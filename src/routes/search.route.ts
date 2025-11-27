import { Router } from "express";
import { SearchController } from "../controller/search.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();

router.get('/global', authenticateToken, SearchController.globalSearch);

export default router;