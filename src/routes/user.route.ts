import { Router } from "express";
import { UserController } from "../controller/user.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();

router.get('/business-users', authenticateToken, UserController.getBusinessUsers);
router.post('/business-approval', authenticateToken, UserController.respondToBusinessApproval);
router.get('/:id', authenticateToken, UserController.getUserById);

export default router;