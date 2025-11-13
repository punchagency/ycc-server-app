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

            const [error, result] = await catchError(BookingService.createBooking({
                userId: req.user._id.toString(),
                serviceId,
                serviceLocation,
                dateTime,
                notes,
                contact,
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
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
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
}