import BookingModel, { BOOKING_STATUSES } from "../models/booking.model";
import ServiceModel from "../models/service.model";
import BusinessModel from "../models/business.model";
import UserModel from "../models/user.model";
import EventModel from "../models/event.model";
import QuoteModel from "../models/quote.model";
import uuid from "../utils/uuid";
import { addEmailJob, addNotificationJob } from "../integration/QueueManager";
import { generateVendorBookingEmail, generateCrewBookingConfirmationEmail } from "../templates/email-templates";
import { DateTime } from 'luxon';
import { logError } from "../utils/SystemLogs";
import CONSTANTS from "../config/constant";
import 'dotenv/config';

export class BookingService {
    static async createBooking({ userId, serviceId, serviceLocation, dateTime, notes, contact, attachments }: { userId: string, serviceId: string, serviceLocation: { street: string, city: string, state: string, zip: string, country: string }, dateTime: string, notes?: string, contact?: { email?: string, phone?: string }, attachments?: string[] }) {

        const service = await ServiceModel.findById(serviceId);
        if (!service) {
            throw new Error('Service not found');
        }

        const business = await BusinessModel.findById(service.businessId);
        if (!business) {
            throw new Error('Business not found');
        }

        const user = await UserModel.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const confirmationToken = uuid();
        const confirmationExpires = DateTime.now().plus({ days: 7 }).toJSDate();
        const bookingDateTime = DateTime.fromISO(dateTime).toJSDate();

        const booking = new BookingModel({
            userId,
            businessId: service.businessId,
            serviceId,
            serviceLocation,
            bookingDate: bookingDateTime,
            startTime: bookingDateTime,
            customerEmail: contact?.email || user.email,
            customerPhone: contact?.phone || user.phone,
            status: 'pending',
            paymentStatus: 'pending',
            attachments: attachments || [],
            confirmationToken,
            confirmationExpires,
            isTokenUsed: false,
            notes
        });

        await booking.save();

        await EventModel.create({
            userId,
            title: `Booking: ${service.name}`,
            description: notes || `Service booking at ${serviceLocation.street}, ${serviceLocation.city}`,
            start: bookingDateTime,
            end: bookingDateTime,
            allDay: false,
            type: 'booking',
            location: `${serviceLocation.street}, ${serviceLocation.city}, ${serviceLocation.state}, ${serviceLocation.zip}, ${serviceLocation.country}`,
            guestIds: [],
            guestEmails: []
        });

        const confirmationUrl = `${process.env.FRONTEND_URL}/bookings/confirm/${confirmationToken}`;
        const serviceLocationStr = `${serviceLocation.street}, ${serviceLocation.city}, ${serviceLocation.state}, ${serviceLocation.zip}, ${serviceLocation.country}`;

        await addNotificationJob({
            recipientId: business.userId,
            type: 'booking',
            priority: 'high',
            title: 'New Booking Request',
            message: `${user.firstName} ${user.lastName} has requested a booking for ${service.name}`,
            data: { bookingId: booking._id, serviceId: service._id }
        });

        const vendorEmailHtml = await generateVendorBookingEmail({
            vendor: business,
            crew: user,
            servicesList: [service],
            totalPrice: service.price,
            dateTime: bookingDateTime,
            serviceLocation: serviceLocationStr,
            contactPhone: contact?.phone || user.phone,
            internalNotes: notes || '',
            confirmationUrl
        });

        await addEmailJob({
            email: business.email,
            subject: 'New Booking Request - Confirmation Required',
            html: vendorEmailHtml
        });

        const crewEmailHtml = await generateCrewBookingConfirmationEmail({
            crew: user,
            vendorUser: business,
            servicesList: [service],
            totalPrice: service.price,
            dateTime: bookingDateTime,
            serviceLocation: serviceLocationStr,
            contactPhone: contact?.phone || user.phone,
            internalNotes: notes || ''
        });

        await addEmailJob({
            email: user.email,
            subject: 'Booking Confirmation - Pending Vendor Approval',
            html: crewEmailHtml
        });

        return booking;
    }
    static async confirmBooking(token: string) {
        try {
            const booking = await BookingModel.findOne({ confirmationToken: token, isTokenUsed: false });

            if (!booking) {
                throw new Error('Invalid or expired token');
            }

            if (!booking.confirmationExpires || booking.confirmationExpires < new Date()) {
                throw new Error('Token has expired');
            }

            booking.isTokenUsed = true;
            booking.status = 'confirmed';
            booking.confirmationExpires = undefined;
            booking.confirmationToken = undefined;
            await booking.save();

            const user = await UserModel.findById(booking.userId);

            if (user) {
                await addEmailJob({
                    email: user.email,
                    subject: 'Booking Confirmed',
                    html: `
                <h1>Your Booking Has Been Confirmed</h1>
                <p>Dear ${user.firstName} ${user.lastName},</p>
                <p>Your booking #${booking._id.toString()} has been confirmed by the vendor.</p>
                <p>Scheduled date and time: ${new Date(booking.bookingDate).toLocaleString()}</p>
                <p>You can view your booking details in your account.</p>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'
                        }/crew/bookings/${booking._id
                        }" style="display:inline-block;background-color:#4CAF50;color:white;padding:14px 20px;text-align:center;text-decoration:none;font-size:16px;margin:4px 2px;cursor:pointer;border-radius:4px;">
                View Booking
                </a>
                <p>Thank you for your booking!</p>
            `
                });
            }

            return booking;
        } catch (error) {
            logError({ message: "Confirming a booking failed!", source: "BookingService.confirmBooking", error });
            throw new Error('Error confirming booking.');
        }
    }
    static async updateBookingStatus({bookingId, userId, userRole, status, notes, reason, quoteItems}:{bookingId: string; userId: string; userRole: string; status: typeof BOOKING_STATUSES[number]; notes?: string; reason?: string; quoteItems?: {name: string; price: number; quantity?: number}[]}) {
        const USER_BOOKING_STATUS_RULES: Record<string, {allowedTransitions: string[]; canBeChangedBy: string[]}> = {
            pending: {
                allowedTransitions: ['confirmed', 'declined', 'cancelled'],
                canBeChangedBy: ['distributor', 'admin', 'user', 'manufacturer']
            },
            confirmed: {
                allowedTransitions: ['completed', 'cancelled'],
                canBeChangedBy: ['distributor', 'admin', 'manufacturer']
            },
            completed: {
                allowedTransitions: [],
                canBeChangedBy: ['admin', 'manufacturer']
            },
            declined: {
                allowedTransitions: [],
                canBeChangedBy: ['admin', 'manufacturer']
            },
            cancelled: {
                allowedTransitions: [],
                canBeChangedBy: ['admin', 'manufacturer']
            }
        };

        const booking = await BookingModel.findById(bookingId);
        if (!booking) {
            throw new Error('Booking not found');
        }

        const user = await UserModel.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const currentStatusRules = USER_BOOKING_STATUS_RULES[booking.status];
        
        if (!currentStatusRules.allowedTransitions.includes(status)) {
            throw new Error(`Cannot transition from ${booking.status} to ${status}`);
        }

        if (!currentStatusRules.canBeChangedBy.includes(userRole)) {
            throw new Error(`User role ${userRole} is not allowed to change status from ${booking.status}`);
        }

        const service = await ServiceModel.findById(booking.serviceId);
        if (!service) {
            throw new Error('Service not found');
        }

        const business = await BusinessModel.findById(booking.businessId);
        if (!business) {
            throw new Error('Business not found');
        }

        const bookingUser = await UserModel.findById(booking.userId);
        if (!bookingUser) {
            throw new Error('Booking user not found');
        }

        const oldStatus = booking.status;
        booking.status = status;

        if (status === 'confirmed') {
            let quoteAmount = 0;
            const services = [];

            if (quoteItems && quoteItems.length > 0) {
                for (const item of quoteItems) {
                    const totalPrice = item.price * (item.quantity || 1);
                    quoteAmount += totalPrice;
                    services.push({
                        serviceId: booking.serviceId,
                        item: item.name,
                        quantity: item.quantity || 1,
                        unitPrice: item.price,
                        totalPrice
                    });
                }
            } else {
                quoteAmount = service.price;
                services.push({
                    serviceId: booking.serviceId,
                    item: service.name,
                    quantity: 1,
                    unitPrice: service.price,
                    totalPrice: service.price
                });
            }

            const platformFee = quoteAmount * CONSTANTS.PLATFORM_FEE_PERCENT;
            const amount = quoteAmount + platformFee;

            const quote = new QuoteModel({
                bookingId: booking._id,
                services,
                status: 'pending',
                amount,
                platformFee,
                currency: 'USD',
                quoteDate: new Date(),
                quoteAmount,
                createdBy: userId,
                updatedBy: userId,
                attachments: []
            });

            await quote.save();
            booking.quoteId = quote._id;
            booking.quoteStatus = 'provided';
            booking.isTokenUsed = true;
            booking.confirmedAt = new Date();

            await EventModel.create({
                userId: business.userId,
                title: `Booking: ${service.name}`,
                description: `Confirmed booking with ${bookingUser.firstName} ${bookingUser.lastName}`,
                start: booking.startTime,
                end: booking.startTime,
                allDay: false,
                type: 'booking',
                location: `${booking.serviceLocation.street}, ${booking.serviceLocation.city}, ${booking.serviceLocation.state}`,
                guestIds: [booking.userId],
                guestEmails: [bookingUser.email]
            });
        }

        if (status === 'completed') {
            booking.completedAt = new Date();

            if (userRole === 'distributor' || userRole === 'admin') {
                await EventModel.updateMany(
                    { userId: { $in: [booking.userId, business.userId] }, type: 'booking', start: booking.startTime },
                    { $set: { description: `Completed: ${service.name}` } }
                );
            }
        }

        if (status === 'cancelled' || status === 'declined') {
            if (status === 'cancelled') {
                booking.cancelledAt = new Date();
                if (reason) booking.cancellationReason = reason;
            } else {
                booking.declinedAt = new Date();
                if (reason) booking.declineReason = reason;
            }

            await EventModel.deleteMany({
                userId: { $in: [booking.userId, business.userId] },
                type: 'booking',
                start: booking.startTime
            });
        }

        if (notes) {
            booking.notes = notes;
        }

        if (!booking.statusHistory) {
            booking.statusHistory = [] as any;
        }
        (booking.statusHistory as any).push({
            fromStatus: oldStatus,
            toStatus: status,
            changedBy: `${user.firstName} ${user.lastName}`,
            userRole,
            reason,
            notes,
            changedAt: new Date()
        });

        await booking.save();

        const statusMessages: Record<string, string> = {
            confirmed: 'Your booking has been confirmed',
            completed: 'Your booking has been completed',
            cancelled: 'Your booking has been cancelled',
            declined: 'Your booking has been declined'
        };

        await addNotificationJob({
            recipientId: booking.userId,
            type: 'booking',
            priority: 'high',
            title: 'Booking Status Update',
            message: statusMessages[status] || `Booking status updated to ${status}`,
            data: { bookingId: booking._id, status }
        });

        await addEmailJob({
            email: bookingUser.email,
            subject: `Booking ${status.charAt(0).toUpperCase() + status.slice(1)} - ${service.name}`,
            html: `
                <h1>Booking Status Update</h1>
                <p>Dear ${bookingUser.firstName} ${bookingUser.lastName},</p>
                <p>Your booking #${booking._id.toString()} has been <strong>${status}</strong>.</p>
                <p>Service: ${service.name}</p>
                <p>Date: ${new Date(booking.bookingDate).toLocaleString()}</p>
                ${reason ? `<p>Reason: ${reason}</p>` : ''}
                ${notes ? `<p>Notes: ${notes}</p>` : ''}
                <a href="${process.env.FRONTEND_URL}/bookings/${booking._id}" style="display:inline-block;background-color:#4CAF50;color:white;padding:14px 20px;text-align:center;text-decoration:none;font-size:16px;margin:4px 2px;cursor:pointer;border-radius:4px;">
                    View Booking
                </a>
            `
        });

        return booking;
    }
    static async getBookings({userId, role, page = 1, limit = 10, status, paymentStatus, startDate, endDate, sortBy = 'createdAt', sortOrder = 'desc' }: {userId: string; role: string; page?: number; limit?: number; status?: string; paymentStatus?: string; startDate?: Date; endDate?: Date; sortBy?: string; sortOrder?: string}) {
        const query: any = {};

        // For admin, fetch all bookings (no user/business filter)
        if (role === 'user') {
            query.userId = userId;
        } else if (role === 'distributor' || role === 'manufacturer') {
            const business = await BusinessModel.findOne({ userId });
            if (!business) {
                throw new Error('Business not found');
            }
            query.businessId = business._id;
        }
        // Admin role has no query restriction, returns all bookings

        if (status) query.status = status;
        if (paymentStatus) query.paymentStatus = paymentStatus;
        if (startDate || endDate) {
            query.bookingDate = {};
            if (startDate) query.bookingDate.$gte = startDate;
            if (endDate) query.bookingDate.$lte = endDate;
        }

        const skip = (page - 1) * limit;
        const sort: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

        const [bookings, total] = await Promise.all([
            BookingModel.find(query)
                .populate('userId', 'firstName lastName email phone role')
                .populate({
                    path: 'businessId',
                    select: 'businessName email phone address userId',
                    populate: {
                        path: 'userId',
                        select: 'firstName lastName email phone'
                    }
                })
                .populate('serviceId', 'name price description category')
                .populate('quoteId')
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            BookingModel.countDocuments(query)
        ]);

        return {
            bookings,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit),
                limit
            }
        };
    }
    static async getBookingById(bookingId: string) {
        const booking = await BookingModel.findById(bookingId)
            .populate('userId', 'firstName lastName email phone role')
            .populate({
                path: 'businessId',
                select: 'businessName email phone address userId',
                populate: {
                    path: 'userId',
                    select: 'firstName lastName email phone'
                }
            })
            .populate('serviceId', 'name price description category')
            .populate('quoteId')
            .lean();

        if (!booking) {
            throw new Error('Booking not found');
        }

        return booking;
    }
}