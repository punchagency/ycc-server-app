import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { AuthService } from '../service/auth.service';
import { ROLES } from '../models/user.model';

/**
 * Middleware to require a specific role
 */
export const requireRole = (requiredRole: typeof ROLES[number]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      const hasRole = await AuthService.hasRole(req.user._id, requiredRole);

      if (!hasRole) {
        res.status(403).json({
          error: `Access denied. Required role: ${requiredRole}`,
          code: 'INSUFFICIENT_PERMISSIONS'
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({
        error: 'Authorization service error',
        code: 'AUTHORIZATION_ERROR'
      });
    }
  };
};

/**
 * Middleware to require any of the specified roles
 */
export const requireAnyRole = (roles: Array<typeof ROLES[number]>) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      const userRoles = await AuthService.getUserRoles(req.user._id);
      const hasAnyRole = roles.some(role => userRoles.includes(role));

      if (!hasAnyRole) {
        res.status(403).json({
          error: `Access denied. Required roles: ${roles.join(', ')}`,
          code: 'INSUFFICIENT_PERMISSIONS'
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({
        error: 'Authorization service error',
        code: 'AUTHORIZATION_ERROR'
      });
    }
  };
};

/**
 * Middleware to require all of the specified roles
 */
export const requireAllRoles = (roles: Array<typeof ROLES[number]>) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      const userRoles = await AuthService.getUserRoles(req.user._id);
      const hasAllRoles = roles.every(role => userRoles.includes(role));

      if (!hasAllRoles) {
        res.status(403).json({
          error: `Access denied. Required all roles: ${roles.join(', ')}`,
          code: 'INSUFFICIENT_PERMISSIONS'
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({
        error: 'Authorization service error',
        code: 'AUTHORIZATION_ERROR'
      });
    }
  };
};

/**
 * Middleware to check if user has a business account
 */
export const requireBusiness = async (
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

    if (!req.user.businessId) {
      res.status(403).json({
        error: 'Business account required',
        code: 'BUSINESS_REQUIRED'
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Business authorization error:', error);
    res.status(500).json({
      error: 'Authorization service error',
      code: 'AUTHORIZATION_ERROR'
    });
  }
};

/**
 * Middleware to check if user owns the resource
 * Resource user ID should be in req.params.userId or req.body.userId
 */
export const requireOwnership = async (
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

    const resourceUserId = req.params.userId || req.body.userId;
    
    if (!resourceUserId) {
      res.status(400).json({
        error: 'Resource user ID not provided',
        code: 'RESOURCE_USER_ID_MISSING'
      });
      return;
    }

    // Admin can access all resources
    if (req.user.role === 'admin') {
      next();
      return;
    }

    // Check if user owns the resource
    if (req.user._id !== resourceUserId) {
      res.status(403).json({
        error: 'Access denied. You can only access your own resources',
        code: 'OWNERSHIP_REQUIRED'
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Ownership authorization error:', error);
    res.status(500).json({
      error: 'Authorization service error',
      code: 'AUTHORIZATION_ERROR'
    });
  }
};

/**
 * Middleware to check if user owns the business
 * Business ID should be in req.params.businessId or req.body.businessId
 */
export const requireBusinessOwnership = async (
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

    const businessId = req.params.businessId || req.body.businessId;
    
    if (!businessId) {
      res.status(400).json({
        error: 'Business ID not provided',
        code: 'BUSINESS_ID_MISSING'
      });
      return;
    }

    // Admin can access all businesses
    if (req.user.role === 'admin') {
      next();
      return;
    }

    // Check if user owns the business
    if (req.user.businessId !== businessId) {
      res.status(403).json({
        error: 'Access denied. You can only access your own business',
        code: 'BUSINESS_OWNERSHIP_REQUIRED'
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Business ownership authorization error:', error);
    res.status(500).json({
      error: 'Authorization service error',
      code: 'AUTHORIZATION_ERROR'
    });
  }
};

// Predefined role-based middlewares
export const requireAdmin = requireRole('admin');
export const requireUser = requireRole('user');
export const requireDistributor = requireRole('distributor');
export const requireManufacturer = requireRole('manufacturer');

// Business roles (distributor or manufacturer)
export const requireBusinessRole = requireAnyRole(['distributor', 'manufacturer']);

// Admin or business owner
export const requireAdminOrBusiness = requireAnyRole(['admin', 'distributor', 'manufacturer']);
