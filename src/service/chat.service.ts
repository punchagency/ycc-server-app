import chatModel from "../models/chat.model";

export class ChatService {
    static async getChatHistory({userId, page = 1, limit = 20}:{userId: string, page: number, limit: number}){
        const total = await chatModel.countDocuments({ sessionId: userId });
        const skip = (page - 1) * limit;

        const chats = await chatModel.find({ sessionId: userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        return {
            data: chats,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        };
    }
}