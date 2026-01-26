import chatModel from "../models/chat.model";
import Validate from "../utils/Validate";

export class ChatService {
    static async getChatHistory({userId, page = 1, limit = 20}: {userId: string, page: number, limit: number}){
        const query: any = {};
        if (userId && Validate.mongoId(userId)) {
            query.userId = userId;
        } else {
            query.sessionId = userId;
            query.userId = { $exists: false };
        }

        const total = await chatModel.countDocuments(query);
        const skip = (page - 1) * limit;

        const chats = await chatModel.find(query)
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