import UserModel from "../models/user.model"
import BusinessModel from "../models/business.model"
import { addEmailJob } from '../integration/QueueManager';
import { vendorApprovalEmailTemplate, vendorRejectionEmailTemplate } from '../templates/approval-email-templates';
import { saveAuditLog } from '../utils/SaveAuditlogs';
import 'dotenv/config';

export class UserService {
    static async getBusinessUsers({ businessType, isVerified, isOnboarded, page, limit, search }: { 
        businessType?: 'manufacturer' | 'distributor',
        isVerified?: boolean,
        isOnboarded?: boolean,
        page?: number,
        limit?: number,
        search?: string
    }) {
        const userFilter: any = { role: { $in: ['distributor', 'manufacturer'] } };
        
        if (businessType) {
            userFilter.role = businessType;
        }

        if (isVerified !== undefined) {
            userFilter.isVerified = isVerified;
        }

        if (search) {
            userFilter.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const total = await UserModel.countDocuments(userFilter);
        const usePagination = page !== undefined && limit !== undefined;
        const skip = usePagination ? (page! - 1) * limit! : 0;

        let userQuery = UserModel.find(userFilter)
            .select('_id firstName lastName email phone profilePicture address role isVerified isActive createdAt');
        
        if (usePagination) {
            userQuery = userQuery.skip(skip).limit(limit!);
        }

        const users = await userQuery.lean();

        const userIds = users.map(user => user._id);
        
        const businessFilter: any = { userId: { $in: userIds }, $or: [{ isRejected: null }, { isRejected: false }] };
        if (isOnboarded !== undefined) {
            businessFilter.isOnboarded = isOnboarded;
        }

        const businesses = await BusinessModel.find(businessFilter)
            .select('userId businessName businessType email phone website address ratings isOnboarded')
            .lean();

        const businessMap = new Map(businesses.map(b => [b.userId.toString(), b]));

        const data = users
            .filter(user => isOnboarded === undefined || businessMap.has(user._id.toString()))
            .map(user => ({
                user: {
                    _id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    phone: user.phone,
                    profilePicture: user.profilePicture,
                    role: user.role,
                    isVerified: user.isVerified,
                    isActive: user.isActive,
                    createdAt: user.createdAt
                },
                business: businessMap.get(user._id.toString()) || null
            }));

        const response: any = { data };
        
        if (usePagination) {
            response.pagination = {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit!)
            };
        } else {
            response.total = total;
        }

        return response;
    }
    static async respondToBusinessApproval({ userId, status, subject, emailBody }: {
        userId: string,
        status: 'approved' | 'rejected',
        subject: string,
        emailBody: string
    }) {
        const user = await UserModel.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        if (user.role !== 'distributor' && user.role !== 'manufacturer') {
            throw new Error('User is not a business owner');
        }

        const business = await BusinessModel.findOne({ userId });
        if (!business) {
            throw new Error('Business not found');
        }

        if (status === 'approved') {
            user.isVerified = true;
            user.isActive = true;
            await user.save();

            const onboardingUrl = `${process.env.FRONTEND_URL}/${user.role === 'distributor' ? 'distributor' : 'manufacturer'}/onboarding/${user._id.toString()}`;
            
            const emailHtml = vendorApprovalEmailTemplate
                .replace(/{{businessName}}/g, business.businessName)
                .replace(/{{emailBody}}/g, emailBody)
                .replace(/{{onboardingUrl}}/g, onboardingUrl);

            await addEmailJob({
                email: user.email,
                subject,
                html: emailHtml
            });

            await saveAuditLog({
                userId: user._id,
                action: 'BUSINESS_APPROVED',
                name: 'User',
                entityId: user._id.toString(),
                entityType: "admin",
                newValues: { isVerified: true, isActive: true }
            });
        } else {
            user.isVerified = false;
            user.isActive = false;
            await user.save();

            business.isRejected = true;
            await business.save();

            const emailHtml = vendorRejectionEmailTemplate
                .replace(/{{businessName}}/g, business.businessName)
                .replace(/{{emailBody}}/g, emailBody);

            await addEmailJob({
                email: user.email,
                subject,
                html: emailHtml
            });

            await saveAuditLog({
                userId: user._id,
                action: 'BUSINESS_REJECTED',
                name: 'User',
                entityId: user._id.toString(),
                entityType: "admin",
                newValues: { isVerified: false, isActive: false, user }
            });
        }

        return {
            userId: user._id,
            status,
            email: user.email,
            businessName: business.businessName
        };
    }
    static async getUserById(userId: string) {
        const user = await UserModel.findById(userId)
            .select('_id firstName lastName email phone profilePicture address role isVerified isActive createdAt');

        if (!user) {
            throw new Error('User not found');
        }
        let business: any = null;
        if (user.role === 'distributor' || user.role === 'manufacturer') {
            business = await BusinessModel.findOne({ userId })
            .select('userId businessName businessType email phone website address ratings isOnboarded');
        }
        return {
            user,
            business
        };
    }
}