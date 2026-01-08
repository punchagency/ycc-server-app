import 'dotenv/config';
import Stripe from 'stripe';
import { logError } from '../utils/SystemLogs';

class StripeService {
    private static stripe: Stripe;
    private static instance: StripeService;

    private constructor() {
        // Initialize Stripe instance with secret key
        const secretKey = process.env.STRIPE_SECRET_KEY;
        if (!secretKey) {
            throw new Error('STRIPE_SECRET_KEY environment variable is required');
        }
        StripeService.stripe = new Stripe(secretKey, {
            apiVersion: '2025-10-29.clover' // Specify latest API version
        });
    }

    // Singleton pattern
    public static getInstance(): StripeService {
        if (!StripeService.instance) {
            StripeService.instance = new StripeService();
        }
        return StripeService.instance;
    }

    public async createConnectAccount({
        email,
        businessType,
        country = 'US'
    }: {
        email: string,
        businessType: 'company' | 'individual',
        country?: string
    }): Promise<Stripe.Account> {
        try {
            const account = await StripeService.stripe.accounts.create({
                type: 'express',
                email,
                country,
                business_type: businessType,
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true }
                }
            });
            return account;
        } catch (error) {
            logError({ message: 'Stripe account creation failed', error, source: 'StripeService.createConnectAccount' });
            if (error instanceof Error) {
                throw new Error(`Stripe account creation failed: ${error.message}`);
            }
            throw error;
        }
    }

    public async createAccountLink({
        accountId,
        refreshUrl,
        returnUrl
    }: {
        accountId: string,
        refreshUrl: string,
        returnUrl: string
    }): Promise<Stripe.AccountLink> {
        try {
            const accountLink = await StripeService.stripe.accountLinks.create({
                account: accountId,
                refresh_url: refreshUrl,
                return_url: returnUrl,
                type: 'account_onboarding',
                collect: "eventually_due"
            });
            return accountLink;
        } catch (error) {
            logError({ message: 'Stripe account link creation failed', error, source: 'StripeService.createAccountLink' });
            if (error instanceof Error) {
                throw new Error(`Stripe account link creation failed: ${error.message}`);
            }
            throw error;
        }
    }

    public async retrieveAccount(accountId: string): Promise<Stripe.Account> {
        try {
            const account = await StripeService.stripe.accounts.retrieve(accountId);
            return account;
        } catch (error) {
            logError({ message: 'Stripe account retrieval failed', error, source: 'StripeService.retrieveAccount' });
            if (error instanceof Error) {
                throw new Error(`Stripe account retrieval failed: ${error.message}`);
            }
            throw error;
        }
    }

    public async getPaymentIntentAndProcessRefund({
        invoiceId,
        refundAmount,
        options = {}
    }: {
        invoiceId: string,
        refundAmount: number,
        options?: Stripe.RefundCreateParams
    }): Promise<Stripe.Refund> {
        try {
            // Validate inputs
            if (!invoiceId) {
                throw new Error('Invoice ID is required');
            }
            if (refundAmount <= 0) {
                throw new Error('Refund amount must be greater than 0');
            }

            // List invoice payments
            const payments = await StripeService.stripe.invoicePayments.list({ invoice: invoiceId });

            // Find the paid payment
            const paidPayment = payments.data.find(payment => payment.status === 'paid');

            if (!paidPayment) {
                throw new Error('No paid payment found for the invoice.');
            }

            // Get the payment intent ID
            const paymentIntentId: string = paidPayment.payment.payment_intent as string;

            if (!paymentIntentId) {
                throw new Error('No payment intent found in the paid payment.');
            }

            // Process the refund
            const refundParams = {
                payment_intent: paymentIntentId,
                ...options,
            };

            if (refundAmount !== undefined) {
                refundParams.amount = refundAmount;
            }

            // Process the refund
            const refund = await StripeService.stripe.refunds.create(refundParams);

            return refund;
        } catch (error) {
            logError({ message: 'Stripe refund failed', error, source: 'StripeService.getPaymentIntentAndProcessRefund' })
            if (error instanceof Error) {
                throw new Error(`Stripe refund failed: ${error.message}`);
            }
            throw error;
        }
    }

    public async getPaymentIntentAndCharge(invoiceId: string) {
        const payments = await StripeService.stripe.invoicePayments.list({
            invoice: invoiceId,
        });

        // Find the paid payment
        const paidPayment = payments.data.find(payment => payment.status === 'paid');

        if (!paidPayment) {
            throw new Error('No paid payment found for the invoice.');
        }

        // Get the payment intent ID
        const paymentIntentId = paidPayment.payment.payment_intent as string;

        if (!paymentIntentId) {
            throw new Error('No payment intent found in the paid payment.');
        }

        const paymentIntent = await StripeService.stripe.paymentIntents.retrieve(paymentIntentId);
        const chargeId = paymentIntent.latest_charge;

        return { paymentIntentId: paymentIntentId, chargeId };
    }

    public async getPaymentIntent(invoiceId: string): Promise<string> {
        const payments = await StripeService.stripe.invoicePayments.list({
            invoice: invoiceId,
        });

        // Find the paid payment
        const paidPayment = payments.data.find(payment => payment.status === 'paid');

        if (!paidPayment) {
            throw new Error('No paid payment found for the invoice.');
        }

        // Get the payment intent ID
        const paymentIntentId = paidPayment.payment.payment_intent as string;

        if (!paymentIntentId) {
            throw new Error('No payment intent found in the paid payment.');
        }
        return paymentIntentId;
    }

    public async getInvoice(invoiceId: string) {
        return await StripeService.stripe.invoices.retrieve(invoiceId);
    }

    public async createProduct({
        name,
        description,
        images
    }: {
        name: string,
        description?: string,
        images?: string[]
    }): Promise<Stripe.Product> {
        try {
            const product = await StripeService.stripe.products.create({
                name,
                description,
                images
            });
            return product;
        } catch (error) {
            logError({ message: 'Stripe product creation failed', error, source: 'StripeService.createProduct' });
            if (error instanceof Error) {
                throw new Error(`Stripe product creation failed: ${error.message}`);
            }
            throw error;
        }
    }

    public async createPrice({
        productId,
        unitAmount,
        currency = 'usd'
    }: {
        productId: string,
        unitAmount: number,
        currency?: string
    }): Promise<Stripe.Price> {
        try {
            const price = await StripeService.stripe.prices.create({
                product: productId,
                unit_amount: unitAmount,
                currency
            });
            return price;
        } catch (error) {
            logError({ message: 'Stripe price creation failed', error, source: 'StripeService.createPrice' });
            if (error instanceof Error) {
                throw new Error(`Stripe price creation failed: ${error.message}`);
            }
            throw error;
        }
    }

    public async createCustomer({
        email,
        name,
        description
    }: {
        email: string,
        name?: string,
        description?: string
    }): Promise<Stripe.Customer> {
        try {
            const customer = await StripeService.stripe.customers.create({
                email,
                name,
                description
            });
            return customer;
        } catch (error) {
            logError({ message: 'Stripe customer creation failed', error, source: 'StripeService.createCustomer' });
            if (error instanceof Error) {
                throw new Error(`Stripe customer creation failed: ${error.message}`);
            }
            throw error;
        }
    }

    public async listCustomers({ email, limit = 100 }: { email?: string, limit?: number }): Promise<Stripe.ApiList<Stripe.Customer>> {
        try {
            const customers = await StripeService.stripe.customers.list({ email, limit });
            return customers;
        } catch (error) {
            logError({ message: 'Stripe customer listing failed', error, source: 'StripeService.listCustomers' });
            if (error instanceof Error) {
                throw new Error(`Stripe customer listing failed: ${error.message}`);
            }
            throw error;
        }
    }

    public async retrieveCustomer(customerId: string): Promise<Stripe.Customer | Stripe.DeletedCustomer> {
        try {
            const customer = await StripeService.stripe.customers.retrieve(customerId);
            return customer;
        } catch (error) {
            logError({ message: 'Stripe customer retrieval failed', error, source: 'StripeService.retrieveCustomer' });
            if (error instanceof Error) {
                throw new Error(`Stripe customer retrieval failed: ${error.message}`);
            }
            throw error;
        }
    }

    public async createinvoices({ customer, collection_method, days_until_due, metadata }: {
        customer: string,
        collection_method: 'send_invoice' | 'charge_automatically',
        days_until_due: number,
        metadata: { [key: string]: string }
    }): Promise<Stripe.Invoice> {
        try {
            const invoice = await StripeService.stripe.invoices.create({
                customer,
                collection_method,
                days_until_due,
                metadata
            });
            return invoice;
        } catch (error) {
            logError({ message: 'Stripe invoice creation failed', error, source: 'StripeService.createinvoices' });
            if (error instanceof Error) {
                throw new Error(`Stripe invoice creation failed: ${error.message}`);
            }
            throw error;
        }
    }
    public async createInvoiceItems({ customer, invoice, amount, currency, description, metadata }: { customer: string, invoice: string, amount: number, currency: string, description: string, metadata: { [key: string]: string } }): Promise<Stripe.InvoiceItem> {
        try {
            const invoiceItem = await StripeService.stripe.invoiceItems.create({
                customer,
                invoice,
                amount,
                currency,
                description,
                metadata
            });
            return invoiceItem;
        } catch (error) {
            logError({ message: 'Stripe invoice item creation failed', error, source: 'StripeService.createInvoiceItems' });
            if (error instanceof Error) {
                throw new Error(`Stripe invoice item creation failed: ${error.message}`);
            }
            throw error;
        }
    }
    public async deleteInvoice(invoiceId: string){
        try {
            const deletedInvoice = await StripeService.stripe.invoices.del(invoiceId);
            return deletedInvoice;
        } catch (error) {
            logError({ message: 'Stripe invoice deletion failed', error, source: 'StripeService.deleteInvoice' });
            if (error instanceof Error) {
                throw new Error(`Stripe invoice deletion failed: ${error.message}`);
            }
            throw error;
        }
    }
    public async finalizeInvoice(invoiceId: string): Promise<Stripe.Invoice>{
        try {
            const finalizedInvoice = await StripeService.stripe.invoices.finalizeInvoice(invoiceId);
            return finalizedInvoice;
        } catch (error) {
            logError({ message: 'Stripe invoice finalization failed', error, source: 'StripeService.finalizeInvoice' });
            if (error instanceof Error) {
                throw new Error(`Stripe invoice finalization failed: ${error.message}`);
            }
            throw error;
        }
    }
    public async sendInvoice(invoiceId: string){
        try {
            const sentInvoice = await StripeService.stripe.invoices.sendInvoice(invoiceId);
            return sentInvoice;
        } catch (error) {
            logError({ message: 'Stripe invoice sending failed', error, source: 'StripeService.sendInvoice' });
            if (error instanceof Error) {
                throw new Error(`Stripe invoice sending failed: ${error.message}`);
            }
            throw error;
        }
    }

    public async getLatestChargeId(stripeInvoiceId: string): Promise<string> {
        try {
            const invoice = await StripeService.stripe.invoices.retrieve(stripeInvoiceId);
            if (!(invoice as any).charge) {
                // If the invoice object doesn't have the charge ID directly, look through payments
                const payments = await StripeService.stripe.invoicePayments.list({ invoice: stripeInvoiceId });
                const paidPayment = payments.data.find(p => p.status === 'paid');
                if (!paidPayment || !paidPayment.payment.payment_intent) {
                    throw new Error('No paid transaction found for this invoice');
                }
                
                const pi = await StripeService.stripe.paymentIntents.retrieve(paidPayment.payment.payment_intent as string);
                if (!pi.latest_charge) {
                    throw new Error('No charge ID found on payment intent');
                }
                return pi.latest_charge as string;
            }
            return (invoice as any).charge as string;
        } catch (error) {
            logError({ message: 'Failed to retrieve charge ID', error, source: 'StripeService.getLatestChargeId' });
            throw error;
        }
    }

    public async createTransfer({amount, currency = 'usd', destination, source_transaction, description, metadata}:
        {amount: number, currency?: string, destination: string, source_transaction: string, description?: string, metadata?: { [key: string]: string }}){
        try {
            if (!amount || amount <= 0) {
                throw new Error('Transfer amount must be greater than 0');
            }
            if (!destination) {
                throw new Error('Destination account is required');
            }
            if (!source_transaction) {
                throw new Error('Source transaction is required');
            }

            const transfer = await StripeService.stripe.transfers.create({
                amount,
                currency: currency,
                destination,
                source_transaction: source_transaction,
                description,
                metadata
            });

            return transfer;
        } catch (error) {
            logError({ message: 'Stripe transfer failed', error, source: 'StripeService.createTransfer' })
            if (error instanceof Error) {
                throw new Error(`Stripe transfer failed: ${error.message}`);
            }
            throw error;
        }
    }

    public async validateStripeAccount(accountId: string): Promise<boolean> {
        try {
            const account = await StripeService.stripe.accounts.retrieve(accountId);
            return account.charges_enabled && account.details_submitted;
        } catch (error) {
            logError({ message: 'Stripe account validation failed', error, source: 'StripeService.validateStripeAccount' });
            return false;
        }
    }
}

export default StripeService;