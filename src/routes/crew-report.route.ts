import { Router } from "express";
import { CrewReportController } from "../controller/crew-report.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();
const controller = new CrewReportController();

router.get('/dashboard', authenticateToken, controller.getDashboardSummary);
router.post('/generate', authenticateToken, controller.generateReport);

export default router;