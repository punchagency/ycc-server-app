import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User, { ROLES } from '../models/user.model';
import Business, { BUSINESS_TYPE } from '../models/business.model';

export interface AuthResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: typeof ROLES[number];
    business?: {
      id: string;
      businessName: string;
      businessType: typeof BUSINESS_TYPE[number];
    };
  };
  error?: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: typeof ROLES[number];
  // Business-specific fields (for distributor/manufacturer roles)
  businessName?: string;
  businessType?: typeof BUSINESS_TYPE[number];
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
  name?: string;
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
    const secret = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('REFRESH_TOKEN_SECRET environment variable is not configured');
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

      // Create user
      const newUser = new User({
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        phone: userData.phone,
        role: userData.role || 'user',
        isVerified: false,
        isActive: true
      });

      const savedUser = await newUser.save();

      // If role is distributor or manufacturer, create business record
      let business = null;
      if (
        (userData.role === 'distributor' || userData.role === 'manufacturer') &&
        userData.businessName
      ) {
        // For simplicity, creating placeholder Stripe account details
        // TODO: In production, you would integrate with Stripe API
        const newBusiness = new Business({
          userId: savedUser._id.toString(),
          bunsinessName: userData.businessName,
          businessType: userData.businessType || userData.role,
          website: userData.website || '',
          email: userData.email,
          phone: userData.phone || '',
          taxId: userData.taxId || '',
          stripeAccountId: '', // Should be created via Stripe API
          stripeAccountLink: '', // Should be created via Stripe API
          license: userData.license || '',
          isOnboarded: false
        });

        business = await newBusiness.save();
      }

      // Generate tokens
      const token = this.generateJwtToken(savedUser, business);
      const refreshToken = this.generateRefreshToken(savedUser);

      // Save refresh token to user
      savedUser.refreshToken = refreshToken;
      await savedUser.save();

      return {
        success: true,
        token,
        refreshToken,
        user: {
          id: savedUser._id.toString(),
          email: savedUser.email,
          name: savedUser.name,
          role: savedUser.role,
          business: business ? {
            id: business._id.toString(),
            businessName: business.bunsinessName,
            businessType: business.businessType
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
        business = await Business.findOne({ userId: user._id.toString() });
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
          name: user.name,
          role: user.role,
          business: business ? {
            id: business._id.toString(),
            businessName: business.bunsinessName,
            businessType: business.businessType
          } : undefined
        }
      };
    } catch (error) {
      console.error('Login error:', error);
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
        business = await Business.findOne({ userId: user._id.toString() });
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
          name: user.name,
          role: user.role,
          business: business ? {
            id: business._id.toString(),
            businessName: business.bunsinessName,
            businessType: business.businessType
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
        name: user.name,
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
      name: user.name,
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

  static async changePassword(
    userId: string, 
    oldPassword: string, 
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
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
}
