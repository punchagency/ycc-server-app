import ShipmentModel, { IShippment } from "../models/shipment.model";
import OrderModel, { IOrder } from "../models/order.model";
import ProductModel from "../models/product.model";
import UserModel from "../models/user.model";
import { EasyPostIntegration } from "../integration/easypost";
import catchError from "../utils/catchError";
import { addNotificationJob, addEmailJob } from "../integration/QueueManager";
import { generateShippedEmailTemplate, generateDeliveredEmailTemplate, generateFailedEmailTemplate, generateReturnedEmailTemplate } from "../templates/shipment-email-templates";
import { logInfo } from "../utils/SystemLogs";

export class ShipmentService {
    static async createShipmentsForConfirmedItems(orderId: string, businessId: string) {
        const order = await OrderModel.findById(orderId);
        if (!order) throw new Error('Order not found');

        const confirmedItems = order.items.filter(
            item => item.businessId.toString() === businessId && item.status === 'confirmed'
        );
        if (confirmedItems.length === 0) throw new Error('No confirmed items found for this distributor');

        const existingShipment = await ShipmentModel.findOne({
            orderId: order._id,
            'items.businessId': businessId
        });
        if (existingShipment) return existingShipment;

        const productIds = confirmedItems.map(item => item.productId);
        const products = await ProductModel.find({ _id: { $in: productIds } });

        let totalWeight = 0;
        let maxLength = 0;
        let maxWidth = 0;
        let maxHeight = 0;

        for (const item of confirmedItems) {
            const product = products.find(p => p._id.toString() === item.productId.toString());
            if (product) {
                totalWeight += product.weight * item.quantity;
                maxLength = Math.max(maxLength, product.length);
                maxWidth = Math.max(maxWidth, product.width);
                maxHeight = Math.max(maxHeight, product.height);
            }
        }

        const easypost = new EasyPostIntegration();
        const [error, response] = await catchError(easypost.createShipmentLogistics({
            fromAddress: {
                street1: confirmedItems[0].fromAddress.street,
                street2: '',
                city: confirmedItems[0].fromAddress.city,
                state: confirmedItems[0].fromAddress.state,
                zip: confirmedItems[0].fromAddress.zip,
                country: confirmedItems[0].fromAddress.country,
                company: '',
                phone: ''
            },
            toAddress: {
                name: '',
                street1: order.deliveryAddress.street,
                city: order.deliveryAddress.city,
                state: order.deliveryAddress.state,
                zip: order.deliveryAddress.zip,
                country: order.deliveryAddress.country,
                phone: ''
            },
            parcel: {
                length: maxLength,
                width: maxWidth,
                height: maxHeight,
                weight: totalWeight
            }
        }));

        if (error) throw new Error(`EasyPost error: ${error.message}`);

        const rates = response.rates?.map((rate: any) => ({
            carrier: rate.carrier,
            rate: parseFloat(rate.rate),
            service: rate.service,
            estimatedDays: rate.delivery_days,
            guaranteedDeliveryDate: rate.delivery_date_guaranteed || false,
            deliveryDate: rate.est_delivery_date ? new Date(rate.est_delivery_date) : undefined,
            isSelected: false,
            id: rate.id
        })) || [];

        const shipment = await ShipmentModel.create({
            orderId: order._id,
            userId: order.userId,
            fromAddress: confirmedItems[0].fromAddress,
            toAddress: order.deliveryAddress,
            items: confirmedItems.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                businessId: item.businessId,
                discount: item.discount,
                pricePerItem: item.pricePerItem,
                totalPriceOfItems: item.totalPriceOfItems
            })),
            rates,
            status: 'rates_fetched'
        });

        await addNotificationJob({
            recipientId: order.userId,
            type: 'order',
            priority: 'high',
            title: 'Shipment Rates Available',
            message: `Shipping rates are now available for your order. Please select a rate to proceed with payment.`,
            data: { orderId: order._id, shipmentId: shipment._id }
        });

        return shipment;
    }

    static async getShipmentsByOrder(orderId: string, userId: string) {
        const order = await OrderModel.findById(orderId);
        if (!order) throw new Error('Order not found');
        if (order.userId.toString() !== userId) throw new Error('Unauthorized');

        return await ShipmentModel.find({ orderId })
            .populate('items.productId', 'name imageURLs')
            .populate('items.businessId', 'businessName');
    }

    static async selectShipmentRate(shipmentId: string, rateId: string, userId: string) {
        const shipment = await ShipmentModel.findById(shipmentId);
        if (!shipment) throw new Error('Shipment not found');
        if (shipment.userId.toString() !== userId) throw new Error('Unauthorized');

        const selectedRate = shipment.rates.find(r => r.id === rateId);
        if (!selectedRate) throw new Error('Rate not found');

        shipment.rates.forEach(r => r.isSelected = r.id === rateId);
        shipment.carrierName = selectedRate.carrier;
        shipment.status = 'rate_selected';
        await shipment.save();

        return shipment;
    }

    static async purchaseShipmentLabel(shipmentId: string, userId: string) {
        const shipment = await ShipmentModel.findById(shipmentId);
        if (!shipment) throw new Error('Shipment not found');
        if (shipment.userId.toString() !== userId) throw new Error('Unauthorized');
        if (shipment.status !== 'rate_selected') throw new Error('Rate must be selected first');

        const selectedRate = shipment.rates.find(r => r.isSelected);
        if (!selectedRate) throw new Error('No rate selected');

        const easypost = new EasyPostIntegration();
        const [error, response] = await catchError(easypost.purchaseLabel(shipmentId, selectedRate.id));
        
        if (error) throw new Error(`Label purchase failed: ${error.message}`);

        shipment.trackingNumber = response.tracking_code;
        shipment.labelUrl = response.postage_label?.label_url;
        shipment.status = 'label_purchased';
        await shipment.save();

        const order = await OrderModel.findById(shipment.orderId);
        if (order) {
            for (const shipmentItem of shipment.items) {
                const orderItem = order.items.find(i => 
                    i.productId.toString() === shipmentItem.productId.toString()
                );
                if (orderItem) orderItem.status = 'processing';
            }
            await order.save();
        }

        return shipment;
    }

    static async processTrackingWebhook(trackingCode: string, easypostStatus: string, webhookData: any) {
        const shipment = await ShipmentModel.findOne({ trackingNumber: trackingCode });
        if (!shipment) {
            console.warn(`Shipment not found for tracking: ${trackingCode}`);
            return;
        }

        const statusMap: Record<string, typeof shipment.status> = {
            'unknown': 'created',
            'pre_transit': 'label_purchased',
            'in_transit': 'shipped',
            'out_for_delivery': 'shipped',
            'delivered': 'delivered',
            'failure': 'failed',
            'return_to_sender': 'returned_to_supplier',
            'cancelled': 'failed'
        };

        const newStatus = statusMap[easypostStatus] || shipment.status;
        
        if (shipment.status === newStatus) {
            console.log(`No status change for shipment ${shipment._id}`);
            return;
        }

        const oldStatus = shipment.status;
        shipment.status = newStatus;
        shipment.lastWebhookData = webhookData;
        await shipment.save();

        logInfo({message: `Shipment ${shipment._id} status: ${oldStatus} → ${newStatus}`, source: 'ShipmentService.processTrackingWebhook'});

        const order: any = await OrderModel.findById(shipment.orderId);
        if (order) {
            const orderStatusMap: Record<string, 'processing' | 'shipped' | 'delivered' | 'cancelled'> = {
                'label_purchased': 'processing',
                'shipped': 'shipped',
                'delivered': 'delivered',
                'failed': 'cancelled',
                'returned_to_supplier': 'cancelled'
            };

            const targetOrderStatus = orderStatusMap[newStatus];
            if (targetOrderStatus) {
                for (const shipmentItem of shipment.items) {
                    const orderItem = order.items.find((i: any) => 
                        i.productId.toString() === shipmentItem.productId.toString()
                    );
                    if (orderItem) orderItem.status = targetOrderStatus;
                }
                await order.save();
            }
        }

        const notifiableStatuses = ['shipped', 'delivered', 'failed', 'returned_to_supplier'];
        if (notifiableStatuses.includes(newStatus)) {
            await this.sendTrackingNotification(shipment, order, webhookData);
        }
    }

    private static async sendTrackingNotification(shipment: IShippment, order: IOrder, trackingData: any) {
        const user = await UserModel.findById(order.userId);
        if (!user) return;

        const products = await ProductModel.find({ 
            _id: { $in: shipment.items.map((i: any) => i.productId) } 
        });

        const notificationMap: Record<string, { title: string; message: string; priority: 'medium' | 'high' | 'urgent' }> = {
            'shipped': {
                title: '🚢 Your Order is On Its Way!',
                message: `Your order has been shipped and is now in transit. Tracking: ${shipment.trackingNumber}`,
                priority: 'medium'
            },
            'delivered': {
                title: '📦 Package Delivered Successfully!',
                message: `Your order has been delivered successfully. We hope you're satisfied!`,
                priority: 'high'
            },
            'failed': {
                title: '🔄 Delivery Attempt Failed',
                message: `We encountered an issue delivering your order. Our team is working to resolve this.`,
                priority: 'urgent'
            },
            'returned_to_supplier': {
                title: '📋 Package Returned to Supplier',
                message: `Your order has been returned to the supplier. Please contact support immediately.`,
                priority: 'urgent'
            }
        };

        const notification = notificationMap[shipment.status];
        if (notification) {
            await addNotificationJob({
                recipientId: order.userId,
                type: 'order',
                priority: notification.priority,
                title: notification.title,
                message: notification.message,
                data: { 
                    orderId: order._id, 
                    shipmentId: shipment._id, 
                    trackingNumber: shipment.trackingNumber,
                    status: shipment.status
                }
            });

            const emailData = {
                customerName: `${user.firstName} ${user.lastName}`,
                orderNumber: order._id.toString(),
                trackingNumber: shipment.trackingNumber,
                carrierName: shipment.carrierName || trackingData.carrier || 'Carrier',
                products: products.map(p => ({ name: p.name, price: p.price, quantity: 1 })),
                deliveryAddress: order.deliveryAddress,
                estimatedDelivery: trackingData.est_delivery_date,
                failureReason: trackingData.status_detail,
                returnReason: trackingData.status_detail
            };

            let emailTemplate = '';
            let subject = '';

            switch (shipment.status) {
                case 'shipped':
                    emailTemplate = generateShippedEmailTemplate(emailData);
                    subject = `Order #${order._id} - Shipped & En Route`;
                    break;
                case 'delivered':
                    emailTemplate = generateDeliveredEmailTemplate(emailData);
                    subject = `Order #${order._id} - Delivered Successfully`;
                    break;
                case 'failed':
                    emailTemplate = generateFailedEmailTemplate(emailData);
                    subject = `Order #${order._id} - Delivery Issue`;
                    break;
                case 'returned_to_supplier':
                    emailTemplate = generateReturnedEmailTemplate(emailData);
                    subject = `Order #${order._id} - Returned to Supplier (Urgent)`;
                    break;
            }

            if (emailTemplate) {
                await addEmailJob({
                    email: user.email,
                    subject,
                    html: emailTemplate
                });
            }
        }
    }
}
