import { Schema, model, Document } from "mongoose";

export interface IChat extends Document {
    _id: Schema.Types.ObjectId;
    userId?: Schema.Types.ObjectId;
    sessionId: string;
    messages: {
        type: 'human' | 'ai';
        data: {
            content: string;
            tool_calls: Record<string, any>[];
            invalid_tool_calls: Record<string, any>[];
            additional_kwargs: Record<string, any>;
            response_metadata: Record<string, any>
        };
        createdAt: Date;
    }[];
    chatSuggestions: string[];
    createdAt: Date;
}

const chatSchema = new Schema<IChat>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
    sessionId: { type: String, required: true },
    messages: [{
        type: { type: String, enum: ['human', 'ai'], required: true },
        data: {
            content: { type: String, required: true },
            tool_calls: { type: Schema.Types.Mixed, required: false },
            invalid_tool_calls: { type: Schema.Types.Mixed, required: false },
            additional_kwargs: { type: Schema.Types.Mixed, required: false },
            response_metadata: { type: Schema.Types.Mixed, required: false }
        },
        createdAt: { type: Date, required: true }
    }],
    chatSuggestions: [{ type: String, required: false }],
    createdAt: { type: Date, required: true }
}, {
    timestamps: true
});

export default model<IChat>('Chat', chatSchema);