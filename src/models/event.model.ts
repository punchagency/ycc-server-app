import { Schema, model, Document } from "mongoose";

export interface IEvent extends Document{
    _id: Schema.Types.ObjectId;
    userId: Schema.Types.ObjectId;
    title: string;
    description?: string;
    start: Date;
    end: Date;
    allDay: boolean;
    color?: string;
    type: 'personal' | 'work' | 'reminder' | 'holiday' | 'booking';
    location?: string;
    guestIds: Schema.Types.ObjectId[];
    guestEmails: string[];
    createdAt: Date;
    updatedAt: Date;
}

const eventSchema = new Schema<IEvent>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    allDay: { type: Boolean, required: true },
    color: { type: String },
    type: { type: String, enum: ['personal', 'work', 'reminder', 'holiday', 'booking'], required: true },
    location: { type: String },
    guestIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    guestEmails: [{ type: String }],
}, {
    timestamps: true
});

export default model<IEvent>('Event', eventSchema);