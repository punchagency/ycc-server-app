import { Router } from 'express';
import { N8NController } from '../controller/n8n.controller';
const router = Router();

router.post('/ask', N8NController.askAI);
router.post('/recieve', N8NController.recieveN8nResponse);

export default router;