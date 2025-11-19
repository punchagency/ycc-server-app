import QuoteModel from "../models/quote.model";
import BookingModel from "../models/booking.model";
import UserModel from "../models/user.model";
import BusinessModel from "../models/business.model";
import InvoiceModel from "../models/invoice.model";
import StripeService from "../integration/stripe";
import Stripe from 'stripe';
import { addEmailJob } from "../integration/QueueManager";
import 'dotenv/config';

export class QuoteService {
    static async approveQuoteAndPay({quoteId, userId}: {quoteId: string, userId: string}) {
        const quote = await QuoteModel.findById(quoteId);
        if (!quote) {
            throw new Error('Quote not found');
        }

        const user = await UserModel.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        if (quote.bookingId) {
            const booking = await BookingModel.findById(quote.bookingId);
            if (booking && booking.userId.toString() !== userId) {
                throw new Error('Unauthorized to approve this quote');
            }
        }

        const stripeService = StripeService.getInstance();
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-10-29.clover' });

        let stripeCustomerId = user.stripeCustomerId;
        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: `${user.firstName} ${user.lastName}`,
                phone: user.phone,
                metadata: { userId: user._id.toString() }
            });
            stripeCustomerId = customer.id;
            user.stripeCustomerId = stripeCustomerId;
            await user.save();
        }

        let stripeInvoice: Stripe.Invoice;
        let shouldCreateInvoice = true;

        if (quote.stripeInvoiceId) {
            try {
                stripeInvoice = await stripeService.getInvoice(quote.stripeInvoiceId);
                if (stripeInvoice.status === 'paid' || stripeInvoice.status === 'void') {
                    throw new Error(`Invoice is already ${stripeInvoice.status}`);
                }
                shouldCreateInvoice = false;
            } catch (error) {
                shouldCreateInvoice = true;
            }
        }

        if (shouldCreateInvoice) {
            stripeInvoice = await stripe.invoices.create({
                customer: stripeCustomerId,
                collection_method: 'send_invoice',
                days_until_due: 30,
                metadata: {
                    quoteId: quote._id.toString(),
                    bookingId: quote.bookingId?.toString() || ''
                }
            });

            for (const service of quote.services) {
                await stripe.invoiceItems.create({
                    customer: stripeCustomerId,
                    invoice: stripeInvoice.id,
                    amount: Math.round(service.totalPrice * 100),
                    currency: quote.currency.toLowerCase(),
                    description: service.item
                });
            }

            await stripe.invoiceItems.create({
                customer: stripeCustomerId,
                invoice: stripeInvoice.id,
                amount: Math.round(quote.platformFee * 100),
                currency: quote.currency.toLowerCase(),
                description: 'Platform Fee'
            });

            stripeInvoice = await stripe.invoices.finalizeInvoice(stripeInvoice.id);

            quote.stripeInvoiceId = stripeInvoice.id;
            quote.stripeInvoiceUrl = stripeInvoice.hosted_invoice_url || undefined;
            quote.stripePDFUrl = stripeInvoice.invoice_pdf || undefined;
        }

        quote.status = 'accepted';
        await quote.save();

        const booking = await BookingModel.findById(quote.bookingId);
        if (booking) {
            booking.quoteStatus = 'accepted';
            await booking.save();
        }

        const existingInvoice = await InvoiceModel.findOne({ stripeInvoiceId: stripeInvoice!.id });
        if (existingInvoice) {
            existingInvoice.status = 'pending';
            existingInvoice.stripeInvoiceUrl = stripeInvoice!.hosted_invoice_url || undefined;
            await existingInvoice.save();
        } else {
            await InvoiceModel.create({
                stripeInvoiceId: stripeInvoice!.id,
                userId: user._id,
                bookingId: quote.bookingId,
                businessIds: booking ? [booking.businessId] : [],
                amount: quote.amount,
                platformFee: quote.platformFee,
                currency: quote.currency,
                status: 'pending',
                invoiceDate: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                stripeInvoiceUrl: stripeInvoice!.hosted_invoice_url || undefined
            });
        }

        return { quote, invoiceUrl: stripeInvoice!.hosted_invoice_url };
    }

    static async declineQuote({quoteId, userId, reason}: {quoteId: string, userId: string, reason?: string}) {
        const quote = await QuoteModel.findById(quoteId);
        if (!quote) {
            throw new Error('Quote not found');
        }

        if (quote.status !== 'pending' && quote.status !== 'quoted') {
            throw new Error('Quote cannot be declined');
        }

        const booking = await BookingModel.findById(quote.bookingId);
        if (!booking) {
            throw new Error('Booking not found');
        }

        if (booking.userId.toString() !== userId) {
            throw new Error('Unauthorized to decline this quote');
        }

        quote.status = 'declined';
        if (reason) {
            quote.customerNotes = reason;
        }
        await quote.save();

        booking.quoteStatus = 'rejected';
        await booking.save();

        const business = await BusinessModel.findById(booking.businessId);
        if (business) {
            await addEmailJob({
                email: business.email,
                subject: 'Quote Declined',
                html: `
                    <h1>Quote Declined</h1>
                    <p>The quote for booking #${booking._id.toString()} has been declined by the customer.</p>
                    ${reason ? `<p>Reason: ${reason}</p>` : ''}
                    <p>Quote ID: ${quote._id.toString()}</p>
                `
            });
        }

        return quote;
    }
}