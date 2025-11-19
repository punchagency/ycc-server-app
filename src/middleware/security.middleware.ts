import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import 'dotenv/config';

// Rate limiting configuration
export const createRateLimit = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: message || 'Too many requests from this IP, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
      retryable: true,
      timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        error: message || 'Too many requests from this IP, please try again later',
        code: 'RATE_LIMIT_EXCEEDED',
        retryable: true,
        timestamp: new Date().toISOString()
      });
    }
  });
};

// General API rate limit
export const generalRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // limit each IP to 100 requests per windowMs
  'Too many API requests from this IP, please try again later'
);

// Auth endpoints rate limit (more restrictive)
export const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // limit each IP to 5 auth requests per windowMs
  'Too many authentication attempts from this IP, please try again later'
);

// Message sending rate limit
export const messageRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  10, // limit each IP to 10 message requests per minute
  'Too many message requests, please try again later'
);

// Request size limit middleware
export const requestSizeLimit = (maxSize: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.headers['content-length'];
    
    if (contentLength) {
      const sizeInMB = parseInt(contentLength) / (1024 * 1024);
      const maxSizeInMB = parseInt(maxSize.replace('mb', ''));
      
      if (sizeInMB > maxSizeInMB) {
        res.status(413).json({
          error: `Request size too large. Maximum allowed size is ${maxSize}`,
          code: 'REQUEST_TOO_LARGE',
          retryable: false,
          timestamp: new Date().toISOString()
        });
        return;
      }
    }
    
    next();
  };
};

// Content type validation middleware
export const validateContentType = (allowedTypes: string[] = ['application/json']) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET' || req.method === 'DELETE') {
      return next();
    }
    
    const contentType = req.headers['content-type'];
    
    if (!contentType) {
      res.status(400).json({
        error: 'Content-Type header is required',
        code: 'CONTENT_TYPE_MISSING',
        retryable: false,
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    const isValidType = allowedTypes.some(type => 
      contentType.toLowerCase().includes(type.toLowerCase())
    );
    
    if (!isValidType) {
      res.status(415).json({
        error: `Unsupported content type. Allowed types: ${allowedTypes.join(', ')}`,
        code: 'UNSUPPORTED_CONTENT_TYPE',
        retryable: false,
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    next();
  };
};

// API key validation middleware (for webhook endpoints)
export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  const expectedApiKey = process.env.WEBHOOK_API_KEY;
  
  if (!expectedApiKey) {
    console.error('WEBHOOK_API_KEY not configured');
    res.status(500).json({
      error: 'Server configuration error',
      code: 'SERVER_CONFIG_ERROR',
      retryable: false,
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  if (!apiKey || apiKey !== expectedApiKey) {
    res.status(401).json({
      error: 'Invalid or missing API key',
      code: 'INVALID_API_KEY',
      retryable: false,
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  next();
};