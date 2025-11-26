import { Response } from 'express';
import { CartService } from '../service/cart.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import Validate from '../utils/Validate';

export class CartController {
    static async getCart(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
                return;
            }

            const cart = await CartService.getCart(req.user._id);

            res.status(200).json({
                success: true,
                message: cart ? 'Cart retrieved successfully' : 'Cart is empty',
                data: cart ? cart : null
            });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to retrieve cart' });
        }
    }

    static async addToCart(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
                return;
            }

            const { productId, quantity } = req.body;

            if (!productId || !Validate.string(productId)) {
                res.status(400).json({ success: false, message: 'Valid product ID is required', code: 'VALIDATION_ERROR' });
                return;
            }

            if (!quantity || !Validate.positiveInteger(quantity) || quantity < 1) {
                res.status(400).json({ success: false, message: 'Quantity must be a positive integer', code: 'VALIDATION_ERROR' });
                return;
            }

            const cart = await CartService.addToCart(req.user._id, productId, quantity);

            if (!cart) {
                res.status(400).json({ success: false, message: 'Failed to add item to cart. Product may not exist or insufficient stock.' });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Item added to cart successfully',
                data: { cart }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to add item to cart' });
        }
    }

    static async updateCartItem(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
                return;
            }

            const { productId, quantity } = req.body;

            if (!productId || !Validate.string(productId)) {
                res.status(400).json({ success: false, message: 'Valid product ID is required', code: 'VALIDATION_ERROR' });
                return;
            }

            if (!quantity || !Validate.positiveInteger(quantity) || quantity < 1) {
                res.status(400).json({ success: false, message: 'Quantity must be a positive integer', code: 'VALIDATION_ERROR' });
                return;
            }

            const cart = await CartService.updateCartItem(req.user._id, productId, quantity);

            if (!cart) {
                res.status(400).json({ success: false, message: 'Failed to update cart item. Item may not exist or insufficient stock.' });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Cart item updated successfully',
                data: { cart }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to update cart item' });
        }
    }

    static async removeFromCart(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
                return;
            }

            const { productId } = req.params;

            if (!productId || !Validate.string(productId)) {
                res.status(400).json({ success: false, message: 'Valid product ID is required', code: 'VALIDATION_ERROR' });
                return;
            }

            const cart = await CartService.removeFromCart(req.user._id, productId);

            res.status(200).json({
                success: true,
                message: cart ? 'Item removed from cart successfully' : 'Cart cleared (last item removed)',
                data: { cart }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to remove item from cart' });
        }
    }

    static async clearCart(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
                return;
            }

            const success = await CartService.clearCart(req.user._id);

            if (!success) {
                res.status(400).json({ success: false, message: 'Failed to clear cart' });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Cart cleared successfully'
            });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to clear cart' });
        }
    }
}
