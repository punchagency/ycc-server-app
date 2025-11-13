import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { Response } from "express";
import { logError } from "../utils/SystemLogs";
import { EventDto, UpdateEventDto, AddGuestsDto, RemoveGuestsDto } from "../dto/event.dto";
import { EventService } from "../service/event.service";
import Validate from "../utils/Validate";

export class EventController {
    static async createEvent(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
                return;
            }

            const { title, start, end, allDay, type, guestEmails }: EventDto = req.body;

            if (!title || !Validate.string(title)) {
                res.status(400).json({ success: false, message: 'Valid title is required', code: 'VALIDATION_ERROR' });
                return;
            }

            if (!start || !Validate.date(new Date(start).toISOString().split('T')[0])) {
                res.status(400).json({ success: false, message: 'Valid start date is required', code: 'VALIDATION_ERROR' });
                return;
            }

            if (!end || !Validate.date(new Date(end).toISOString().split('T')[0])) {
                res.status(400).json({ success: false, message: 'Valid end date is required', code: 'VALIDATION_ERROR' });
                return;
            }

            if (new Date(start) >= new Date(end)) {
                res.status(400).json({ success: false, message: 'End date must be after start date', code: 'VALIDATION_ERROR' });
                return;
            }

            if (!Validate.oneOf({ value: type, allowedValues: ['personal', 'work', 'reminder', 'holiday', 'booking'] })) {
                res.status(400).json({ success: false, message: 'Valid event type is required', code: 'VALIDATION_ERROR' });
                return;
            }

            if (typeof allDay !== 'boolean') {
                res.status(400).json({ success: false, message: 'allDay must be a boolean', code: 'VALIDATION_ERROR' });
                return;
            }

            if (guestEmails && guestEmails.length > 0) {
                if (!Validate.arrayOf(guestEmails, Validate.email)) {
                    res.status(400).json({ success: false, message: 'All guest emails must be valid', code: 'VALIDATION_ERROR' });
                    return;
                }
            }

            const result = await EventService.createEvent(req.user._id, req.body);

            if (result.success) {
                res.status(201).json({
                    success: true,
                    message: 'Event created successfully',
                    data: { event: result.event }
                });
            } else {
                res.status(400).json({ success: false, message: result.error });
            }
        } catch (error) {
            logError({ message: "Creating an event failed!", source: "EventController.createEvent", error });
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
        }
    }

    static async updateEvent(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
                return;
            }

            const { eventId } = req.params;
            const updateData: UpdateEventDto = req.body;

            if (!eventId || !Validate.mongoId(eventId)) {
                res.status(400).json({ success: false, message: 'Valid event ID is required', code: 'VALIDATION_ERROR' });
                return;
            }

            if (updateData.title && !Validate.string(updateData.title)) {
                res.status(400).json({ success: false, message: 'Valid title is required', code: 'VALIDATION_ERROR' });
                return;
            }

            if (updateData.start && updateData.end && new Date(updateData.start) >= new Date(updateData.end)) {
                res.status(400).json({ success: false, message: 'End date must be after start date', code: 'VALIDATION_ERROR' });
                return;
            }

            if (updateData.type && !Validate.oneOf({ value: updateData.type, allowedValues: ['personal', 'work', 'reminder', 'holiday', 'booking'] })) {
                res.status(400).json({ success: false, message: 'Valid event type is required', code: 'VALIDATION_ERROR' });
                return;
            }

            const result = await EventService.updateEvent(eventId, req.user._id, updateData);

            if (result.success) {
                res.status(200).json({
                    success: true,
                    message: 'Event updated successfully',
                    data: { event: result.event }
                });
            } else {
                res.status(400).json({ success: false, message: result.error });
            }
        } catch (error) {
            logError({ message: "Updating an event failed!", source: "EventController.updateEvent", error });
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
        }
    }

    static async deleteEvent(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
                return;
            }

            const { eventId } = req.params;

            if (!eventId || !Validate.mongoId(eventId)) {
                res.status(400).json({ success: false, message: 'Valid event ID is required', code: 'VALIDATION_ERROR' });
                return;
            }

            const result = await EventService.deleteEvent(eventId, req.user._id);

            if (result.success) {
                res.status(200).json({
                    success: true,
                    message: 'Event deleted successfully'
                });
            } else {
                res.status(400).json({ success: false, message: result.error });
            }
        } catch (error) {
            logError({ message: "Deleting an event failed!", source: "EventController.deleteEvent", error });
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
        }
    }

    static async getEvents(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
                return;
            }

            const { page, limit, type, startDate, endDate, filterBy } = req.query;

            const filters: any = {};

            if (page) filters.page = parseInt(page as string);
            if (limit) filters.limit = parseInt(limit as string);
            if (type) filters.type = type;
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;
            if (filterBy) filters.filterBy = filterBy;

            const result = await EventService.getEvents(req.user._id, filters);

            if (result.success) {
                res.status(200).json({
                    success: true,
                    message: 'Events fetched successfully',
                    data: result.events,
                    pagination: result.pagination
                });
            } else {
                res.status(400).json({ success: false, message: result.error });
            }
        } catch (error) {
            logError({ message: "Fetching events failed!", source: "EventController.getEvents", error });
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
        }
    }

    static async getEventById(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
                return;
            }

            const { eventId } = req.params;

            if (!eventId || !Validate.mongoId(eventId)) {
                res.status(400).json({ success: false, message: 'Valid event ID is required', code: 'VALIDATION_ERROR' });
                return;
            }

            const result = await EventService.getEventById(eventId, req.user._id);

            if (result.success) {
                res.status(200).json({
                    success: true,
                    message: 'Event fetched successfully',
                    data: { event: result.event }
                });
            } else {
                res.status(404).json({ success: false, message: result.error });
            }
        } catch (error) {
            logError({ message: "Fetching event failed!", source: "EventController.getEventById", error });
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
        }
    }

    static async addEventGuests(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
                return;
            }

            const { eventId } = req.params;
            const { guestEmails }: AddGuestsDto = req.body;

            if (!eventId || !Validate.mongoId(eventId)) {
                res.status(400).json({ success: false, message: 'Valid event ID is required', code: 'VALIDATION_ERROR' });
                return;
            }

            if (!guestEmails || !Validate.array(guestEmails)) {
                res.status(400).json({ success: false, message: 'Guest emails array is required', code: 'VALIDATION_ERROR' });
                return;
            }

            if (!Validate.arrayOf(guestEmails, Validate.email)) {
                res.status(400).json({ success: false, message: 'All guest emails must be valid', code: 'VALIDATION_ERROR' });
                return;
            }

            const result = await EventService.addEventGuests(eventId, req.user._id, guestEmails);

            if (result.success) {
                res.status(200).json({
                    success: true,
                    message: 'Guests added successfully',
                    data: { event: result.event }
                });
            } else {
                res.status(400).json({ success: false, message: result.error });
            }
        } catch (error) {
            logError({ message: "Adding event guests failed!", source: "EventController.addEventGuests", error });
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
        }
    }

    static async removeEventGuests(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
                return;
            }

            const { eventId } = req.params;
            const { guestEmails }: RemoveGuestsDto = req.body;

            if (!eventId || !Validate.mongoId(eventId)) {
                res.status(400).json({ success: false, message: 'Valid event ID is required', code: 'VALIDATION_ERROR' });
                return;
            }

            if (!guestEmails || !Validate.array(guestEmails)) {
                res.status(400).json({ success: false, message: 'Guest emails array is required', code: 'VALIDATION_ERROR' });
                return;
            }

            if (!Validate.arrayOf(guestEmails, Validate.email)) {
                res.status(400).json({ success: false, message: 'All guest emails must be valid', code: 'VALIDATION_ERROR' });
                return;
            }

            const result = await EventService.removeEventGuests(eventId, req.user._id, guestEmails);

            if (result.success) {
                res.status(200).json({
                    success: true,
                    message: 'Guests removed successfully',
                    data: { event: result.event }
                });
            } else {
                res.status(400).json({ success: false, message: result.error });
            }
        } catch (error) {
            logError({ message: "Removing event guests failed!", source: "EventController.removeEventGuests", error });
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
        }
    }
}
