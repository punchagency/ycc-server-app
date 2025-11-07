import express, { Application, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';
import connectDB from './config/database';
import { RedisConnect } from './integration/Redis';
import { healthCheck, readinessCheck, livenessCheck } from './middleware/health.middleware';

const app: Application = express();
const PORT = process.env.PORT || 4500;

// Connect to MongoDB and Redis
connectDB();
RedisConnect();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check routes (before other routes for quick responses)
app.get('/health', healthCheck);
app.get('/ready', readinessCheck);
app.get('/live', livenessCheck);

// Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Import routes
import authRoutes from './routes/auth.route';
import categoryRoutes from './routes/category.route';
import serviceRoutes from './routes/service.route';
import cartRoutes from './routes/cart.route';

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/category', categoryRoutes);
app.use('/api/service', serviceRoutes);
app.use('/api/cart', cartRoutes);

app.get('/', (_, res: Response) => {
    res.json({ 
        message: 'Welcome to YCC Server API',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            readiness: '/ready',
            liveness: '/live',
            docs: '/api-docs',
            auth: '/api/auth'
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Readiness check: http://localhost:${PORT}/ready`);
    console.log(`Liveness check: http://localhost:${PORT}/live`);
    console.log(`API Documentation: http://localhost:${PORT}/api-docs`);
});

export default app;
