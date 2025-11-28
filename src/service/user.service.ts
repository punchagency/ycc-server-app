import UserModel from "../models/user.model"
import BusinessModel from "../models/business.model"

export class UserService {

    static async getBusinessUsers({ businessType }: { businessType?: 'manufacturer' | 'distributor' }) {
        const filter: any = { role: { $in: ['distributor', 'manufacturer'] } };
        
        if (businessType) {
            filter.role = businessType;
        }

        const users = await UserModel.find(filter)
            .select('_id firstName lastName email phone profilePicture role isVerified isActive createdAt')
            .lean();

        const userIds = users.map(user => user._id);
        const businesses = await BusinessModel.find({ userId: { $in: userIds } })
            .select('userId businessName businessType email phone website address ratings isOnboarded')
            .lean();

        const businessMap = new Map(businesses.map(b => [b.userId.toString(), b]));

        return users.map(user => ({
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
    }
}