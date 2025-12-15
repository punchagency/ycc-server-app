import { Router } from 'express';
import { PublicController } from '../controller/public.controller';

const router = Router();

router.get('/items', PublicController.getServicesOrProducts);

export default router;
