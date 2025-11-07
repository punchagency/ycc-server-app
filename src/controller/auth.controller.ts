import { Request, Response } from 'express';
import { AuthService, RegisterInput, LoginInput } from '../service/auth.service';
import User, { ROLES } from '../models/user.model';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import Validate from '../utils/Validate';

export class AuthController {
    static async register(req: Request, res: Response): Promise<void> {
        try {
            let { name, email, password, phone, role } = req.body;
            email = email.toLowerCase().trim();
            name = name.trim();
            phone = phone.trim();
            // Validation
            if (!name || !Validate.string(name)) {
                res.status(400).json({ success: false, message: 'Valid name is required', code: "VALIDATION_ERROR" });
                return;
            }

            if (!email || !Validate.email(email)) {
                res.status(400).json({ success: false, message: 'Valid email is required', code: "VALIDATION_ERROR" });
                return;
            }

            if (!password || password.length < 6) {
                res.status(400).json({ success: false, message: 'Password must be at least 6 characters long', code: "VALIDATION_ERROR" });
                return;
            }

            if (phone && !Validate.phone(phone)) {
                res.status(400).json({ success: false, message: 'Valid phone number is required', code: "VALIDATION_ERROR" });
                return;
            }

            if(!Validate.oneOf({ allowedValues: ROLES as any, value: role})){
                res.status(400).json({ success: false, message: 'Valid role is required', code: "VALIDATION_ERROR" })
            }

            const registerData: RegisterInput = req.body;
            const result = await AuthService.register(registerData);

            if (result.success) {
                res.status(201).json({
                    success: true,
                    message: 'User registered successfully',
                    data: {
                        token: result.token,
                        refreshToken: result.refreshToken,
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
                res.status(400).json({ success: false, message: 'Valid email is required' });
                return;
            }

            if (!password || !Validate.string(password)) {
                res.status(400).json({ success: false, message: 'Password is required' });
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
                    message: 'Refresh token is required'
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
                    message: 'Authentication required'
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
                    message: 'Authentication required'
                });
                return;
            }

            const { oldPassword, newPassword } = req.body;

            if (!oldPassword || !newPassword) {
                res.status(400).json({
                    success: false,
                    message: 'Old password and new password are required'
                });
                return;
            }

            if (newPassword.length < 6) {
                res.status(400).json({
                    success: false,
                    message: 'New password must be at least 6 characters long'
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
                    message: 'Authentication required'
                });
                return;
            }

            const user = await User.findById(req.user._id).select('-password -refreshToken');

            if (!user) {
                res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Profile retrieved successfully',
                data: {
                    user: {
                        id: user._id,
                        name: user.name,
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
                message: 'Failed to retrieve profile'
            });
        }
    }

    static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
                return;
            }

            const { name, phone, profilePicture, address } = req.body;

            const updateData: any = {};
            if (name) updateData.name = name;
            if (phone) updateData.phone = phone;
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
                    message: 'User not found'
                });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Profile updated successfully',
                data: {
                    user: {
                        id: user._id,
                        name: user.name,
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
}