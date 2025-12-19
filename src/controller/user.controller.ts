import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import catchError from '../utils/catchError';
import { UserService } from '../service/user.service';
import Validate from '../utils/Validate';

export class UserController {
    static async getBusinessUsers(req: AuthenticatedRequest, res: Response) {
        if(!req.user){
            res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
            return;
        }

        if(!['admin', 'distributor'].includes(req.user?.role)){
            res.status(403).json({ success: false, message: 'Forbidden', code: 'FORBIDDEN' });
            return;
        }
        
        const { businessType, isVerified, isOnboarded, page, limit, search, status } = req.query;

        if(businessType && !Validate.oneOf({value: businessType as string, allowedValues: ['manufacturer', 'distributor']})){
            res.status(400).json({ success: false, message: 'Invalid business type. Must be either "manufacturer" or "distributor"', code: 'VALIDATION_ERROR' });
            return;
        }

        if(status && !Validate.oneOf({value: status as string, allowedValues: ['pending', 'approved', 'rejected']})){
            res.status(400).json({ success: false, message: 'Invalid status value. Must be either "pending", "approved" or "rejected"', code: 'VALIDATION_ERROR' });
            return;
        }

        if(req.user?.role === "distributor" && businessType === "distributor"){
            res.status(403).json({ success: false, message: 'Forbidden', code: 'FORBIDDEN' });
            return;
        }

        if(isVerified && !Validate.oneOf({value: isVerified as string, allowedValues: ['true', 'false']})){
            res.status(400).json({ success: false, message: 'Invalid isVerified value. Must be either "true" or "false"', code: 'VALIDATION_ERROR' });
            return;
        }

        if(isOnboarded && !Validate.oneOf({value: isOnboarded as string, allowedValues: ['true', 'false']})){
            res.status(400).json({ success: false, message: 'Invalid isOnboarded value. Must be either "true" or "false"', code: 'VALIDATION_ERROR' });
            return;
        }

        const [error, result] = await catchError(
            UserService.getBusinessUsers({ 
                businessType: businessType as 'manufacturer' | 'distributor',
                isVerified: isVerified ? isVerified === 'true' : undefined,
                isOnboarded: isOnboarded ? isOnboarded === 'true' : undefined,
                page: page ? parseInt(page as string) : undefined,
                limit: limit ? parseInt(limit as string) : undefined,
                search: search as string,
                status: status as 'pending' | 'approved' | 'rejected'
            })
        );

        if(error){
            res.status(500).json({ success: false, message: error.message, code: 'INTERNAL_SERVER_ERROR' });
            return;
        }
        
        const response: any = { success: true, data: result.data, message: 'Business users fetched successfully', code: 'SUCCESS' };
        if (result.pagination) {
            response.pagination = result.pagination;
        } else {
            response.total = result.total;
        }
        res.status(200).json(response);
    }
    static async respondToBusinessApproval(req: AuthenticatedRequest, res: Response) {
        if(!req.user){
            res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
            return;
        }

        if(req.user.role !== 'admin'){
            res.status(403).json({ success: false, message: 'Forbidden', code: 'FORBIDDEN' });
            return;
        }

        const { userId, status, subject, emailBody } = req.body;

        if(!userId || !status){
            res.status(400).json({ success: false, message: 'User ID and status are required', code: 'VALIDATION_ERROR' });
            return;
        }

        if(!Validate.oneOf({value: status, allowedValues: ['approved', 'rejected']})){
            res.status(400).json({ success: false, message: 'Invalid status. Must be either "approved" or "rejected"', code: 'VALIDATION_ERROR' });
            return;
        }

        if(!subject || !emailBody){
            res.status(400).json({ success: false, message: 'Subject and email body are required', code: 'VALIDATION_ERROR' });
            return;
        }

        const [error, result] = await catchError(
            UserService.respondToBusinessApproval({
                userId,
                status,
                subject,
                emailBody
            })
        );

        if(error){
            res.status(500).json({ success: false, message: error.message, code: 'INTERNAL_SERVER_ERROR' });
            return;
        }

        res.status(200).json({ success: true, data: result, message: 'Business user responded successfully', code: 'SUCCESS' });
    }
    static async getUserById(req: AuthenticatedRequest, res: Response) {
        if(!req.user){
            res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
            return;
        }

        const { id } = req.params;

        if(!Validate.mongoId(id)){
            res.status(400).json({ success: false, message: 'Invalid user id', code: 'VALIDATION_ERROR' });
            return;
        }

        const [error, result] = await catchError(
            UserService.getUserById(id)
        );

        if(error){
            res.status(500).json({ success: false, message: error.message, code: 'INTERNAL_SERVER_ERROR' });
            return;
        }

        res.status(200).json({ success: true, data: result, message: 'Business user fetched successfully', code: 'SUCCESS' });
    }
}