import { AuthenticatedRequest } from "../middleware";
import { Response } from "express";
import Validate from "../utils/Validate";
import { QuoteService } from "../service/quote.service";
import catchError from "../utils/catchError";
import { logError } from "../utils/SystemLogs";

export class QuoteController {
    static async approveQuoteAndPay(req: AuthenticatedRequest, res: Response){
        try {
            if(!req.user){
                res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
                return;
            }
            const { id } = req.params;
            if(!Validate.mongoId(id)){
                res.status(400).json({ success: false, message: 'Invalid quote id', code: 'INVALID_QUOTE_ID' });
                return;
            }

            const [error, result] = await catchError(QuoteService.approveQuoteAndPay({quoteId: id, userId: req.user._id.toString()}));
            if(error){
                logError({ message: "Approving quote and paying failed!", source: "QuoteController.approveQuoteAndPay", error })
                res.status(500).json({ success: false, message: error.message || 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
                return;
            }
            res.status(200).json({ success: true, message: 'Quote approved and payment processed successfully', code: 'QUOTE_APPROVED', data: result });
        } catch (error) {
            logError({ message: "Approving quote and paying failed!", source: "QuoteController.approveQuoteAndPay", error });
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
            return;
        }
    }
    static async declineQuote(req: AuthenticatedRequest, res: Response){
        try {
            if(!req.user){
                res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
                return;
            }
            const { id } = req.params;
            const { reason } = req.body;

            const [error, result] = await catchError(QuoteService.declineQuote({quoteId: id, userId: req.user._id.toString(), reason}));
            if(error){
                logError({ message: "Declining quote failed!", source: "QuoteController.declineQuote", error });
                res.status(500).json({ success: false, message: error.message || 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
                return;
            }
            res.status(200).json({ success: true, message: 'Quote declined successfully', code: 'QUOTE_DECLINED', data: result });
        } catch (error) {
            logError({ message: "Declining quote failed!", source: "QuoteController.declineQuote", error });
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
            return;
        }
    }
}
