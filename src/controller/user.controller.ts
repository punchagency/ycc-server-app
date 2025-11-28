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

        if(req.user.role !== 'admin'){
            res.status(403).json({ success: false, message: 'Forbidden', code: 'FORBIDDEN' });
            return;
        }
        
        const { businessType } = req.query;

        if(businessType && !Validate.oneOf({value: businessType as string, allowedValues: ['manufacturer', 'distributor']})){
            res.status(400).json({ success: false, message: 'Invalid business type. Must be either "manufacturer" or "distributor"', code: 'VALIDATION_ERROR' });
            return;
        }

        const [error, result] = await catchError(
            UserService.getBusinessUsers({ businessType: businessType as 'manufacturer' | 'distributor' })
        );

        if(error){
            res.status(500).json({ success: false, message: error.message, code: 'INTERNAL_SERVER_ERROR' });
            return;
        }
        
        res.status(200).json({ success: true, data: result, message: 'Business users fetched successfully', code: 'SUCCESS' });
    }
}