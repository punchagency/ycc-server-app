import { Router } from "express";
import { sendContactMessage } from "../controller/contact.controller";

const router = Router();

router.post("/send", sendContactMessage);

export default router;