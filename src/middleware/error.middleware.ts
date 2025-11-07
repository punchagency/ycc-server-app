import { Request, Response, NextFunction } from 'express';
import { Logger } from './logging.middleware';

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error categories for monitoring and alerting
export enum ErrorCategory {
  CLIENT_ERROR = 'client_error',
  SERVER_ERROR = 'server_error',
  EXTERNAL_SERVICE = 'external_service',
  DATABASE = 'database',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  RATE_LIMIT = 'rate_limit',
  TIMEOUT = 'timeout',
  NETWORK = 'network'
}

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  retryable?: boolean;
  details?: any;
  severity?: ErrorSeverity;
  category?: ErrorCategory;
  correlationId?: string;
  userId?: string;
  service?: string;
  operation?: string;
  metadata?: Record<string, any>;
}

export class ValidationError extends Error implements AppError {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
  retryable = false;
  severity = ErrorSeverity.LOW;
  category = ErrorCategory.VALIDATION;

  constructor(message: string, public details?: any, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error implements AppError {
  statusCode = 401;
  code = 'AUTHENTICATION_ERROR';
  retryable = false;
  severity = ErrorSeverity.MEDIUM;
  category = ErrorCategory.AUTHENTICATION;

  constructor(message: string = 'Authentication required', public details?: any) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error implements AppError {
  statusCode = 403;
  code = 'AUTHORIZATION_ERROR';
  retryable = false;
  severity = ErrorSeverity.MEDIUM;
  category = ErrorCategory.AUTHORIZATION;

  constructor(message: string = 'Insufficient permissions', public details?: any) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error implements AppError {
  statusCode = 404;
  code = 'NOT_FOUND_ERROR';
  retryable = false;
  severity = ErrorSeverity.LOW;
  category = ErrorCategory.CLIENT_ERROR;

  constructor(message: string = 'Resource not found', public resource?: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error implements AppError {
  statusCode = 409;
  code = 'CONFLICT_ERROR';
  retryable = false;
  severity = ErrorSeverity.MEDIUM;
  category = ErrorCategory.CLIENT_ERROR;

  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends Error implements AppError {
  statusCode = 429;
  code = 'RATE_LIMIT_ERROR';
  retryable = true;
  severity = ErrorSeverity.MEDIUM;
  category = ErrorCategory.RATE_LIMIT;

  constructor(message: string = 'Rate limit exceeded', public retryAfter?: number) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class ExternalServiceError extends Error implements AppError {
  statusCode = 502;
  code = 'EXTERNAL_SERVICE_ERROR';
  retryable = true;
  severity = ErrorSeverity.HIGH;
  category = ErrorCategory.EXTERNAL_SERVICE;

  constructor(
    message: string, 
    public service?: string, 
    public operation?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ExternalServiceError';
  }
}

export class DatabaseError extends Error implements AppError {
  statusCode = 500;
  code = 'DATABASE_ERROR';
  retryable = true;
  severity = ErrorSeverity.HIGH;
  category = ErrorCategory.DATABASE;

  constructor(message: string, public operation?: string, public details?: any) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class TimeoutError extends Error implements AppError {
  statusCode = 504;
  code = 'TIMEOUT_ERROR';
  retryable = true;
  severity = ErrorSeverity.HIGH;
  category = ErrorCategory.TIMEOUT;

  constructor(message: string, public operation?: string, public timeout?: number) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class NetworkError extends Error implements AppError {
  statusCode = 503;
  code = 'NETWORK_ERROR';
  retryable = true;
  severity = ErrorSeverity.HIGH;
  category = ErrorCategory.NETWORK;

  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'NetworkError';
  }
}

// Error monitoring and alerting service
export class ErrorMonitoringService {
  private static instance: ErrorMonitoringService;
  private errorCounts: Map<string, number> = new Map();
  private alertThresholds: Map<ErrorCategory, number> = new Map([
    [ErrorCategory.SERVER_ERROR, 1],
    [ErrorCategory.DATABASE, 5],
    [ErrorCategory.EXTERNAL_SERVICE, 10],
    [ErrorCategory.AUTHENTICATION, 20],
    [ErrorCategory.RATE_LIMIT, 50]
  ]);

  static getInstance(): ErrorMonitoringService {
    if (!ErrorMonitoringService.instance) {
      ErrorMonitoringService.instance = new ErrorMonitoringService();
    }
    return ErrorMonitoringService.instance;
  }

  async recordError(error: AppError, context: ErrorContext): Promise<void> {
    const errorKey = `${error.category}_${error.code}`;
    const currentCount = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, currentCount + 1);

    // Check if we need to send an alert
    const threshold = this.alertThresholds.get(error.category!) || 100;
    if (currentCount + 1 >= threshold) {
      await this.sendAlert(error, context, currentCount + 1);
      // Reset counter after alert
      this.errorCounts.set(errorKey, 0);
    }

    // Log structured error data
    Logger.error('Application error occurred', {
      correlationId: context.correlationId,
      userId: context.userId,
      metadata: {
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          category: error.category,
          severity: error.severity,
          retryable: error.retryable,
          stack: error.stack
        },
        context,
        errorMetadata: error.metadata
      }
    });
  }

  private async sendAlert(error: AppError, context: ErrorContext, count: number): Promise<void> {
    // In production, this would integrate with alerting services like PagerDuty, Slack, etc.
    const alertData = {
      severity: error.severity,
      category: error.category,
      message: `High error rate detected: ${error.code}`,
      count,
      context,
      timestamp: new Date().toISOString()
    };

    Logger.warn('Error alert triggered', {
      correlationId: context.correlationId,
      metadata: alertData
    });

    // TODO: Integrate with external alerting services
    // await this.sendToSlack(alertData);
    // await this.sendToPagerDuty(alertData);
  }

  getErrorStats(): Record<string, number> {
    return Object.fromEntries(this.errorCounts);
  }

  resetErrorCounts(): void {
    this.errorCounts.clear();
  }
}

// Error context interface
interface ErrorContext {
  correlationId: string;
  userId?: string;
  userAgent?: string;
  ip?: string;
  url: string;
  method: string;
  timestamp: string;
  requestBody?: any;
  headers?: Record<string, string>;
}

// Enhanced error response interface
interface ErrorResponse {
  error: string;
  code: string;
  retryable: boolean;
  timestamp: string;
  correlationId: string;
  details?: any;
  stack?: string;
  retryAfter?: number;
  supportReference?: string;
}

// Error classification utility
export class ErrorClassifier {
  static classifyError(error: Error): AppError {
    // Convert generic errors to AppError with proper classification
    if ('statusCode' in error && 'code' in error && 'retryable' in error) {
      return error as AppError;
    }

    // Database errors
    if (error.message.includes('ECONNREFUSED') || 
        error.message.includes('Connection terminated') ||
        error.message.includes('ER_')) {
      return new DatabaseError(error.message, 'unknown', { originalError: error.message });
    }

    // Network errors
    if (error.message.includes('ENOTFOUND') || 
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('ECONNRESET')) {
      return new NetworkError(error.message, { originalError: error.message });
    }

    // Timeout errors
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      return new TimeoutError(error.message, 'unknown');
    }

    // Default to server error
    const serverError = new Error(error.message) as AppError;
    serverError.statusCode = 500;
    serverError.code = 'INTERNAL_SERVER_ERROR';
    serverError.retryable = false;
    serverError.severity = ErrorSeverity.HIGH;
    serverError.category = ErrorCategory.SERVER_ERROR;
    
    return serverError;
  }
}

// Enhanced error handler with monitoring and recovery
export const errorHandler = (
  error: Error,
  req: Request & { correlationId?: string; user?: { id: string } },
  res: Response,
): void => {
  // Classify the error
  const appError = ErrorClassifier.classifyError(error);
  
  // Enrich error with request context
  appError.correlationId = req.correlationId;
  appError.userId = req.user?.id;

  // Create error context
  const context: ErrorContext = {
    correlationId: req.correlationId || 'unknown',
    userId: req.user?.id,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
    headers: req.headers as Record<string, string>
  };

  // Record error for monitoring
  const errorMonitor = ErrorMonitoringService.getInstance();
  errorMonitor.recordError(appError, context).catch(monitorError => {
    Logger.error('Failed to record error in monitoring system', { 
      correlationId: context.correlationId,
      metadata: {
        monitorError: monitorError.message,
        originalError: appError.message 
      }
    });
  });

  // Determine response status and details
  const statusCode = appError.statusCode || 500;
  const code = appError.code || 'INTERNAL_SERVER_ERROR';
  const retryable = appError.retryable !== undefined ? appError.retryable : false;

  // Generate support reference for critical errors
  const supportReference = appError.severity === ErrorSeverity.CRITICAL || statusCode >= 500
    ? `SUP-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    : undefined;

  // Build error response
  const errorResponse: ErrorResponse = {
    error: appError.message || 'An unexpected error occurred',
    code,
    retryable,
    timestamp: new Date().toISOString(),
    correlationId: context.correlationId
  };

  // Add retry-after header for rate limit errors
  if (appError instanceof RateLimitError && appError.retryAfter) {
    res.setHeader('Retry-After', appError.retryAfter);
    errorResponse.retryAfter = appError.retryAfter;
  }

  // Add support reference for server errors
  if (supportReference) {
    errorResponse.supportReference = supportReference;
  }

  // Add details for development environment
  if (process.env.NODE_ENV === 'development') {
    errorResponse.details = appError.message;
    errorResponse.stack = appError.stack;
  }

  // Set correlation ID header
  res.setHeader('X-Correlation-ID', context.correlationId);

  // Send error response
  res.status(statusCode).json(errorResponse);
};



// Error recovery and retry mechanisms
export class RetryManager {
  private static instance: RetryManager;
  private retryAttempts: Map<string, number> = new Map();

  static getInstance(): RetryManager {
    if (!RetryManager.instance) {
      RetryManager.instance = new RetryManager();
    }
    return RetryManager.instance;
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      backoffMultiplier = 2,
      retryCondition = (error: Error) => this.isRetryableError(error),
      onRetry = () => {},
      operationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    } = options;

    let lastError: Error;
    let delay = baseDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          Logger.info('Retrying operation', {
            metadata: {
              operationId,
              attempt,
              maxRetries,
              delay
            }
          });
          
          await this.sleep(delay);
          onRetry(attempt, lastError!);
        }

        const result = await operation();
        
        if (attempt > 0) {
          Logger.info('Operation succeeded after retry', {
            metadata: {
              operationId,
              attempt,
              totalAttempts: attempt + 1
            }
          });
        }

        return result;
      } catch (error) {
        lastError = error as Error;
        
        Logger.warn('Operation failed', {
          metadata: {
            operationId,
            attempt,
            maxRetries,
            error: lastError.message,
            retryable: retryCondition(lastError)
          }
        });

        if (attempt === maxRetries || !retryCondition(lastError)) {
          Logger.error('Operation failed after all retries', {
            metadata: {
              operationId,
              totalAttempts: attempt + 1,
              finalError: lastError.message
            }
          });
          throw lastError;
        }

        // Calculate next delay with exponential backoff
        delay = Math.min(delay * backoffMultiplier, maxDelay);
      }
    }

    throw lastError!;
  }

  private isRetryableError(error: Error): boolean {
    // Check if error has retryable property (AppError interface)
    if ('retryable' in error && typeof (error as any).retryable === 'boolean') {
      return (error as any).retryable === true;
    }

    // Check for common retryable error patterns
    const retryablePatterns = [
      /ECONNRESET/,
      /ETIMEDOUT/,
      /ENOTFOUND/,
      /ECONNREFUSED/,
      /timeout/i,
      /network/i,
      /connection/i
    ];

    return retryablePatterns.some(pattern => pattern.test(error.message));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getRetryStats(): Record<string, number> {
    return Object.fromEntries(this.retryAttempts);
  }

  resetRetryStats(): void {
    this.retryAttempts.clear();
  }
}

// Retry options interface
interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryCondition?: (error: Error) => boolean;
  onRetry?: (attempt: number, error: Error) => void;
  operationId?: string;
}

// Circuit breaker implementation
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private options: CircuitBreakerOptions = {}
  ) {
    this.options = {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      monitoringPeriod: 10000, // 10 seconds
      ...options
    };
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.options.recoveryTimeout!) {
        this.state = 'HALF_OPEN';
        Logger.info('Circuit breaker transitioning to HALF_OPEN', {
          metadata: {
            name: this.options.name,
            failures: this.failures
          }
        });
      } else {
        throw new ExternalServiceError(
          `Circuit breaker is OPEN for ${this.options.name}`,
          this.options.name
        );
      }
    }

    try {
      const result = await operation();
      
      if (this.state === 'HALF_OPEN') {
        this.reset();
        Logger.info('Circuit breaker reset to CLOSED', {
          metadata: {
            name: this.options.name
          }
        });
      }
      
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.options.failureThreshold!) {
      this.state = 'OPEN';
      Logger.warn('Circuit breaker opened', {
        metadata: {
          name: this.options.name,
          failures: this.failures,
          threshold: this.options.failureThreshold
        }
      });
    }
  }

  private reset(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  getState(): { state: string; failures: number; lastFailureTime: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    };
  }
}

// Circuit breaker options
interface CircuitBreakerOptions {
  name?: string;
  failureThreshold?: number;
  recoveryTimeout?: number;
  monitoringPeriod?: number;
}

// Health check service for monitoring system health
export class HealthCheckService {
  private static instance: HealthCheckService;
  private healthChecks: Map<string, HealthCheck> = new Map();

  static getInstance(): HealthCheckService {
    if (!HealthCheckService.instance) {
      HealthCheckService.instance = new HealthCheckService();
    }
    return HealthCheckService.instance;
  }

  registerHealthCheck(name: string, check: HealthCheck): void {
    this.healthChecks.set(name, check);
  }

  async runHealthChecks(): Promise<HealthCheckResult> {
    const results: Record<string, any> = {};
    let overallHealth = 'healthy';

    for (const [name, check] of Array.from(this.healthChecks.entries())) {
      try {
        const result = await Promise.race([
          check.check(),
          this.timeout(check.timeout || 5000)
        ]);
        
        results[name] = {
          status: 'healthy',
          ...result
        };
      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          error: (error as Error).message
        };
        overallHealth = 'unhealthy';
      }
    }

    return {
      overall: overallHealth,
      checks: results,
      timestamp: new Date().toISOString()
    };
  }

  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Health check timeout')), ms);
    });
  }
}

// Health check interfaces
interface HealthCheck {
  check: () => Promise<any>;
  timeout?: number;
}

interface HealthCheckResult {
  overall: string;
  checks: Record<string, any>;
  timestamp: string;
}

export const notFoundHandler = (req: Request, res: Response): void => {
  const correlationId = (req as any).correlationId || 'unknown';
  
  Logger.warn('Route not found', {
    correlationId,
    metadata: {
      method: req.method,
      path: req.path,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    }
  });

  res.status(404).json({
    error: `Route ${req.method} ${req.path} not found`,
    code: 'ROUTE_NOT_FOUND',
    retryable: false,
    timestamp: new Date().toISOString(),
    correlationId
  });
};

// Async error wrapper for route handlers
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Error boundary for catching unhandled promise rejections
export const setupGlobalErrorHandlers = (): void => {
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    Logger.error('Unhandled promise rejection', {
      metadata: {
        reason: reason?.message || reason,
        stack: reason?.stack
      }
    });
    
    // In production, you might want to gracefully shutdown
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });

  process.on('uncaughtException', (error: Error) => {
    Logger.error('Uncaught exception', {
      metadata: {
        message: error.message,
        stack: error.stack
      }
    });
    
    // Always exit on uncaught exceptions
    process.exit(1);
  });
};