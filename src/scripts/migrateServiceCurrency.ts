import 'dotenv/config';
import mongoose from 'mongoose';
import ServiceModel from '../models/service.model';
import { logInfo, logError } from '../utils/SystemLogs';

async function migrateServiceCurrency() {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI not found in environment variables');
        }

        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const result = await ServiceModel.updateMany(
            { currency: { $exists: false } },
            { $set: { currency: 'usd' } }
        );

        await logInfo({
            message: 'Service currency migration completed',
            source: 'migrateServiceCurrency',
            additionalData: {
                matched: result.matchedCount,
                modified: result.modifiedCount
            }
        });

        console.log(`Migration completed: ${result.modifiedCount} services updated with default currency (usd)`);
        
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    } catch (error: any) {
        await logError({
            message: 'Service currency migration failed',
            source: 'migrateServiceCurrency',
            additionalData: { error: error.message }
        });
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrateServiceCurrency();
