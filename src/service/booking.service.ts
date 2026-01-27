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
import StripeService from "../integration/stripe";
import InvoiceModel from "../models/invoice.model";
import { CurrencyHelper } from "../utils/currencyHelper";
import 'dotenv/config';

export class BookingService {
    static async createBooking({ userId, businessId, serviceId, serviceLocation, bookingDate, startTime, customerEmail, customerPhone, attachments, notes }: { userId: string; businessId: string; serviceId: string; serviceLocation: { street: string; city: string; state: string; zip: string; country: string }; bookingDate: Date; startTime: Date; customerEmail?: string; customerPhone?: string; attachments?: string[]; notes?: string }) {
        const business = await BusinessModel.findById(businessId);
        if (!business) throw new Error('Business not found');

        const service = await ServiceModel.findById(serviceId);
        if (!service) throw new Error('Service not found');

        const user = await UserModel.findById(userId);
        if (!user) throw new Error('User not found');

        const userCurrency = user.preferences?.currency || 'usd';
        const originalCurrency = service.currency || 'usd';

        const confirmationToken = uuid();
        const confirmationExpires = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000));

        const booking = await BookingModel.create({
            userId,
            businessId,
            serviceId,
            serviceLocation,
            bookingDate,
            startTime,
            customerEmail: customerEmail || user.email,
            customerPhone: customerPhone || user.phone,
            status: 'pending',
            paymentStatus: 'pending',
            attachments: attachments || [],
            confirmationToken,
            confirmationExpires,
            isTokenUsed: false,
            requiresQuote: service.isQuotable || false,
            quoteStatus: service.isQuotable ? 'pending' : 'not_required',
            originalCurrency,
            currency: userCurrency,
            notes
        });

        const dateTimeFormatted = DateTime.fromJSDate(startTime).toFormat('MMMM d, yyyy, h:mm a');
        const serviceLocationString = `${serviceLocation.street}, ${serviceLocation.city}, ${serviceLocation.state}, ${serviceLocation.zip}`;

        const confirmationUrl = `${process.env.FRONTEND_URL}/distributor/bookings/confirm/${confirmationToken}`;

        const vendorEmailHtml = await generateVendorBookingEmail({
            vendor: business,
            crew: user,
            servicesList: [service],
            totalPrice: service.price,
            dateTime: startTime,
            serviceLocation: serviceLocationString,
            contactPhone: customerPhone || user.phone || 'N/A',
            internalNotes: notes || '',
            confirmationUrl
        });

        const crewEmailHtml = await generateCrewBookingConfirmationEmail({
            crew: user,
            vendorUser: business,
            servicesList: [service],
            totalPrice: service.price,
            dateTime: startTime,
            serviceLocation: serviceLocationString,
            contactPhone: customerPhone || user.phone || 'N/A',
            internalNotes: notes || ''
        });

        await addEmailJob({
            email: business.email,
            subject: `New Booking Request for ${service.name}`,
            html: vendorEmailHtml
        });

        await addEmailJob({
            email: user.email,
            subject: `Booking Confirmation for ${service.name}`,
            html: crewEmailHtml
        });

        await addNotificationJob({
            recipientId: business.userId,
            type: 'booking',
            priority: 'high',
            title: 'New Booking',
            message: `You have a new booking request for ${service.name} on ${dateTimeFormatted}.`,
            data: { bookingId: booking._id, serviceId: service._id, userRole: 'distributor' }
        });

        await addNotificationJob({
            recipientId: user._id,
            type: 'booking',
            priority: 'medium',
            title: 'Booking Created',
            message: `Your booking for ${service.name} has been successfully created and is awaiting confirmation.`,
            data: { bookingId: booking._id, serviceId: service._id, userRole: 'user' }
        });

        return booking;
    }

    static async confirmBooking(confirmationToken: string) {
        const booking = await BookingModel.findOne({ confirmationToken, isTokenUsed: false });

        if (!booking) {
            throw new Error('Invalid or expired confirmation link');
        }

        if (booking.confirmationExpires && booking.confirmationExpires < new Date()) {
            throw new Error('Confirmation link has expired');
        }

        booking.status = 'confirmed';
        booking.isTokenUsed = true;
        booking.confirmedAt = new Date();
        await booking.save();

        const business = await BusinessModel.findById(booking.businessId);
        if (!business) throw new Error('Business not found');

        const service = await ServiceModel.findById(booking.serviceId);
        if (!service) throw new Error('Service not found');

        const user = await UserModel.findById(booking.userId);
        if (!user) throw new Error('User not found');

        await addNotificationJob({
            recipientId: booking.userId,
            type: 'booking',
            priority: 'high',
            title: 'Booking Confirmed',
            message: `Your booking for ${service.name} has been confirmed!`,
            data: { bookingId: booking._id }
        });

        await EventModel.create({
            userId: business.userId,
            type: 'booking',
            title: `Confirmed: ${service.name}`,
            description: `Booking for ${service.name} with ${user.firstName} ${user.lastName}`,
            start: booking.startTime,
            end: new Date(booking.startTime.getTime() + (2 * 60 * 60 * 1000)),
            status: 'confirmed',
            bookingId: booking._id
        });

        await EventModel.create({
            userId: booking.userId,
            type: 'booking',
            title: `Confirmed: ${service.name}`,
            description: `Booking confirmed with ${business.businessName}`,
            start: booking.startTime,
            end: new Date(booking.startTime.getTime() + (2 * 60 * 60 * 1000)),
            status: 'confirmed',
            bookingId: booking._id
        });

        return booking;
    }

    static async updateBookingStatus({ bookingId, userId, userRole, status, notes, reason, quoteItems }: { bookingId: string; userId: string; userRole: string; status: typeof BOOKING_STATUSES[number]; notes?: string; reason?: string; quoteItems?: { name: string; price: number; quantity?: number }[] }) {
        const USER_BOOKING_STATUS_RULES: Record<string, { allowedTransitions: string[]; canBeChangedBy: string[] }> = {
            pending: {
                allowedTransitions: ['confirmed', 'declined', 'cancelled'],
                canBeChangedBy: ['distributor', 'admin', 'user', 'manufacturer']
            },
            confirmed: {
                allowedTransitions: ['completed', 'cancelled'],
                canBeChangedBy: ['distributor', 'admin', 'manufacturer']
            },
            cancelled: {
                allowedTransitions: [],
                canBeChangedBy: []
            },
            completed: {
                allowedTransitions: [],
                canBeChangedBy: []
            },
            declined: {
                allowedTransitions: [],
                canBeChangedBy: []
            }
        };

        const booking = await BookingModel.findById(bookingId);
        if (!booking) throw new Error('Booking not found');

        const currentStatus = booking.status;
        const rules = USER_BOOKING_STATUS_RULES[currentStatus];

        if (!rules) {
            throw new Error(`Cannot transition from status: ${currentStatus}`);
        }

        if (!rules.allowedTransitions.includes(status)) {
            throw new Error(`Cannot transition from ${currentStatus} to ${status}`);
        }

        if (!rules.canBeChangedBy.includes(userRole)) {
            throw new Error(`Role ${userRole} cannot change booking status`);
        }

        const service = await ServiceModel.findById(booking.serviceId);
        if (!service) throw new Error('Service not found');

        const business = await BusinessModel.findById(booking.businessId);
        if (!business) throw new Error('Business not found');

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
                        currency: service.currency || 'usd',
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
                currency: booking.currency,
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
                type: 'booking',
                title: `Confirmed: ${service.name}`,
                description: notes || `Booking confirmed`,
                start: booking.startTime,
                end: new Date(booking.startTime.getTime() + (2 * 60 * 60 * 1000)),
                allDay: false,
                status: 'confirmed',
                bookingId: booking._id
            });

            await EventModel.create({
                userId: booking.userId,
                type: 'booking',
                title: `Confirmed: ${service.name}`,
                description: notes || `Booking confirmed`,
                start: booking.startTime,
                end: new Date(booking.startTime.getTime() + (2 * 60 * 60 * 1000)),
                allDay: false,
                status: 'confirmed',
                bookingId: booking._id
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

                if (booking.paymentStatus === 'pending' || booking.paymentStatus === 'deposit_paid') {
                    booking.paymentStatus = 'cancelled';
                }
            }

            const depositInvoice = await InvoiceModel.findOne({ bookingId: booking._id, invoiceType: 'deposit' });
            if (depositInvoice && depositInvoice.status === 'pending') {
                depositInvoice.status = 'cancelled';
                await depositInvoice.save();
            }

            const balanceInvoice = await InvoiceModel.findOne({ bookingId: booking._id, invoiceType: 'balance' });
            if (balanceInvoice && balanceInvoice.status === 'pending') {
                balanceInvoice.status = 'cancelled';
                await balanceInvoice.save();
            }

            await EventModel.deleteMany({
                bookingId: booking._id,
                type: 'booking'
            });
        }

        if (notes) {
            if (!booking.notes) {
                booking.notes = notes;
            } else {
                booking.notes += ` | ${notes}`;
            }
        }

        if (!booking.statusHistory) {
            booking.statusHistory = [];
        }

        booking.statusHistory.push({
            fromStatus: currentStatus,
            toStatus: status,
            changedBy: userId,
            userRole,
            reason,
            notes,
            changedAt: new Date()
        } as any);

        await booking.save();

        await addNotificationJob({
            recipientId: booking.userId,
            type: 'booking',
            priority: 'high',
            title: `Booking ${status}`,
            message: `Your booking has been ${status}.${reason ? ` Reason: ${reason}` : ''}`,
            data: { bookingId: booking._id }
        });

        return booking;
    }

    static async getBookings({ userId, role, page = 1, limit = 10, status, paymentStatus, startDate, endDate, sortBy = 'createdAt', sortOrder = 'desc', completedStatus }: { userId: string; role: string; page?: number; limit?: number; status?: string; paymentStatus?: string; startDate?: Date; endDate?: Date; sortBy?: string; sortOrder?: string, completedStatus?: string }) {
        const query: any = {};

        // For admin, fetch all bookings (no user/business filter)
        if (role === 'user') {
            query.userId = userId;
        } else if (role === 'distributor' || role === 'manufacturer') {
            const business = await BusinessModel.findOne({ userId });
            if (!business) {
                throw new Error('Business not found for this user');
            }
            query.businessId = business._id;
        }
        // Admin role has no query restriction, returns all bookings

        if (status) query.status = status;
        if (paymentStatus) query.paymentStatus = paymentStatus;
        if (completedStatus) query.completedStatus = completedStatus;
        if (startDate || endDate) {
            query.bookingDate = {};
            if (startDate) query.bookingDate.$gte = startDate;
            if (endDate) query.bookingDate.$lte = endDate;
        }

        const skip = (page - 1) * limit;
        const sort: any = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

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

        const distributor = await UserModel.findById(userId);
        const distributorCurrency = distributor?.preferences?.currency || service.currency || 'usd';
        const userCurrency = bookingUser.preferences?.currency || 'usd';

        // Calculate quote amount
        let quoteItemsTotal = 0;
        const services = [];

        // Add quote items with currency conversion
        for (const item of quoteItems) {
            const totalPrice = item.price * (item.quantity || 1);
            quoteItemsTotal += totalPrice;

            const conversion = await CurrencyHelper.convertPrice(
                item.price,
                distributorCurrency,
                userCurrency
            );

            services.push({
                serviceId: booking.serviceId,
                item: item.name,
                description: item.description,
                quantity: item.quantity || 1,
                originalUnitPrice: item.price,
                originalCurrency: distributorCurrency,
                convertedUnitPrice: conversion.convertedPrice,
                convertedCurrency: userCurrency,
                totalPrice: conversion.convertedPrice * (item.quantity || 1)
            });
        }

        // Convert service price to user currency
        const serviceConversion = await CurrencyHelper.convertPrice(
            service.price,
            service.currency || 'usd',
            userCurrency
        );

        // Total in user currency
        const quoteItemsTotalInUserCurrency = services.reduce((sum, s) => sum + s.totalPrice, 0);
        const quoteAmount = serviceConversion.convertedPrice + quoteItemsTotalInUserCurrency;
        const platformFee = quoteAmount * CONSTANTS.PLATFORM_FEE_PERCENT;
        const amount = quoteAmount + platformFee;

        // Create quote
        const quote = new QuoteModel({
            bookingId: booking._id,
            services,
            status: 'pending',
            amount,
            platformFee,
            currency: userCurrency,
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
        console.log('Sending email to crew', bookingUser.email);

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
                <p>Platform Fee (5%): $${platformFee.toFixed(2)}</p>
                <p>Please review and accept or reject the quote.</p>
                <a href="${process.env.FRONTEND_URL}/crew/bookings/${booking._id}" style="display:inline-block;background-color:#4CAF50;color:white;padding:14px 20px;text-align:center;text-decoration:none;font-size:16px;margin:4px 2px;cursor:pointer;border-radius:4px;">
                    View Quote
                </a>
            `
        });

        return { booking, quote };
    }

    static async acceptQuote({ bookingId, userId }: { bookingId: string; userId: string }) {
        const booking = await BookingModel.findById(bookingId).populate('quoteId').populate('serviceId');
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

        const quote: any = booking.quoteId;
        const user = await UserModel.findById(userId);
        const userCurrency = user?.preferences?.currency || 'usd';
        const conversionTimestamp = new Date();

        // Lock conversion rates for all quote items
        for (const quoteService of quote.services) {
            if (!quoteService.conversionRate) {
                const conversion = await CurrencyHelper.convertPrice(
                    quoteService.originalUnitPrice,
                    quoteService.originalCurrency,
                    userCurrency
                );
                quoteService.conversionRate = conversion.conversionRate;
                quoteService.conversionTimestamp = conversionTimestamp;
            }
        }

        await quote.save();

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

        const bookingUser = await UserModel.findById(booking.userId);
        const distributor = await UserModel.findById(userId);
        const distributorCurrency = distributor?.preferences?.currency || item.originalCurrency || 'usd';
        const userCurrency = bookingUser?.preferences?.currency || item.convertedCurrency || 'usd';

        // Update item fields
        if (updatedItem.name) item.item = updatedItem.name;
        if (updatedItem.description !== undefined) item.description = updatedItem.description;
        if (updatedItem.quantity) item.quantity = updatedItem.quantity;

        if (updatedItem.price) {
            item.originalUnitPrice = updatedItem.price;
            item.originalCurrency = distributorCurrency;

            const conversion = await CurrencyHelper.convertPrice(
                updatedItem.price,
                distributorCurrency,
                userCurrency
            );
            item.convertedUnitPrice = conversion.convertedPrice;
            item.convertedCurrency = userCurrency;
        }

        // Recalculate total price
        item.totalPrice = item.quantity * item.convertedUnitPrice;

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

        const serviceConversion = await CurrencyHelper.convertPrice(
            service.price,
            service.currency || 'usd',
            userCurrency
        );

        const quoteAmount = serviceConversion.convertedPrice + quoteItemsTotal;
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

    static async createBookingPayment({ bookingId, userId }: { bookingId: string; userId: string }) {
        const booking = await BookingModel.findById(bookingId)
            .populate('serviceId')
            .populate('quoteId')
            .populate('businessId');

        if (!booking) throw new Error('Booking not found');
        if (booking.userId.toString() !== userId) throw new Error('Unauthorized: This booking does not belong to you');

        if (booking.status !== 'confirmed') {
            throw new Error('Booking must be confirmed before payment');
        }

        if (booking.paymentStatus === 'paid') {
            throw new Error('This booking has already been fully paid');
        }

        if (booking.requiresQuote && booking.quoteStatus !== 'accepted') {
            throw new Error('Quote must be accepted before payment');
        }

        // Check if deposit invoice already exists and is valid
        if (booking.stripeInvoiceId) {
            const stripe = StripeService.getInstance();
            try {
                const existingInvoice = await stripe.getInvoice(booking.stripeInvoiceId);
                if (existingInvoice.status !== 'void' && existingInvoice.status !== 'uncollectible') {
                    return {
                        invoiceUrl: existingInvoice.hosted_invoice_url,
                        invoiceId: existingInvoice.id,
                        status: existingInvoice.status,
                        invoiceType: 'deposit'
                    };
                }
            } catch (error) {
                logError({ message: 'Existing invoice retrieval failed, will create new invoice', error, source: 'BookingService.createBookingPayment' });
            }
        }

        const user = await UserModel.findById(userId);
        if (!user) throw new Error('User not found');

        const service: any = booking.serviceId;
        if (!service) throw new Error('Service not found');

        const business: any = booking.businessId;
        if (!business) throw new Error('Business not found');

        if (!business.stripeAccountId) {
            throw new Error('Distributor has not set up payment processing. Please contact support.');
        }

        const stripe = StripeService.getInstance();
        const userCurrency = booking.currency || 'usd';
        const conversionTimestamp = new Date();

        let stripeCustomerId = user.stripeCustomerId;
        if (!stripeCustomerId) {
            const customers = await stripe.listCustomers({ email: user.email, limit: 1 });
            if (customers.data.length > 0) {
                stripeCustomerId = customers.data[0].id;
            } else {
                const customer = await stripe.createCustomer({
                    email: user.email,
                    name: `${user.firstName} ${user.lastName}`
                });
                stripeCustomerId = customer.id;
            }
            user.stripeCustomerId = stripeCustomerId;
            await user.save();
        } else {
            try {
                const customer = await stripe.retrieveCustomer(stripeCustomerId);
                if (!customer) {
                    const customer = await stripe.createCustomer({
                        email: user.email,
                        name: `${user.firstName} ${user.lastName}`
                    });
                    stripeCustomerId = customer.id;
                    user.stripeCustomerId = stripeCustomerId;
                    await user.save();
                }
            } catch (error) {
                const customer = await stripe.createCustomer({
                    email: user.email,
                    name: `${user.firstName} ${user.lastName}`
                });
                stripeCustomerId = customer.id;
                user.stripeCustomerId = stripeCustomerId;
                await user.save();
            }
        }

        const invoice = await stripe.createinvoices({
            customer: stripeCustomerId,
            collection_method: 'send_invoice',
            days_until_due: 7,
            metadata: {
                bookingId: booking._id.toString(),
                userId: user._id.toString(),
                serviceId: service._id.toString(),
                businessId: business._id.toString(),
                customerEmail: user.email,
                transactionType: 'booking',
                invoiceType: 'deposit'
            }
        });

        let totalAmountInUserCurrency = 0;
        const businessOwner = await UserModel.findById(business.userId);
        const distributorCurrency = businessOwner?.preferences?.currency || service.currency || 'usd';

        if (booking.requiresQuote && booking.quoteId) {
            const quote: any = booking.quoteId;

            for (const quoteService of quote.services) {
                const itemTotal = quoteService.convertedUnitPrice * quoteService.quantity;
                totalAmountInUserCurrency += itemTotal;

                await stripe.createInvoiceItems({
                    customer: stripeCustomerId,
                    invoice: invoice.id,
                    amount: Math.round(itemTotal * 100),
                    currency: userCurrency.toLowerCase(),
                    description: `${quoteService.item}${quoteService.description ? ` - ${quoteService.description}` : ''}`,
                    metadata: {
                        bookingId: booking._id.toString(),
                        quoteItemId: quoteService._id.toString(),
                        type: 'quote_item',
                        lockedConversionRate: quoteService.conversionRate?.toString() || '1',
                        lockedAt: quoteService.conversionTimestamp?.toISOString() || new Date().toISOString()
                    }
                });
            }

            const serviceConversion = await CurrencyHelper.convertPrice(
                service.price,
                service.currency || 'usd',
                userCurrency
            );
            totalAmountInUserCurrency += serviceConversion.convertedPrice;

            await stripe.createInvoiceItems({
                customer: stripeCustomerId,
                invoice: invoice.id,
                amount: Math.round(serviceConversion.convertedPrice * 100),
                currency: userCurrency.toLowerCase(),
                description: `${service.name} - Base Service`,
                metadata: {
                    bookingId: booking._id.toString(),
                    serviceId: service._id.toString(),
                    businessId: business._id.toString(),
                    type: 'service_fee'
                }
            });
        } else {
            const serviceConversion = await CurrencyHelper.convertPrice(
                service.price,
                service.currency || 'usd',
                userCurrency
            );
            totalAmountInUserCurrency = serviceConversion.convertedPrice;

            await stripe.createInvoiceItems({
                customer: stripeCustomerId,
                invoice: invoice.id,
                amount: Math.round(serviceConversion.convertedPrice * 100),
                currency: userCurrency.toLowerCase(),
                description: service.name,
                metadata: {
                    bookingId: booking._id.toString(),
                    serviceId: service._id.toString(),
                    businessId: business._id.toString(),
                    type: 'service_fee'
                }
            });
        }

        const conversionRate = await CurrencyHelper.convertPrice(
            totalAmountInUserCurrency,
            userCurrency,
            distributorCurrency
        );

        booking.originalAmount = service.price;
        booking.originalCurrency = service.currency || 'usd';
        booking.convertedAmount = totalAmountInUserCurrency;
        booking.convertedCurrency = userCurrency;
        booking.conversionRate = conversionRate.conversionRate;
        booking.conversionTimestamp = conversionTimestamp;
        booking.distributorPayoutAmount = conversionRate.convertedPrice;
        booking.distributorPayoutCurrency = distributorCurrency;
        booking.totalAmount = totalAmountInUserCurrency;

        const platformFee = totalAmountInUserCurrency * CONSTANTS.PLATFORM_FEE_PERCENT;
        booking.platformFee = platformFee;

        await stripe.createInvoiceItems({
            customer: stripeCustomerId,
            invoice: invoice.id,
            amount: Math.round(platformFee * 100),
            currency: userCurrency.toLowerCase(),
            description: 'Platform Fee (10%)',
            metadata: {
                bookingId: booking._id.toString(),
                type: 'platform_fee'
            }
        });

        // Apply 50% discount for deposit
        const totalWithFee = totalAmountInUserCurrency + platformFee;
        const depositAmount = totalWithFee * 0.5;
        const discountAmount = totalWithFee - depositAmount;

        await stripe.createInvoiceItems({
            customer: stripeCustomerId,
            invoice: invoice.id,
            amount: -Math.round(discountAmount * 100),
            currency: userCurrency.toLowerCase(),
            description: '50% Deposit (Balance due on completion)',
            metadata: {
                bookingId: booking._id.toString(),
                type: 'deposit_discount'
            }
        });

        const finalizedInvoice = await stripe.finalizeInvoice(invoice.id);

        booking.stripeInvoiceUrl = finalizedInvoice.hosted_invoice_url || undefined;
        booking.stripeInvoiceId = invoice.id;
        await booking.save();

        await stripe.sendInvoice(invoice.id);

        const totalAmount = finalizedInvoice.amount_due / 100;
        const distributorAmount = totalAmount - (platformFee * 0.5);

        try {
            const invoiceRecord = await InvoiceModel.create({
                stripeInvoiceId: invoice.id,
                userId: user._id,
                bookingId: booking._id,
                businessIds: [business._id],
                invoiceType: 'deposit',
                originalAmount: booking.originalAmount || totalAmount,
                originalCurrency: booking.originalCurrency || userCurrency,
                convertedAmount: totalAmount,
                convertedCurrency: userCurrency,
                conversionRate: booking.conversionRate || 1,
                conversionTimestamp: booking.conversionTimestamp || new Date(),
                amount: totalAmount,
                platformFee: platformFee * 0.5,
                distributorAmount,
                currency: userCurrency,
                status: 'pending',
                invoiceDate: new Date(),
                dueDate: finalizedInvoice.due_date ? new Date(finalizedInvoice.due_date * 1000) : null,
                stripeInvoiceUrl: finalizedInvoice.hosted_invoice_url
            });

            booking.depositInvoiceId = invoiceRecord._id as any;
            await booking.save();
        } catch (error) {
            logError({ message: 'Invoice record creation failed', error, source: 'BookingService.createBookingPayment' });
        }

        await addNotificationJob({
            recipientId: user._id,
            type: 'booking',
            priority: 'high',
            title: '50% Deposit Invoice Ready',
            message: `Your 50% deposit invoice for ${service.name} is ready. Balance will be due on completion.`,
            data: { bookingId: booking._id, invoiceId: invoice.id }
        });

        return {
            invoiceUrl: finalizedInvoice.hosted_invoice_url,
            invoiceId: invoice.id,
            status: 'pending',
            dueDate: finalizedInvoice.due_date,
            amount: finalizedInvoice.amount_due / 100,
            invoiceType: 'deposit'
        };
    }

    static async createBalancePayment({ bookingId, userId }: { bookingId: string; userId: string }) {
        const booking = await BookingModel.findById(bookingId)
            .populate('serviceId')
            .populate('quoteId')
            .populate('businessId');

        if (!booking) throw new Error('Booking not found');
        if (booking.userId.toString() !== userId) throw new Error('Unauthorized: This booking does not belong to you');

        if (booking.paymentStatus !== 'deposit_paid') {
            throw new Error('Deposit must be paid before requesting balance invoice');
        }

        if (!['confirmed', 'completed'].includes(booking.status)) {
            throw new Error('Booking must be confirmed before balance payment');
        }

        if (booking.balanceInvoiceId) {
            const existingInvoice = await InvoiceModel.findById(booking.balanceInvoiceId);
            if (existingInvoice && existingInvoice.status !== 'cancelled') {
                const stripe = StripeService.getInstance();
                try {
                    const stripeInvoice = await stripe.getInvoice(existingInvoice.stripeInvoiceId);
                    if (stripeInvoice.status !== 'void' && stripeInvoice.status !== 'uncollectible') {
                        return {
                            invoiceUrl: stripeInvoice.hosted_invoice_url,
                            invoiceId: stripeInvoice.id,
                            status: stripeInvoice.status,
                            invoiceType: 'balance'
                        };
                    }
                } catch (error) {
                    logError({ message: 'Existing balance invoice retrieval failed, will create new invoice', error, source: 'BookingService.createBalancePayment' });
                }
            }
        }

        const user = await UserModel.findById(userId);
        if (!user) throw new Error('User not found');

        const service: any = booking.serviceId;
        const business: any = booking.businessId;
        const stripe = StripeService.getInstance();
        const userCurrency = booking.currency || 'usd';

        let stripeCustomerId = user.stripeCustomerId;
        if (!stripeCustomerId) throw new Error('Customer not found in Stripe');

        const invoice = await stripe.createinvoices({
            customer: stripeCustomerId,
            collection_method: 'send_invoice',
            days_until_due: 3,
            metadata: {
                bookingId: booking._id.toString(),
                userId: user._id.toString(),
                serviceId: service._id.toString(),
                businessId: business._id.toString(),
                customerEmail: user.email,
                transactionType: 'booking',
                invoiceType: 'balance'
            }
        });

        const totalAmount = booking.totalAmount || 0;
        const platformFee = booking.platformFee || 0;
        const balanceAmount = (totalAmount + platformFee) * 0.5;

        await stripe.createInvoiceItems({
            customer: stripeCustomerId,
            invoice: invoice.id,
            amount: Math.round(balanceAmount * 100),
            currency: userCurrency.toLowerCase(),
            description: `${service.name} - Balance Payment (50%)`,
            metadata: {
                bookingId: booking._id.toString(),
                type: 'balance_payment'
            }
        });

        const finalizedInvoice = await stripe.finalizeInvoice(invoice.id);
        await stripe.sendInvoice(invoice.id);

        const balancePlatformFee = platformFee * 0.5;
        const distributorAmount = balanceAmount - balancePlatformFee;

        const invoiceRecord = await InvoiceModel.create({
            stripeInvoiceId: invoice.id,
            userId: user._id,
            bookingId: booking._id,
            businessIds: [business._id],
            invoiceType: 'balance',
            originalAmount: balanceAmount,
            originalCurrency: userCurrency,
            convertedAmount: balanceAmount,
            convertedCurrency: userCurrency,
            conversionRate: 1,
            conversionTimestamp: new Date(),
            amount: balanceAmount,
            platformFee: balancePlatformFee,
            distributorAmount,
            currency: userCurrency,
            status: 'pending',
            invoiceDate: new Date(),
            dueDate: finalizedInvoice.due_date ? new Date(finalizedInvoice.due_date * 1000) : null,
            stripeInvoiceUrl: finalizedInvoice.hosted_invoice_url
        });

        booking.balanceInvoiceId = invoiceRecord._id as any;
        booking.status = "completed"
        await booking.save();

        await addNotificationJob({
            recipientId: user._id,
            type: 'booking',
            priority: 'high',
            title: 'Balance Payment Due',
            message: `Your service is complete! Please pay the remaining 50% balance for ${service.name}.`,
            data: { bookingId: booking._id, invoiceId: invoice.id }
        });

        return {
            invoiceUrl: finalizedInvoice.hosted_invoice_url,
            invoiceId: invoice.id,
            status: 'pending',
            dueDate: finalizedInvoice.due_date,
            amount: finalizedInvoice.amount_due / 100,
            invoiceType: 'balance'
        };
    }

    static async updateCompletedStatus({ bookingId, userId, userRole, completedStatus, rejectionReason }: {
        bookingId: string;
        userId: string;
        userRole: string;
        completedStatus: 'pending' | 'request_completed' | 'completed' | 'rejected';
        rejectionReason?: string;
    }) {
        const booking = await BookingModel.findById(bookingId).populate('userId businessId serviceId');

        if (!booking) {
            throw new Error('Booking not found');
        }

        // Verify access - user role is 'user' for crew members, not 'crew'
        if (userRole === 'user' && (booking.userId as any)?._id?.toString() !== userId) {
            throw new Error('Unauthorized: You can only update your own bookings');
        }

        // For distributors, they should only be able to update bookings for their business
        // The middleware ensures they're authenticated, and the business relationship is validated through the booking
        if (userRole === 'distributor' && !booking.businessId) {
            throw new Error('Booking has no associated business');
        }

        // Validate status transitions
        if (userRole === 'distributor') {
            if (completedStatus !== 'request_completed') {
                throw new Error('Distributors can only mark service as completed (pending/rejected → request_completed)');
            }
            if (booking.completedStatus !== 'pending' && booking.completedStatus !== 'rejected') {
                throw new Error('Can only mark as completed from pending or rejected status');
            }
            if (booking.paymentStatus !== 'deposit_paid') {
                throw new Error('Deposit must be paid before marking service as done');
            }
        } else if (userRole === 'user') {
            // User/Crew can change from request_completed to completed or rejected
            if (booking.completedStatus !== 'request_completed') {
                throw new Error('Can only confirm or reject completion after distributor marks service as done');
            }
            if (completedStatus !== 'completed' && completedStatus !== 'rejected') {
                throw new Error('You can only confirm completion or reject (request_completed → completed/rejected)');
            }
            // Require rejection reason if rejecting
            if (completedStatus === 'rejected' && (!rejectionReason || !rejectionReason.trim())) {
                throw new Error('Rejection reason is required when rejecting completion');
            }
        } else {
            throw new Error('Invalid user role for this operation');
        }

        booking.completedStatus = completedStatus;

        if (completedStatus === 'rejected' && rejectionReason) {
            booking.completedRejectionReason = rejectionReason.trim();
        }

        if (completedStatus === 'completed') {
            booking.status = 'completed';
            booking.completedAt = new Date();
        }

        await booking.save();

        if (completedStatus === 'request_completed') {
            await addNotificationJob({
                recipientId: (booking.userId as any)._id,
                type: 'booking',
                priority: 'high',
                title: 'Service Completed - Balance Payment Due',
                message: `${(booking.businessId as any).businessName} has completed your service. Please pay the remaining 50% balance and confirm receipt.`,
                data: { bookingId: booking._id }
            });
        } else if (completedStatus === 'completed') {
            await addNotificationJob({
                recipientId: (booking.businessId as any)._id,
                type: 'booking',
                priority: 'medium',
                title: 'Booking Completed',
                message: `${(booking.userId as any).firstName} has confirmed completion of the booking.`,
                data: { bookingId: booking._id }
            });
        } else if (completedStatus === 'rejected') {
            // Notify distributor that user has rejected completion
            await addNotificationJob({
                recipientId: (booking.businessId as any)._id,
                type: 'booking',
                priority: 'high',
                title: 'Service Completion Rejected',
                message: `${(booking.userId as any).firstName} has rejected the service completion. Reason: ${rejectionReason}`,
                data: { bookingId: booking._id }
            });
        }

        return booking;
    }
} 