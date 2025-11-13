import { Router } from "express";
import { StripeAccountController } from "../controller/stripe_account.controller";
const router = Router();

router.post('/create', StripeAccountController.createStripeAccount);
router.post('/get', StripeAccountController.getStripeAccount);
router.post('/refresh', StripeAccountController.refreshStripeAccountLink);

export default router;