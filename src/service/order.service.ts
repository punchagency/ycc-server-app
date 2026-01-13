import OrderModel from "../models/order.model";
import ProductModel from "../models/product.model";
import BusinessModel from "../models/business.model";
import UserModel, { ROLES } from "../models/user.model";
import EventModel from "../models/event.model";
import uuid from "../utils/uuid";
import catchError from "../utils/catchError";
import { addEmailJob, addNotificationJob } from "../integration/QueueManager";
import { generateUserOrderConfirmationEmail } from "../templates/email-templates";
import { Schema } from "mongoose";
import CONSTANTS from "../config/constant";
import StripeService from "../integration/stripe";
import { ShipmentService } from "./shipment.service";
import ShipmentModel from "../models/shipment.model";
import InvoiceModel from "../models/invoice.model";
import 'dotenv/config';
import { logCritical } from "../utils/SystemLogs";
import { CurrencyConverter } from "../utils/currencyConverter";

export interface CreateOrderInput {
    userId: Schema.Types.ObjectId | string;
    userType: 'user' | 'distributor';
    products: { productId: string; quantity: number; discount?: number }[];
    deliveryAddress: { street: string; zipcode: string; city: string; state: string; country: string };
    estimatedDeliveryDate?: Date;
}

export class OrderService {
    private static async createOrUpdateInvoice(orderId: string, businessId: string) {
        const order = await OrderModel.findById(orderId).populate('userId');
        if (!order) throw new Error('Order not found');

        const user: any = order.userId;
        const stripe = StripeService.getInstance();

        let stripeCustomerId = user.stripeCustomerId;
        if (!stripeCustomerId) {
            const customers = await stripe.listCustomers({ email: user.email, limit: 1 });
            if (customers.data.length > 0) {
                stripeCustomerId = customers.data[0].id;
            } else {
                const customer = await stripe.createCustomer({
                    email: user.email,
                    name: `${user.firstName} ${user.lastName}`
                });
                stripeCustomerId = customer.id;
            }
            user.stripeCustomerId = stripeCustomerId;
            await user.save();
        }else{
            try{
                const customer = await stripe.retrieveCustomer(stripeCustomerId);
                if(!customer){
                    const customer = await stripe.createCustomer({
                        email: user.email,
                        name: `${user.firstName} ${user.lastName}`
                    });
                    stripeCustomerId = customer.id;
                    user.stripeCustomerId = stripeCustomerId;
                    await user.save();
                }
            }catch(error){
                const customer = await stripe.createCustomer({
                    email: user.email,
                    name: `${user.firstName} ${user.lastName}`
                });
                stripeCustomerId = customer.id;
                user.stripeCustomerId = stripeCustomerId;
                await user.save();
            }
        }

        if (order.stripeInvoiceId) {
            await this.addItemsToExistingInvoice(order, businessId, stripeCustomerId);
            return order.stripeInvoiceId;
        } else {
            const invoiceId = await this.createDraftInvoiceForOrder(order, stripeCustomerId);
            order.stripeInvoiceId = invoiceId;
            await order.save();
            return invoiceId;
        }
    }

    private static async createDraftInvoiceForOrder(order: any, stripeCustomerId: string) {
        const stripe = StripeService.getInstance();
        const invoice = await stripe.createinvoices({
            customer: stripeCustomerId,
            collection_method: 'send_invoice',
            days_until_due: 7,
            metadata: {
                orderId: order._id.toString(),
                userId: order.userId._id.toString(),
                customerEmail: order.userId.email,
                transactionType: 'order'
            }
        });

        const confirmedItems = order.items.filter((item: any) => item.status === 'confirmed');
        const businessIds = [...new Set(confirmedItems.map((item: any) => item.businessId.toString()))];

        for (const businessId of businessIds) {
            const business = await BusinessModel.findById(businessId);
            if (!business?.stripeAccountId) continue;

            const businessItems = confirmedItems.filter((item: any) => item.businessId.toString() === businessId);
            for (const item of businessItems) {
                const itemIndex = order.items.findIndex((i: any) => i._id?.toString() === item._id?.toString());
                const amountInUSD = await CurrencyConverter.convertToUSD(item.totalPriceOfItems, item.currency || 'usd');
                await stripe.createInvoiceItems({
                    customer: stripeCustomerId,
                    invoice: invoice.id,
                    amount: Math.round(amountInUSD * 100),
                    currency: 'usd',
                    description: `Product from ${business.businessName}`,
                    metadata: {
                        supplierId: businessId as string,
                        supplierUserId: business.userId.toString(),
                        type: 'supplier_product',
                        orderItemIndex: itemIndex.toString()
                    }
                });
            }
        }

        const shipments = await ShipmentModel.find({ orderId: order._id });
        for (const shipment of shipments) {
            if (shipment.isBusinessHandled && shipment.shipmentCost) {
                const manufacturerBusinessId = shipment.items[0]?.businessId;
                if (manufacturerBusinessId) {
                    const business = await BusinessModel.findById(manufacturerBusinessId);
                    await stripe.createInvoiceItems({
                        customer: stripeCustomerId,
                        invoice: invoice.id,
                        amount: Math.round(shipment.shipmentCost * 100),
                        currency: 'usd',
                        description: `Business Shipping - ${business?.businessName || 'Supplier'}`,
                        metadata: {
                            type: 'business_shipping',
                            supplierId: manufacturerBusinessId.toString(),
                            supplierUserId: business?.userId.toString() || '',
                            shipmentId: shipment._id.toString()
                        }
                    });
                }
            }
        }

        let confirmedTotalUSD = 0;
        for (const item of confirmedItems) {
            confirmedTotalUSD += await CurrencyConverter.convertToUSD(item.totalPriceOfItems, item.currency || 'usd');
        }
        const platformFee = confirmedTotalUSD * CONSTANTS.PLATFORM_FEE_PERCENT;
        if (platformFee > 0) {
            await stripe.createInvoiceItems({
                customer: stripeCustomerId,
                invoice: invoice.id,
                amount: Math.round(platformFee * 100),
                currency: 'usd',
                description: 'Platform Fee (10%)',
                metadata: { type: 'platform_fee' }
            });
        }

        return invoice.id;
    }

    private static async addItemsToExistingInvoice(order: any, businessId: string, stripeCustomerId: string) {
        const stripe = StripeService.getInstance();
        const business = await BusinessModel.findById(businessId);
        if (!business?.stripeAccountId) throw new Error('Business missing Stripe account');

        const businessItems = order.items.filter((item: any) => 
            item.businessId.toString() === businessId && item.status === 'confirmed'
        );

        for (const item of businessItems) {
            const itemIndex = order.items.findIndex((i: any) => i._id?.toString() === item._id?.toString());
            const amountInUSD = await CurrencyConverter.convertToUSD(item.totalPriceOfItems, item.currency || 'usd');
            await stripe.createInvoiceItems({
                customer: stripeCustomerId,
                invoice: order.stripeInvoiceId,
                amount: Math.round(amountInUSD * 100),
                currency: 'usd',
                description: `Product from ${business.businessName}`,
                metadata: {
                    supplierId: businessId,
                    supplierUserId: business.userId.toString(),
                    type: 'supplier_product',
                    orderItemIndex: itemIndex.toString()
                }
            });
        }

        const shipments = await ShipmentModel.find({ orderId: order._id, 'items.businessId': businessId });
        for (const shipment of shipments) {
            if (shipment.isBusinessHandled && shipment.shipmentCost) {
                await stripe.createInvoiceItems({
                    customer: stripeCustomerId,
                    invoice: order.stripeInvoiceId,
                    amount: Math.round(shipment.shipmentCost * 100),
                    currency: 'usd',
                    description: `Business Shipping - ${business.businessName}`,
                    metadata: {
                        type: 'business_shipping',
                        supplierId: businessId,
                        supplierUserId: business.userId.toString(),
                        shipmentId: shipment._id.toString()
                    }
                });
            }
        }

        const confirmedItems = order.items.filter((item: any) => item.status === 'confirmed');
        let confirmedTotalUSD = 0;
        for (const item of confirmedItems) {
            confirmedTotalUSD += await CurrencyConverter.convertToUSD(item.totalPriceOfItems, item.currency || 'usd');
        }
        const platformFee = confirmedTotalUSD * CONSTANTS.PLATFORM_FEE_PERCENT;
        
        const existingInvoice = await stripe.getInvoice(order.stripeInvoiceId);
        const existingPlatformFee = existingInvoice.lines.data.find((line: any) => line.metadata?.type === 'platform_fee');
        
        if (existingPlatformFee) {
            const newPlatformFeeAmount = Math.round(platformFee * 100);
            if (newPlatformFeeAmount !== existingPlatformFee.amount) {
                await stripe.createInvoiceItems({
                    customer: stripeCustomerId,
                    invoice: order.stripeInvoiceId,
                    amount: newPlatformFeeAmount - existingPlatformFee.amount,
                    currency: 'usd',
                    description: 'Platform Fee Adjustment',
                    metadata: { type: 'platform_fee_adjustment' }
                });
            }
        }
    }

    private static async shouldFinalizeInvoice(orderId: string): Promise<boolean> {
        const shipments = await ShipmentModel.find({ orderId });
        if (shipments.length === 0) return false;
        return shipments.every(s => s.isBusinessHandled || s.status === 'label_purchased');
    }

    private static async finalizeInvoiceIfReady(orderId: string) {
        const order = await OrderModel.findById(orderId);
        if (!order?.stripeInvoiceId) return;

        const shouldFinalize = await this.shouldFinalizeInvoice(orderId);
        if (!shouldFinalize) return;

        const stripe = StripeService.getInstance();
        const invoice = await stripe.getInvoice(order.stripeInvoiceId);
        if (invoice.status === 'draft') {
            const finalizedInvoice = await stripe.finalizeInvoice(order.stripeInvoiceId);
            order.stripeInvoiceUrl = finalizedInvoice.hosted_invoice_url;
            await order.save();

            await stripe.sendInvoice(order.stripeInvoiceId);

            const businessIds = [...new Set(order.items.map((item: any) => item.businessId))];
            const confirmedItems = order.items.filter((item: any) => item.status === 'confirmed');
            let confirmedTotalUSD = 0;
            for (const item of confirmedItems) {
                confirmedTotalUSD += await CurrencyConverter.convertToUSD(item.totalPriceOfItems, item.currency || 'usd');
            }

            await InvoiceModel.create({
                stripeInvoiceId: order.stripeInvoiceId,
                userId: order.userId,
                orderId: orderId,
                businessIds,
                amount: finalizedInvoice.amount_due / 100,
                platformFee: confirmedTotalUSD * CONSTANTS.PLATFORM_FEE_PERCENT,
                distributorAmount: (finalizedInvoice.amount_due / 100) - (confirmedTotalUSD * CONSTANTS.PLATFORM_FEE_PERCENT),
                currency: 'usd',
                status: 'pending',
                invoiceDate: new Date(),
                dueDate: finalizedInvoice.due_date ? new Date(finalizedInvoice.due_date * 1000) : new Date(),
                stripeInvoiceUrl: finalizedInvoice.hosted_invoice_url
            });
        }
    }
    private static async notifyOps(order: any, business: any, eventType: string) {
        const subject = `[OPS ALERT] Order ${order._id} - ${eventType.replaceAll('_', ' ').toUpperCase()}`;
        const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d32f2f; border-bottom: 2px solid #d32f2f; padding-bottom: 10px;">⚠️ Operations Alert</h2>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Event Details</h3>
            <p><strong>Event Type:</strong> ${eventType.replaceAll(/_/g, ' ').toUpperCase()}</p>
            <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
        </div>
    
        <div style="background-color: #fff; padding: 15px; border: 1px solid #ddd; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Order Information</h3>
            <p><strong>Order ID:</strong> ${order._id}</p>
            <p><strong>Status:</strong> ${order.status}</p>
            <p><strong>Payment Status:</strong> ${order.paymentStatus}</p>
            <p><strong>Total Amount:</strong> $${order.totalAmount.toFixed(2)}</p>
        </div>
    
        <div style="background-color: #fff; padding: 15px; border: 1px solid #ddd; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Business Information</h3>
            <p><strong>Business Name:</strong> ${business?.businessName || 'N/A'}</p>
            <p><strong>Business Email:</strong> ${business?.email || 'N/A'}</p>
        </div>
    
        <div style="background-color: #fff3cd; padding: 15px; border: 1px solid #ffc107; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>⚠️ Action Required:</strong> Please review this order immediately and take appropriate action.</p>
        </div>
        </div>
        `;

        await addEmailJob({
            email: process.env.ORDERS_EMAIL_USER || 'ops@example.com',
            subject,
            html
        });
    }
    private static async handleProductOrderEvent(orderId: string, eventType: 'client_cancel_after_confirmation' | 'client_cancel_after_shipment' | 'distributor_cancel') {
        const order = await OrderModel.findById(orderId);
        if (!order) throw new Error('Order not found');

        if (order.paymentStatus !== 'paid') {
            return { success: true, message: 'Order cancelled, no payment to refund' };
        }

        const invoiceId = order.stripeInvoiceId;
        if (!invoiceId) {
            return { success: false, message: 'No invoice found for refund processing' };
        }

        const stripeService = StripeService.getInstance();
        const { chargeId } = await stripeService.getPaymentIntentAndCharge(invoiceId);

        switch (eventType) {
            case 'client_cancel_after_confirmation': {
                const totalAmountUSD = await CurrencyConverter.convertToUSD(order.totalAmount, order.currency || 'usd');
                const refundAmount = Math.round(totalAmountUSD * 0.75);
                
                await stripeService.getPaymentIntentAndProcessRefund({
                    invoiceId,
                    refundAmount
                });

                for (const item of order.items) {
                    const business = await BusinessModel.findById(item.businessId);
                    if (business?.stripeAccountId && chargeId) {
                        const itemAmountUSD = await CurrencyConverter.convertToUSD(item.totalPriceOfItems, item.currency || 'usd');
                        const supplierAmount = Math.round(itemAmountUSD * 0.25);
                        await stripeService.createTransfer({
                            amount: supplierAmount,
                            destination: business.stripeAccountId,
                            source_transaction: chargeId as string,
                            description: `Refund for order ${order._id} - 25% to supplier`
                        });
                    }
                }

                return { success: true, message: '75% refund processed, 25% to suppliers' };
            }

            case 'client_cancel_after_shipment': {
                for (const item of order.items) {
                    const business = await BusinessModel.findById(item.businessId);
                    if (business?.stripeAccountId && chargeId) {
                        const itemAmountUSD = await CurrencyConverter.convertToUSD(item.totalPriceOfItems, item.currency || 'usd');
                        await stripeService.createTransfer({
                            amount: Math.round(itemAmountUSD * 100),
                            destination: business.stripeAccountId,
                            source_transaction: chargeId as string,
                            description: `Refund for order ${order._id} - full amount to supplier`
                        });
                    }
                }

                return { success: true, message: 'No refund - full amount to suppliers' };
            }

            case 'distributor_cancel': {
                const totalAmountUSD = await CurrencyConverter.convertToUSD(order.totalAmount, order.currency || 'usd');
                await stripeService.getPaymentIntentAndProcessRefund({
                    invoiceId,
                    refundAmount: Math.round(totalAmountUSD * 100),
                    options: {
                        refund_application_fee: true,
                        reverse_transfer: true
                    }
                });

                const business = await BusinessModel.findById(order.items[0]?.businessId);
                await this.notifyOps(order, business, eventType);

                return { success: true, message: 'Full refund processed - ops notified' };
            }

            default:
                throw new Error(`Unknown event type: ${eventType}`);
        }
    }
    static async createOrder(data: CreateOrderInput) {
        const { userId, userType, products, deliveryAddress, estimatedDeliveryDate } = data;

        const [userError, user] = await catchError(UserModel.findById(userId));
        if (userError || !user) throw new Error('User not found');

        const productIds = products.map(p => p.productId);
        const [productsError, productDocs] = await catchError(ProductModel.find({ _id: { $in: productIds } }).populate('businessId'));
        if (productsError || !productDocs || productDocs.length === 0) throw new Error('Products not found');

        const items = [];
        let totalAmountUSD = 0;

        for (const productInput of products) {
            const product = productDocs.find(p => p._id.toString() === productInput.productId);
            if (!product) throw new Error(`Product ${productInput.productId} not found`);

            const business = await BusinessModel.findById(product.businessId);
            if (!business) throw new Error(`Business not found for product ${productInput.productId}`);

            const pricePerItem = product.price;
            const discount = productInput.discount || 0;
            const totalPriceOfItems = pricePerItem ? (pricePerItem * productInput.quantity) - discount : 0;
            const confirmationToken = uuid();
            const confirmationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

            items.push({
                productId: product._id,
                quantity: productInput.quantity,
                businessId: business._id,
                discount,
                pricePerItem,
                currency: product.currency || 'usd',
                totalPriceOfItems,
                fromAddress: {
                    street: product.wareHouseAddress.street,
                    city: product.wareHouseAddress.city,
                    state: product.wareHouseAddress.state,
                    zip: product.wareHouseAddress.zipcode,
                    country: product.wareHouseAddress.country
                },
                status: 'pending',
                confirmationToken,
                confirmationExpires
            });

            totalAmountUSD += await CurrencyConverter.convertToUSD(totalPriceOfItems, product.currency || 'usd');
        }

        const platformFee = totalAmountUSD * CONSTANTS.PLATFORM_FEE_PERCENT;
        const total = totalAmountUSD + platformFee;

        const order = await OrderModel.create({
            userId,
            items,
            status: 'pending',
            userType: userType,
            deliveryAddress: {
                street: deliveryAddress.street,
                city: deliveryAddress.city,
                state: deliveryAddress.state,
                zip: deliveryAddress.zipcode,
                country: deliveryAddress.country
            },
            currency: 'usd',
            total,
            totalAmount: totalAmountUSD,
            platformFee,
            paymentStatus: 'pending',
            orderHistory: []
        });

        await addNotificationJob({
            recipientId: userId,
            type: 'order',
            priority: 'medium',
            title: 'Order Created',
            message: `Your order has been created successfully and is pending confirmation from suppliers.`,
            data: { orderId: order._id }
        });

        const businessMap = new Map();
        for (const item of items) {
            const businessId = item.businessId.toString();
            if (!businessMap.has(businessId)) {
                businessMap.set(businessId, []);
            }
            businessMap.get(businessId).push(item);
        }

        for (const [businessId, businessItems] of businessMap.entries()) {
            const business = await BusinessModel.findById(businessId).populate('userId');
            if (!business) continue;

            const businessProducts = [];
            for (const item of businessItems) {
                const product = productDocs.find(p => p._id.toString() === item.productId.toString());
                if (product) {
                    businessProducts.push({ ...product.toObject(), quantity: item.quantity });
                }
            }

            const businessTotal = businessItems.reduce((sum: number, item: Record<string, number>) => sum + Number(item.totalPriceOfItems), 0);
            const confirmationUrl = `${process.env.FRONTEND_URL}/api/crew-orders/confirm/${businessItems[0].confirmationToken}`;
            const deliveryAddressStr = `${deliveryAddress.street}, ${deliveryAddress.city}, ${deliveryAddress.state} ${deliveryAddress.zipcode}, ${deliveryAddress.country}`;

            const emailHtml = await generateUserOrderConfirmationEmail({
                supplier: business,
                crew: user,
                products: businessProducts as any,
                totalPrice: businessTotal,
                deliveryDate: estimatedDeliveryDate || new Date(),
                deliveryAddress: deliveryAddressStr,
                additionalNotes: '',
                confirmationUrl
            });

            await addEmailJob({
                email: business.email,
                subject: 'New Order Confirmation Required',
                html: emailHtml
            });

            await addNotificationJob({
                recipientId: business.userId,
                type: 'order',
                priority: 'high',
                title: 'New Order Received',
                message: `You have received a new order from ${user.firstName} ${user.lastName}. Please confirm within 24 hours.`,
                data: { orderId: order._id, businessId }
            });
        }

        if (estimatedDeliveryDate) {
            await EventModel.create({
                userId,
                title: 'Order Delivery',
                description: `Estimated delivery for order #${order._id}`,
                start: estimatedDeliveryDate,
                end: estimatedDeliveryDate,
                allDay: true,
                type: 'reminder',
                guestIds: [],
                guestEmails: []
            });
        }

        return { success: true, order };
    }
    static async getOrderById(id: string, userId: string, userRole: typeof ROLES[number]) {
        const order = await OrderModel.findById(id);
        if (!order) throw new Error('Order not found');

        if (userRole === 'user') {
            // if (order.userId.toString() !== userId || order.userType !== 'user') {
            //     throw new Error('user not authorized to view this order');
            // }
            if (order.userId.toString() !== userId) {
                throw new Error('user not authorized to view this order');
            }
        } else if (userRole === 'distributor') {
            const business = await BusinessModel.findOne({ userId });
            if (!business) throw new Error('Business not found');

            // const isOrderPlacer = order.userId.toString() === userId && order.userType === 'distributor';
            const isOrderPlacer = order.userId.toString() === userId
            // const isSupplier = order.userType === 'user' && order.items.some(item => 
            //     item.businessId.toString() === business._id.toString()
            // );
            const isSupplier = order.items.some(item => 
                item.businessId.toString() === business._id.toString()
            );

            if (!isOrderPlacer && !isSupplier) {
                throw new Error('distributor not authorized to view this order');
            }
        } else if (userRole === 'manufacturer') {
            const business = await BusinessModel.findOne({ userId });
            if (!business) throw new Error('Business not found');

            const isSupplier = order.userType === 'distributor' && order.items.some(item => 
                item.businessId.toString() === business._id.toString()
            );

            if (!isSupplier) {
                throw new Error('manufacturer not authorized to view this order');
            }
        }

        const productIds = order.items.map(item => item.productId);
        const businessIds = [...new Set(order.items.map(item => item.businessId))];

        const [user, products, businesses, shipments] = await Promise.all([
            UserModel.findById(order.userId).select('firstName lastName email phone'),
            ProductModel.find({ _id: { $in: productIds } }).select('name price imageURLs'),
            BusinessModel.find({ _id: { $in: businessIds } }).select('businessName email phone address'),
            ShipmentModel.find({ orderId: id })
        ]);

        const productMap = new Map(products.map(p => [p._id.toString(), p]));
        const businessMap = new Map(businesses.map(b => [b._id.toString(), b]));

        const orderObj: Record<string, any> = order.toObject();
        orderObj.userId = user;
        orderObj.items = orderObj.items.map((item: any) => ({
            ...item,
            productId: productMap.get(item.productId.toString()),
            businessId: businessMap.get(item.businessId.toString())
        }));
        orderObj.shipments = shipments;

        if (userRole === 'distributor' && (!order.userType || order.userType === 'user')) {
            const business = await BusinessModel.findOne({ userId });
            if (business) {
                orderObj.items = orderObj.items.filter((item: any) => 
                    item.businessId._id.toString() === business._id.toString()
                );
            }
        }

        return orderObj;
    }
    static async getOrders({userId, role, page = 1, limit = 10, status, paymentStatus, startDate, endDate, sortBy = 'createdAt', orderBy = 'desc', userType}:{
        userId: string;
        role: typeof ROLES[number];
        page?: number;
        limit?: number;
        status?: string;
        paymentStatus?: string;
        startDate?: Date;
        endDate?: Date;
        sortBy?: string;
        orderBy?: string;
        userType?: 'user' | 'distributor';
    }) {
        const query: any = {};

        if (role === 'user') {
            query.userId = userId;
            query.$or = [{ userType: 'user' }, { userType: null }, { userType: { $exists: false } }];
        } else if (role === 'distributor') {
            const business = await BusinessModel.findOne({ userId });
            if (!business) throw new Error('Business not found');
            
            if (userType === 'distributor') {
                query.userId = userId;
                query.userType = 'distributor';
            } else {
                query['items.businessId'] = business._id;
                query.$or = [{ userType: 'user' }, { userType: null }, { userType: { $exists: false } }];
            }
        } else if (role === 'manufacturer') {
            const business = await BusinessModel.findOne({ userId });
            if (!business) throw new Error('Business not found');
            query['items.businessId'] = business._id;
            query.userType = 'distributor';
        }

        if (status) query.status = status;
        if (paymentStatus) query.paymentStatus = paymentStatus;
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = startDate;
            if (endDate) query.createdAt.$lte = endDate;
        }

        const sortOptions: any = {};
        sortOptions[sortBy] = orderBy === 'asc' ? 1 : -1;

        const skip = (page - 1) * limit;
        const total = await OrderModel.countDocuments(query);

        const orders = await OrderModel.find(query)
            .populate('userId', 'firstName lastName email phone')
            .populate('items.productId', 'name price imageURLs')
            .populate('items.businessId', 'businessName email phone')
            .sort(sortOptions)
            .skip(skip)
            .limit(limit);

        return {
            orders,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit),
                limit
            }
        };
    }
    static async confirmOrder(token: string) {
        const order = await OrderModel.findOne({ 'items.confirmationToken': token });
        if (!order) throw new Error('Order not found or invalid token');

        const item = order.items.find(i => i.confirmationToken === token);
        if (!item) throw new Error('Invalid confirmation token');

        if (item.confirmationExpires < new Date()) throw new Error('Confirmation token has expired');
        if (item.status !== 'pending') throw new Error('Order item already processed');

        item.status = 'confirmed';
        const allConfirmed = order.items.every(i => i.status === 'confirmed');
        if (allConfirmed) order.status = 'confirmed';

        // Deduct inventory when order is confirmed
        const product = await ProductModel.findById(item.productId);
        if (product) {
            product.quantity = Math.max(0, product.quantity - item.quantity);
            await product.save();
        }

        await order.save();

        const [shipmentError] = await catchError(
            ShipmentService.createShipmentsForConfirmedItems(order._id.toString(), item.businessId.toString())
        );
        if (shipmentError) {
            console.error('Shipment creation failed:', shipmentError);
        }

        const user = await UserModel.findById(order.userId);
        const business = await BusinessModel.findById(item.businessId);

        if (user) {
            await addNotificationJob({
                recipientId: user._id,
                type: 'order',
                priority: 'high',
                title: 'Order Confirmed',
                message: `Your order has been confirmed by ${business?.businessName || 'the supplier'}.`,
                data: { orderId: order._id }
            });

            await addEmailJob({
                email: user.email,
                subject: `Order #${order._id} has been confirmed`,
                html: `
                <h1>Your Order Has Been Confirmed</h1>
                <p>Dear ${user.firstName} ${user.lastName},</p>
                <p>Your order #${order._id} has been confirmed by ${business?.businessName || 'the supplier'}.</p>
                <p>You can view your order details in your account.</p>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/crew/orders/${order._id}" style="display:inline-block;background-color:#4CAF50;color:white;padding:14px 20px;text-align:center;text-decoration:none;font-size:16px;margin:4px 2px;cursor:pointer;border-radius:4px;">
                    View Order
                </a>
                <p>Thank you for your order!</p>
                `
            });
        }

        return { success: true, orderId: order._id };
    }
    static async declineOrder(token: string, reason?: string) {
        const order = await OrderModel.findOne({ 'items.confirmationToken': token });
        if (!order) throw new Error('Order not found or invalid token');

        const item = order.items.find(i => i.confirmationToken === token);
        if (!item) throw new Error('Invalid confirmation token');

        if (item.confirmationExpires < new Date()) throw new Error('Confirmation token has expired');
        if (item.status !== 'pending') throw new Error('Order item already processed');

        item.status = 'declined';
        order.status = 'declined';

        // No inventory restoration needed for declined orders since inventory was never deducted (order was still pending)

        await order.save();

        const user = await UserModel.findById(order.userId);
        const business = await BusinessModel.findById(item.businessId);

        if (user) {
            await addNotificationJob({
                recipientId: user._id,
                type: 'order',
                priority: 'urgent',
                title: 'Order Declined',
                message: `Your order has been declined by ${business?.businessName || 'the supplier'}. ${reason ? `Reason: ${reason}` : ''}`,
                data: { orderId: order._id }
            });

            await addEmailJob({
                email: user.email,
                subject: `Order #${order._id} has been declined`,
                html: `
                <h1>Your Order Has Been Declined</h1>
                <p>Dear ${user.firstName} ${user.lastName},</p>
                <p>Unfortunately, your order #${order._id} has been declined by ${business?.businessName || 'the supplier'}.</p>
                ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
                <p>Please contact support if you have any questions.</p>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/crew/orders/${order._id}" style="display:inline-block;background-color:#f44336;color:white;padding:14px 20px;text-align:center;text-decoration:none;font-size:16px;margin:4px 2px;cursor:pointer;border-radius:4px;">
                    View Order
                </a>
                `
            });
        }

        return { success: true, orderId: order._id };
    }
    static async updateUserOrderStatus({orderId, status, userId, userRole, notes, reason, trackingNumber, enableShipping, shipmentCost }:{userId: string, orderId: string, status: 'confirmed' | 'processing' | 'shipped' | 'out_for_delivery'| 'cancelled', userRole: typeof ROLES[number], reason?: string, notes?: string, trackingNumber?: string, enableShipping?: boolean, shipmentCost?: number}) {
        const order = await OrderModel.findById(orderId);
        if (!order) throw new Error('Order not found');
        if(!order.userType){
            order.userType = "user";
            await order.save();
        }
        // if (order.userId.toString() !== userId) throw new Error('Unauthorized to update this order');

        if (userRole === 'user') {
            const validTransitions: Record<string, string[]> = {
                'pending': ['confirmed', 'cancelled'],
                'confirmed': ['cancelled'],
                'declined': [],
                'processing': [],
                'out_for_delivery': [],
                'shipped': ['delivered'],
                'delivered': [],
                'cancelled': []
            };

            if (!validTransitions[order.status]?.includes(status)) {
                throw new Error(`Cannot transition from ${order.status} to ${status}`);
            }

            const fromStatus = order.status;
            order.status = status;
            order.orderHistory.push({
                fromStatus,
                toStatus: status,
                changedBy: userId,
                userRole,
                reason,
                notes,
                changedAt: new Date()
            });

            // Restore inventory when order is cancelled
            if (status === 'cancelled') {
                for (const item of order.items) {
                    if (item.status === 'confirmed' || item.status === 'processing') {
                        const product = await ProductModel.findById(item.productId);
                        if (product) {
                            product.quantity += item.quantity;
                            await product.save();
                        }
                    }
                }
            }

            await order.save();

            if (status === 'cancelled' && order.paymentStatus === 'paid') {
                const hasShippedItems = order.items.some(i => ['shipped', 'out_for_delivery', 'delivered'].includes(i.status));
                const eventType = hasShippedItems ? 'client_cancel_after_shipment' : 'client_cancel_after_confirmation';
                await this.handleProductOrderEvent(order._id.toString(), eventType);
            }

            const user = await UserModel.findById(userId);
            await addNotificationJob({
                recipientId: userId,
                type: 'order',
                priority: 'high',
                title: 'Order Status Updated',
                message: `Your order #${order._id} status has been updated to ${status}.`,
                data: { orderId: order._id, status }
            });

            await addEmailJob({
                email: user?.email || '',
                subject: `Order #${order._id} Status Updated`,
                html: `
                <h1>Order Status Updated</h1>
                <p>Dear ${user?.firstName} ${user?.lastName},</p>
                <p>Your order #${order._id} status has been updated to <strong>${status}</strong>.</p>
                ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
                ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/crew/orders/${order._id}" style="display:inline-block;background-color:#4CAF50;color:white;padding:14px 20px;text-align:center;text-decoration:none;font-size:16px;margin:4px 2px;cursor:pointer;border-radius:4px;">
                    View Order
                </a>
                `
            });
        } else if (userRole === 'distributor') {
            const business = await BusinessModel.findOne({ userId });
            if (!business) throw new Error('Business not found');

            const businessItems = order.items.filter(i => i.businessId.toString() === business._id.toString());
            if (businessItems.length === 0) throw new Error('No items found for your business in this order');

            const validTransitions: Record<string, string[]> = {
                'pending': ['confirmed', 'declined', "cancelled"],
                'confirmed': ['processing', 'declined', "cancelled"],
                'declined': [],
                'processing': ['shipped', 'declined', "cancelled", "out_for_delivery"],
                'shipped': ['out_for_delivery', 'declined', "cancelled"],
                'out_for_delivery': ['declined', "cancelled", 'delivered'],
                'delivered': [],
                'cancelled': []
            };

            for (const item of businessItems) {
                if (!validTransitions[item.status]?.includes(status)) {
                    throw new Error(`Cannot transition from ${item.status} to ${status}`);
                }

                const fromStatus = item.status;
                item.status = status;

                // Deduct inventory when distributor confirms order
                if (status === 'confirmed' && fromStatus === 'pending') {
                    const product = await ProductModel.findById(item.productId);
                    if (product) {
                        product.quantity = Math.max(0, product.quantity - item.quantity);
                        await product.save();
                    }
                }

                // Restore inventory when distributor cancels order
                if (status === 'cancelled' && (fromStatus === 'confirmed' || fromStatus === 'processing')) {
                    const product = await ProductModel.findById(item.productId);
                    if (product) {
                        product.quantity += item.quantity;
                        await product.save();
                    }
                }

                order.orderHistory.push({
                    fromStatus,
                    toStatus: status,
                    changedBy: userId,
                    userRole,
                    notes,
                    changedAt: new Date()
                });
            }

            if (status === 'confirmed' && enableShipping !== undefined) {
                order.enableShipping = enableShipping;
            }

            if (status === 'out_for_delivery' && trackingNumber) {
                order.trackingNumber = trackingNumber;
            }

            const allSameStatus = order.items.every(i => i.status === status);
            if (allSameStatus) {
                order.status = status;
            } else {
                const activeItems = order.items.filter((i: any) => !['declined', 'cancelled'].includes(i.status));
                if (activeItems.length > 0 && activeItems.every((i: any) => i.status === status)) {
                    order.status = status;
                }
            }

            await order.save();

            if (status === 'cancelled' && order.paymentStatus === 'paid') {
                await this.handleProductOrderEvent(order._id.toString(), 'distributor_cancel');
            }

            if (status === 'confirmed') {
                if (enableShipping) {
                    const [shipmentError] = await catchError(
                        ShipmentService.createShipmentsForConfirmedItems(order._id.toString(), business._id.toString())
                    );
                    if (shipmentError) {
                        logCritical({message: `Shipment creation failed: ${shipmentError.message}`, error: shipmentError, source: "OrderService.updateOrderStatus"});
                        throw new Error('Shipment creation failed');
                    }
                } else if (enableShipping === false && shipmentCost) {
                    const [shipmentError] = await catchError(
                        ShipmentService.createBusinessHandledShipment(order._id.toString(), business._id.toString(), shipmentCost)
                    );
                    if (shipmentError) {
                        logCritical({message: `Business-handled shipment creation failed: ${shipmentError.message}`, error: shipmentError, source: "OrderService.updateOrderStatus"});
                        throw new Error('Business-handled shipment creation failed');
                    }
                }

                const [invoiceError] = await catchError(
                    this.createOrUpdateInvoice(order._id.toString(), business._id.toString())
                );
                if (invoiceError) {
                    logCritical({message: `Invoice creation/update failed: ${invoiceError.message}`, error: invoiceError, source: "OrderService.updateOrderStatus"});
                    throw new Error('Invoice creation/update failed');
                }

                await this.finalizeInvoiceIfReady(order._id.toString());
            }

            const user = await UserModel.findById(order.userId);
            await addNotificationJob({
                recipientId: order.userId,
                type: 'order',
                priority: 'high',
                title: 'Order Items Status Updated',
                message: `Items in your order #${order._id} have been updated to ${status} by ${business.businessName}.`,
                data: { orderId: order._id, status }
            });

            await addEmailJob({
                email: user?.email || '',
                subject: `Order #${order._id} Items Status Updated`,
                html: `
            <h1>Order Items Status Updated</h1>
            <p>Dear ${user?.firstName} ${user?.lastName},</p>
            <p>Items in your order #${order._id} have been updated to <strong>${status}</strong> by ${business.businessName}.</p>
            ${trackingNumber ? `<p><strong>Tracking Number:</strong> ${trackingNumber}</p>` : ''}
            ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/crew/orders/${order._id}" style="display:inline-block;background-color:#4CAF50;color:white;padding:14px 20px;text-align:center;text-decoration:none;font-size:16px;margin:4px 2px;cursor:pointer;border-radius:4px;">
                View Order
            </a>
            `
            });
        } else{
            throw new Error('Invalid user role');
        }

        return { success: true, order };
    }
    static async updateDistributorOrderStatus({userId, orderId, status, userRole, notes, reason, enableShipping, trackingNumber, shipmentCost }: { userId: string, orderId: string, status: 'confirmed' | 'processing' | 'shipped' | 'out_for_delivery' | 'cancelled', reason?: string, notes?: string, userRole: typeof ROLES[number], enableShipping?: boolean, trackingNumber?: string, shipmentCost?: number}){
        const order = await OrderModel.findById(orderId);
        if (!order) throw new Error('Order not found');

        if (order.userType !== 'distributor') throw new Error('This endpoint is only for distributor orders');

        if (userRole === 'distributor') {
            if (order.userId.toString() !== userId) throw new Error('Unauthorized to update this order');
            if (status !== 'cancelled') throw new Error('Distributors can only cancel orders');

            const fromStatus = order.status;
            order.status = 'cancelled';
            order.orderHistory.push({
                fromStatus,
                toStatus: 'cancelled',
                changedBy: userId,
                userRole,
                reason,
                notes,
                changedAt: new Date()
            });

            // Restore inventory when distributor cancels their own order
            for (const item of order.items) {
                if (item.status === 'confirmed' || item.status === 'processing') {
                    const product = await ProductModel.findById(item.productId);
                    if (product) {
                        product.quantity += item.quantity;
                        await product.save();
                    }
                }
            }

            await order.save();

            if (order.paymentStatus === 'paid') {
                await this.handleProductOrderEvent(order._id.toString(), 'distributor_cancel');
            } else{
                order.paymentStatus = 'cancelled';
                await order.save();
            }

            const distributor = await UserModel.findById(userId);
            const businessIds = [...new Set(order.items.map(item => item.businessId))];
            const businesses = await BusinessModel.find({ _id: { $in: businessIds } });

            for (const business of businesses) {
                await addNotificationJob({
                    recipientId: business.userId,
                    type: 'order',
                    priority: 'high',
                    title: 'Order Cancelled',
                    message: `Order #${order._id} has been cancelled by ${distributor?.firstName} ${distributor?.lastName}.`,
                    data: { orderId: order._id, status: 'cancelled' }
                });
            }

            return { success: true, order };
        } else if (userRole === 'manufacturer') {
            const business = await BusinessModel.findOne({ userId });
            if (!business) throw new Error('Business not found');

            const businessItems = order.items.filter(i => i.businessId.toString() === business._id.toString());
            if (businessItems.length === 0) throw new Error('No items found for your business in this order');

            const validTransitions: Record<string, string[]> = {
                'pending': ['confirmed', 'cancelled'],
                'confirmed': ['processing', 'cancelled'],
                'declined': [],
                'processing': ['shipped', 'cancelled'],
                'shipped': ['out_for_delivery', 'cancelled'],
                'out_for_delivery': ['cancelled'],
                'delivered': [],
                'cancelled': []
            };

            for (const item of businessItems) {
                if (!validTransitions[item.status]?.includes(status)) {
                    throw new Error(`Cannot transition from ${item.status} to ${status}`);
                }

                const fromStatus = item.status;
                item.status = status;

                // Deduct inventory when manufacturer confirms order
                if (status === 'confirmed' && fromStatus === 'pending') {
                    const product = await ProductModel.findById(item.productId);
                    if (product) {
                        product.quantity = Math.max(0, product.quantity - item.quantity);
                        await product.save();
                    }
                }

                // Restore inventory when manufacturer cancels order
                if (status === 'cancelled' && (fromStatus === 'confirmed' || fromStatus === 'processing')) {
                    const product = await ProductModel.findById(item.productId);
                    if (product) {
                        product.quantity += item.quantity;
                        await product.save();
                    }
                }

                order.orderHistory.push({
                    fromStatus,
                    toStatus: status,
                    changedBy: userId,
                    userRole,
                    reason,
                    notes,
                    changedAt: new Date()
                });
            }

            if (status === 'confirmed' && enableShipping !== undefined) {
                order.enableShipping = enableShipping;
            }

            if (status === 'out_for_delivery' && trackingNumber) {
                order.trackingNumber = trackingNumber;
            }

            const allSameStatus = order.items.every(i => i.status === status);
            if (allSameStatus) {
                order.status = status;
            }

            await order.save();

            if (status === 'confirmed' && enableShipping) {
                const [shipmentError] = await catchError(
                    ShipmentService.createShipmentsForConfirmedItems(order._id.toString(), business._id.toString())
                );
                if (shipmentError) {
                    logCritical({message: `Shipment creation failed: ${shipmentError.message}`, error: shipmentError, source: "OrderService.updateDistributorOrderStatus"});
                    throw new Error('Shipment creation failed');
                }
            } else if (status === 'confirmed' && enableShipping === false && shipmentCost) {
                const [shipmentError] = await catchError(
                    ShipmentService.createBusinessHandledShipment(order._id.toString(), business._id.toString(), shipmentCost)
                );
                if (shipmentError) {
                    logCritical({message: `Manufacturer shipment creation failed: ${shipmentError.message}`, error: shipmentError, source: "OrderService.updateDistributorOrderStatus"});
                    throw new Error('Manufacturer shipment creation failed');
                }

                const [invoiceError] = await catchError(
                    ShipmentService.createAndFinalizeBusinessInvoice(order._id.toString())
                );
                if (invoiceError) {
                    logCritical({message: `Invoice creation failed: ${invoiceError.message}`, error: invoiceError, source: "OrderService.updateDistributorOrderStatus"});
                    throw new Error('Invoice creation failed');
                }
            }

            const distributor = await UserModel.findById(order.userId);
            await addNotificationJob({
                recipientId: order.userId,
                type: 'order',
                priority: 'high',
                title: 'Order Status Updated',
                message: `Items in your order #${order._id} have been updated to ${status} by ${business.businessName}.`,
                data: { orderId: order._id, status }
            });

            await addEmailJob({
                email: distributor?.email || '',
                subject: `Order #${order._id} Status Updated`,
                html: `
                <h1>Order Status Updated</h1>
                <p>Dear ${distributor?.firstName} ${distributor?.lastName},</p>
                <p>Items in your order #${order._id} have been updated to <strong>${status}</strong> by ${business.businessName}.</p>
                ${trackingNumber ? `<p><strong>Tracking Number:</strong> ${trackingNumber}</p>` : ''}
                ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
                ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/distributor/orders/${order._id}" style="display:inline-block;background-color:#4CAF50;color:white;padding:14px 20px;text-align:center;text-decoration:none;font-size:16px;margin:4px 2px;cursor:pointer;border-radius:4px;">
                    View Order
                </a>
                `
            });

            return { success: true, order };
        } else {
            throw new Error('Invalid user role');
        }
    }
}