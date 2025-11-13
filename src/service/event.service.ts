import Event, { IEvent } from '../models/event.model';
import User from '../models/user.model';
import { EventDto, UpdateEventDto } from '../dto/event.dto';
import { Schema } from 'mongoose';
import { addEmailJob } from '../integration/QueueManager';
import { DateTime } from 'luxon';

export class EventService {
    static async createEvent(userId: string, eventData: EventDto): Promise<{ success: boolean; event?: IEvent; error?: string }> {
        try {
            const guestIds: Schema.Types.ObjectId[] = [];
            
            if (eventData.guestEmails && eventData.guestEmails.length > 0) {
                const users = await User.find({ email: { $in: eventData.guestEmails } }).select('_id');
                guestIds.push(...users.map(u => u._id));
            }

            const event = new Event({
                userId,
                ...eventData,
                guestIds,
                guestEmails: eventData.guestEmails || []
            });

            await event.save();
            
            if (eventData.guestEmails && eventData.guestEmails.length > 0) {
                const creator = await User.findById(userId).select('firstName lastName email');
                await this.sendEventInvitations(event, creator!, eventData.guestEmails);
            }

            return { success: true, event };
        } catch (error) {
            return { success: false, error: 'Failed to create event' };
        }
    }

    static async getEvents(userId: string, filters: {
        page?: number;
        limit?: number;
        type?: string;
        startDate?: string;
        endDate?: string;
        filterBy?: 'week' | 'month' | 'year' | 'custom';
    }): Promise<{ success: boolean; events?: IEvent[]; pagination?: any; error?: string }> {
        try {
            const page = filters.page || 1;
            const limit = filters.limit || 20;
            const skip = (page - 1) * limit;

            const query: any = {
                $or: [
                    { userId },
                    { guestIds: userId },
                    { guestEmails: (await User.findById(userId).select('email'))?.email }
                ]
            };

            if (filters.type) {
                query.type = filters.type;
            }

            if (filters.filterBy || filters.startDate || filters.endDate) {
                const now = DateTime.now();
                let startDate: Date;
                let endDate: Date;

                if (filters.filterBy === 'week') {
                    startDate = now.startOf('week').toJSDate();
                    endDate = now.endOf('week').toJSDate();
                } else if (filters.filterBy === 'month') {
                    startDate = now.startOf('month').toJSDate();
                    endDate = now.endOf('month').toJSDate();
                } else if (filters.filterBy === 'year') {
                    startDate = now.startOf('year').toJSDate();
                    endDate = now.endOf('year').toJSDate();
                } else if (filters.startDate && filters.endDate) {
                    startDate = new Date(filters.startDate);
                    endDate = new Date(filters.endDate);
                } else {
                    startDate = filters.startDate ? new Date(filters.startDate) : now.startOf('month').toJSDate();
                    endDate = filters.endDate ? new Date(filters.endDate) : now.endOf('month').toJSDate();
                }

                query.start = { $gte: startDate, $lte: endDate };
            }

            const [events, total] = await Promise.all([
                Event.find(query).sort({ start: 1 }).skip(skip).limit(limit).populate('userId', 'firstName lastName email'),
                Event.countDocuments(query)
            ]);

            return {
                success: true,
                events,
                pagination: {
                    total,
                    page,
                    pages: Math.ceil(total / limit),
                    limit
                }
            };
        } catch (error) {
            return { success: false, error: 'Failed to fetch events' };
        }
    }

    static async getEventById(eventId: string, userId: string): Promise<{ success: boolean; event?: IEvent; error?: string }> {
        try {
            const userEmail = (await User.findById(userId).select('email'))?.email;
            const event = await Event.findOne({
                _id: eventId,
                $or: [
                    { userId },
                    { guestIds: userId },
                    { guestEmails: userEmail }
                ]
            }).populate('userId', 'firstName lastName email');

            if (!event) {
                return { success: false, error: 'Event not found' };
            }

            return { success: true, event };
        } catch (error) {
            return { success: false, error: 'Failed to fetch event' };
        }
    }

    static async updateEvent(eventId: string, userId: string, updateData: UpdateEventDto): Promise<{ success: boolean; event?: IEvent; error?: string }> {
        try {
            const event = await Event.findOne({ _id: eventId, userId });

            if (!event) {
                return { success: false, error: 'Event not found or unauthorized' };
            }

            Object.assign(event, updateData);
            await event.save();

            if (event.guestEmails.length > 0) {
                const creator = await User.findById(userId).select('firstName lastName email');
                await this.sendEventUpdateNotification(event, creator!);
            }

            return { success: true, event };
        } catch (error) {
            return { success: false, error: 'Failed to update event' };
        }
    }

    static async deleteEvent(eventId: string, userId: string): Promise<{ success: boolean; error?: string }> {
        try {
            const event = await Event.findOneAndDelete({ _id: eventId, userId });

            if (!event) {
                return { success: false, error: 'Event not found or unauthorized' };
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: 'Failed to delete event' };
        }
    }

    static async addEventGuests(eventId: string, userId: string, guestEmails: string[]): Promise<{ success: boolean; event?: IEvent; error?: string }> {
        try {
            const event = await Event.findOne({ _id: eventId, userId });

            if (!event) {
                return { success: false, error: 'Event not found or unauthorized' };
            }

            const newEmails = guestEmails.filter(email => !event.guestEmails.includes(email));
            
            if (newEmails.length === 0) {
                return { success: false, error: 'All guests already added' };
            }

            const users = await User.find({ email: { $in: newEmails } }).select('_id');
            const newGuestIds = users.map(u => u._id).filter(id => !event.guestIds.includes(id));

            event.guestEmails.push(...newEmails);
            event.guestIds.push(...newGuestIds);
            await event.save();

            const creator = await User.findById(userId).select('firstName lastName email');
            await this.sendEventInvitations(event, creator!, newEmails);

            return { success: true, event };
        } catch (error) {
            return { success: false, error: 'Failed to add guests' };
        }
    }

    static async removeEventGuests(eventId: string, userId: string, guestEmails: string[]): Promise<{ success: boolean; event?: IEvent; error?: string }> {
        try {
            const event = await Event.findOne({ _id: eventId, userId });

            if (!event) {
                return { success: false, error: 'Event not found or unauthorized' };
            }

            const removedEmails = guestEmails.filter(email => event.guestEmails.includes(email));

            if (removedEmails.length === 0) {
                return { success: false, error: 'No guests to remove' };
            }

            const users = await User.find({ email: { $in: removedEmails } }).select('_id');
            const removeGuestIds = users.map(u => u._id.toString());

            event.guestEmails = event.guestEmails.filter(email => !removedEmails.includes(email));
            event.guestIds = event.guestIds.filter(id => !removeGuestIds.includes(id.toString()));
            await event.save();

            const creator = await User.findById(userId).select('firstName lastName email');
            await this.sendEventCancellationNotification(event, creator!, removedEmails);

            return { success: true, event };
        } catch (error) {
            return { success: false, error: 'Failed to remove guests' };
        }
    }

    private static async sendEventInvitations(event: IEvent, creator: any, guestEmails: string[]): Promise<void> {
        const icsContent = this.generateICS(event, creator);
        
        await addEmailJob({
            email: guestEmails,
            subject: `Event Invitation: ${event.title}`,
            html: `
                <h2>You're Invited!</h2>
                <p><strong>${creator.firstName} ${creator.lastName}</strong> (${creator.email}) has invited you to an event.</p>
                <h3>${event.title}</h3>
                ${event.description ? `<p>${event.description}</p>` : ''}
                <p><strong>When:</strong> ${DateTime.fromJSDate(event.start).toFormat('DDDD t')} - ${DateTime.fromJSDate(event.end).toFormat('DDDD t')}</p>
                ${event.location ? `<p><strong>Location:</strong> ${event.location}</p>` : ''}
                <p><strong>Type:</strong> ${event.type}</p>
                <hr>
                <p>Please find the event details in the attached invite.ics file.</p>
                <pre>${icsContent}</pre>
            `
        });
    }

    private static async sendEventUpdateNotification(event: IEvent, creator: any): Promise<void> {
        await addEmailJob({
            email: event.guestEmails,
            subject: `Event Updated: ${event.title}`,
            html: `
                <h2>Event Updated</h2>
                <p><strong>${creator.firstName} ${creator.lastName}</strong> has updated the event details.</p>
                <h3>${event.title}</h3>
                ${event.description ? `<p>${event.description}</p>` : ''}
                <p><strong>When:</strong> ${DateTime.fromJSDate(event.start).toFormat('DDDD t')} - ${DateTime.fromJSDate(event.end).toFormat('DDDD t')}</p>
                ${event.location ? `<p><strong>Location:</strong> ${event.location}</p>` : ''}
                <p><strong>Type:</strong> ${event.type}</p>
            `
        });
    }

    private static async sendEventCancellationNotification(event: IEvent, creator: any, removedEmails: string[]): Promise<void> {
        await addEmailJob({
            email: removedEmails,
            subject: `Removed from Event: ${event.title}`,
            html: `
                <h2>Event Invitation Cancelled</h2>
                <p><strong>${creator.firstName} ${creator.lastName}</strong> has removed you from the event.</p>
                <h3>${event.title}</h3>
                <p><strong>Original Date:</strong> ${DateTime.fromJSDate(event.start).toFormat('DDDD t')} - ${DateTime.fromJSDate(event.end).toFormat('DDDD t')}</p>
            `
        });
    }

    private static generateICS(event: IEvent, creator: any): string {
        const formatDate = (date: Date) => DateTime.fromJSDate(date).toFormat("yyyyMMdd'T'HHmmss'Z'");
        
        return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//YCC Server//Event//EN
BEGIN:VEVENT
UID:${event._id}@ycc-server
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(event.start)}
DTEND:${formatDate(event.end)}
SUMMARY:${event.title}
DESCRIPTION:${event.description || ''}
LOCATION:${event.location || ''}
ORGANIZER;CN=${creator.firstName} ${creator.lastName}:mailto:${creator.email}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;
    }
}
