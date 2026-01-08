import 'dotenv/config';
import mongoose from 'mongoose';
import ProductModel from '../models/product.model';
import { logInfo, logError } from '../utils/SystemLogs';

async function migrateProductCurrency() {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI not found in environment variables');
        }

        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const result = await ProductModel.updateMany(
            { currency: { $exists: false } },
            { $set: { currency: 'usd' } }
        );

        await logInfo({
            message: 'Product currency migration completed',
            source: 'migrateProductCurrency',
            additionalData: {
                matched: result.matchedCount,
                modified: result.modifiedCount
            }
        });

        console.log(`Migration completed: ${result.modifiedCount} products updated with default currency (usd)`);
        
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    } catch (error: any) {
        await logError({
            message: 'Product currency migration failed',
            source: 'migrateProductCurrency',
            additionalData: { error: error.message }
        });
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrateProductCurrency();
