import { Request, Response } from "express";
import axios from "axios";
import { getConnectedSockets } from "../ws/initialize-ws";
import 'dotenv/config';

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || "";
const N8N_SESSION_ID = process.env.N8N_SESSION_ID;
const APP_URL = process.env.APP_URL;

const aiAxiosInstance = axios.create({
    timeout: 600000, // 10 minutes
    headers: {
        "Content-Type": "application/json",
        "Connection": "keep-alive",
    },
});
aiAxiosInstance.defaults.timeout = 600000;
export class N8NController {
    static async askAI(req: Request, res: Response) {
        try {
            const { chatInput, userId, sessionId } = req.body;
            if (!chatInput) {
                return res.status(400).json({ error: 'chatInput is required' })
            }
            await aiAxiosInstance.post(N8N_WEBHOOK_URL, {
                chatInput: chatInput,
                sessionId: sessionId || N8N_SESSION_ID || "",
                userId: userId || null,
                appUrl: `${APP_URL}/api/n8n/recieve`
            })
            res.status(200).json({ success: true });
            return;
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }
    static async recieveN8nResponse(req: Request, res: Response) {
        try {
            const { webhookBody, agentOutput } = req.body;
            const { userId } = webhookBody;

            if (!userId) {
                return res.status(400).json({ error: 'userId is required' });
            }

            const connectedSockets = getConnectedSockets();
            const socket = connectedSockets.get(userId);
            
            if (socket) {
                socket.emit('ai-response', { output: agentOutput.output });
                return res.status(200).json({ success: true });
            } else {
                return res.status(200).json({ success: false, message: 'User not connected' });
            }
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }
}