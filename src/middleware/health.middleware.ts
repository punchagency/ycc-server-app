import { Request, Response, NextFunction } from 'express';
import amqp from 'amqplib';
import mongoose from 'mongoose';
import { RedisObject } from '../integration/Redis';
import 'dotenv/config';

interface HealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy';
  responseTime?: number;
  error?: string;
  details?: any;
}

interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: HealthCheck[];
}

class HealthService {

  async checkDatabase(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      // Check if mongoose is connected
      if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
        return {
          service: 'database',
          status: 'unhealthy',
          responseTime: Date.now() - start,
          error: 'MongoDB not connected',
          details: {
            type: 'mongodb',
            connected: false,
            readyState: mongoose.connection.readyState
          }
        };
      }

      // Perform a simple ping operation to verify connection
      await mongoose.connection.db.admin().ping();
      
      return {
        service: 'database',
        status: 'healthy',
        responseTime: Date.now() - start,
        details: {
          type: 'mongodb',
          connected: true,
          host: mongoose.connection.host,
          name: mongoose.connection.name,
          readyState: mongoose.connection.readyState
        }
      };
    } catch (error) {
      return {
        service: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: {
          type: 'mongodb',
          connected: false
        }
      };
    }
  }

  async checkRedis(): Promise<HealthCheck> {
    const start = Date.now();
    
    if (!RedisObject.isAvailable()) {
      return {
        service: 'redis',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        error: 'Redis is not available or disabled'
      };
    }

    try {
      const testKey = 'health:check';
      await RedisObject.set(testKey, { timestamp: Date.now() }, 5);
      const result = await RedisObject.get(testKey);
      
      if (!result) {
        throw new Error('Redis read/write test failed');
      }
      
      return {
        service: 'redis',
        status: 'healthy',
        responseTime: Date.now() - start,
        details: {
          connected: true
        }
      };
    } catch (error) {
      return {
        service: 'redis',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async checkRabbitMQ(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost:5672');
      await connection.close();
      
      return {
        service: 'rabbitmq',
        status: 'healthy',
        responseTime: Date.now() - start,
        details: {
          connected: true
        }
      };
    } catch (error) {
      return {
        service: 'rabbitmq',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async checkExternalServices(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];
    
    // Check Stripe if configured
    if (process.env.STRIPE_SECRET_KEY) {
      try {
        checks.push({
          service: 'stripe',
          status: 'healthy',
          details: { configured: true }
        });
      } catch (error) {
        checks.push({
          service: 'stripe',
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Check SendGrid if configured
    if (process.env.SENDGRID_API_KEY) {
      try {
        checks.push({
          service: 'sendgrid',
          status: 'healthy',
          details: { configured: true }
        });
      } catch (error) {
        checks.push({
          service: 'sendgrid',
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return checks;
  }

  async performHealthCheck(): Promise<HealthResponse> {
    
    const [
      databaseCheck,
      redisCheck,
      rabbitmqCheck,
      externalChecks
    ] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkRabbitMQ(),
      this.checkExternalServices()
    ]);

    const checks = [databaseCheck, redisCheck, rabbitmqCheck, ...externalChecks];
    const overallStatus = checks.every(check => check.status === 'healthy') ? 'healthy' : 'unhealthy';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks
    };
  }
}

const healthService = new HealthService();

/**
 * Health check endpoint - checks all dependencies
 */
export const healthCheck = async (_req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const healthStatus = await healthService.performHealthCheck();
    
    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Health check failed'
    });
  }
};

/**
 * Readiness check - checks if application is ready to serve requests
 * For Kubernetes readiness probes
 */
export const readinessCheck = async (_req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    // Check if MongoDB is connected
    const isMongoReady = mongoose.connection.readyState === 1 && mongoose.connection.db;
    
    if (isMongoReady) {
      // Perform a quick ping to ensure connection is actually working
      await mongoose.connection.db!.admin().ping();
      
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        database: {
          connected: true,
          name: mongoose.connection.name,
          host: mongoose.connection.host
        }
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        error: 'MongoDB connection not established',
        database: {
          connected: false,
          readyState: mongoose.connection.readyState
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Readiness check failed'
    });
  }
};

/**
 * Liveness check - checks if application is alive
 * For Kubernetes liveness probes
 */
export const livenessCheck = async (_req: Request, res: Response, _next: NextFunction): Promise<void> => {
  // Simple liveness check - if the process is running, it's alive
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    pid: process.pid,
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      external: Math.round(process.memoryUsage().external / 1024 / 1024)
    }
  });
};
