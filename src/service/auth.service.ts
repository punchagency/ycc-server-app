import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User, { ROLES } from '../models/user.model';
import Business, { BUSINESS_TYPE } from '../models/business.model';
import crypto from 'crypto';
import { addEmailJob } from '../integration/QueueManager';
import { DateTime } from 'luxon';
import { logError } from '../utils/SystemLogs';
import 'dotenv/config';

export interface AuthResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: typeof ROLES[number];
    business?: {
      id: string;
      businessName: string;
      businessType: typeof BUSINESS_TYPE[number];
      isOnboarded: boolean;
    };
  };
  error?: string;
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  nationality?: string;
  role?: typeof ROLES[number];
  profilePicture?: string | null;
  address: {
    street: string;
    zipcode: string;
    city: string;
    state: string;
    country: string;
  };
  // Business-specific fields (for distributor/manufacturer roles)
  businessName?: string;
  businessType?: typeof BUSINESS_TYPE[number];
  businessEmail?: string;
  businessPhone?: string;
  website?: string;
  taxId?: string;
  license?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ValidationResponse {
  valid: boolean;
  userId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: typeof ROLES[number];
  businessId?: string;
  error?: string;
}

export class AuthService {
  private static getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is not configured');
    }
    return secret;
  }

  private static getRefreshTokenSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is not configured');
    }
    return secret;
  }

  private static getJwtExpiresIn(): string {
    return process.env.JWT_EXPIRES_IN || '24h';
  }

  private static getRefreshTokenExpiresIn(): string {
    return process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
  }

  static async register(userData: RegisterInput): Promise<AuthResponse> {
    let savedUser: any = null;
    let business: any = null;

    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });

      if (existingUser) {
        return {
          success: false,
          error: 'User with this email already exists'
        };
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

      // Generate activation code
      const activationCode = crypto.randomInt(100000, 999999).toString();
      const activationCodeExpires = DateTime.now().plus({ minutes: 20 }).toJSDate();

      // Create user
      const newUser = new User({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: hashedPassword,
        phone: userData.phone,
        nationality: userData.nationality,
        address: userData.address,
        profilePicture: userData.profilePicture,
        role: userData.role || 'user',
        activationCode,
        activationCodeExpires,
        isVerified: false,
        isActive: false
      });

      savedUser = await newUser.save();

      // Send activation email
      try {
        await addEmailJob({
          email: savedUser.email,
          subject: 'Activate Your Account',
          html: `
            <h1>Welcome ${savedUser.firstName}!</h1>
            <p>Your activation code is: <strong>${activationCode}</strong></p>
            <p>This code will expire in 20 minutes.</p>
          `
        });
      } catch (emailError) {
        await User.findByIdAndDelete(savedUser._id);
        throw new Error('Failed to send activation email');
      }

      // If role is distributor or manufacturer, create business record
      if (
        (userData.role === 'distributor' || userData.role === 'manufacturer') &&
        userData.businessName
      ) {
        try {
          const newBusiness = new Business({
            userId: savedUser._id,
            businessName: userData.businessName,
            businessType: userData.businessType || userData.role,
            website: userData.website || '',
            address: userData.address,
            email: userData.businessEmail || '',
            phone: userData.businessPhone || '',
            taxId: userData.taxId || '',
            stripeAccountId: '',
            stripeAccountLink: '',
            license: userData.license || '',
            isOnboarded: false
          });

          business = await newBusiness.save();
        } catch (businessError) {
          await User.findByIdAndDelete(savedUser._id);
          throw new Error('Failed to create business record');
        }
      }

      return {
        success: true,
        user: {
          id: savedUser._id.toString(),
          email: savedUser.email,
          firstName: savedUser.firstName,
          lastName: savedUser.lastName,
          role: savedUser.role,
          business: business ? {
            id: business._id.toString(),
            businessName: business.businessName,
            businessType: business.businessType,
            isOnboarded: business.isOnboarded
          } : undefined
        }
      };
    } catch (error) {
      console.error('Registration error:', error);
      
      return {
        success: false,
        error: 'Registration failed. Please try again.'
      };
    }
  }

  static async login(loginData: LoginInput): Promise<AuthResponse> {
    try {
      // Find user in database
      const user = await User.findOne({ email: loginData.email });

      if (!user) {
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      // Check if user is active
      if (!user.isActive) {
        return {
          success: false,
          error: 'Your account has been deactivated. Please contact support.'
        };
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(loginData.password, user.password);
      
      if (!isPasswordValid) {
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      // Get business if user is distributor or manufacturer
      let business = null;
      if (user.role === 'distributor' || user.role === 'manufacturer') {
        business = await Business.findOne({ userId: user._id });
      }

      // Generate tokens
      const token = this.generateJwtToken(user, business);
      const refreshToken = this.generateRefreshToken(user);

      // Save refresh token to user
      user.refreshToken = refreshToken;
      await user.save();

      return {
        success: true,
        token,
        refreshToken,
        user: {
          id: user._id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          business: business ? {
            id: business._id.toString(),
            businessName: business.businessName,
            businessType: business.businessType,
            isOnboarded: business.isOnboarded
          } : undefined
        }
      };
    } catch (error) {
      logError({message: 'Login error', error: error as Error, source: 'AuthService'})
      return {
        success: false,
        error: 'Login failed. Please try again.'
      };
    }
  }

  static async refreshToken(oldRefreshToken: string): Promise<AuthResponse> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(oldRefreshToken, this.getRefreshTokenSecret()) as any;
      
      // Find user
      const user = await User.findById(decoded.userId);

      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Check if refresh token matches
      if (user.refreshToken !== oldRefreshToken) {
        return {
          success: false,
          error: 'Invalid refresh token'
        };
      }

      // Check if user is active
      if (!user.isActive) {
        return {
          success: false,
          error: 'Your account has been deactivated'
        };
      }

      // Get business if applicable
      let business = null;
      if (user.role === 'distributor' || user.role === 'manufacturer') {
        business = await Business.findOne({ userId: user._id });

        if(!user.isVerified){
          return {
            success: false,
            error: 'Your account has not been verified yet. Please check your email for verification instructions.'
          };
        }
      }

      // Generate new tokens
      const newToken = this.generateJwtToken(user, business);
      const newRefreshToken = this.generateRefreshToken(user);

      // Update refresh token
      user.refreshToken = newRefreshToken;
      await user.save();

      return {
        success: true,
        token: newToken,
        refreshToken: newRefreshToken,
        user: {
          id: user._id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          business: business ? {
            id: business._id.toString(),
            businessName: business.businessName,
            businessType: business.businessType,
            isOnboarded: business.isOnboarded
          } : undefined
        }
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      
      if (error instanceof jwt.TokenExpiredError) {
        return {
          success: false,
          error: 'Refresh token expired. Please login again.'
        };
      }

      return {
        success: false,
        error: 'Token refresh failed'
      };
    }
  }

  static async validateToken(token: string): Promise<ValidationResponse> {
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, this.getJwtSecret()) as any;
      
      // Get user from database
      const user = await User.findById(decoded.userId);

      if (!user) {
        return {
          valid: false,
          error: 'User not found'
        };
      }

      // Check if user is active
      if (!user.isActive) {
        return {
          valid: false,
          error: 'User account is deactivated'
        };
      }

      return {
        valid: true,
        userId: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        businessId: decoded.businessId
      };
    } catch (error) {
      console.error('Token validation error:', error);
      
      if (error instanceof jwt.JsonWebTokenError) {
        return {
          valid: false,
          error: 'Invalid token format'
        };
      }

      if (error instanceof jwt.TokenExpiredError) {
        return {
          valid: false,
          error: 'Token expired'
        };
      }

      return {
        valid: false,
        error: 'Token validation failed'
      };
    }
  }

  static async logout(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await User.findById(userId);

      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Clear refresh token
      user.refreshToken = '';
      await user.save();

      return {
        success: true
      };
    } catch (error) {
      console.error('Logout error:', error);
      return {
        success: false,
        error: 'Logout failed'
      };
    }
  }

  private static generateJwtToken(user: any, business: any = null): string {
    const payload = {
      userId: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      businessId: business ? business._id.toString() : null
    };

    return jwt.sign(payload, this.getJwtSecret(), {
      expiresIn: this.getJwtExpiresIn()
    } as jwt.SignOptions);
  }

  private static generateRefreshToken(user: any): string {
    const payload = {
      userId: user._id.toString(),
      type: 'refresh'
    };

    return jwt.sign(payload, this.getRefreshTokenSecret(), {
      expiresIn: this.getRefreshTokenExpiresIn()
    } as jwt.SignOptions);
  }

  static async getUserRoles(userId: string): Promise<string[]> {
    try {
      const user = await User.findById(userId);

      if (!user) {
        return [];
      }

      // Return the user's role
      return [user.role];
    } catch (error) {
      console.error('Error getting user roles:', error);
      return [];
    }
  }

  static async hasRole(userId: string, role: string): Promise<boolean> {
    const roles = await this.getUserRoles(userId);
    return roles.includes(role);
  }

  static async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await User.findById(userId);

      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Verify old password
      const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
      
      if (!isPasswordValid) {
        return {
          success: false,
          error: 'Current password is incorrect'
        };
      }

      // Hash new password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      user.password = hashedPassword;
      await user.save();

      return {
        success: true
      };
    } catch (error) {
      console.error('Change password error:', error);
      return {
        success: false,
        error: 'Failed to change password'
      };
    }
  }

  static async verifyUser(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await User.findById(userId);

      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      user.isVerified = true;
      await user.save();

      return {
        success: true
      };
    } catch (error) {
      console.error('Verify user error:', error);
      return {
        success: false,
        error: 'Failed to verify user'
      };
    }
  }

  static async activateAccount(email: string, code: string): Promise<AuthResponse> {
    try {
      const user = await User.findOne({ email });

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      if (user.isActive) {
        return { success: false, error: 'Account already activated' };
      }

      if (!user.activationCode || user.activationCode !== code) {
        return { success: false, error: 'Invalid activation code' };
      }

      if (user.activationCodeExpires && user.activationCodeExpires < new Date()) {
        return { success: false, error: 'Activation code expired' };
      }

      user.isActive = true;
      user.isVerified = true;
      user.activationCode = undefined;
      user.activationCodeExpires = undefined;
      await user.save();

      const business = (user.role === 'distributor' || user.role === 'manufacturer') 
        ? await Business.findOne({ userId: user._id }) 
        : null;

      const token = this.generateJwtToken(user, business);
      const refreshToken = this.generateRefreshToken(user);
      user.refreshToken = refreshToken;
      await user.save();

      return {
        success: true,
        token,
        refreshToken,
        user: {
          id: user._id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          business: business ? {
            id: business._id.toString(),
            businessName: business.businessName,
            businessType: business.businessType,
            isOnboarded: business.isOnboarded
          } : undefined
        }
      };
    } catch (error) {
      console.error('Activate account error:', error);
      return { success: false, error: 'Failed to activate account' };
    }
  }

  static async resendActivationCode(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await User.findOne({ email });

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      if (user.isActive) {
        return { success: false, error: 'Account already activated' };
      }

      const activationCode = crypto.randomInt(100000, 999999).toString();
      const activationCodeExpires = DateTime.now().plus({ minutes: 20 }).toJSDate();

      user.activationCode = activationCode;
      user.activationCodeExpires = activationCodeExpires;
      await user.save();

      await addEmailJob({
        email: user.email,
        subject: 'Activation Code',
        html: `
          <h1>Hello ${user.firstName}!</h1>
          <p>Your new activation code is: <strong>${activationCode}</strong></p>
          <p>This code will expire in 20 minutes.</p>
        `
      });

      return { success: true };
    } catch (error) {
      console.error('Resend activation code error:', error);
      return { success: false, error: 'Failed to resend activation code' };
    }
  }

  static async forgotPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await User.findOne({ email });

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      const resetCode = crypto.randomInt(100000, 999999).toString();
      const resetCodeExpires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

      user.resetPasswordCode = resetCode;
      user.resetPasswordCodeExpires = resetCodeExpires;
      await user.save();

      await addEmailJob({
        email: user.email,
        subject: 'Reset Password Code',
        html: `
          <h1>Hello ${user.firstName}!</h1>
          <p>Your password reset code is: <strong>${resetCode}</strong></p>
          <p>This code will expire in 1 hour.</p>
        `
      });

      return { success: true };
    } catch (error) {
      console.error('Forgot password error:', error);
      return { success: false, error: 'Failed to send reset code' };
    }
  }

  static async resetPassword(email: string, code: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await User.findOne({ email });

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      if (!user.resetPasswordCode || user.resetPasswordCode !== code) {
        return { success: false, error: 'Invalid reset code' };
      }

      if (user.resetPasswordCodeExpires && user.resetPasswordCodeExpires < new Date()) {
        return { success: false, error: 'Reset code expired' };
      }

      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      user.password = hashedPassword;
      user.resetPasswordCode = undefined;
      user.resetPasswordCodeExpires = undefined;
      await user.save();

      return { success: true };
    } catch (error) {
      console.error('Reset password error:', error);
      return { success: false, error: 'Failed to reset password' };
    }
  }

  static async resendResetPasswordCode(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await User.findOne({ email });

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      const resetCode = crypto.randomInt(100000, 999999).toString();
      const resetCodeExpires = DateTime.now().plus({ hour: 1 }).toJSDate();

      user.resetPasswordCode = resetCode;
      user.resetPasswordCodeExpires = resetCodeExpires;
      await user.save();

      await addEmailJob({
        email: user.email,
        subject: 'Reset Password Code',
        html: `
          <h1>Hello ${user.firstName}!</h1>
          <p>Your new password reset code is: <strong>${resetCode}</strong></p>
          <p>This code will expire in 1 hour.</p>
        `
      });

      return { success: true };
    } catch (error) {
      console.error('Resend reset code error:', error);
      return { success: false, error: 'Failed to resend reset code' };
    }
  }
}
