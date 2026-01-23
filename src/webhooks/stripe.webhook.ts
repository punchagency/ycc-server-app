import { Request, Response } from 'express';
import Stripe from 'stripe';
import Invoice from '../models/invoice.model';
import Order from '../models/order.model';
import Booking from '../models/booking.model';
import Quote from '../models/quote.model';
import User from '../models/user.model';
import Business from '../models/business.model';
import SendMail from '../utils/SendMail';
import { logInfo, logError } from '../utils/SystemLogs';
import { saveAuditLog } from '../utils/SaveAuditlogs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-10-29.clover'
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export const handleStripeWebhook = async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string;
    let event: Stripe.Event;
    try {
        // Use raw body for signature verification
        const rawBody = (req as any).rawBody || req.body;
        logInfo({ message: 'Received Stripe webhook', source: 'handleStripeWebhook', additionalData: rawBody });
        event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
    } catch (err: any) {
        logError({ message: 'Stripe webhook signature verification failed', error: err, source: 'handleStripeWebhook' });
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const invoiceObject = event.data.object as Stripe.Invoice;
    const { orderId, bookingId, transactionType } = invoiceObject.metadata || {};

    switch (event.type) {
        case 'invoice.paid':
        case 'invoice.payment_succeeded':
            try {
                await handlePaymentSuccess(invoiceObject, orderId, bookingId, transactionType);
                return res.status(200).json({ received: true });
            } catch (err: any) {
                logError({ message: 'Error processing payment success', error: err, source: 'handleStripeWebhook' });
                return res.status(500).json({ error: err.message });
            }

        case 'invoice.payment_failed':
            try {
                await handlePaymentFailed(invoiceObject, orderId, bookingId, transactionType);
                return res.status(200).json({ received: true });
            } catch (err: any) {
                logError({ message: 'Error processing payment failure', error: err, source: 'handleStripeWebhook' });
                return res.status(500).json({ error: err.message });
            }

        case 'invoice.voided':
            try {
                await handleInvoiceVoided(invoiceObject, orderId, bookingId);
                return res.status(200).json({ received: true });
            } catch (err: any) {
                logError({ message: 'Error processing invoice void', error: err, source: 'handleStripeWebhook' });
                return res.status(500).json({ error: err.message });
            }

        default:
            return res.status(200).json({ ignored: true });
    }
};

async function handlePaymentSuccess(
    stripeInvoice: Stripe.Invoice,
    orderId?: string,
    bookingId?: string,
    transactionType?: string
) {
    logInfo({ message: `Processing payment success: ${stripeInvoice.id}`, source: 'handlePaymentSuccess' });

    const invoice = await Invoice.findOne({ stripeInvoiceId: stripeInvoice.id });
    if (!invoice) {
        logError({ message: `Invoice not found: ${stripeInvoice.id}`, source: 'handlePaymentSuccess' });
        return;
    }

    if (invoice.status === 'paid') {
        logInfo({ message: `Invoice already processed: ${stripeInvoice.id}`, source: 'handlePaymentSuccess' });
        return;
    }

    invoice.status = 'paid';
    invoice.paymentDate = new Date(stripeInvoice.status_transitions.paid_at! * 1000);
    await invoice.save();

    if (transactionType === 'order' && orderId) {
        await handleOrderPaymentSuccess(orderId, stripeInvoice, invoice.userId.toString(), invoice._id.toString());
    } else if (transactionType === 'booking' && bookingId) {
        await handleBookingPaymentSuccess(bookingId, stripeInvoice, invoice.userId.toString(), invoice._id.toString());
    }

    await saveAuditLog({
        userId: invoice.userId,
        action: 'PAYMENT_SUCCESS',
        name: 'Invoice',
        entityId: invoice._id.toString(),
        entityType: "user",
        newValues: { status: 'paid', paymentDate: invoice.paymentDate }
    });
}

async function processBusinessPayouts(orderId: string, stripeInvoice: Stripe.Invoice) {
    logInfo({ message: `Starting business payouts for order: ${orderId}`, source: 'processBusinessPayouts', additionalData: { invoiceId: stripeInvoice.id } });

    const order = await Order.findById(orderId);
    if (!order) {
        logError({ message: `Order not found: ${orderId}`, source: 'processBusinessPayouts' });
        return;
    }

    const invoiceItems = await stripe.invoiceItems.list({ invoice: stripeInvoice.id, limit: 100 });
    const supplierItems = invoiceItems.data.filter(item =>
        item.metadata?.type === 'supplier_product' || item.metadata?.type === 'manufacturer_shipping'
    );

    logInfo({ message: `Found ${supplierItems.length} supplier items to process`, source: 'processBusinessPayouts', additionalData: { orderId } });

    let paidCount = 0;
    let failedCount = 0;

    for (const item of supplierItems) {
        const { supplierUserId, orderItemIndex, type } = item.metadata || {};

        if (!supplierUserId) {
            logError({ message: `Missing supplierUserId in invoice item: ${item.id}`, source: 'processBusinessPayouts' });
            continue;
        }

        const business = await Business.findOne({ userId: supplierUserId });
        if (!business) {
            logError({ message: `Business not found for user: ${supplierUserId}`, source: 'processBusinessPayouts' });
            if (type === 'supplier_product' && orderItemIndex !== undefined) {
                order.items[parseInt(orderItemIndex)].paymentStatus = 'failed';
            }
            failedCount++;
            continue;
        }

        // Check if item already paid
        if (type === 'supplier_product' && orderItemIndex !== undefined) {
            const orderItem = order.items[parseInt(orderItemIndex)];
            if (orderItem?.paymentStatus === 'paid') {
                logInfo({ message: `Order item ${orderItemIndex} already paid, skipping`, source: 'processBusinessPayouts' });
                paidCount++;
                continue;
            }
        }

        // Validate Stripe account
        if (!business.stripeAccountId || !business.stripeTransfersEnabled) {
            logError({
                message: `Business ${business._id} missing Stripe setup`,
                source: 'processBusinessPayouts',
                additionalData: { hasAccountId: !!business.stripeAccountId, transfersEnabled: business.stripeTransfersEnabled }
            });

            const businessOwner = await User.findById(business.userId);
            if (businessOwner?.email) {
                await SendMail({
                    email: businessOwner.email,
                    subject: 'Complete Stripe Onboarding to Receive Payouts',
                    html: `
                        <h2>Action Required: Complete Stripe Onboarding</h2>
                        <p>Dear ${businessOwner.firstName},</p>
                        <p>You have received a payment for order #${orderId}, but we cannot transfer funds to your account because your Stripe onboarding is incomplete.</p>
                        <p>Please complete your Stripe onboarding to receive payouts.</p>
                        <p><strong>Amount Pending: $${(item.amount / 100).toFixed(2)}</strong></p>
                        <p>Log in to your account to complete the setup.</p>
                    `
                });
            }

            if (type === 'supplier_product' && orderItemIndex !== undefined) {
                order.items[parseInt(orderItemIndex)].paymentStatus = 'failed';
            }
            failedCount++;
            continue;
        }

        // Create transfer
        try {
            // Using the charge from the invoice if available
            const chargeId = (stripeInvoice as any).charge as string;

            const transfer = await stripe.transfers.create({
                amount: item.amount,
                currency: item.currency || 'usd',
                destination: business.stripeAccountId,
                source_transaction: chargeId || undefined,
                description: `Payout for ${type === 'manufacturer_shipping' ? 'shipping' : 'products'} (Order ${orderId})`,
                metadata: {
                    orderId,
                    invoiceId: stripeInvoice.id,
                    supplierUserId,
                    businessId: business._id.toString(),
                    invoiceItemId: item.id,
                    type
                }
            });

            if (type === 'supplier_product' && orderItemIndex !== undefined) {
                order.items[parseInt(orderItemIndex)].paymentStatus = 'paid';
            }
            paidCount++;

            logInfo({
                message: `Transfer created: ${transfer.id}`,
                source: 'processBusinessPayouts',
                additionalData: { businessId: business._id, amount: item.amount, orderId }
            });
        } catch (error: any) {
            logError({
                message: `Transfer failed for business ${business._id}: ${error.message}`,
                error,
                source: 'processBusinessPayouts',
                additionalData: { businessId: business._id, orderId, errorCode: error.code }
            });

            if (type === 'supplier_product' && orderItemIndex !== undefined) {
                order.items[parseInt(orderItemIndex)].paymentStatus = 'failed';
            }
            failedCount++;
        }
    }

    await order.save();

    logInfo({
        message: `Business payouts completed`,
        source: 'processBusinessPayouts',
        additionalData: { orderId, paidCount, failedCount, totalItems: supplierItems.length }
    });
}

async function handleOrderPaymentSuccess(orderId: string, stripeInvoice: Stripe.Invoice, userId: string, invoiceId?: string) {
    logInfo({ message: `Processing order payment success: ${orderId}`, source: 'handleOrderPaymentSuccess', additionalData: { invoiceId: stripeInvoice.id } });

    const order = await Order.findById(orderId);
    if (!order) {
        logError({ message: `Order not found: ${orderId}`, source: 'handleOrderPaymentSuccess' });
        return;
    }

    order.paymentStatus = 'paid';
    if (invoiceId) {
        order.invoiceId = invoiceId as any;
    }
    order.orderHistory.push({
        fromStatus: order.status,
        toStatus: order.status,
        changedBy: 'stripe_webhook',
        userRole: 'system',
        notes: `Payment received via Stripe - Invoice ${stripeInvoice.id}`,
        changedAt: new Date()
    });
    await order.save();

    // Process business payouts
    await processBusinessPayouts(orderId, stripeInvoice);

    const user = await User.findById(userId);
    if (user?.email) {
        await SendMail({
            email: user.email,
            subject: 'Payment Confirmation - Order Confirmed',
            html: `
                <h2>Payment Confirmation</h2>
                <p>Dear ${user.firstName},</p>
                <p>Your payment has been successfully processed!</p>
                <ul>
                    <li>Order ID: ${order._id}</li>
                    <li>Amount Paid: $${(stripeInvoice.amount_paid! / 100).toFixed(2)}</li>
                    <li>Payment Date: ${new Date().toLocaleDateString()}</li>
                </ul>
                <p>Your order is now confirmed and will be processed shortly.</p>
            `
        });
    }

    logInfo({ message: `Order payment success completed: ${orderId}`, source: 'handleOrderPaymentSuccess' });
}

async function handleBookingPaymentSuccess(bookingId: string, stripeInvoice: Stripe.Invoice, userId: string, invoiceId?: string) {
    const booking = await Booking.findById(bookingId)
        .populate('serviceId')
        .populate('businessId');
    if (!booking) return;

    const invoice = await Invoice.findById(invoiceId);
    const invoiceType = invoice?.invoiceType || stripeInvoice.metadata?.invoiceType || 'full';

    if (invoiceType === 'deposit') {
        booking.paymentStatus = 'deposit_paid';
        booking.depositPaidAt = new Date(stripeInvoice.status_transitions.paid_at! * 1000);
        if (invoiceId) {
            booking.depositInvoiceId = invoiceId as any;
        }
    } else if (invoiceType === 'balance') {
        booking.paymentStatus = 'paid';
        booking.balancePaidAt = new Date(stripeInvoice.status_transitions.paid_at! * 1000);
        if (invoiceId) {
            booking.balanceInvoiceId = invoiceId as any;
        }
    } else {
        booking.paymentStatus = 'paid';
        if (invoiceId) {
            booking.invoiceId = invoiceId as any;
        }
    }

    booking.paidAt = new Date(stripeInvoice.status_transitions.paid_at! * 1000);
    booking.statusHistory?.push({
        fromStatus: booking.status,
        toStatus: booking.status,
        changedBy: 'stripe_webhook',
        userRole: 'system',
        notes: `${invoiceType === 'deposit' ? 'Deposit' : invoiceType === 'balance' ? 'Balance' : 'Full'} payment received via Stripe - Invoice ${stripeInvoice.id}`,
        changedAt: new Date()
    });
    await booking.save();

    // Process distributor payout immediately
    await processBookingDistributorPayout(booking, stripeInvoice, invoice, invoiceType);

    if (booking.quoteId) {
        const quote = await Quote.findById(booking.quoteId);
        if (quote) {
            if (invoiceType === 'deposit' && quote.status !== 'completed') {
                quote.status = 'deposit_paid';
                await quote.save();
            } else if (invoiceType === 'balance' && quote.status !== 'completed') {
                quote.status = 'completed';
                await quote.save();
            }
        }
    }

    const user = await User.findById(userId);
    const service: any = booking.serviceId;
    const business: any = booking.businessId;

    if (user?.email) {
        const paymentTypeText = invoiceType === 'deposit' ? '50% Deposit' : invoiceType === 'balance' ? 'Final Balance (50%)' : 'Full Payment';
        await SendMail({
            email: user.email,
            subject: `Payment Confirmation - ${paymentTypeText}`,
            html: `
                <h2>Payment Confirmation</h2>
                <p>Dear ${user.firstName},</p>
                <p>Your ${paymentTypeText.toLowerCase()} has been successfully processed!</p>
                <ul>
                    <li>Booking ID: ${booking._id}</li>
                    <li>Service: ${service?.name || 'N/A'}</li>
                    <li>Amount Paid: $${(stripeInvoice.amount_paid! / 100).toFixed(2)}</li>
                    <li>Payment Date: ${new Date().toLocaleDateString()}</li>
                </ul>
                ${invoiceType === 'deposit' ? '<p>Your booking is now confirmed. The remaining 50% balance will be due upon service completion.</p>' : '<p>Thank you for your payment. Your booking is now fully paid.</p>'}
            `
        });
    }

    if (business?.email) {
        const paymentTypeText = invoiceType === 'deposit' ? 'Deposit (50%)' : invoiceType === 'balance' ? 'Balance (50%)' : 'Full Payment';
        await SendMail({
            email: business.email,
            subject: `Payment Received - ${paymentTypeText}`,
            html: `
                <h2>Payment Received</h2>
                <p>A ${paymentTypeText.toLowerCase()} has been received for booking #${booking._id}</p>
                <ul>
                    <li>Service: ${service?.name || 'N/A'}</li>
                    <li>Customer: ${user?.firstName} ${user?.lastName}</li>
                    <li>Amount: $${(stripeInvoice.amount_paid! / 100).toFixed(2)}</li>
                </ul>
                ${invoiceType === 'deposit' ? '<p>You can now proceed with service delivery. The remaining balance will be collected upon completion.</p>' : '<p>The booking is now fully paid.</p>'}
            `
        });
    }

    logInfo({ message: `Booking ${invoiceType} payment success: ${bookingId}`, source: 'handleBookingPaymentSuccess' });
}

async function processBookingDistributorPayout(
    booking: any,
    stripeInvoice: Stripe.Invoice,
    invoice: any,
    invoiceType: string
) {
    try {
        const business = booking.businessId;
        if (!business || !business.stripeAccountId) {
            logError({
                message: `Business missing Stripe account for booking ${booking._id}`,
                source: 'processBookingDistributorPayout',
                additionalData: { bookingId: booking._id, hasStripeAccount: !!business?.stripeAccountId }
            });
            return;
        }

        if (!business.stripeTransfersEnabled) {
            logError({
                message: `Stripe transfers not enabled for business ${business._id}`,
                source: 'processBookingDistributorPayout',
                additionalData: { bookingId: booking._id, businessId: business._id }
            });
            return;
        }

        if (!invoice || !invoice.distributorAmount || invoice.distributorAmount <= 0) {
            logError({
                message: `No distributor amount to payout for booking ${booking._id}`,
                source: 'processBookingDistributorPayout',
                additionalData: { bookingId: booking._id, distributorAmount: invoice?.distributorAmount }
            });
            return;
        }

        // Get charge ID from the invoice
        const chargeId = (stripeInvoice as any).charge as string;
        if (!chargeId) {
            logError({
                message: `No charge ID found for invoice ${stripeInvoice.id}`,
                source: 'processBookingDistributorPayout',
                additionalData: { bookingId: booking._id, invoiceId: stripeInvoice.id }
            });
            return;
        }

        // Calculate payout amount (distributor gets their share minus platform fee)
        const payoutAmount = Math.round(invoice.distributorAmount * 100);
        const payoutCurrency = invoice.currency || 'usd';

        logInfo({
            message: `Initiating ${invoiceType} payout for booking ${booking._id}`,
            source: 'processBookingDistributorPayout',
            additionalData: {
                bookingId: booking._id,
                businessId: business._id,
                amount: invoice.distributorAmount,
                currency: payoutCurrency,
                invoiceType
            }
        });

        // Create transfer to distributor
        const transfer = await stripe.transfers.create({
            amount: payoutAmount,
            currency: payoutCurrency.toLowerCase(),
            destination: business.stripeAccountId,
            source_transaction: chargeId,
            description: `${invoiceType === 'deposit' ? 'Deposit (50%)' : 'Balance (50%)'} payout for booking ${booking._id}`,
            metadata: {
                bookingId: booking._id.toString(),
                businessId: business._id.toString(),
                invoiceId: stripeInvoice.id,
                invoiceType,
                transactionType: 'booking'
            }
        });

        // Update booking with payout info
        if (invoiceType === 'deposit') {
            booking.depositPayoutId = transfer.id;
            booking.depositPayoutStatus = 'paid';
        } else if (invoiceType === 'balance') {
            booking.balancePayoutId = transfer.id;
            booking.balancePayoutStatus = 'paid';
        }
        await booking.save();

        logInfo({
            message: `${invoiceType} payout completed for booking ${booking._id}`,
            source: 'processBookingDistributorPayout',
            additionalData: {
                bookingId: booking._id,
                transferId: transfer.id,
                amount: invoice.distributorAmount,
                currency: payoutCurrency
            }
        });
    } catch (error: any) {
        logError({
            message: `Payout failed for booking ${booking._id}: ${error.message}`,
            error,
            source: 'processBookingDistributorPayout',
            additionalData: {
                bookingId: booking._id,
                invoiceType,
                errorCode: error.code
            }
        });
    }
}

async function handlePaymentFailed(
    stripeInvoice: Stripe.Invoice,
    orderId?: string,
    bookingId?: string,
    transactionType?: string
) {
    logInfo({ message: `Processing payment failure: ${stripeInvoice.id}`, source: 'handlePaymentFailed' });

    const invoice = await Invoice.findOne({ stripeInvoiceId: stripeInvoice.id });
    if (!invoice) return;

    invoice.status = 'failed';
    await invoice.save();

    if (transactionType === 'order' && orderId) {
        const order = await Order.findById(orderId);
        if (order) {
            order.paymentStatus = 'failed';
            order.orderHistory.push({
                fromStatus: order.status,
                toStatus: order.status,
                changedBy: 'stripe_webhook',
                userRole: 'system',
                notes: `Payment failed - Invoice ${stripeInvoice.id}`,
                changedAt: new Date()
            });
            await order.save();
        }
    } else if (transactionType === 'booking' && bookingId) {
        const booking = await Booking.findById(bookingId);
        if (booking) {
            booking.paymentStatus = 'failed';
            booking.statusHistory?.push({
                fromStatus: booking.status,
                toStatus: booking.status,
                changedBy: 'stripe_webhook',
                userRole: 'system',
                notes: `Payment failed - Invoice ${stripeInvoice.id}`,
                changedAt: new Date()
            });
            await booking.save();
        }
    }

    const user = await User.findById(invoice.userId);
    if (user?.email) {
        await SendMail({
            email: user.email,
            subject: 'Payment Failed - Action Required',
            html: `
                <h2>Payment Failed</h2>
                <p>Dear ${user.firstName},</p>
                <p>Unfortunately, your payment could not be processed.</p>
                <p>Please try again or contact support for assistance.</p>
            `
        });
    }

    await saveAuditLog({
        userId: invoice.userId,
        action: 'PAYMENT_FAILED',
        name: 'Invoice',
        entityId: invoice._id.toString(),
        newValues: { status: 'failed' },
        entityType: "user"
    });
}

async function handleInvoiceVoided(stripeInvoice: Stripe.Invoice, orderId?: string, bookingId?: string) {
    logInfo({ message: `Processing invoice void: ${stripeInvoice.id}`, source: 'handleInvoiceVoided' });

    const invoice = await Invoice.findOne({ stripeInvoiceId: stripeInvoice.id });
    if (invoice) {
        invoice.status = 'cancelled';
        await invoice.save();
    }

    if (orderId) {
        const order = await Order.findById(orderId);
        if (order) {
            order.paymentStatus = 'cancelled';
            await order.save();
        }
    }

    if (bookingId) {
        const booking = await Booking.findById(bookingId);
        if (booking) {
            booking.paymentStatus = 'cancelled';
            await booking.save();
        }
    }
}
