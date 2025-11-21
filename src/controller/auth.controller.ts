import { Request, Response } from 'express';
import { AuthService, RegisterInput, LoginInput } from '../service/auth.service';
import User, { ROLES } from '../models/user.model';
import Business from '../models/business.model';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import Validate from '../utils/Validate';
import { TryParseJSON } from '../utils/Helpers';

export class AuthController {
    static async register(req: Request, res: Response): Promise<void> {
        try {
            let { firstName, lastName, email, password, phone, nationality, address, role, businessName, businessEmail, businessPhone, website, taxId, license } = req.body;
            email = email.toLowerCase().trim();
            firstName = firstName.trim();
            if (phone) phone = phone.trim();
            if (nationality) nationality = nationality.trim();
            
            const files = req.files as { [fieldname: string]: any[] };
            const profilePicture = files?.profilePicture?.[0]?.location || null;
            
            // Validation
            if (!firstName || !Validate.string(firstName)) {
                res.status(400).json({ success: false, message: 'Valid first name is required', code: "VALIDATION_ERROR" });
                return;
            }
            if (!lastName || !Validate.string(lastName)) {
                res.status(400).json({ success: false, message: 'Valid last name is required', code: "VALIDATION_ERROR" });
                return;
            }

            if (!email || !Validate.email(email)) {
                res.status(400).json({ success: false, message: 'Valid email is required', code: "VALIDATION_ERROR" });
                return;
            }

            if (!password || password.length < 8) {
                res.status(400).json({ success: false, message: 'Password must be at least 8 characters long', code: "VALIDATION_ERROR" });
                return;
            }

            if (phone) {
                if (!Validate.phone(phone)) {
                    res.status(400).json({ success: false, message: 'Valid phone number is required', code: "VALIDATION_ERROR" });
                    return;
                }
                phone = Validate.formatPhone(phone) || phone;
            }

            if (businessPhone) {
                if (!Validate.phone(businessPhone)) {
                    res.status(400).json({ success: false, message: 'Valid business phone is required', code: "VALIDATION_ERROR" });
                    return;
                }
                businessPhone = Validate.formatPhone(businessPhone) || businessPhone;
            }

            if(!Validate.oneOf({ allowedValues: ROLES as any, value: role})){
                res.status(400).json({ success: false, message: 'Valid role is required', code: "VALIDATION_ERROR" });
                return;
            }

            if(role !== 'admin'){
                console.log({address});
                address = TryParseJSON(address, {street: '', zipcode: '', city: '', state: '', country: ''})
                // Address validation
                if (!address || typeof address !== 'object') {
                    res.status(400).json({ success: false, message: 'Valid address is required', code: "VALIDATION_ERROR" });
                    return;
                }
                if (!address.street || !Validate.string(address.street)) {
                    res.status(400).json({ success: false, message: 'Valid street address is required', code: "VALIDATION_ERROR" });
                    return;
                }
                if (!address.zipcode || !Validate.string(address.zipcode)) {
                    res.status(400).json({ success: false, message: 'Valid zipcode is required', code: "VALIDATION_ERROR" });
                    return;
                }
                if (!address.city || !Validate.string(address.city)) {
                    res.status(400).json({ success: false, message: 'Valid city is required', code: "VALIDATION_ERROR" });
                    return;
                }
                if (!address.state || !Validate.string(address.state)) {
                    res.status(400).json({ success: false, message: 'Valid state is required', code: "VALIDATION_ERROR" });
                    return;
                }
                if (!address.country || !Validate.string(address.country)) {
                    res.status(400).json({ success: false, message: 'Valid country is required', code: "VALIDATION_ERROR" });
                    return;
                }
            }
            

            // Business validation for distributor/manufacturer
            if (role === 'distributor' || role === 'manufacturer') {
                if (!businessName || !Validate.string(businessName)) {
                    res.status(400).json({ success: false, message: 'Business name is required for business accounts', code: "VALIDATION_ERROR" });
                    return;
                }
                if (!businessEmail || !Validate.email(businessEmail)) {
                    res.status(400).json({ success: false, message: 'Valid business email is required for business accounts', code: "VALIDATION_ERROR" });
                    return;
                }

                if (!website || !Validate.string(website)) {
                    res.status(400).json({ success: false, message: 'Website is required for business accounts', code: "VALIDATION_ERROR" });
                    return;
                }
                if (!taxId || !Validate.string(taxId)) {
                    res.status(400).json({ success: false, message: 'Tax ID is required for business accounts', code: "VALIDATION_ERROR" });
                    return;
                }
                if (!license || !Validate.string(license)) {
                    res.status(400).json({ success: false, message: 'License is required for business accounts', code: "VALIDATION_ERROR" });
                    return;
                }
            }

            const registerData: RegisterInput = {
                ...req.body,
                phone,
                businessPhone,
                profilePicture
            };
            const result = await AuthService.register(registerData);

            if (result.success) {
                res.status(201).json({
                    success: true,
                    message: 'Registration successful. Please check your email for activation code.',
                    data: {
                        user: result.user
                    }
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: result.error
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Registration failed'
            });
        }
    }

    static async login(req: Request, res: Response): Promise<void> {
        try {
            let { email, password } = req.body;
            email = email.toLowerCase().trim();
            // Validation
            if (!email || !Validate.email(email)) {
                res.status(400).json({ success: false, message: 'Valid email is required', code: "VALIDATION_ERROR" });
                return;
            }

            if (!password || !Validate.string(password)) {
                res.status(400).json({ success: false, message: 'Password is required', code: "VALIDATION_ERROR" });
                return;
            }

            const loginData: LoginInput = { email, password };
            const result = await AuthService.login(loginData);

            if (result.success) {
                res.status(200).json({
                    success: true,
                    message: 'Login successful',
                    data: {
                        token: result.token,
                        refreshToken: result.refreshToken,
                        user: result.user
                    }
                });
            } else {
                res.status(401).json({
                    success: false,
                    message: result.error
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Login failed'
            });
        }
    }

    static async refreshToken(req: Request, res: Response): Promise<void> {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                res.status(400).json({
                    success: false,
                    message: 'Refresh token is required',
                    code: 'VALIDATION_ERROR'
                });
                return;
            }

            const result = await AuthService.refreshToken(refreshToken);

            if (result.success) {
                res.status(200).json({
                    success: true,
                    message: 'Token refreshed successfully',
                    data: {
                        token: result.token,
                        refreshToken: result.refreshToken,
                        user: result.user
                    }
                });
            } else {
                res.status(401).json({
                    success: false,
                    message: result.error
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Token refresh failed'
            });
        }
    }

    static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: 'UNAUTHORIZED'
                });
                return;
            }

            const result = await AuthService.logout(req.user._id);

            if (result.success) {
                res.status(200).json({
                    success: true,
                    message: 'Logout successful'
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: result.error
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Logout failed'
            });
        }
    }

    static async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: 'UNAUTHORIZED'
                });
                return;
            }

            const { oldPassword, newPassword } = req.body;

            if (!oldPassword || !newPassword) {
                res.status(400).json({
                    success: false,
                    message: 'Old password and new password are required',
                    code: 'VALIDATION_ERROR'
                });
                return;
            }

            if (newPassword.length < 8) {
                res.status(400).json({
                    success: false,
                    message: 'New password must be at least 8 characters long',
                    code: 'VALIDATION_ERROR'
                });
                return;
            }

            const result = await AuthService.changePassword(req.user._id, oldPassword, newPassword);

            if (result.success) {
                res.status(200).json({
                    success: true,
                    message: 'Password changed successfully'
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: result.error
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Password change failed'
            });
        }
    }

    static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: 'UNAUTHORIZED'
                });
                return;
            }

            const user = await User.findById(req.user._id).select('-password -refreshToken');

            if (!user) {
                res.status(404).json({
                    success: false,
                    message: 'User not found',
                    code: 'USER_NOT_FOUND'
                });
                return;
            }

            const responseData: any = {
                user: {
                    _id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    nationality: user.nationality,
                    profilePicture: user.profilePicture,
                    address: user.address,
                    isVerified: user.isVerified,
                    isActive: user.isActive,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt
                }
            };

            if (user.role === 'distributor' || user.role === 'manufacturer') {
                const business = await Business.findOne({ userId: user._id });
                if (business) {
                    responseData.business = business;
                }
            }

            res.status(200).json({
                success: true,
                message: 'Profile retrieved successfully',
                data: responseData
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve profile'
            });
        }
    }

    static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: 'UNAUTHORIZED'
                });
                return;
            }

            const { firstName, lastName, phone, nationality, address } = req.body;
            const files = req.files as { [fieldname: string]: any[] };
            const profilePicture = files?.profilePicture?.[0]?.location;

            const updateData: any = {};
            if (firstName) updateData.firstName = firstName.trim();
            if (lastName) updateData.lastName = lastName.trim();
            if (phone) {
                if (!Validate.phone(phone)) {
                    res.status(400).json({ success: false, message: 'Valid phone number is required', code: "VALIDATION_ERROR" });
                    return;
                }
                updateData.phone = Validate.formatPhone(phone) || phone;
            }
            if (nationality) updateData.nationality = nationality.trim();
            if (profilePicture) updateData.profilePicture = profilePicture;
            if (address) updateData.address = address;

            const user = await User.findByIdAndUpdate(
                req.user._id,
                updateData,
                { new: true, runValidators: true }
            ).select('-password -refreshToken');

            if (!user) {
                res.status(404).json({
                    success: false,
                    message: 'User not found',
                    code: 'USER_NOT_FOUND'
                });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Profile updated successfully',
                data: {
                    user: {
                        id: user._id,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        email: user.email,
                        phone: user.phone,
                        role: user.role,
                        profilePicture: user.profilePicture,
                        address: user.address,
                        isVerified: user.isVerified,
                        isActive: user.isActive,
                        createdAt: user.createdAt,
                        updatedAt: user.updatedAt
                    }
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Profile update failed'
            });
        }
    }

    static async updateDistributorProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: 'UNAUTHORIZED'
                });
                return;
            }

            // Check if user is distributor or manufacturer
            if (req.user.role !== 'distributor' && req.user.role !== 'manufacturer') {
                res.status(403).json({
                    success: false,
                    message: 'This endpoint is only for distributor and manufacturer accounts',
                    code: 'FORBIDDEN'
                });
                return;
            }

            const { businessName, businessEmail, businessPhone, website, address } = req.body;

            const updateData: any = {};
            
            if (businessName) updateData.businessName = businessName.trim();
            
            if (businessEmail) {
                if (!Validate.email(businessEmail)) {
                    res.status(400).json({ 
                        success: false, 
                        message: 'Valid business email is required', 
                        code: "VALIDATION_ERROR" 
                    });
                    return;
                }
                updateData.businessEmail = businessEmail.toLowerCase().trim();
            }
            
            if (businessPhone) {
                if (!Validate.phone(businessPhone)) {
                    res.status(400).json({ 
                        success: false, 
                        message: 'Valid business phone is required', 
                        code: "VALIDATION_ERROR" 
                    });
                    return;
                }
                updateData.businessPhone = Validate.formatPhone(businessPhone) || businessPhone;
            }
            
            if (website) updateData.website = website.trim();
            
            if (address) {
                const parsedAddress = TryParseJSON(address, null);
                if (parsedAddress) {
                    updateData.address = parsedAddress;
                } else {
                    updateData.address = address;
                }
            }

            const user = await User.findByIdAndUpdate(
                req.user._id,
                updateData,
                { new: true, runValidators: true }
            ).select('-password -refreshToken');

            if (!user) {
                res.status(404).json({
                    success: false,
                    message: 'User not found',
                    code: 'USER_NOT_FOUND'
                });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Business profile updated successfully',
                data: {
                    user: {
                        id: user._id,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        email: user.email,
                        phone: user.phone,
                        role: user.role,
                        businessName: user.businessName,
                        businessEmail: user.businessEmail,
                        businessPhone: user.businessPhone,
                        website: user.website,
                        address: user.address,
                        isVerified: user.isVerified,
                        isActive: user.isActive,
                        createdAt: user.createdAt,
                        updatedAt: user.updatedAt
                    }
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Business profile update failed'
            });
        }
    }


    static async activateAccount(req: Request, res: Response): Promise<void> {
        try {
            const { email, code } = req.body;

            if (!email || !Validate.email(email)) {
                res.status(400).json({ success: false, message: 'Valid email is required', code: 'VALIDATION_ERROR' });
                return;
            }

            if (!code || !Validate.string(code)) {
                res.status(400).json({ success: false, message: 'Activation code is required', code: 'VALIDATION_ERROR' });
                return;
            }

            const result = await AuthService.activateAccount(email.toLowerCase().trim(), code.trim());

            if (result.success) {
                res.status(200).json({
                    success: true,
                    message: 'Account activated successfully',
                    data: {
                        token: result.token,
                        refreshToken: result.refreshToken,
                        user: result.user
                    }
                });
            } else {
                res.status(400).json({ success: false, message: result.error });
            }
        } catch (error) {
            res.status(500).json({ success: false, message: 'Account activation failed' });
        }
    }

    static async resendActivationCode(req: Request, res: Response): Promise<void> {
        try {
            const { email } = req.body;

            if (!email || !Validate.email(email)) {
                res.status(400).json({ success: false, message: 'Valid email is required', code: 'VALIDATION_ERROR' });
                return;
            }

            const result = await AuthService.resendActivationCode(email.toLowerCase().trim());

            if (result.success) {
                res.status(200).json({ success: true, message: 'Activation code sent successfully' });
            } else {
                res.status(400).json({ success: false, message: result.error });
            }
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to resend activation code' });
        }
    }

    static async forgotPassword(req: Request, res: Response): Promise<void> {
        try {
            const { email } = req.body;

            if (!email || !Validate.email(email)) {
                res.status(400).json({ success: false, message: 'Valid email is required', code: 'VALIDATION_ERROR' });
                return;
            }

            const result = await AuthService.forgotPassword(email.toLowerCase().trim());

            if (result.success) {
                res.status(200).json({ success: true, message: 'Reset code sent to your email' });
            } else {
                res.status(400).json({ success: false, message: result.error });
            }
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to process forgot password request' });
        }
    }

    static async resetPassword(req: Request, res: Response): Promise<void> {
        try {
            const { email, code, newPassword } = req.body;

            if (!email || !Validate.email(email)) {
                res.status(400).json({ success: false, message: 'Valid email is required', code: 'VALIDATION_ERROR' });
                return;
            }

            if (!code || !Validate.string(code)) {
                res.status(400).json({ success: false, message: 'Reset code is required', code: 'VALIDATION_ERROR' });
                return;
            }

            if (!newPassword || newPassword.length < 8) {
                res.status(400).json({ success: false, message: 'Password must be at least 8 characters long', code: 'VALIDATION_ERROR' });
                return;
            }

            const result = await AuthService.resetPassword(email.toLowerCase().trim(), code.trim(), newPassword);

            if (result.success) {
                res.status(200).json({ success: true, message: 'Password reset successfully' });
            } else {
                res.status(400).json({ success: false, message: result.error });
            }
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to reset password' });
        }
    }

    static async resendResetPasswordCode(req: Request, res: Response): Promise<void> {
        try {
            const { email } = req.body;

            if (!email || !Validate.email(email)) {
                res.status(400).json({ success: false, message: 'Valid email is required', code: 'VALIDATION_ERROR' });
                return;
            }

            const result = await AuthService.resendResetPasswordCode(email.toLowerCase().trim());

            if (result.success) {
                res.status(200).json({ success: true, message: 'Reset code sent successfully' });
            } else {
                res.status(400).json({ success: false, message: result.error });
            }
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to resend reset code' });
        }
    }
}