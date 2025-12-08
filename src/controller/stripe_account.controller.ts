import { Request, Response } from "express";
import Validate from "../utils/Validate";
import { StripeAccountService } from "../service/stripe_account.service";
import catchError from "../utils/catchError";
import { logError } from "../utils/SystemLogs";

export class StripeAccountController {

        static async createStripeAccount(req: Request, res: Response){
                try {
                        const { userId } = req.body;
                        if(!Validate.mongoId(userId)){
                                res.status(400).json({ success: false, message: 'Invalid user id', code: 'INVALID_USER_ID' });
                                return;
                        }

                        const [error, result] = await catchError(StripeAccountService.createStripeAccount(userId));

                        if(error){
                                logError({ message: "Creating a stripe account failed!", source: "StripeAccountController.createStripeAccount", error });
                                res.status(500).json({ success: false, message: error.message || 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
                                return;
                        }
                        res.status(200).json({ success: true, message: 'Stripe account created successfully', code: 'STRIPE_ACCOUNT_CREATED', data: result });
                } catch (error) {
                        logError({ message: "Creating a stripe account failed!", source: "StripeAccountController.createStripeAccount", error });
                        res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
                        return;
                }
        }
        static async getStripeAccount(req: Request, res: Response){
                try {
                        const { userId } = req.body;
                        if(!Validate.mongoId(userId)){
                                res.status(400).json({ success: false, message: 'Invalid user id', code: 'INVALID_USER_ID' });
                                return;
                        }

                        const [error, result] = await catchError(StripeAccountService.getStripeAccount(userId));

                        if(error){
                                logError({ message: "Fetching a stripe account failed!", source: "StripeAccountController.getStripeAccount", error });
                                res.status(500).json({ success: false, message: error.message || 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
                                return;
                        }
                        res.status(200).json({ success: true, message: 'Stripe account retrieved successfully', code: 'GET_STRIPE_ACCOUNT', data: result });
                } catch (error) {
                        logError({ message: "Fetching a stripe account failed!", source: "StripeAccountController.getStripeAccount", error });
                        res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
                        return;
                }
        }
        static async refreshStripeAccountLink(req: Request, res: Response){
                try {
                        const { userId } = req.body;
                        if(!Validate.mongoId(userId)){
                                res.status(400).json({ success: false, message: 'Invalid user id', code: 'INVALID_USER_ID' });
                                return;
                        }

                        const [error, result] = await catchError(StripeAccountService.refreshStripeAccountLink(userId));

                        if(error){
                                logError({ message: "Refreshing a stripe account link failed!", source: "StripeAccountController.refreshStripeAccountLink", error });
                                res.status(500).json({ success: false, message: error.message || 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
                                return;
                        }
                        res.status(200).json({ success: true, message: 'Stripe account link refreshed successfully', code: 'STRIPE_ACCOUNT_LINK_REFRESHED', data: result });
                } catch (error) {
                        logError({ message: "Refreshing a stripe account link failed!", source: "StripeAccountController.refreshStripeAccountLink", error });
                        res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
                        return;
                }
        }
}