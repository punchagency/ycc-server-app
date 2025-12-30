import { Response, Request } from 'express';
import { OrderService } from '../service/order.service';
import catchError from '../utils/catchError';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { UpdateOrderStatusDto } from '../dto/order.dto';
import { logError } from '../utils/SystemLogs';
import Validate from '../utils/Validate';
import 'dotenv/config';

class OrderController {
    static async createOrder(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
                return;
            }
            const { products, deliveryAddress, estimatedDeliveryDate } = req.body;
            const userId = req.user?._id;

            if (!userId) {
                return res.status(401).json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' });
            }
            if(!['user', 'distributor'].includes(req.user?.role)){
                return res.status(403).json({ success: false, message: 'Only users and distributors can create orders', code: 'FORBIDDEN' });
            }

            if (!products || !Array.isArray(products) || products.length === 0) {
                return res.status(400).json({ success: false, message: 'Products array is required', code: 'VALIDATION_ERROR' });
            }

            if (!deliveryAddress || !deliveryAddress.street || !deliveryAddress.zipcode || !deliveryAddress.city || !deliveryAddress.state || !deliveryAddress.country) {
                return res.status(400).json({ success: false, message: 'Complete delivery address is required', code: 'VALIDATION_ERROR' });
            }

            for (const product of products) {
                if (!product.productId || !product.quantity || product.quantity <= 0) {
                    return res.status(400).json({ success: false, message: 'Each product must have valid productId and quantity', code: 'VALIDATION_ERROR' });
                }
            }


            const [error, result] = await catchError(OrderService.createOrder({
                userId,
                userType: req.user?.role as "user" | "distributor",
                products,
                deliveryAddress,
                estimatedDeliveryDate: estimatedDeliveryDate ? new Date(estimatedDeliveryDate) : undefined
            }));

            if (error) {
                return res.status(400).json({ success: false, message: error.message, code: 'ORDER_CREATION_FAILED' });
            }

            return res.status(201).json({ success: true, message: 'Order created successfully', data: result?.order });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message || 'Internal server error', code: 'INTERNAL_ERROR' });
        }
    }
    static async confirmOrder(req: Request, res: Response) {
        try {
            const { token } = req.params;

            const [error, result] = await catchError(OrderService.confirmOrder(token));

            if (error) {
                return res.send(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                    <title>Order Confirmation Failed</title>
                    <style>
                        body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                        text-align: center;
                        }
                        .error {
                        color: #f44336;
                        font-size: 48px;
                        margin-bottom: 20px;
                        }
                        .card {
                        border: 1px solid #ddd;
                        border-radius: 8px;
                        padding: 20px;
                        margin-top: 20px;
                        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                        }
                    </style>
                    </head>
                    <body>
                    <div class="error">✗</div>
                    <h1>Order Confirmation Failed</h1>
                    <div class="card">
                        <p>${error.message}</p>
                    </div>
                    </body>
                    </html>
                `);
            }

            return res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                <title>Order Confirmed</title>
                <style>
                    body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    text-align: center;
                    }
                    .success {
                    color: #4CAF50;
                    font-size: 48px;
                    margin-bottom: 20px;
                    }
                    .card {
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    padding: 20px;
                    margin-top: 20px;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                    }
                    .button {
                    display: inline-block;
                    background-color: #4CAF50;
                    color: white;
                    padding: 14px 20px;
                    text-align: center;
                    text-decoration: none;
                    font-size: 16px;
                    margin: 20px 0;
                    cursor: pointer;
                    border-radius: 4px;
                    }
                </style>
                </head>
                <body>
                <div class="success">✓</div>
                <h1>Order Confirmed Successfully</h1>
                <div class="card">
                    <p>You have successfully confirmed order #${result?.orderId}.</p>
                    <p>The customer has been notified about the confirmation.</p>
                    <p>Thank you for your prompt response!</p>
                </div>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/supplier/dashboard" class="button">Go to Dashboard</a>
                </body>
                </html>
            `);
        } catch (error: any) {
            return res.status(500).send(`
                <!DOCTYPE html>
                <html>
                <head>
                <title>Error</title>
                <style>
                    body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    text-align: center;
                    }
                    .error {
                    color: #f44336;
                    font-size: 48px;
                    margin-bottom: 20px;
                    }
                </style>
                </head>
                <body>
                <div class="error">✗</div>
                <h1>An error occurred</h1>
                <p>${error.message}</p>
                </body>
                </html>
            `);
        }
    }
    static async declineOrder(req: Request, res: Response) {
        try {
            const { token } = req.params;
            const { reason } = req.body;

            const [error, result] = await catchError(OrderService.declineOrder(token, reason));

            if (error) {
                return res.send(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                    <title>Order Decline Failed</title>
                    <style>
                        body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                        text-align: center;
                        }
                        .error {
                        color: #f44336;
                        font-size: 48px;
                        margin-bottom: 20px;
                        }
                        .card {
                        border: 1px solid #ddd;
                        border-radius: 8px;
                        padding: 20px;
                        margin-top: 20px;
                        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                        }
                    </style>
                    </head>
                    <body>
                    <div class="error">✗</div>
                    <h1>Order Decline Failed</h1>
                    <div class="card">
                        <p>${error.message}</p>
                    </div>
                    </body>
                    </html>
                `);
            }

            return res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                <title>Order Declined</title>
                <style>
                    body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    text-align: center;
                    }
                    .warning {
                    color: #ff9800;
                    font-size: 48px;
                    margin-bottom: 20px;
                    }
                    .card {
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    padding: 20px;
                    margin-top: 20px;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                    }
                    .button {
                    display: inline-block;
                    background-color: #f44336;
                    color: white;
                    padding: 14px 20px;
                    text-align: center;
                    text-decoration: none;
                    font-size: 16px;
                    margin: 20px 0;
                    cursor: pointer;
                    border-radius: 4px;
                    }
                </style>
                </head>
                <body>
                <div class="warning">⚠</div>
                <h1>Order Declined</h1>
                <div class="card">
                    <p>You have declined order #${result?.orderId}.</p>
                    <p>The customer has been notified about the decline.</p>
                </div>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/supplier/dashboard" class="button">Go to Dashboard</a>
                </body>
                </html>
            `);
        } catch (error: any) {
            return res.status(500).send(`
                <!DOCTYPE html>
                <html>
                <head>
                <title>Error</title>
                <style>
                    body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    text-align: center;
                    }
                    .error {
                    color: #f44336;
                    font-size: 48px;
                    margin-bottom: 20px;
                    }
                </style>
                </head>
                <body>
                <div class="error">✗</div>
                <h1>An error occurred</h1>
                <p>${error.message}</p>
                </body>
                </html>
            `);
        }
    }
    // update order in distributor dashboard
    static async updateUserOrderStatus(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
                return;
            }
            const { orderId, status, reason, notes, trackingNumber }: UpdateOrderStatusDto = req.body;
            const userId = req.user?._id;
            const userRole = req.user?.role;

            if (!userId || !userRole) {
                return res.status(401).json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' });
            }

            if (!orderId || !status) {
                return res.status(400).json({ success: false, message: 'Order ID and status are required', code: 'VALIDATION_ERROR' });
            }

            if (!['confirmed', 'processing', 'shipped', 'out_for_delivery', 'cancelled'].includes(status)) {
                return res.status(400).json({ success: false, message: 'Invalid status. User can only set confirmed or cancelled', code: 'VALIDATION_ERROR' });
            }

            const [error, result] = await catchError(OrderService.updateUserOrderStatus(userId.toString(), orderId, status, userRole, reason, notes, trackingNumber));

            if (error) {
                logError({ message: "Updating order status failed!", source: "OrderController.updateUserOrderStatus", error });
                return res.status(400).json({ success: false, message: error.message, code: 'UPDATE_FAILED' });
            }

            return res.status(200).json({ success: true, message: 'Order status updated successfully', data: result?.order });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message || 'Internal server error', code: 'INTERNAL_ERROR' });
        }
    }
    static async getOrderById(req: AuthenticatedRequest, res: Response){
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
                return;
            }

            const { id } = req.params;

            if (!Validate.mongoId(id)) {
                res.status(400).json({ success: false, message: 'Invalid order id', code: 'INVALID_ORDER_ID' });
                return;
            }

            const [error, result] = await catchError(OrderService.getOrderById(id, req.user._id.toString(), req.user.role));

            if (error) {
                logError({ message: "Fetching order by id failed!", source: "OrderController.getOrderById", error });
                res.status(400).json({ success: false, message: error.message || 'Failed to fetch order', code: 'FETCH_FAILED' });
                return;
            }

            res.status(200).json({ success: true, message: 'Order fetched successfully', data: result });
        } catch (error) {
            logError({ message: "Fetching order by id failed", source: "OrderController.getOrderById", error });
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
        }
    }
    static async getOrders(req: AuthenticatedRequest, res: Response){
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
                return;
            }

            const { page, limit, status, paymentStatus, startDate, endDate, sortBy, orderBy, userType } = req.query;

            if (status && !['pending', 'declined', 'confirmed', 'processing', 'out_for_delivery', 'shipped', 'delivered', 'cancelled'].includes(status as string)) {
                res.status(400).json({ success: false, message: 'Invalid status value', code: 'INVALID_STATUS' });
                return;
            }

            if (paymentStatus && !['paid', 'pending', 'failed'].includes(paymentStatus as string)) {
                res.status(400).json({ success: false, message: 'Invalid payment status value', code: 'INVALID_PAYMENT_STATUS' });
                return;
            }

            if (startDate && isNaN(new Date(startDate as string).getTime())) {
                res.status(400).json({ success: false, message: 'Invalid start date format', code: 'INVALID_START_DATE' });
                return;
            }

            if (endDate && isNaN(new Date(endDate as string).getTime())) {
                res.status(400).json({ success: false, message: 'Invalid end date format', code: 'INVALID_END_DATE' });
                return;
            }

            if (startDate && endDate && new Date(startDate as string) > new Date(endDate as string)) {
                res.status(400).json({ success: false, message: 'Start date must be before end date', code: 'INVALID_DATE_RANGE' });
                return;
            }

            if (sortBy && !['createdAt', 'status', 'paymentStatus', 'totalAmount'].includes(sortBy as string)) {
                res.status(400).json({ success: false, message: 'Invalid sort by field', code: 'INVALID_SORTBY' });
                return;
            }

            if (orderBy && !['asc', 'desc'].includes(orderBy as string)) {
                res.status(400).json({ success: false, message: 'Invalid order by value', code: 'INVALID_ORDERBY' });
                return;
            }

            if (userType && !['user', 'distributor'].includes(userType as string)) {
                res.status(400).json({ success: false, message: 'Invalid user type value', code: 'INVALID_USERTYPE' });
                return;
            }

            const [error, result] = await catchError(OrderService.getOrders({
                userId: req.user._id.toString(),
                role: req.user.role,
                page: page ? parseInt(page as string) : undefined,
                limit: limit ? parseInt(limit as string) : undefined,
                status: status as string,
                paymentStatus: paymentStatus as string,
                startDate: startDate ? new Date(startDate as string) : undefined,
                endDate: endDate ? new Date(endDate as string) : undefined,
                sortBy: sortBy as string,
                orderBy: orderBy as string,
                userType: userType as 'user' | 'distributor' | undefined
            }));

            if (error) {
                logError({ message: "Fetching orders failed!", source: "OrderController.getOrders", error });
                res.status(400).json({ success: false, message: error.message || 'Failed to fetch orders', code: 'FETCH_FAILED' });
                return;
            }

            res.status(200).json({ success: true, message: 'Orders fetched successfully', data: result?.orders, pagination: result?.pagination });
        } catch (error) {
            logError({ message: "Fetching orders failed!", source: "OrderController.getOrders", error });
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
        }
    }
    static async updateDistributorOrderStatus(req: AuthenticatedRequest, res: Response){
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
                return;
            }

            const { orderId, status, reason, notes, enableShipping, trackingNumber, shipmentCost } = req.body;
            const userId = req.user._id;
            const userRole = req.user.role;

            if (!userId || !userRole) {
                return res.status(401).json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' });
            }

            if (!['distributor', 'manufacturer'].includes(userRole)) {
                return res.status(403).json({ success: false, message: 'Only distributors and manufacturers can update distributor orders', code: 'FORBIDDEN' });
            }

            if (!orderId || !status) {
                return res.status(400).json({ success: false, message: 'Order ID and status are required', code: 'VALIDATION_ERROR' });
            }

            if (!['confirmed', 'processing', 'shipped', 'out_for_delivery', 'cancelled'].includes(status)) {
                return res.status(400).json({ success: false, message: 'Invalid status', code: 'VALIDATION_ERROR' });
            }

            if (status === 'confirmed' && enableShipping !== undefined && typeof enableShipping !== 'boolean') {
                return res.status(400).json({ success: false, message: 'enableShipping must be a boolean', code: 'VALIDATION_ERROR' });
            }

            if (status === 'confirmed' && enableShipping === false && (!shipmentCost || typeof shipmentCost !== 'number' || shipmentCost <= 0)) {
                return res.status(400).json({ success: false, message: 'shipmentCost is required and must be a positive number when enableShipping is false', code: 'VALIDATION_ERROR' });
            }

            const [error, result] = await catchError(OrderService.updateDistributorOrderStatus({
                userId: userId.toString(),
                orderId,
                status,
                userRole,
                reason,
                notes,
                enableShipping,
                trackingNumber,
                shipmentCost
            }));

            if (error) {
                logError({ message: "Updating distributor order status failed!", source: "OrderController.updateDistributorOrderStatus", error });
                return res.status(400).json({ success: false, message: error.message, code: 'UPDATE_FAILED' });
            }

            return res.status(200).json({ success: true, message: 'Order status updated successfully', data: result?.order });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message || 'Internal server error', code: 'INTERNAL_ERROR' });
        }
    }
}

export default OrderController;