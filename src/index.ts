import express, { Application, Response } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';
import connectDB from './config/database';
import { RedisConnect } from './integration/Redis';
import { healthCheck, readinessCheck, livenessCheck } from './middleware/health.middleware';
import './integration/QueueManager';
import 'dotenv/config';

const app: Application = express();
const PORT = process.env.PORT || 4500;

// Connect to MongoDB and Redis
connectDB();
RedisConnect();

const allowedOrigins = [
    'http://localhost:5174',
    'http://localhost:5173',
    'https://ycc-sage.vercel.app',
    'https://ycc-client.vercel.app',
    'https://ycc-client.netlify.app',
    'https://yachtcrewcenter-dev.netlify.app',
    'https://yachtcrewcenter.com',
];
// CORS Configuration
const corsOptions: cors.CorsOptions = {
    origin: process.env.ENV === 'development' ? '*' : allowedOrigins, // Allow all origins in development
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Accept',
        'Access-Control-Allow-Origin',
        'x-retry-count'
    ],
    exposedHeaders: [
        'Content-Type',
        'Authorization',
        'Access-Control-Allow-Origin',
    ],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
};


// Middleware
app.use(cors(corsOptions));
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
import bookingRoutes from './routes/booking.route';
import cartRoutes from './routes/cart.route';
import categoryRoutes from './routes/category.route';
import documentRoutes from './routes/document.route';
import eventRoutes from './routes/event.route';
import invoiceRoutes from './routes/invoice.route';
import notificationRoutes from './routes/notification.route';
import orderRoutes from './routes/order.route';
import productRoutes from './routes/product.route';
import quoteRoutes from './routes/quote.route';
import serviceRoutes from './routes/service.route';
import stripeAccountRoutes from './routes/stripe_account.route';
import distributorAnalyticsRoutes from './routes/distributor-analytics.route';
import searchRoutes from './routes/search.route';
import adminDashboardRoutes from './routes/admin-dashboard.route';
import userRoutes from './routes/user.route';
import crewReportRoutes from './routes/crew-report.route';

// Routes
app.use('/api/v2/auth', authRoutes);
app.use('/api/v2/booking', bookingRoutes);
app.use('/api/v2/cart', cartRoutes);
app.use('/api/v2/category', categoryRoutes);
app.use('/api/v2/document', documentRoutes);
app.use('/api/v2/event', eventRoutes);
app.use('/api/v2/invoice', invoiceRoutes);
app.use('/api/v2/notification', notificationRoutes);
app.use('/api/v2/order', orderRoutes);
app.use('/api/v2/product', productRoutes);
app.use('/api/v2/quote', quoteRoutes);
app.use('/api/v2/service', serviceRoutes);
app.use('/api/v2/stripe-account', stripeAccountRoutes);
app.use('/api/v2/admin/dashboard', adminDashboardRoutes);
app.use('/api/v2/distributor-analytics', distributorAnalyticsRoutes);
app.use('/api/v2/search', searchRoutes);
app.use('/api/v2/user', userRoutes);
app.use('/api/v2/crew-report', crewReportRoutes);


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
