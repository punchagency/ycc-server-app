import CartModel, { ICart } from '../models/cart.model';
import ProductModel from '../models/product.model';
import BusinessModel from '../models/business.model';
import { RedisUtils } from '../utils/RedisUtils';
import catchError from '../utils/catchError';
import { logError, logInfo } from '../utils/SystemLogs';
import { Types } from 'mongoose';

interface CartOperationResult {
    cart: ICart | null;
    wasCleared?: boolean;
    previousBusinessName?: string;
    newBusinessName?: string;
}

export class CartService {
    private static CART_CACHE_TTL = 1800;

    private static getCacheKey(userId: string): string {
        return `cart:${userId}`;
    }

    static async getCart(userId: string): Promise<ICart | null> {
        const cacheKey = this.getCacheKey(userId);
        
        const [cacheError, cachedCart] = await catchError(RedisUtils.getTempData(cacheKey));
        if (!cacheError && cachedCart) {
            return JSON.parse(cachedCart);
        }

        const [error, cart] = await catchError(
            CartModel.findOne({ userId })
                .populate({
                    path: 'items.productId',
                    select: 'name price imageURLs description category',
                    populate: { path: 'category', select: 'name' }
                })
                .populate({
                    path: 'items.businessId',
                    select: 'businessName email phone userId',
                    populate: { path: 'userId', select: 'name email phone' }
                })
        );

        if (error) {
            await logError({
                message: 'Failed to fetch cart',
                source: 'CartService.getCart',
                additionalData: { userId, error: error.message }
            });
            return null;
        }

        if (cart) {
            await catchError(RedisUtils.storeTempData(cacheKey, JSON.stringify(cart), this.CART_CACHE_TTL));
        }

        return cart;
    }

    static async addToCart(userId: string, productId: string, quantity: number, userRole?: string): Promise<CartOperationResult> {
        if (!Types.ObjectId.isValid(productId)) return { cart: null };

        const [productError, product] = await catchError(ProductModel.findById(productId).populate('businessId'));
        if (productError || !product) {
            await logError({
                message: 'Product not found',
                source: 'CartService.addToCart',
                additionalData: { userId, productId }
            });
            return { cart: null };
        }

        if (product.quantity < quantity) {
            await logError({
                message: 'Insufficient stock',
                source: 'CartService.addToCart',
                additionalData: { userId, productId, requested: quantity, available: product.quantity }
            });
            return { cart: null };
        }

        let cart = await CartModel.findOne({ userId });
        let wasCleared = false;
        let previousBusinessName: string | undefined;
        let newBusinessName: string | undefined;

        if (userRole === 'distributor' && cart && cart.items.length > 0) {
            const existingBusinessId = cart.items[0].businessId.toString();
            const newBusinessId = (product.businessId as any)._id.toString()

            if (existingBusinessId !== newBusinessId) {
                const [, previousBusiness] = await catchError(BusinessModel.findById(existingBusinessId));
                previousBusinessName = previousBusiness?.businessName || 'previous manufacturer';
                newBusinessName = (product.businessId as any).businessName || 'new manufacturer';

                await this.clearCart(userId);
                cart = null;
                wasCleared = true;
            }
        }

        if (!cart) {
            cart = new CartModel({
                userId: new Types.ObjectId(userId),
                totalItems: 0,
                totalPrice: 0,
                lastUpdated: new Date(),
                items: []
            });
        }

        const existingItemIndex = cart.items.findIndex(
            item => item.productId.toString() === productId
        );

        if (existingItemIndex > -1) {
            const newQuantity = cart.items[existingItemIndex].quantity + quantity;
            if (product.quantity < newQuantity) {
                await logError({
                    message: 'Insufficient stock for update',
                    source: 'CartService.addToCart',
                    additionalData: { userId, productId, requested: newQuantity, available: product.quantity }
                });
                return { cart: null };
            }
            cart.items[existingItemIndex].quantity = newQuantity;
            cart.items[existingItemIndex].totalPriceOfItems = product.price ? newQuantity * product.price : 0;
        } else {
            const businessIdValue = typeof product.businessId === 'object' ? (product.businessId as any)._id : product.businessId;
            cart.items.push({
                productId: new Types.ObjectId(productId) as any,
                quantity,
                pricePerItem: product.price,
                businessId: businessIdValue,
                totalPriceOfItems: product.price ? quantity * product.price : 0
            });
        }

        cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
        cart.totalPrice = cart.items.reduce((sum, item) => sum + (item?.totalPriceOfItems || 0), 0);
        cart.lastUpdated = new Date();

        const [saveError] = await catchError(cart.save());
        if (saveError) {
            await logError({
                message: 'Failed to save cart',
                source: 'CartService.addToCart',
                additionalData: { userId, productId, error: saveError.message }
            });
            return { cart: null };
        }

        await this.invalidateCache(userId);

        await logInfo({
            message: 'Item added to cart',
            source: 'CartService.addToCart',
            additionalData: { userId, productId, quantity, wasCleared }
        });

        const updatedCart = await this.getCart(userId);
        return { cart: updatedCart, wasCleared, previousBusinessName, newBusinessName };
    }

    static async updateCartItem(userId: string, productId: string, quantity: number, userRole?: string): Promise<CartOperationResult> {
        if (!Types.ObjectId.isValid(productId)) return { cart: null };

        const [productError, product] = await catchError(ProductModel.findById(productId).populate('businessId'));
        if (productError || !product) return { cart: null };

        if (product.quantity < quantity) {
            await logError({
                message: 'Insufficient stock',
                source: 'CartService.updateCartItem',
                additionalData: { userId, productId, requested: quantity, available: product.quantity }
            });
            return { cart: null };
        }

        let cart = await CartModel.findOne({ userId });
        if (!cart) return { cart: null };

        let wasCleared = false;
        let previousBusinessName: string | undefined;
        let newBusinessName: string | undefined;

        if (userRole === 'distributor' && cart.items.length > 0) {
            const existingBusinessId = cart.items[0].businessId.toString();
            const newBusinessId = (product.businessId as any)._id.toString()

            if (existingBusinessId !== newBusinessId) {
                const [, previousBusiness] = await catchError(BusinessModel.findById(existingBusinessId));
                previousBusinessName = previousBusiness?.businessName || 'previous manufacturer';
                newBusinessName = (product.businessId as any).businessName || 'new manufacturer';

                await this.clearCart(userId);
                cart = new CartModel({
                    userId: new Types.ObjectId(userId),
                    totalItems: 0,
                    totalPrice: 0,
                    lastUpdated: new Date(),
                    items: []
                });
                wasCleared = true;
            }
        }

        const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
        if (itemIndex === -1) {
            if (wasCleared) {
                const businessIdValue = typeof product.businessId === 'object' ? (product.businessId as any)._id : product.businessId;
                cart.items.push({
                    productId: new Types.ObjectId(productId) as any,
                    quantity,
                    pricePerItem: product.price,
                    businessId: businessIdValue,
                    totalPriceOfItems: product.price ? quantity * product?.price : 0,
                });
            } else {
                return { cart: null };
            }
        } else {
            cart.items[itemIndex].quantity = quantity;
            cart.items[itemIndex].totalPriceOfItems = product.price ? quantity * product?.price : 0;
        }

        cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
        cart.totalPrice = cart.items.reduce((sum, item) => sum + (item?.totalPriceOfItems || 0), 0);
        cart.lastUpdated = new Date();

        const [saveError] = await catchError(cart.save());
        if (saveError) {
            await logError({
                message: 'Failed to update cart',
                source: 'CartService.updateCartItem',
                additionalData: { userId, productId, error: saveError.message }
            });
            return { cart: null };
        }

        await this.invalidateCache(userId);

        await logInfo({
            message: 'Cart item updated',
            source: 'CartService.updateCartItem',
            additionalData: { userId, productId, quantity, wasCleared }
        });

        const updatedCart = await this.getCart(userId);
        return { cart: updatedCart, wasCleared, previousBusinessName, newBusinessName };
    }

    static async removeFromCart(userId: string, productId: string): Promise<ICart | null> {
        const cart = await CartModel.findOne({ userId });
        if (!cart) return null;

        cart.items = cart.items.filter(item => item.productId.toString() !== productId);

        if (cart.items.length === 0) {
            await this.clearCart(userId);
            return null;
        }

        cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
        cart.totalPrice = cart.items.reduce((sum, item) => sum + (item.totalPriceOfItems || 0), 0);
        cart.lastUpdated = new Date();

        const [saveError] = await catchError(cart.save());
        if (saveError) {
            await logError({
                message: 'Failed to remove item from cart',
                source: 'CartService.removeFromCart',
                additionalData: { userId, productId, error: saveError.message }
            });
            return null;
        }

        await this.invalidateCache(userId);

        await logInfo({
            message: 'Item removed from cart',
            source: 'CartService.removeFromCart',
            additionalData: { userId, productId }
        });

        return this.getCart(userId);
    }

    static async clearCart(userId: string): Promise<boolean> {
        const [error] = await catchError(CartModel.findOneAndDelete({ userId }));

        if (error) {
            await logError({
                message: 'Failed to clear cart',
                source: 'CartService.clearCart',
                additionalData: { userId, error: error.message }
            });
            return false;
        }

        await this.invalidateCache(userId);

        await logInfo({
            message: 'Cart cleared',
            source: 'CartService.clearCart',
            additionalData: { userId }
        });

        return true;
    }

    private static async invalidateCache(userId: string): Promise<void> {
        await catchError(RedisUtils.deleteTempData(this.getCacheKey(userId)));
    }
}
