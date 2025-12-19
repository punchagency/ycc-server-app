import { Request, Response } from 'express';
import Stripe from 'stripe';
import Invoice from '../models/invoice.model';
import Order from '../models/order.model';
import Booking from '../models/booking.model';
import Quote from '../models/quote.model';
import User from '../models/user.model';
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

const handlePaymentSuccess = async (
    stripeInvoice: Stripe.Invoice,
    orderId?: string,
    bookingId?: string,
    transactionType?: string
) => {
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
        await handleOrderPaymentSuccess(orderId, stripeInvoice, invoice.userId.toString());
    } else if (transactionType === 'booking' && bookingId) {
        await handleBookingPaymentSuccess(bookingId, stripeInvoice, invoice.userId.toString());
    }

    await saveAuditLog({
        userId: invoice.userId,
        action: 'PAYMENT_SUCCESS',
        name: 'Invoice',
        entityId: invoice._id.toString(),
        entityType: "user",
        newValues: { status: 'paid', paymentDate: invoice.paymentDate }
    });
};

const handleOrderPaymentSuccess = async (orderId: string, stripeInvoice: Stripe.Invoice, userId: string) => {
    const order = await Order.findById(orderId);
    if (!order) return;

    order.paymentStatus = 'paid';
    order.orderHistory.push({
        fromStatus: order.status,
        toStatus: order.status,
        changedBy: 'stripe_webhook',
        userRole: 'system',
        notes: `Payment received via Stripe - Invoice ${stripeInvoice.id}`,
        changedAt: new Date()
    });
    await order.save();

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

    logInfo({ message: `Order payment success: ${orderId}`, source: 'handleOrderPaymentSuccess' });
};

const handleBookingPaymentSuccess = async (bookingId: string, stripeInvoice: Stripe.Invoice, userId: string) => {
    const booking = await Booking.findById(bookingId)
        .populate('serviceId')
        .populate('businessId');
    if (!booking) return;

    booking.paymentStatus = 'paid';
    booking.paidAt = new Date(stripeInvoice.status_transitions.paid_at! * 1000); // Set payment timestamp
    booking.statusHistory?.push({
        fromStatus: booking.status,
        toStatus: booking.status,
        changedBy: 'stripe_webhook',
        userRole: 'system',
        notes: `Payment received via Stripe - Invoice ${stripeInvoice.id}`,
        changedAt: new Date()
    });
    await booking.save();

    if (booking.quoteId) {
        const quote = await Quote.findById(booking.quoteId);
        if (quote && quote.status !== 'deposit_paid' && quote.status !== 'completed') {
            quote.status = 'deposit_paid';
            await quote.save();
        }
    }

    const user = await User.findById(userId);
    const service: any = booking.serviceId;
    const business: any = booking.businessId;

    // Send email to crew
    if (user?.email) {
        await SendMail({
            email: user.email,
            subject: 'Payment Confirmation - Booking Confirmed',
            html: `
                <h2>Payment Confirmation</h2>
                <p>Dear ${user.firstName},</p>
                <p>Your payment has been successfully processed!</p>
                <ul>
                    <li>Booking ID: ${booking._id}</li>
                    <li>Service: ${service?.name || 'N/A'}</li>
                    <li>Amount Paid: $${(stripeInvoice.amount_paid! / 100).toFixed(2)}</li>
                    <li>Payment Date: ${new Date().toLocaleDateString()}</li>
                </ul>
                <p>Your booking is now confirmed and the distributor will proceed with service delivery.</p>
            `
        });
    }

    // Send email to distributor
    if (business?.email) {
        await SendMail({
            email: business.email,
            subject: 'Payment Received for Booking',
            html: `
                <h2>Payment Received</h2>
                <p>A payment has been received for booking #${booking._id}</p>
                <ul>
                    <li>Service: ${service?.name || 'N/A'}</li>
                    <li>Customer: ${user?.firstName} ${user?.lastName}</li>
                    <li>Amount: $${(stripeInvoice.amount_paid! / 100).toFixed(2)}</li>
                </ul>
                <p>You can now proceed with service delivery.</p>
            `
        });
    }

    logInfo({ message: `Booking payment success: ${bookingId}`, source: 'handleBookingPaymentSuccess' });
};

const handlePaymentFailed = async (
    stripeInvoice: Stripe.Invoice,
    orderId?: string,
    bookingId?: string,
    transactionType?: string
) => {
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
};

const handleInvoiceVoided = async (stripeInvoice: Stripe.Invoice, orderId?: string, bookingId?: string) => {
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
};
