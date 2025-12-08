import { Router } from "express";
import { ChatController } from "../controller/chat.controller";

const router = Router();

router.get('/history', ChatController.getChatHistory);
export default router;