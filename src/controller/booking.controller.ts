import { ICreateBookingInput } from "../dto/booking.dto";
import { AuthenticatedRequest } from "../middleware";
import { Response } from "express";
import Validate from "../utils/Validate";
import { DateTime } from 'luxon';
import { BookingService } from "../service/booking.service";
import catchError from "../utils/catchError";
import { logError } from "../utils/SystemLogs";

export class BookingController {

    static async createBooking(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
                return;
            }
            const { serviceId, serviceLocation, dateTime, notes, contact }: ICreateBookingInput = req.body;
            const attachments = (req.files as any)?.attachments?.map((file: any) => file.location) || [];

            if (!Validate.mongoId(serviceId)) {
                res.status(400).json({ success: false, message: 'Invalid service id', code: 'INVALID_SERVICE_ID' });
                return;
            }
            if (!DateTime.fromISO(dateTime).isValid) {
                res.status(400).json({ success: false, message: 'Invalid service date and time.', code: 'INVALID_DATE' });
                return;
            }
            if (!serviceLocation || !serviceLocation.street || !serviceLocation.city || !serviceLocation.state || !serviceLocation.zip || !serviceLocation.country) {
                res.status(400).json({ success: false, message: 'Invalid service location', code: 'INVALID_LOCATION' });
                return;
            }

            // Get businessId from serviceId
            const ServiceModel = (await import('../models/service.model')).default;
            const service = await ServiceModel.findById(serviceId);
            if (!service || !service.businessId) {
                res.status(404).json({ success: false, message: 'Service not found or has no associated business', code: 'SERVICE_NOT_FOUND' });
                return;
            }

            // Parse dateTime to bookingDate and startTime
            const parsedDateTime = new Date(dateTime);
            const bookingDate = new Date(parsedDateTime.getFullYear(), parsedDateTime.getMonth(), parsedDateTime.getDate());
            const startTime = parsedDateTime;

            const [error, result] = await catchError(BookingService.createBooking({
                userId: req.user._id.toString(),
                businessId: service.businessId.toString(),
                serviceId,
                serviceLocation,
                bookingDate,
                startTime,
                customerEmail: contact?.email,
                customerPhone: contact?.phone,
                notes,
                attachments
            }));

            if (error) {
                logError({ message: "Creating a booking failed!", source: "BookingController.createBooking", error });
                res.status(500).json({ success: false, message: error.message || 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
                return;
            }

            return res.status(201).json({ success: true, message: 'Booking created successfully', code: 'BOOKING_CREATED', data: result });
        } catch (error) {
            logError({ message: "Creating a booking failed!", source: "BookingController.createBooking", error });
            return res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
        }
    }
    static async confirmBooking(req: AuthenticatedRequest, res: Response) {
        try {
            const { token } = req.params;

            if (!Validate.string(token)) {
                res.status(400).json({ success: false, message: 'Invalid token', code: 'INVALID_TOKEN' });
                return;
            }

            const [error, result] = await catchError(BookingService.confirmBooking(token));
            if (error) {
                logError({ message: "Confirming a booking failed!", source: "BookingController.confirmBooking", error });
                res.status(500).json({ success: false, message: error.message || 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
                return;
            }
            res.status(200).json({ success: true, message: 'Booking confirmed successfully', code: 'BOOKING_CONFIRMED', data: result });
        } catch (error) {
            logError({ message: "Confirming a booking failed!", source: "BookingController.confirmBooking", error });
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
        }
    }
    static async updateBookingStatus(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
                return;
            }

            const { id } = req.params;
            const { status, reason, notes, quoteItems } = req.body;

            if (!Validate.mongoId(id)) {
                res.status(400).json({ success: false, message: 'Invalid booking id', code: 'INVALID_BOOKING_ID' });
                return;
            }

            if (!status || !['pending', 'confirmed', 'cancelled', 'completed', 'declined'].includes(status)) {
                res.status(400).json({ success: false, message: 'Invalid status', code: 'INVALID_STATUS' });
                return;
            }

            const [error, result] = await catchError(BookingService.updateBookingStatus({
                bookingId: id,
                userId: req.user._id.toString(),
                userRole: req.user.role,
                status,
                reason,
                notes,
                quoteItems
            }));

            if (error) {
                logError({ message: "Updating booking status failed!", source: "BookingController.updateBookingStatus", error });
                res.status(400).json({ success: false, message: error.message || 'Failed to update booking status', code: 'UPDATE_FAILED' });
                return;
            }

            res.status(200).json({ success: true, message: 'Booking status updated successfully', code: 'STATUS_UPDATED', data: result });
        } catch (error) {
            logError({ message: "Updating booking status failed!", source: "BookingController.updateBookingStatus", error });
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERyNAL_SERVER_ERROR' });
        }
    }
    static async getBookings(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
                return;
            }

            const { status, paymentStatus, startDate, endDate, page, limit, sortBy, sortOrder } = req.query;

            if(status && !['pending', 'confirmed', 'cancelled', 'completed', 'declined'].includes(status as string)){
                res.status(400).json({ success: false, message: 'Status must be one of: pending, confirmed, cancelled, completed, declined', code: 'INVALID_STATUS' });
                return;
            }

            if(startDate && !DateTime.fromISO(startDate as string).isValid){
                res.status(400).json({ success: false, message: 'Invalid start date format', code: 'INVALID_START_DATE' });
                return;
            }

            if(endDate && !DateTime.fromISO(endDate as string).isValid){
                res.status(400).json({ success: false, message: 'Invalid end date format', code: 'INVALID_END_DATE' });
                return;
            }

            if(startDate && endDate && DateTime.fromISO(startDate as string) > DateTime.fromISO(endDate as string)){
                res.status(400).json({ success: false, message: 'Start date must be before end date', code: 'INVALID_DATE_RANGE' });
                return;
            }

            if(sortBy && !['createdAt', 'status', 'paymentStatus', 'vendorName'].includes(sortBy as string)){
                res.status(400).json({ success: false, message: 'Sort by field must be one of: createdAt, status, paymentStatus, vendorName', code: 'INVALID_SORTBY' });
                return;
            }

            if(sortOrder && !['asc', 'desc'].includes(sortOrder as string)){
                res.status(400).json({ success: false, message: 'Sort order must be either asc or desc', code: 'INVALID_SORTORDER' });
                return;
            }

            const [error, result] = await catchError(BookingService.getBookings({
                userId: req.user._id.toString(),
                role: req.user.role,
                page: page ? parseInt(page as string) : undefined,
                limit: limit ? parseInt(limit as string) : undefined,
                status: status as string,
                paymentStatus: paymentStatus as string,
                startDate: startDate ? new Date(startDate as string) : undefined,
                endDate: endDate ? new Date(endDate as string) : undefined,
                sortBy: sortBy as string,
                sortOrder: sortOrder as string
            }));

            if (error) {
                logError({ message: "Fetching bookings failed!", source: "BookingController.getBookings", error });
                res.status(500).json({ success: false, message: error.message || 'Failed to fetch bookings', code: 'FETCH_FAILED' });
                return;
            }

            res.status(200).json({ success: true, message: 'Bookings fetched successfully', data: result?.bookings, pagination: result?.pagination });
        } catch (error) {
            logError({ message: "Fetching bookings failed!", source: "BookingController.getBookings", error });
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
        }
    }
    static async getBookingById(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
                return;
            }

            const { id } = req.params;

            if (!Validate.mongoId(id)) {
                res.status(400).json({ success: false, message: 'Invalid booking id', code: 'INVALID_BOOKING_ID' });
                return;
            }

            const [error, result] = await catchError(BookingService.getBookingById(id));

            if (error) {
                logError({ message: "Fetching booking by id failed!", source: "BookingController.getBookingById", error });
                res.status(500).json({ success: false, message: error.message || 'Failed to fetch booking', code: 'FETCH_FAILED' });
                return;
            }

            res.status(200).json({ success: true, message: 'Booking fetched successfully', data: result });
        } catch (error) {
            logError({ message: "Fetching booking by id failed!", source: "BookingController.getBookingById", error });
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
        }
    }

    static async addQuotes(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
                return;
            }

            const { id } = req.params;
            const { quoteItems } = req.body;

            if (!Validate.mongoId(id)) {
                res.status(400).json({ success: false, message: 'Invalid booking id', code: 'INVALID_BOOKING_ID' });
                return;
            }

            if (!quoteItems || !Array.isArray(quoteItems) || quoteItems.length === 0) {
                res.status(400).json({ success: false, message: 'Quote items are required', code: 'INVALID_QUOTE_ITEMS' });
                return;
            }

            const [error, result] = await catchError(BookingService.addQuotesToBooking({
                bookingId: id,
                userId: req.user._id.toString(),
                userRole: req.user.role,
                quoteItems
            }));

            if (error) {
                logError({ message: "Adding quotes failed!", source: "BookingController.addQuotes", error });
                res.status(400).json({ success: false, message: error.message || 'Failed to add quotes', code: 'ADD_QUOTES_FAILED' });
                return;
            }

            res.status(200).json({ success: true, message: 'Quotes added successfully', data: result });
        } catch (error) {
            logError({ message: "Adding quotes failed!", source: "BookingController.addQuotes", error });
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
        }
    }

    static async acceptQuote(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
                return;
            }

            const { id } = req.params;

            if (!Validate.mongoId(id)) {
                res.status(400).json({ success: false, message: 'Invalid booking id', code: 'INVALID_BOOKING_ID' });
                return;
            }

            const [error, result] = await catchError(BookingService.acceptQuote({
                bookingId: id,
                userId: req.user._id.toString()
            }));

            if (error) {
                logError({ message: "Accepting quote failed!", source: "BookingController.acceptQuote", error });
                res.status(400).json({ success: false, message: error.message || 'Failed to accept quote', code: 'ACCEPT_QUOTE_FAILED' });
                return;
            }

            res.status(200).json({ success: true, message: 'Quote accepted successfully', data: result });
        } catch (error) {
            logError({ message: "Accepting quote failed!", source: "BookingController.acceptQuote", error });
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
        }
    }

    static async rejectQuote(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
                return;
            }

            const { id } = req.params;
            const { reason } = req.body;

            if (!Validate.mongoId(id)) {
                res.status(400).json({ success: false, message: 'Invalid booking id', code: 'INVALID_BOOKING_ID' });
                return;
            }

            const [error, result] = await catchError(BookingService.rejectQuote({
                bookingId: id,
                userId: req.user._id.toString(),
                reason
            }));

            if (error) {
                logError({ message: "Rejecting quote failed!", source: "BookingController.rejectQuote", error });
                res.status(400).json({ success: false, message: error.message || 'Failed to reject quote', code: 'REJECT_QUOTE_FAILED' });
                return;
            }

            res.status(200).json({ success: true, message: 'Quote rejected successfully', data: result });
        } catch (error) {
            logError({ message: "Rejecting quote failed!", source: "BookingController.rejectQuote", error });
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
        }
    }

    static async confirmCompletion(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
                return;
            }

            const { id } = req.params;

            if (!Validate.mongoId(id)) {
                res.status(400).json({ success: false, message: 'Invalid booking id', code: 'INVALID_BOOKING_ID' });
                return;
            }

            const [error, result] = await catchError(BookingService.confirmJobCompletion({
                bookingId: id,
                userId: req.user._id.toString()
            }));

            if (error) {
                logError({ message: "Confirming job completion failed!", source: "BookingController.confirmCompletion", error });
                res.status(400).json({ success: false, message: error.message || 'Failed to confirm job completion', code: 'CONFIRM_COMPLETION_FAILED' });
                return;
            }

            res.status(200).json({ success: true, message: 'Job completion confirmed successfully', data: result });
        } catch (error) {
            logError({ message: "Confirming job completion failed!", source: "BookingController.confirmCompletion", error });
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
        }
    }

    // ==================== GRANULAR QUOTE ITEM MANAGEMENT ====================

    static async acceptQuoteItem(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
                return;
            }

            const { id, itemId } = req.params;

            if (!Validate.mongoId(id) || !Validate.mongoId(itemId)) {
                res.status(400).json({ success: false, message: 'Invalid ID', code: 'INVALID_ID' });
                return;
            }

            const [error, result] = await catchError(BookingService.acceptQuoteItem({
                bookingId: id,
                itemId,
                userId: req.user._id.toString()
            }));

            if (error) {
                logError({ message: "Accepting quote item failed!", source: "BookingController.acceptQuoteItem", error });
                res.status(400).json({ success: false, message: error.message || 'Failed to accept quote item', code: 'ACCEPT_ITEM_FAILED' });
                return;
            }

            res.status(200).json({ success: true, message: 'Quote item accepted successfully', data: result });
        } catch (error) {
            logError({ message: "Accepting quote item failed!", source: "BookingController.acceptQuoteItem", error });
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
        }
    }

    static async rejectQuoteItem(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
                return;
            }

            const { id, itemId } = req.params;
            const { reason } = req.body;

            if (!Validate.mongoId(id) || !Validate.mongoId(itemId)) {
                res.status(400).json({ success: false, message: 'Invalid ID', code: 'INVALID_ID' });
                return;
            }

            const [error, result] = await catchError(BookingService.rejectQuoteItem({
                bookingId: id,
                itemId,
                userId: req.user._id.toString(),
                reason
            }));

            if (error) {
                logError({ message: "Rejecting quote item failed!", source: "BookingController.rejectQuoteItem", error });
                res.status(400).json({ success: false, message: error.message || 'Failed to reject quote item', code: 'REJECT_ITEM_FAILED' });
                return;
            }

            res.status(200).json({ success: true, message: 'Quote item rejected successfully', data: result });
        } catch (error) {
            logError({ message: "Rejecting quote item failed!", source: "BookingController.rejectQuoteItem", error });
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
        }
    }

    static async requestQuoteItemEdit(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
                return;
            }

            const { id, itemId } = req.params;
            const { reason } = req.body;

            if (!Validate.mongoId(id) || !Validate.mongoId(itemId)) {
                res.status(400).json({ success: false, message: 'Invalid ID', code: 'INVALID_ID' });
                return;
            }

            if (!reason || !reason.trim()) {
                res.status(400).json({ success: false, message: 'Edit reason is required', code: 'REASON_REQUIRED' });
                return;
            }

            const [error, result] = await catchError(BookingService.requestQuoteItemEdit({
                bookingId: id,
                itemId,
                userId: req.user._id.toString(),
                reason: reason.trim()
            }));

            if (error) {
                logError({ message: "Requesting quote item edit failed!", source: "BookingController.requestQuoteItemEdit", error });
                res.status(400).json({ success: false, message: error.message || 'Failed to request edit', code: 'REQUEST_EDIT_FAILED' });
                return;
            }

            res.status(200).json({ success: true, message: 'Edit request submitted successfully', data: result });
        } catch (error) {
            logError({ message: "Requesting quote item edit failed!", source: "BookingController.requestQuoteItemEdit", error });
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
        }
    }

    static async acceptAllQuoteItems(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
                return;
            }

            const { id } = req.params;

            if (!Validate.mongoId(id)) {
                res.status(400).json({ success: false, message: 'Invalid booking ID', code: 'INVALID_ID' });
                return;
            }

            const [error, result] = await catchError(BookingService.acceptAllQuoteItems({
                bookingId: id,
                userId: req.user._id.toString()
            }));

            if (error) {
                logError({ message: "Accepting all quote items failed!", source: "BookingController.acceptAllQuoteItems", error });
                res.status(400).json({ success: false, message: error.message || 'Failed to accept all items', code: 'ACCEPT_ALL_FAILED' });
                return;
            }

            res.status(200).json({ success: true, message: 'All quote items accepted successfully', data: result });
        } catch (error) {
            logError({ message: "Accepting all quote items failed!", source: "BookingController.acceptAllQuoteItems", error });
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
        }
    }

    static async rejectAllQuoteItems(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
                return;
            }

            const { id } = req.params;
            const { reason } = req.body;

            if (!Validate.mongoId(id)) {
                res.status(400).json({ success: false, message: 'Invalid booking ID', code: 'INVALID_ID' });
                return;
            }

            const [error, result] = await catchError(BookingService.rejectAllQuoteItems({
                bookingId: id,
                userId: req.user._id.toString(),
                reason
            }));

            if (error) {
                logError({ message: "Rejecting all quote items failed!", source: "BookingController.rejectAllQuoteItems", error });
                res.status(400).json({ success: false, message: error.message || 'Failed to reject all items', code: 'REJECT_ALL_FAILED' });
                return;
            }

            res.status(200).json({ success: true, message: 'All quote items rejected successfully', data: result });
        } catch (error) {
            logError({ message: "Rejecting all quote items failed!", source: "BookingController.rejectAllQuoteItems", error });
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
        }
    }

    static async updateQuoteItem(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
                return;
            }

            const { id, itemId } = req.params;
            const { name, description, quantity, price } = req.body;

            if (!Validate.mongoId(id) || !Validate.mongoId(itemId)) {
                res.status(400).json({ success: false, message: 'Invalid ID', code: 'INVALID_ID' });
                return;
            }

            const [error, result] = await catchError(BookingService.updateQuoteItem({
                bookingId: id,
                itemId,
                userId: req.user._id.toString(),
                userRole: req.user.role,
                updatedItem: { name, description, quantity, price }
            }));

            if (error) {
                logError({ message: "Updating quote item failed!", source: "BookingController.updateQuoteItem", error });
                res.status(400).json({ success: false, message: error.message || 'Failed to update quote item', code: 'UPDATE_ITEM_FAILED' });
                return;
            }

            res.status(200).json({ success: true, message: 'Quote item updated successfully', data: result });
        } catch (error) {
            logError({ message: "Updating quote item failed!", source: "BookingController.updateQuoteItem", error });
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
        }
    }

    static async deleteQuoteItem(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
                return;
            }

            const { id, itemId } = req.params;

            if (!Validate.mongoId(id) || !Validate.mongoId(itemId)) {
                res.status(400).json({ success: false, message: 'Invalid ID', code: 'INVALID_ID' });
                return;
            }

            const [error, result] = await catchError(BookingService.deleteQuoteItem({
                bookingId: id,
                itemId,
                userId: req.user._id.toString(),
                userRole: req.user.role
            }));

            if (error) {
                logError({ message: "Deleting quote item failed!", source: "BookingController.deleteQuoteItem", error });
                res.status(400).json({ success: false, message: error.message || 'Failed to delete quote item', code: 'DELETE_ITEM_FAILED' });
                return;
            }

            res.status(200).json({ success: true, message: 'Quote item deleted successfully', data: result });
        } catch (error) {
            logError({ message: "Deleting quote item failed!", source: "BookingController.deleteQuoteItem", error });
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
        }
    }

    // ==================== PAYMENT INTEGRATION ====================

    static async createPayment(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
                return;
            }

            const { id } = req.params;

            if (!Validate.mongoId(id)) {
                res.status(400).json({ success: false, message: 'Invalid booking ID', code: 'INVALID_BOOKING_ID' });
                return;
            }

            const [error, result] = await catchError(BookingService.createBookingPayment({
                bookingId: id,
                userId: req.user._id.toString()
            }));

            if (error) {
                logError({ message: "Creating booking payment failed!", source: "BookingController.createPayment", error });
                res.status(400).json({ success: false, message: error.message || 'Failed to create payment', code: 'PAYMENT_CREATION_FAILED' });
                return;
            }

            res.status(200).json({ 
                success: true, 
                message: 'Payment invoice created successfully', 
                data: result 
            });
        } catch (error) {
            logError({ message: "Creating booking payment failed!", source: "BookingController.createPayment", error });
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
        }
    }

    static async updateCompletedStatus(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
                return;
            }

            const { id } = req.params;
            const { completedStatus, rejectionReason } = req.body;

            if (!Validate.mongoId(id)) {
                res.status(400).json({ success: false, message: 'Invalid booking id', code: 'INVALID_BOOKING_ID' });
                return;
            }

            if (!completedStatus || !['pending', 'request_completed', 'completed', 'rejected'].includes(completedStatus)) {
                res.status(400).json({ success: false, message: 'Invalid completed status', code: 'INVALID_COMPLETED_STATUS' });
                return;
            }

            const [error, result] = await catchError(BookingService.updateCompletedStatus({
                bookingId: id,
                userId: req.user._id.toString(),
                userRole: req.user.role,
                completedStatus,
                rejectionReason
            }));

            if (error) {
                logError({ message: "Updating completed status failed!", source: "BookingController.updateCompletedStatus", error });
                res.status(400).json({ success: false, message: error.message || 'Failed to update completed status', code: 'UPDATE_FAILED' });
                return;
            }

            res.status(200).json({ success: true, message: 'Completed status updated successfully', code: 'STATUS_UPDATED', data: result });
        } catch (error) {
            logError({ message: "Updating completed status failed!", source: "BookingController.updateCompletedStatus", error });
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
        }
    }
}