import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthService } from '../service/auth.service';
import { ROLES } from '../models/user.model';

export interface AuthenticatedRequest extends Request {
  user?: {
    _id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: typeof ROLES[number];
    businessId?: string;
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({ 
        error: 'Access token required',
        code: 'AUTH_TOKEN_MISSING' 
      });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET not configured');
      res.status(500).json({ 
        error: 'Server configuration error',
        code: 'SERVER_CONFIG_ERROR' 
      });
      return;
    }

    // Verify and validate token
    const validationResult = await AuthService.validateToken(token);
    
    if (!validationResult.valid) {
      res.status(401).json({ 
        error: validationResult.error || 'Invalid or expired token',
        code: 'AUTH_TOKEN_INVALID' 
      });
      return;
    }

    // Attach user info to request
    req.user = {
      _id: validationResult.userId!,
      email: validationResult.email!,
      firstName: validationResult.firstName!,
      lastName: validationResult.lastName!,
      role: validationResult.role!,
      businessId: validationResult.businessId
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ 
        error: 'Invalid token format',
        code: 'AUTH_TOKEN_MALFORMED' 
      });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ 
        error: 'Token expired',
        code: 'AUTH_TOKEN_EXPIRED' 
      });
      return;
    }

    res.status(500).json({ 
      error: 'Authentication service error',
      code: 'AUTH_SERVICE_ERROR' 
    });
  }
};

/**
 * Middleware to optionally authenticate user
 * If token is provided, validate it and attach user info
 * If no token, continue without user info
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    // If no token provided, continue without authentication
    if (!token) {
      next();
      return;
    }

    // If token is provided, validate it
    const validationResult = await AuthService.validateToken(token);
    
    if (validationResult.valid) {
      req.user = {
        _id: validationResult.userId!,
        email: validationResult.email!,
        firstName: validationResult.firstName!,
        lastName: validationResult.lastName!,
        role: validationResult.role!,
        businessId: validationResult.businessId
      };
    }

    next();
  } catch (error) {
    // For optional auth, continue even if token validation fails
    console.warn('Optional auth validation failed:', error);
    next();
  }
};

/**
 * Middleware to check if user is verified
 */
export const requireVerified = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    // Here you might want to check the user's verification status from database
    // For now, we'll allow all authenticated users
    next();
  } catch (error) {
    console.error('Verification check error:', error);
    res.status(500).json({
      error: 'Verification check failed',
      code: 'VERIFICATION_ERROR'
    });
  }
};

// Aliases for backward compatibility
export const requireAuth = authenticateToken;
export const authMiddleware = authenticateToken;
