import ShipmentModel, { IShipment } from "../models/shipment.model";
import OrderModel, { IOrder } from "../models/order.model";
import ProductModel from "../models/product.model";
import UserModel from "../models/user.model";
import { EasyPostIntegration } from "../integration/easypost";
import catchError from "../utils/catchError";
import { addNotificationJob, addEmailJob } from "../integration/QueueManager";
import { generateShippedEmailTemplate, generateDeliveredEmailTemplate, generateFailedEmailTemplate, generateReturnedEmailTemplate } from "../templates/shipment-email-templates";
import { generateShippingLabelEmail } from "../templates/email-templates";
import { logInfo, logError } from "../utils/SystemLogs";
import { AddressFormatter } from "../utils/StateFormatter";
import BusinessModel from "../models/business.model";
import InvoiceModel from "../models/invoice.model";
import StripeService from "../integration/stripe";
import CONSTANTS from "../config/constant";

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

        const MAX_WEIGHT = 1120;
        const MAX_LENGTH = 108;

        const itemGroups: typeof confirmedItems[] = [];
        let currentGroup: typeof confirmedItems = [];
        let currentWeight = 0;
        let currentMaxLength = 0;

        for (const item of confirmedItems) {
            const product = products.find(p => p._id.toString() === item.productId.toString());
            if (!product) continue;

            const itemWeight = parseFloat((product.weight * item.quantity).toFixed(1));
            const itemLength = parseFloat(product.length.toFixed(1));

            if (currentWeight + itemWeight > MAX_WEIGHT || Math.max(currentMaxLength, itemLength) > MAX_LENGTH) {
                if (currentGroup.length > 0) itemGroups.push(currentGroup);
                currentGroup = [item];
                currentWeight = itemWeight;
                currentMaxLength = itemLength;
            } else {
                currentGroup.push(item);
                currentWeight += itemWeight;
                currentMaxLength = Math.max(currentMaxLength, itemLength);
            }
        }
        if (currentGroup.length > 0) itemGroups.push(currentGroup);

        const fromAddr = AddressFormatter.formatAddress(confirmedItems[0].fromAddress);
        const toAddr = AddressFormatter.formatAddress(order.deliveryAddress);
        const business = await BusinessModel.findById(businessId);
        const user = await UserModel.findById(order.userId);

        const parsedFromAddress = {
            street1: fromAddr.street || '',
            street2: null,
            city: fromAddr.city || '',
            state: fromAddr.state || '',
            zip: fromAddr.zip || '',
            country: fromAddr.country || '',
            company: business?.businessName || '',
            phone: business?.phone || ''
        };
        const parsedToAddress = {
            name: user ? `${user.firstName} ${user.lastName}` : '',
            street1: toAddr.street || '',
            city: toAddr.city || '',
            state: toAddr.state || '',
            zip: toAddr.zip || '',
            country: toAddr.country || '',
            email: user?.email || '',
            phone: user?.phone || ''
        };

        const shipments = [];
        const easypost = new EasyPostIntegration();

        for (const group of itemGroups) {
            let totalWeight = 0;
            let maxLength = 0;
            let maxWidth = 0;
            let maxHeight = 0;

            for (const item of group) {
                const product = products.find(p => p._id.toString() === item.productId.toString());
                if (product) {
                    totalWeight += product.weight * item.quantity;
                    maxLength = Math.max(maxLength, product.length);
                    maxWidth = Math.max(maxWidth, product.width);
                    maxHeight = Math.max(maxHeight, product.height);
                }
            }

            const [error, response] = await catchError(easypost.createShipmentLogistics({
                fromAddress: parsedFromAddress,
                toAddress: parsedToAddress,
                parcel: {
                    length: parseFloat(maxLength.toFixed(1)),
                    width: parseFloat(maxWidth.toFixed(1)),
                    height: parseFloat(maxHeight.toFixed(1)),
                    weight: parseFloat(totalWeight.toFixed(1))
                },
                customsInfo: this.isInternational(fromAddr.country || "", toAddr.country || "") 
                    ? this.buildCustomsInfo(group, products) 
                    : undefined
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
                items: group.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    businessId: item.businessId,
                    discount: item.discount,
                    pricePerItem: item.pricePerItem,
                    totalPriceOfItems: item.totalPriceOfItems
                })),
                rates,
                customsInfo: this.isInternational(fromAddr.country || "", toAddr.country || "") 
                    ? this.buildCustomsInfo(group, products) 
                    : undefined,
                status: 'rates_fetched'
            });

            shipments.push(shipment);
        }

        await addNotificationJob({
            recipientId: order.userId,
            type: 'order',
            priority: 'high',
            title: 'Shipment Rates Available',
            message: `Shipping rates are now available for your order. Please select a rate to proceed with payment.`,
            data: { orderId: order._id, shipmentId: shipments[0]._id }
        });

        return shipments.length === 1 ? shipments[0] : shipments;
    }
    static async createBusinessHandledShipment(orderId: string, businessId: string, shipmentCost: number) {
        const order = await OrderModel.findById(orderId);
        if (!order) throw new Error('Order not found');

        const confirmedItems = order.items.filter(
            item => item.businessId.toString() === businessId && item.status === 'confirmed'
        );
        if (confirmedItems.length === 0) throw new Error('No confirmed items found');

        const existingShipment = await ShipmentModel.findOne({
            orderId: order._id,
            'items.businessId': businessId
        });
        if (existingShipment) return existingShipment;

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
            rates: [],
            shipmentCost,
            isBusinessHandled: true,
            status: 'created'
        });

        await addNotificationJob({
            recipientId: order.userId,
            type: 'order',
            priority: 'high',
            title: 'Order Confirmed - Business Handling Shipment',
            message: `Your order has been confirmed. The supplier will handle shipment directly. Shipment cost: $${shipmentCost.toFixed(2)}`,
            data: { orderId: order._id, shipmentId: shipment._id, shipmentCost }
        });

        return shipment;
    }
    static async createAndFinalizeBusinessInvoice(orderId: string) {
        try {
            const { invoice, order } = await this.createDraftInvoice(orderId);
            
            const stripe = StripeService.getInstance();
            
            const finalizedInvoice = await stripe.finalizeInvoice(invoice.id);
    
            order.stripeInvoiceUrl = finalizedInvoice.hosted_invoice_url;
            order.stripeInvoiceId = invoice.id;
            await order.save();
    
            await stripe.sendInvoice(invoice.id);
    
            const businessIds = [...new Set(order.items.map(item => item.businessId))];
            
            await InvoiceModel.create({
                stripeInvoiceId: invoice.id,
                userId: order.userId,
                orderId: orderId,
                businessIds,
                amount: finalizedInvoice.amount_due / 100,
                platformFee: order.platformFee,
                currency: 'usd',
                status: 'pending',
                invoiceDate: new Date(),
                dueDate: finalizedInvoice.due_date ? new Date(finalizedInvoice.due_date * 1000) : new Date(),
                stripeInvoiceUrl: finalizedInvoice.hosted_invoice_url
            });
            
            return finalizedInvoice.hosted_invoice_url;
        } catch (error: any) {
            logError({ 
                message: `Failed to create and finalize manufacturer invoice: ${error.message}`, 
                error, 
                additionalData: { orderId, errorStack: error.stack, errorCode: error.code, errorType: error.type },
                source: 'ShipmentService.createAndFinalizeBusinessInvoice' 
            });
            throw error;
        }
    }
    static async getShipmentsByOrder(orderId: string, userId: string) {
        const order = await OrderModel.findById(orderId);
        if (!order) throw new Error('Order not found');
        if (order.userId.toString() !== userId) throw new Error('Unauthorized');

        return await ShipmentModel.find({ orderId })
            .populate('items.productId', 'name imageURLs')
            .populate('items.businessId', 'businessName');
    }
    static async purchaseShipmentLabel(selections: { shipmentId: string; rateId: string }[], userId: string) {
        if (!selections || !Array.isArray(selections) || selections.length === 0) {
            throw new Error('Selections array is required');
        }

        const firstShipment = await ShipmentModel.findById(selections[0].shipmentId);
        if (!firstShipment) throw new Error('Shipment not found');
        const orderId = firstShipment.orderId;
        if (!orderId) throw new Error('Order ID not found');

        for (const selection of selections) {
            const shipment = await ShipmentModel.findById(selection.shipmentId);
            if (!shipment) throw new Error(`Shipment ${selection.shipmentId} not found`);
            const rate = shipment.rates.find(r => r.id === selection.rateId);
            if (!rate) throw new Error(`Rate ${selection.rateId} not found`);
            shipment.rates.forEach(r => r.isSelected = r.id === selection.rateId);
            shipment.status = 'rate_selected';
            await shipment.save();
        }

        let draftInvoice;
        try {
            draftInvoice = await this.createDraftInvoice(orderId.toString());
        } catch (error: any) {
            for (const selection of selections) {
                const shipment = await ShipmentModel.findById(selection.shipmentId);
                if (shipment) {
                    shipment.rates.forEach(r => r.isSelected = false);
                    await shipment.save();
                }
            }
            logError({ message: 'Draft invoice creation failed', error, source: 'ShipmentService.purchaseShipmentLabel' });
            throw new Error(`Invoice creation failed: ${error.message}`);
        }

        const [error, results] = await catchError(
            this.buyLabels(userId, selections)
        );
        if(error){
            logError({message: 'Label purchase failed', error, source: 'ShipmentService.purchaseShipmentLabel'})
        }
        const allSuccess = results && results.every(r => r.success);

        if (allSuccess) {
            const order = await OrderModel.findById(orderId);
            if (order?.stripeInvoiceId) {
                const stripe = StripeService.getInstance();
                const invoice = await stripe.getInvoice(order.stripeInvoiceId);
                
                if (invoice.status === 'draft') {
                    const shipments = await ShipmentModel.find({ orderId });
                    const allShipmentsHandled = shipments.every(s => s.isBusinessHandled || s.status === 'label_purchased');
                    
                    if (allShipmentsHandled) {
                        const finalizedInvoice = await stripe.finalizeInvoice(order.stripeInvoiceId);
                        order.stripeInvoiceUrl = finalizedInvoice.hosted_invoice_url;
                        await order.save();
                        await stripe.sendInvoice(order.stripeInvoiceId);
                        
                        const businessIds = [...new Set(order.items.map((item: any) => item.businessId))];
                        const confirmedItems = order.items.filter((item: any) => item.status === 'confirmed');
                        const confirmedTotal = confirmedItems.reduce((sum: number, item: any) => sum + item.totalPriceOfItems, 0);
                        
                        await InvoiceModel.create({
                            stripeInvoiceId: order.stripeInvoiceId,
                            userId: order.userId,
                            orderId: orderId.toString(),
                            businessIds,
                            amount: finalizedInvoice.amount_due / 100,
                            platformFee: confirmedTotal * CONSTANTS.PLATFORM_FEE_PERCENT,
                            distributorAmount: (finalizedInvoice.amount_due / 100) - (confirmedTotal * CONSTANTS.PLATFORM_FEE_PERCENT),
                            currency: 'usd',
                            status: 'pending',
                            invoiceDate: new Date(),
                            dueDate: finalizedInvoice.due_date ? new Date(finalizedInvoice.due_date * 1000) : new Date(),
                            stripeInvoiceUrl: finalizedInvoice.hosted_invoice_url
                        });
                    }
                }
            }
            return { status: true, results, labelsPurchased: true };
        } else {
            const stripe = StripeService.getInstance();
            try {
                await stripe.deleteInvoice(draftInvoice.invoice.id);
            } catch (error: any) {
                logError({ message: 'Draft invoice deletion failed', error, source: 'ShipmentService.purchaseShipmentLabel' });
            }
            for (const result of results as any[]){
                if (!result.success) {
                    const shipment = await ShipmentModel.findById(result.shipmentId);
                    if (shipment) {
                        shipment.rates.forEach(r => r.isSelected = false);
                        await shipment.save();
                    }
                }
            }
            return { status: false, results, labelsPurchased: false };
        }
    }
    private static async buyLabels(userId: string, selections: { shipmentId: string; rateId: string }[]) {
        const results: any[] = [];
        const easypost = new EasyPostIntegration();

        for (const selection of selections) {
            try {
                const { shipmentId, rateId } = selection;
                if (!shipmentId || !rateId) {
                    results.push({ shipmentId, success: false, message: 'Missing shipmentId or rateId' });
                    continue;
                }

                const shipment = await ShipmentModel.findById(shipmentId).populate('items.productId');
                if (!shipment) throw new Error('Shipment not found');
                if (shipment.userId.toString() !== userId) throw new Error('Not authorized');
                if (shipment.status === 'label_purchased') throw new Error('Label already purchased');

                const rate = shipment.rates.find(r => r.id === rateId);
                if (!rate) throw new Error('Rate not found');

                const order = await OrderModel.findById(shipment.orderId);
                if (!order) throw new Error('Order not found');

                const businessId = shipment.items[0].businessId;
                const business = await BusinessModel.findById(businessId);
                const user = await UserModel.findById(order.userId);

                const fromAddr = AddressFormatter.formatAddress(shipment.fromAddress);
                const toAddr = AddressFormatter.formatAddress(shipment.toAddress);

                const parsedFromAddress = {
                    street1: fromAddr.street || '',
                    street2: null,
                    city: fromAddr.city || '',
                    state: fromAddr.state || '',
                    zip: fromAddr.zip || '',
                    country: fromAddr.country || '',
                    company: business?.businessName || '',
                    phone: business?.phone || ''
                };
                const parsedToAddress = {
                    name: user ? `${user.firstName} ${user.lastName}` : '',
                    street1: toAddr.street || '',
                    city: toAddr.city || '',
                    state: toAddr.state || '',
                    zip: toAddr.zip || '',
                    country: toAddr.country || '',
                    email: user?.email || '',
                    phone: user?.phone || ''
                };

                let totalWeight = 0;
                let maxLength = 0;
                let maxWidth = 0;
                let maxHeight = 0;

                for (const item of shipment.items) {
                    const product: any = item.productId;
                    if (product) {
                        totalWeight += product.weight * item.quantity;
                        maxLength = Math.max(maxLength, product.length);
                        maxWidth = Math.max(maxWidth, product.width);
                        maxHeight = Math.max(maxHeight, product.height);
                    }
                }

                const [epError, newEpShipment] = await catchError(easypost.createShipmentLogistics({
                    fromAddress: parsedFromAddress,
                    toAddress: parsedToAddress,
                    parcel: {
                        length: parseFloat(maxLength.toFixed(1)),
                        width: parseFloat(maxWidth.toFixed(1)),
                        height: parseFloat(maxHeight.toFixed(1)),
                        weight: parseFloat(totalWeight.toFixed(1))
                    },
                    customsInfo: this.isInternational(fromAddr.country || "", toAddr.country || "") 
                        ? this.buildCustomsInfo(shipment.items, shipment.items.map(i => i.productId as any)) 
                        : undefined
                }));

                if (epError) throw new Error(`EasyPost error: ${epError.message}`);
                if (!newEpShipment.rates || newEpShipment.rates.length === 0) {
                    throw new Error('No rates returned');
                }

                let matchedRate = newEpShipment.rates.find((r: any) => 
                    r.carrier === rate.carrier && r.service === rate.service
                );
                if (!matchedRate) {
                    matchedRate = newEpShipment.rates.reduce((lowest: any, current: any) => 
                        parseFloat(current.rate) < parseFloat(lowest.rate) ? current : lowest
                    );
                }
                // console.log({ shipment: newEpShipment, matchedRate, rateId, matchedRateId: matchedRate.id, rate: rate.id, shipmentId })
                const [error, purchasedShipment] = await catchError(
                    easypost.purchaseLabel(newEpShipment.id, matchedRate.id)
                );
                if(error){
                    logError({message: 'Label purchase failed', error, source: 'ShipmentService.buyLabels.purchaseLabel'})
                    throw new Error(`Label purchase failed: ${error.message}`);
                }

                shipment.rates = newEpShipment.rates.map((r: any) => ({
                    carrier: r.carrier || '',
                    rate: parseFloat(r.rate),
                    service: r.service || '',
                    estimatedDays: r.delivery_days || 0,
                    guaranteedDeliveryDate: r.delivery_date_guaranteed || false,
                    deliveryDate: r.est_delivery_date ? new Date(r.est_delivery_date) : new Date(),
                    isSelected: r.id === matchedRate.id,
                    id: r.id || ''
                })) as any;

                shipment.status = 'label_purchased';
                shipment.trackingNumber = purchasedShipment.tracking_code;
                shipment.labelUrl = purchasedShipment.postage_label?.label_url;
                await shipment.save();

                await this.sendLabelToBusiness(shipment, order, business, user);

                results.push({
                    shipmentId,
                    success: true,
                    trackingCode: purchasedShipment.tracking_code,
                    labelUrl: purchasedShipment.postage_label?.label_url
                });
            } catch (error: any) {
                logError({ message: 'Label purchase failed', error, source: 'ShipmentService.buyLabels' });
                results.push({
                    shipmentId: selection.shipmentId,
                    success: false,
                    message: error.message || 'Unknown error',
                    errorCode: error.code || error.status
                });
            }
        }
        return results;
    }
    
    private static isInternational(fromCountry: string, toCountry: string): boolean {
        return fromCountry.toUpperCase() !== toCountry.toUpperCase();
    }
    
    private static buildCustomsInfo(items: any[], products: any[]) {
        return {
            customs_items: items.map(item => {
                const product = products.find(p => p._id.toString() === item.productId.toString());
                return {
                    description: `${product?.name || 'Product'}\n${product?.description || ''}`,
                    quantity: item.quantity,
                    weight: product?.weight || 0,
                    value: item.pricePerItem,
                    hs_tariff_number: product?.hsCode || '',
                    origin_country: product?.wareHouseAddress?.country || 'US'
                };
            })
        };
    }
    
    private static async sendLabelToBusiness(shipment: IShipment, order: IOrder, business: any, user: any) {
        if (!business?.email || !shipment.labelUrl) return;
        
        const deliveryAddr = AddressFormatter.formatAddress(order.deliveryAddress);
        const emailHtml = generateShippingLabelEmail({
            businessName: business.businessName,
            orderNumber: order._id.toString(),
            trackingNumber: shipment.trackingNumber,
            labelUrl: shipment.labelUrl,
            customerName: `${user.firstName} ${user.lastName}`,
            deliveryAddress: `${deliveryAddr.street}, ${deliveryAddr.city}, ${deliveryAddr.state} ${deliveryAddr.zip}, ${deliveryAddr.country}`
        });
        
        await addEmailJob({
            email: business.email,
            subject: `Shipping Label Ready - Order #${order._id}`,
            html: emailHtml
        });
    }
    private static async createDraftInvoice(orderId: string) {
        const stripe = StripeService.getInstance();
        const order = await OrderModel.findById(orderId).populate('userId');
        if (!order) throw new Error('Order not found');

        const user: any = order.userId;
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

        const invoice = await stripe.createinvoices({
            customer: stripeCustomerId,
            collection_method: 'send_invoice',
            days_until_due: 7,
            metadata: { 
                orderId: orderId,
                userId: user._id.toString(),
                customerEmail: user.email,
                transactionType: "order"
            }
        });

        const businessIds = [...new Set(order.items.map(item => item.businessId.toString()))];
        const missingStripeAccounts: string[] = [];

        for (const businessId of businessIds) {
            const business = await BusinessModel.findById(businessId);
            if (!business?.stripeAccountId) {
                missingStripeAccounts.push(business?.businessName || businessId);
                continue;
            }

            const businessItems = order.items.filter(item => item.businessId.toString() === businessId);
            
            for (const item of businessItems) {
                const itemIndex = order.items.findIndex(i => i._id?.toString() === item._id?.toString());
                await stripe.createInvoiceItems({
                    customer: stripeCustomerId,
                    invoice: invoice.id,
                    amount: Math.round(item.totalPriceOfItems * 100),
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
        }

        if (missingStripeAccounts.length > 0) {
            throw new Error(`Suppliers missing Stripe accounts: ${missingStripeAccounts.join(', ')}`);
        }

        const shipments = await ShipmentModel.find({ orderId });
        let shippingTotal = 0;
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
                        description: `Manufacturer Shipping - ${business?.businessName || 'Manufacturer'}`,
                        metadata: { 
                            type: 'manufacturer_shipping',
                            supplierId: manufacturerBusinessId.toString(),
                            supplierUserId: business?.userId.toString() || ''
                        }
                    });
                }
                shippingTotal += shipment.shipmentCost;
            } else {
                const selectedRate = shipment.rates.find(r => r.isSelected);
                if (selectedRate) shippingTotal += selectedRate.rate;
            }
        }

        if (shippingTotal > 0) {
            const platformShipping = shipments.filter(s => !s.isBusinessHandled && s.rates.some(r => r.isSelected));
            if (platformShipping.length > 0) {
                const platformShippingCost = platformShipping.reduce((sum, s) => {
                    const rate = s.rates.find(r => r.isSelected);
                    return sum + (rate?.rate || 0);
                }, 0);
                
                if (platformShippingCost > 0) {
                    await stripe.createInvoiceItems({
                        customer: stripeCustomerId,
                        invoice: invoice.id,
                        amount: Math.round(platformShippingCost * 100),
                        currency: 'usd',
                        description: 'Shipping (platform)',
                        metadata: { type: 'shipping' }
                    });
                }
            }
        }

        const platformFee = order.totalAmount * CONSTANTS.PLATFORM_FEE_PERCENT;
        if (platformFee > 0) {
            await stripe.createInvoiceItems({
                customer: stripeCustomerId,
                invoice: invoice.id,
                amount: Math.round(platformFee * 100),
                currency: 'usd',
                description: 'Platform Fee (5%)',
                metadata: { type: 'platform_fee' }
            });
        }

        return { invoice, stripeCustomerId, order };
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
            const orderStatusMap: Record<string, 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled'> = {
                'label_purchased': 'processing',
                'shipped': 'shipped',
                'delivered': 'delivered',
                'failed': 'cancelled',
                'returned_to_supplier': 'cancelled'
            };

            const targetOrderStatus = orderStatusMap[newStatus];
            if (targetOrderStatus) {
                // Update individual order items for this shipment
                for (const shipmentItem of shipment.items) {
                    const orderItem = order.items.find((i: any) => 
                        i.productId.toString() === shipmentItem.productId.toString()
                    );
                    if (orderItem) orderItem.status = targetOrderStatus;
                }
                
                // Check if ALL shipments for this order have reached a terminal state
                const allShipments = await ShipmentModel.find({ orderId: order._id });
                const allDelivered = allShipments.every(s => s.status === 'delivered');
                const allFailed = allShipments.every(s => ['failed', 'returned_to_supplier'].includes(s.status));
                const allShipped = allShipments.every(s => ['shipped', 'delivered'].includes(s.status));
                
                // Update overall order status based on all shipments
                const previousOrderStatus = order.status;
                if (allDelivered) {
                    order.status = 'delivered';
                } else if (allFailed) {
                    order.status = 'cancelled';
                } else if (allShipped) {
                    order.status = 'shipped';
                }
                
                // Add order history entry if status changed
                if (previousOrderStatus !== order.status) {
                    order.orderHistory.push({
                        fromStatus: previousOrderStatus,
                        toStatus: order.status,
                        changedBy: 'system',
                        userRole: 'system',
                        notes: `Status updated via EasyPost webhook (tracking: ${trackingCode})`,
                        changedAt: new Date()
                    });
                    logInfo({message: `Order ${order._id} status: ${previousOrderStatus} → ${order.status}`, source: 'ShipmentService.processTrackingWebhook'});
                }
                
                await order.save();
            }
        }

        const notifiableStatuses = ['shipped', 'delivered', 'failed', 'returned_to_supplier'];
        if (notifiableStatuses.includes(newStatus)) {
            await this.sendTrackingNotification(shipment, order, webhookData);
        }
    }
    private static async sendTrackingNotification(shipment: IShipment, order: IOrder, trackingData: any) {
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
