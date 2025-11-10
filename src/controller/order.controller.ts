import { Response, Request } from 'express';
import { OrderService } from '../service/order.service';
import catchError from '../utils/catchError';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { UpdateOrderStatusDto } from '../dto/order.dto';

class OrderController {
    static async createOrder(req: AuthenticatedRequest, res: Response) {
        try {
            const { products, deliveryAddress, estimatedDeliveryDate } = req.body;
            const userId = req.user?._id;

            if (!userId) {
                return res.status(401).json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' });
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
    static async updateOrderStatus(req: AuthenticatedRequest, res: Response) {
        try {
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

            const [error, result] = await catchError(OrderService.updateOrderStatus(userId.toString(), orderId, status, userRole, reason, notes, trackingNumber));

            if (error) {
                return res.status(400).json({ success: false, message: error.message, code: 'UPDATE_FAILED' });
            }

            return res.status(200).json({ success: true, message: 'Order status updated successfully', data: result?.order });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message || 'Internal server error', code: 'INTERNAL_ERROR' });
        }
    }
}

export default OrderController;
