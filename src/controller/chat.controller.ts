import { Response, Request } from "express";
import catchError from "../utils/catchError";
import { ChatService } from "../service/chat.service";

export class ChatController {
    static async getChatHistory(req: Request, res: Response){
        // if(!req.user){
        //     res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
        //     return;
        // }

        const { userId, page, limit } = req.query;

        if(!userId){
            res.status(400).json({ success: false, message: 'User ID is required', code: 'VALIDATION_ERROR' });
            return;
        }

        const pageNum = page ? parseInt(page as string) : 1;
        const limitNum = limit ? parseInt(limit as string) : 20;

        const [error, result] = await catchError(
            ChatService.getChatHistory({
                userId: userId as string,
                page: pageNum,
                limit: limitNum
            })
        );

        if(error){
            res.status(500).json({ success: false, message: error.message, code: 'INTERNAL_SERVER_ERROR' });
            return;
        }

        res.status(200).json({ success: true, data: result.data, message: 'Chat history fetched successfully', code: 'SUCCESS', pagination: result.pagination });
    }
}