import BusinessModel from "../models/business.model";
import UserModel from "../models/user.model";
import StripeService from "../integration/stripe";
import { logInfo } from "../utils/SystemLogs";
import { saveAuditLog } from "../utils/SaveAuditlogs";

export class StripeAccountService {

    static async createStripeAccount(userId: string) {
        const user = await UserModel.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        if (user.role !== 'distributor' && user.role !== 'manufacturer') {
            throw new Error('Only distributors and manufacturers can create Stripe accounts');
        }

        const business = await BusinessModel.findOne({ userId });
        if (!business) {
            throw new Error('Business not found for this user');
        }

        if (business.stripeAccountId) {
            throw new Error('Stripe account already exists for this business');
        }

        const stripeService = StripeService.getInstance();
        const stripeAccount = await stripeService.createConnectAccount({
            email: business.email,
            businessType: 'individual',
            country: business.address?.country || 'US'
        });

        const return_url = `${process.env.FRONTEND_URL}/vendors/onboarding/${userId}`;
        const refresh_url = `${process.env.FRONTEND_URL}/vendors/onboarding/refresh-stripe-account`;

        const accountLink = await stripeService.createAccountLink({
            accountId: stripeAccount.id,
            refreshUrl: refresh_url,
            returnUrl: return_url
        });

        business.stripeAccountId = stripeAccount.id;
        business.stripeAccountLink = accountLink.url;
        business.stripeChargesEnabled = stripeAccount.charges_enabled || false;
        business.stripedetailsSubmitted = stripeAccount.details_submitted || false;
        business.stripeTransfersEnabled = stripeAccount.payouts_enabled || false;
        await business.save();

        await saveAuditLog({
            userId: user._id,
            action: 'STRIPE_ACCOUNT_CREATED',
            actionType: 'create',
            entityType: user.role,
            entityId: business._id.toString(),
            additionalContext: { stripeAccountId: stripeAccount.id }
        });

        await logInfo({
            message: 'Stripe account created successfully',
            source: 'StripeAccountService.createStripeAccount',
            additionalData: { userId, businessId: business._id, stripeAccountId: stripeAccount.id }
        });

        return {
            stripeAccountId: stripeAccount.id,
            accountLink: accountLink.url,
            expiresAt: accountLink.expires_at
        };
    }

    static async getStripeAccount(userId: string) {
        const user = await UserModel.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        if (user.role !== 'distributor' && user.role !== 'manufacturer') {
            throw new Error('Only distributors and manufacturers can access Stripe accounts');
        }

        const business = await BusinessModel.findOne({ userId });
        if (!business) {
            throw new Error('Business not found for this user');
        }

        if (!business.stripeAccountId) {
            throw new Error('No Stripe account found for this business');
        }

        const stripeService = StripeService.getInstance();
        const stripeAccount = await stripeService.retrieveAccount(business.stripeAccountId);

        business.stripeChargesEnabled = stripeAccount.charges_enabled || false;
        business.stripedetailsSubmitted = stripeAccount.details_submitted || false;
        business.stripeTransfersEnabled = stripeAccount.payouts_enabled || false;
        await business.save();

        return {
            local: {
                stripeAccountId: business.stripeAccountId,
                stripeAccountLink: business.stripeAccountLink,
                stripeChargesEnabled: business.stripeChargesEnabled,
                stripedetailsSubmitted: business.stripedetailsSubmitted,
                stripeTransfersEnabled: business.stripeTransfersEnabled
            },
            stripe: {
                id: stripeAccount.id,
                email: stripeAccount.email,
                chargesEnabled: stripeAccount.charges_enabled,
                detailsSubmitted: stripeAccount.details_submitted,
                payoutsEnabled: stripeAccount.payouts_enabled,
                country: stripeAccount.country,
                defaultCurrency: stripeAccount.default_currency,
                type: stripeAccount.type
            }
        };
    }

    static async refreshStripeAccountLink(userId: string) {
        const user = await UserModel.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        if (user.role !== 'distributor' && user.role !== 'manufacturer') {
            throw new Error('Only distributors and manufacturers can refresh Stripe account links');
        }

        const business = await BusinessModel.findOne({ userId });
        if (!business) {
            throw new Error('Business not found for this user');
        }

        if (!business.stripeAccountId) {
            throw new Error('No Stripe account found for this business');
        }

        const return_url = `${process.env.FRONTEND_URL}/vendors/onboarding/${userId}`;
        const refresh_url = `${process.env.FRONTEND_URL}/vendors/onboarding/refresh-stripe-account`;

        const stripeService = StripeService.getInstance();
        const accountLink = await stripeService.createAccountLink({
            accountId: business.stripeAccountId,
            refreshUrl: refresh_url,
            returnUrl: return_url
        });

        business.stripeAccountLink = accountLink.url;
        await business.save();

        await logInfo({
            message: 'Stripe account link refreshed successfully',
            source: 'StripeAccountService.refreshStripeAccountLink',
            additionalData: { userId, businessId: business._id, stripeAccountId: business.stripeAccountId }
        });

        return {
            accountLink: accountLink.url,
            expiresAt: accountLink.expires_at
        };
    }
}