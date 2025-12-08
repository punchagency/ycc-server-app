import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

// Log levels
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  TRACE = 'trace'
}

// Log context interface
interface LogContext {
  correlationId?: string;
  userId?: string;
  operation?: string;
  service?: string;
  metadata?: Record<string, any>;
}

// Structured logger class
export class Logger {
  private static serviceName = 'ycc-server-api';
  private static environment = process.env.NODE_ENV || 'development';
  private static logStreams: { [key: string]: fs.WriteStream } = {};

  // Initialize log streams for file-based logging
  private static initializeLogStreams(): void {
    if (this.environment === 'production' && Object.keys(this.logStreams).length === 0) {
      const logsDir = path.join(process.cwd(), 'logs');
      
      // Ensure logs directory exists
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      // Create write streams for different log levels
      this.logStreams.app = fs.createWriteStream(path.join(logsDir, 'app.log'), { flags: 'a' });
      this.logStreams.error = fs.createWriteStream(path.join(logsDir, 'error.log'), { flags: 'a' });
      this.logStreams.access = fs.createWriteStream(path.join(logsDir, 'access.log'), { flags: 'a' });
    }
  }

  static log(level: LogLevel, message: string, context?: LogContext): void {
    const logEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      environment: this.environment,
      ...context
    };

    const logString = JSON.stringify(logEntry);

    // In production, write to files and console
    if (this.environment === 'production') {
      this.initializeLogStreams();
      
      // Write to appropriate log file
      if (level === LogLevel.ERROR) {
        this.logStreams.error?.write(logString + '\n');
      } else {
        this.logStreams.app?.write(logString + '\n');
      }
      
      // Also write to console for container logs
      console.log(logString);
    } else {
      // Development: Pretty print with colors
      const colorMap = {
        [LogLevel.ERROR]: '\x1b[31m', // Red
        [LogLevel.WARN]: '\x1b[33m',  // Yellow
        [LogLevel.INFO]: '\x1b[36m',  // Cyan
        [LogLevel.DEBUG]: '\x1b[35m', // Magenta
        [LogLevel.TRACE]: '\x1b[37m'  // White
      };
      
      const resetColor = '\x1b[0m';
      const color = colorMap[level] || resetColor;
      
      console.log(
        `${color}[${logEntry.timestamp}] ${level.toUpperCase()}${resetColor} ` +
        `${context?.correlationId ? `[${context.correlationId}] ` : ''}` +
        `${message}` +
        `${context?.metadata ? ` ${JSON.stringify(context.metadata)}` : ''}`
      );
    }
  }

  static error(message: string, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context);
  }

  static warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  static info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  static debug(message: string, context?: LogContext): void {
    if (this.environment === 'development' || process.env.LOG_LEVEL === 'debug') {
      this.log(LogLevel.DEBUG, message, context);
    }
  }

  static trace(message: string, context?: LogContext): void {
    if (process.env.LOG_LEVEL === 'trace') {
      this.log(LogLevel.TRACE, message, context);
    }
  }

  // Create a child logger with persistent context
  static child(context: LogContext): ChildLogger {
    return new ChildLogger(context);
  }
}

// Child logger with persistent context
class ChildLogger {
  constructor(private context: LogContext) {}

  error(message: string, additionalContext?: LogContext): void {
    Logger.error(message, { ...this.context, ...additionalContext });
  }

  warn(message: string, additionalContext?: LogContext): void {
    Logger.warn(message, { ...this.context, ...additionalContext });
  }

  info(message: string, additionalContext?: LogContext): void {
    Logger.info(message, { ...this.context, ...additionalContext });
  }

  debug(message: string, additionalContext?: LogContext): void {
    Logger.debug(message, { ...this.context, ...additionalContext });
  }

  trace(message: string, additionalContext?: LogContext): void {
    Logger.trace(message, { ...this.context, ...additionalContext });
  }
}

// Custom token for correlation ID
morgan.token('correlation-id', (req: any) => {
  return req.correlationId || 'unknown';
});

// Custom token for user ID
morgan.token('user-id', (req: any) => {
  return req.user?.id || 'anonymous';
});

// Custom format for structured logging
const logFormat = process.env.NODE_ENV === 'production'
  ? ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :correlation-id :response-time ms'
  : ':method :url :status :response-time ms - :res[content-length] [:correlation-id]';

// Request correlation ID middleware
export const correlationIdMiddleware = (
  req: Request & { correlationId?: string },
  res: Response,
  next: NextFunction
): void => {
  // Generate or extract correlation ID
  const correlationId = req.headers['x-correlation-id'] as string || req.headers['x-request-id'] as string || generateCorrelationId();
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  
  next();
};

// Enhanced request logging middleware
export const requestLogger = morgan(logFormat, {
  stream: {
    write: (message: string) => {
      const logMessage = message.trim();
      
      // In production, write to access log file
      if (Logger['environment'] === 'production') {
        Logger['initializeLogStreams']();
        Logger['logStreams'].access?.write(logMessage + '\n');
      }
      
      // Also log through structured logger
      Logger.info('HTTP Request', {
        metadata: { rawLog: logMessage }
      });
    }
  },
  skip: (req: Request) => {
    // Skip health check logs in production
    return process.env.NODE_ENV === 'production' && req.url === '/health';
  }
});

// Generate a simple correlation ID
function generateCorrelationId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Enhanced request timing middleware with structured logging
export const requestTiming = (
  req: Request & { startTime?: number; correlationId?: string; user?: { id: string } },
  res: Response,
  next: NextFunction
): void => {
  req.startTime = Date.now();
  
  // Log request start
  Logger.debug('Request started', {
    correlationId: req.correlationId,
    userId: req.user?.id,
    metadata: {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    }
  });
  
  // Log request completion
  res.on('finish', () => {
    const duration = Date.now() - (req.startTime || 0);
    const statusCode = res.statusCode;
    
    const logContext: LogContext = {
      correlationId: req.correlationId,
      userId: req.user?.id,
      metadata: {
        method: req.method,
        url: req.url,
        statusCode,
        duration,
        contentLength: res.get('Content-Length')
      }
    };

    // Log slow requests as warnings
    if (duration > 1000) {
      Logger.warn('Slow request detected', {
        ...logContext,
        metadata: {
          ...logContext.metadata,
          threshold: 1000
        }
      });
    } else {
      Logger.debug('Request completed', logContext);
    }

    // Log error responses
    if (statusCode >= 400) {
      const logLevel = statusCode >= 500 ? LogLevel.ERROR : LogLevel.WARN;
      Logger.log(logLevel, 'Request completed with error', logContext);
    }
  });
  
  next();
};

// Performance monitoring middleware
export const performanceMonitoring = (
  req: Request & { correlationId?: string },
  res: Response,
  next: NextFunction
): void => {
  const startTime = process.hrtime.bigint();
  
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const durationNs = endTime - startTime;
    const durationMs = Number(durationNs) / 1000000; // Convert to milliseconds
    
    // Log performance metrics
    Logger.info('Request performance', {
      correlationId: req.correlationId,
      metadata: {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100, // Round to 2 decimal places
        memoryUsage: process.memoryUsage()
      }
    });
  });
  
  next();
};