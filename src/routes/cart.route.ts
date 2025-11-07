import { Router } from 'express';
import { CartController } from '../controller/cart.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateToken, CartController.getCart);
router.post('/add', authenticateToken, CartController.addToCart);
router.put('/update', authenticateToken, CartController.updateCartItem);
router.delete('/remove/:productId', authenticateToken, CartController.removeFromCart);
router.delete('/clear', authenticateToken, CartController.clearCart);

export default router;
