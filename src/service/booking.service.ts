import BookingModel, { BOOKING_STATUSES } from "../models/booking.model";
// import { Schema, Types } from "mongoose";
import ServiceModel from "../models/service.model";
import BusinessModel from "../models/business.model";
import UserModel from "../models/user.model";
import EventModel from "../models/event.model";
import QuoteModel from "../models/quote.model";
import InvoiceModel from "../models/invoice.model";
import uuid from "../utils/uuid";
import { addEmailJob, addNotificationJob } from "../integration/QueueManager";
import { generateVendorBookingEmail, generateCrewBookingConfirmationEmail } from "../templates/email-templates";
import { DateTime } from 'luxon';
import { logError } from "../utils/SystemLogs"
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
            requiresQuote: service.isQuotable || false,
            quoteStatus: service.isQuotable ? 'pending' : 'not_required',
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
            // Validation: For quotable bookings, quotes must be added first
            if (booking.requiresQuote && booking.quoteStatus !== 'provided') {
                throw new Error('Cannot confirm quotable booking without adding quotes first. Please add quotes before confirming.');
            }

            let quoteAmount = 0;
            const services = [];

            // If quotes were already provided (quotable booking)
            if (booking.requiresQuote && quoteItems && quoteItems.length > 0) {
                for (const item of quoteItems) {
                    const totalPrice = item.price * (item.quantity || 1);
                    quoteAmount += totalPrice;
                    services.push({
                        serviceId: booking.serviceId,
                        item: item.name,
                        quantity: item.quantity || 1,
                        unitPrice: item.price,
                        totalPrice,
                        itemStatus: 'pending'
                    });
                }
                // Add service price to quote amount
                quoteAmount += service.price;
            } else {
                // Non-quotable booking - only use service price, no quote items
                quoteAmount = service.price;
                // Keep services array empty for non-quotable bookings
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
            booking.totalAmount = amount;
            booking.platformFee = platformFee;

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
                
                // If booking is declined and payment is still pending, cancel the payment
                if (booking.paymentStatus === 'pending') {
                    booking.paymentStatus = 'cancelled';
                }
            }

            // Update invoice status if exists
            const invoice = await InvoiceModel.findOne({ bookingId: booking._id });
            if (invoice && invoice.status === 'pending') {
                invoice.status = 'cancelled';
                await invoice.save();
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

    static async addQuotesToBooking({ bookingId, userId, userRole, quoteItems }: { bookingId: string; userId: string; userRole: string; quoteItems: { name: string; price: number; quantity?: number; description?: string }[] }) {
        const booking = await BookingModel.findById(bookingId);
        if (!booking) {
            throw new Error('Booking not found');
        }

        // Validation: Only distributor can add quotes
        if (userRole !== 'distributor' && userRole !== 'admin') {
            throw new Error('Only distributors can add quotes to bookings');
        }

        // Validation: Booking must be pending
        if (booking.status !== 'pending') {
            throw new Error('Can only add quotes to pending bookings');
        }

        // Validation: Service must be quotable
        if (!booking.requiresQuote) {
            throw new Error('This service does not require quotes');
        }

        // Validation: Quote status must be pending
        if (booking.quoteStatus !== 'pending') {
            throw new Error('Quotes have already been provided for this booking');
        }

        // Validation: Must provide at least one quote item
        if (!quoteItems || quoteItems.length === 0) {
            throw new Error('At least one quote item is required');
        }

        const service = await ServiceModel.findById(booking.serviceId);
        if (!service) {
            throw new Error('Service not found');
        }

        const bookingUser = await UserModel.findById(booking.userId);
        if (!bookingUser) {
            throw new Error('Booking user not found');
        }

        // Calculate quote amount
        let quoteItemsTotal = 0;
        const services = [];

        // Add only quote items (not the service itself)
        for (const item of quoteItems) {
            const totalPrice = item.price * (item.quantity || 1);
            quoteItemsTotal += totalPrice;
            services.push({
                serviceId: booking.serviceId,
                item: item.name,
                description: item.description,
                quantity: item.quantity || 1,
                unitPrice: item.price,
                totalPrice
            });
        }

        // Total includes service price + quote items
        const quoteAmount = service.price + quoteItemsTotal;
        const platformFee = quoteAmount * CONSTANTS.PLATFORM_FEE_PERCENT;
        const amount = quoteAmount + platformFee;

        // Create quote
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

        // Update booking - set status to confirmed and update quote info
        booking.quoteId = quote._id;
        booking.quoteStatus = 'provided';
        booking.status = 'confirmed';
        booking.confirmedAt = new Date();
        booking.totalAmount = amount;
        booking.platformFee = platformFee;
        booking.isTokenUsed = true;
        await booking.save();

        // Send notification to crew
        await addNotificationJob({
            recipientId: booking.userId,
            type: 'booking',
            priority: 'high',
            title: 'Quote Provided',
            message: `A quote has been provided for your booking. Total: $${amount.toFixed(2)}`,
            data: { bookingId: booking._id, quoteId: quote._id }
        });

        // Send email to crew
        await addEmailJob({
            email: bookingUser.email,
            subject: 'Quote Provided for Your Booking',
            html: `
                <h1>Quote Provided</h1>
                <p>Dear ${bookingUser.firstName} ${bookingUser.lastName},</p>
                <p>A quote has been provided for your booking #${booking._id.toString()}.</p>
                <p><strong>Total Amount: $${amount.toFixed(2)}</strong></p>
                <p>Service Price: $${service.price.toFixed(2)}</p>
                <p>Additional Items: $${quoteItemsTotal.toFixed(2)}</p>
                <p>Platform Fee (10%): $${platformFee.toFixed(2)}</p>
                <p>Please review and accept or reject the quote.</p>
                <a href="${process.env.FRONTEND_URL}/crew/bookings/${booking._id}" style="display:inline-block;background-color:#4CAF50;color:white;padding:14px 20px;text-align:center;text-decoration:none;font-size:16px;margin:4px 2px;cursor:pointer;border-radius:4px;">
                    View Quote
                </a>
            `
        });

        return { booking, quote };
    }

    static async acceptQuote({ bookingId, userId }: { bookingId: string; userId: string }) {
        const booking = await BookingModel.findById(bookingId).populate('quoteId');
        if (!booking) {
            throw new Error('Booking not found');
        }

        // Validation: User must be the booking owner
        if (booking.userId.toString() !== userId) {
            throw new Error('You can only accept quotes for your own bookings');
        }

        // Validation: Booking must be confirmed
        if (booking.status !== 'confirmed') {
            throw new Error('Booking must be confirmed to accept quote');
        }

        // Validation: Quote must be provided
        if (booking.quoteStatus !== 'provided') {
            throw new Error('No quote available to accept');
        }

        // Update quote and booking
        booking.quoteStatus = 'accepted';
        booking.crewAcceptedQuoteAt = new Date();
        await booking.save();

        if (booking.quoteId) {
            await QuoteModel.findByIdAndUpdate(booking.quoteId, { status: 'accepted' });
        }

        const business = await BusinessModel.findById(booking.businessId);
        if (business) {
            await addNotificationJob({
                recipientId: business.userId,
                type: 'booking',
                priority: 'high',
                title: 'Quote Accepted',
                message: `Customer has accepted the quote for booking #${booking._id.toString()}`,
                data: { bookingId: booking._id }
            });
        }

        return booking;
    }

    static async rejectQuote({ bookingId, userId, reason }: { bookingId: string; userId: string; reason?: string }) {
        const booking = await BookingModel.findById(bookingId).populate('quoteId');
        if (!booking) {
            throw new Error('Booking not found');
        }

        // Validation: User must be the booking owner
        if (booking.userId.toString() !== userId) {
            throw new Error('You can only reject quotes for your own bookings');
        }

        // Validation: Booking must be confirmed
        if (booking.status !== 'confirmed') {
            throw new Error('Booking must be confirmed to reject quote');
        }

        // Validation: Quote must be provided
        if (booking.quoteStatus !== 'provided') {
            throw new Error('No quote available to reject');
        }

        // Update quote and booking
        booking.quoteStatus = 'rejected';
        booking.crewRejectedQuoteAt = new Date();
        booking.status = 'cancelled';
        booking.paymentStatus = 'cancelled';
        if (reason) booking.cancellationReason = reason;
        await booking.save();

        if (booking.quoteId) {
            await QuoteModel.findByIdAndUpdate(booking.quoteId, { status: 'declined' });
        }

        const business = await BusinessModel.findById(booking.businessId);
        if (business) {
            await addNotificationJob({
                recipientId: business.userId,
                type: 'booking',
                priority: 'high',
                title: 'Quote Rejected',
                message: `Customer has rejected the quote for booking #${booking._id.toString()}`,
                data: { bookingId: booking._id }
            });
        }

        return booking;
    }

    static async confirmJobCompletion({ bookingId, userId }: { bookingId: string; userId: string }) {
        const booking = await BookingModel.findById(bookingId);
        if (!booking) {
            throw new Error('Booking not found');
        }

        // Validation: User must be the booking owner
        if (booking.userId.toString() !== userId) {
            throw new Error('You can only confirm completion for your own bookings');
        }

        // Validation: Booking must be completed
        if (booking.status !== 'completed') {
            throw new Error('Booking must be marked as completed by distributor first');
        }

        // Validation: Payment must be made
        if (booking.paymentStatus !== 'paid') {
            throw new Error('Payment must be completed before confirming job completion');
        }

        // Update booking - Add a flag or notes
        if (!booking.notes) {
            booking.notes = 'Job completion confirmed by customer';
        } else {
            booking.notes += ' | Job completion confirmed by customer';
        }
        await booking.save();

        // Here you can add logic to release payment to distributor
        const business = await BusinessModel.findById(booking.businessId);
        if (business) {
            await addNotificationJob({
                recipientId: business.userId,
                type: 'booking',
                priority: 'high',
                title: 'Job Completion Confirmed',
                message: `Customer has confirmed job completion for booking #${booking._id.toString()}. Payment can be released.`,
                data: { bookingId: booking._id }
            });
        }

        return booking;
    }

    // ==================== GRANULAR QUOTE ITEM MANAGEMENT ====================

    /**
     * Accept a single quote item
     */
    static async acceptQuoteItem({ bookingId, itemId, userId }: { bookingId: string; itemId: string; userId: string }) {
        const booking = await BookingModel.findById(bookingId).populate('quoteId');
        if (!booking) throw new Error('Booking not found');

        // Validation: User must be the booking owner
        if (booking.userId.toString() !== userId) {
            throw new Error('Only the booking creator can accept quotes');
        }

        // Validation: Quote must exist
        if (!booking.quoteId) throw new Error('No quote found for this booking');

        const quote = await QuoteModel.findById(booking.quoteId);
        if (!quote) throw new Error('Quote not found');

        // Find and update the specific item
        const item = quote.services.find((service: any) => service._id.toString() === itemId);
        if (!item) throw new Error('Quote item not found');

        // Update item status
        item.itemStatus = 'accepted';
        item.acceptedBy = userId as any;
        item.acceptedAt = new Date();

        await quote.save();

        // Recalculate overall quote status
        booking.quoteStatus = this.calculateQuoteStatus(quote.services);
        await booking.save();

        return { booking, quote };
    }

    /**
     * Reject a single quote item
     */
    static async rejectQuoteItem({ bookingId, itemId, userId, reason }: { bookingId: string; itemId: string; userId: string; reason?: string }) {
        const booking = await BookingModel.findById(bookingId).populate('quoteId');
        if (!booking) throw new Error('Booking not found');

        // Validation
        if (booking.userId.toString() !== userId) {
            throw new Error('Only the booking creator can reject quotes');
        }

        if (!booking.quoteId) throw new Error('No quote found for this booking');

        const quote = await QuoteModel.findById(booking.quoteId);
        if (!quote) throw new Error('Quote not found');

        const item = quote.services.find((service: any) => service._id.toString() === itemId);
        if (!item) throw new Error('Quote item not found');

        // Update item status
        item.itemStatus = 'rejected';
        item.rejectedBy = userId as any;
        item.rejectedAt = new Date();
        if (reason) item.editReason = reason;

        await quote.save();

        // Recalculate overall quote status
        booking.quoteStatus = this.calculateQuoteStatus(quote.services);
        await booking.save();

        return { booking, quote };
    }

    /**
     * Request edit for a single quote item
     */
    static async requestQuoteItemEdit({ bookingId, itemId, userId, reason }: { bookingId: string; itemId: string; userId: string; reason: string }) {
        const booking = await BookingModel.findById(bookingId).populate('quoteId');
        if (!booking) throw new Error('Booking not found');

        // Validation
        if (booking.userId.toString() !== userId) {
            throw new Error('Only the booking creator can request edits');
        }

        if (!booking.quoteId) throw new Error('No quote found for this booking');

        const quote = await QuoteModel.findById(booking.quoteId);
        if (!quote) throw new Error('Quote not found');

        const item = quote.services.find((service: any) => service._id.toString() === itemId);
        if (!item) throw new Error('Quote item not found');

        // Update item status
        item.itemStatus = 'edit_requested';
        item.editReason = reason;

        await quote.save();

        // Recalculate overall quote status
        booking.quoteStatus = this.calculateQuoteStatus(quote.services);
        await booking.save();

        // Notify distributor
        const business = await BusinessModel.findById(booking.businessId);
        if (business) {
            await addNotificationJob({
                recipientId: business.userId,
                type: 'booking',
                priority: 'high',
                title: 'Quote Edit Requested',
                message: `Customer has requested an edit for "${item.item}" in booking #${booking._id.toString()}`,
                data: { bookingId: booking._id, itemId }
            });
        }

        return { booking, quote };
    }

    /**
     * Accept all quote items at once
     */
    static async acceptAllQuoteItems({ bookingId, userId }: { bookingId: string; userId: string }) {
        const booking = await BookingModel.findById(bookingId).populate('quoteId');
        if (!booking) throw new Error('Booking not found');

        if (booking.userId.toString() !== userId) {
            throw new Error('Only the booking creator can accept quotes');
        }

        if (!booking.quoteId) throw new Error('No quote found for this booking');

        const quote = await QuoteModel.findById(booking.quoteId);
        if (!quote) throw new Error('Quote not found');

        // Update all items
        quote.services.forEach((service: any) => {
            service.itemStatus = 'accepted';
            service.acceptedBy = userId as any;
            service.acceptedAt = new Date();
        });

        await quote.save();

        // Update booking quote status
        booking.quoteStatus = 'accepted';
        booking.crewAcceptedQuoteAt = new Date();
        await booking.save();

        // Notify distributor
        const business = await BusinessModel.findById(booking.businessId);
        if (business) {
            await addNotificationJob({
                recipientId: business.userId,
                type: 'booking',
                priority: 'high',
                title: 'Quote Accepted',
                message: `Customer has accepted all quote items for booking #${booking._id.toString()}`,
                data: { bookingId: booking._id }
            });
        }

        return { booking, quote };
    }

    /**
     * Reject all quote items at once
     */
    static async rejectAllQuoteItems({ bookingId, userId, reason }: { bookingId: string; userId: string; reason?: string }) {
        const booking = await BookingModel.findById(bookingId).populate('quoteId');
        if (!booking) throw new Error('Booking not found');

        if (booking.userId.toString() !== userId) {
            throw new Error('Only the booking creator can reject quotes');
        }

        if (!booking.quoteId) throw new Error('No quote found for this booking');

        const quote = await QuoteModel.findById(booking.quoteId);
        if (!quote) throw new Error('Quote not found');

        // Update all items
        quote.services.forEach((service: any) => {
            service.itemStatus = 'rejected';
            service.rejectedBy = userId as any;
            service.rejectedAt = new Date();
            if (reason) service.editReason = reason;
        });

        await quote.save();

        // Update booking
        booking.quoteStatus = 'rejected';
        booking.crewRejectedQuoteAt = new Date();
        booking.status = 'cancelled';
        booking.paymentStatus = 'cancelled';
        if (reason) booking.cancellationReason = reason;
        await booking.save();

        // Notify distributor
        const business = await BusinessModel.findById(booking.businessId);
        if (business) {
            await addNotificationJob({
                recipientId: business.userId,
                type: 'booking',
                priority: 'high',
                title: 'Quote Rejected',
                message: `Customer has rejected all quote items for booking #${booking._id.toString()}`,
                data: { bookingId: booking._id }
            });
        }

        return { booking, quote };
    }

    /**
     * Update a quote item (distributor only)
     */
    static async updateQuoteItem({ bookingId, itemId, userId, userRole, updatedItem }: { 
        bookingId: string; 
        itemId: string; 
        userId: string; 
        userRole: string;
        updatedItem: { name?: string; description?: string; quantity?: number; price?: number }
    }) {
        // Validation: Only distributors can edit
        if (userRole !== 'distributor') {
            throw new Error('Only distributors can edit quote items');
        }

        const booking = await BookingModel.findById(bookingId).populate('quoteId');
        if (!booking) throw new Error('Booking not found');

        // Validation: Must be the booking's distributor
        const business = await BusinessModel.findById(booking.businessId);
        if (!business || business.userId.toString() !== userId) {
            throw new Error('You can only edit quotes for your own bookings');
        }

        if (!booking.quoteId) throw new Error('No quote found for this booking');

        const quote = await QuoteModel.findById(booking.quoteId);
        if (!quote) throw new Error('Quote not found');

        const item = quote.services.find((service: any) => service._id.toString() === itemId);
        if (!item) throw new Error('Quote item not found');

        // Update item fields
        if (updatedItem.name) item.item = updatedItem.name;
        if (updatedItem.description !== undefined) item.description = updatedItem.description;
        if (updatedItem.quantity) item.quantity = updatedItem.quantity;
        if (updatedItem.price) item.unitPrice = updatedItem.price;

        // Recalculate total price
        item.totalPrice = item.quantity * item.unitPrice;

        // Update item status
        item.itemStatus = 'edited';
        item.editedBy = userId as any;
        item.editedAt = new Date();

        // Recalculate quote totals
        const service = await ServiceModel.findById(booking.serviceId);
        if (!service) throw new Error('Service not found');

        let quoteItemsTotal = 0;
        quote.services.forEach((service: any) => {
            quoteItemsTotal += service.totalPrice;
        });

        const quoteAmount = service.price + quoteItemsTotal;
        const platformFee = quoteAmount * CONSTANTS.PLATFORM_FEE_PERCENT;
        const amount = quoteAmount + platformFee;

        quote.quoteAmount = quoteAmount;
        quote.platformFee = platformFee;
        quote.amount = amount;

        await quote.save();

        // Update booking
        booking.quoteStatus = this.calculateQuoteStatus(quote.services);
        booking.totalAmount = amount;
        booking.platformFee = platformFee;
        await booking.save();

        // Notify crew
        const user = await UserModel.findById(booking.userId);
        if (user) {
            await addNotificationJob({
                recipientId: user._id,
                type: 'booking',
                priority: 'high',
                title: 'Quote Updated',
                message: `Quote item "${item.item}" has been updated for your booking`,
                data: { bookingId: booking._id, itemId }
            });
        }

        return { booking, quote };
    }

    /**
     * Delete a quote item (Distributor only)
     */
    static async deleteQuoteItem({ bookingId, itemId, userId, userRole }: {
        bookingId: string;
        itemId: string;
        userId: string;
        userRole: string;
    }) {
        // Validation: Only distributors can delete
        if (userRole !== 'distributor') {
            throw new Error('Only distributors can delete quote items');
        }

        const booking = await BookingModel.findById(bookingId).populate('quoteId');
        if (!booking) throw new Error('Booking not found');

        // Validation: Must be the booking's distributor
        const business = await BusinessModel.findById(booking.businessId);
        if (!business || business.userId.toString() !== userId) {
            throw new Error('You can only delete quotes for your own bookings');
        }

        if (!booking.quoteId) throw new Error('No quote found for this booking');

        const quote = await QuoteModel.findById(booking.quoteId);
        if (!quote) throw new Error('Quote not found');

        // Find and remove the item
        const itemIndex = quote.services.findIndex((service: any) => service._id.toString() === itemId);
        if (itemIndex === -1) throw new Error('Quote item not found');

        const deletedItem = quote.services[itemIndex];
        quote.services.splice(itemIndex, 1);

        // If no items remaining, throw error
        if (quote.services.length === 0) {
            throw new Error('Cannot delete the last quote item. Consider declining the booking instead.');
        }

        // Recalculate quote totals
        const service = await ServiceModel.findById(booking.serviceId);
        if (!service) throw new Error('Service not found');

        let quoteItemsTotal = 0;
        quote.services.forEach((service: any) => {
            quoteItemsTotal += service.totalPrice;
        });

        const quoteAmount = service.price + quoteItemsTotal;
        const platformFee = quoteAmount * CONSTANTS.PLATFORM_FEE_PERCENT;
        const amount = quoteAmount + platformFee;

        quote.quoteAmount = quoteAmount;
        quote.platformFee = platformFee;
        quote.amount = amount;

        await quote.save();

        // Update booking
        booking.quoteStatus = this.calculateQuoteStatus(quote.services);
        booking.totalAmount = amount;
        booking.platformFee = platformFee;
        await booking.save();

        // Notify crew
        const user = await UserModel.findById(booking.userId);
        if (user) {
            await addNotificationJob({
                recipientId: user._id,
                type: 'booking',
                priority: 'high',
                title: 'Quote Item Removed',
                message: `Quote item "${deletedItem.item}" has been removed from your booking`,
                data: { bookingId: booking._id }
            });
        }

        return { booking, quote };
    }

    /**
     * Calculate overall quote status based on individual item statuses
     */
    private static calculateQuoteStatus(services: any[]): 'not_required' | 'pending' | 'provided' | 'accepted' | 'rejected' | 'edit_requested' | 'edited' | 'partially_accepted' {
        const statuses = services.map((service: any) => service.itemStatus || 'pending');

        // All accepted
        if (statuses.every(s => s === 'accepted')) return 'accepted';

        // All rejected
        if (statuses.every(s => s === 'rejected')) return 'rejected';

        // Any edit requested or edited
        if (statuses.some(s => s === 'edit_requested')) return 'edit_requested';
        if (statuses.some(s => s === 'edited')) return 'edited';

        // Mix of accepted and pending
        if (statuses.some(s => s === 'accepted') && statuses.some(s => s === 'pending')) {
            return 'partially_accepted';
        }

        // Default: provided (all pending or mixed)
        return 'provided';
    }
}