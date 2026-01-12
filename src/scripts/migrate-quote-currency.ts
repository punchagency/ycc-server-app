import mongoose from 'mongoose';
import QuoteModel from '../models/quote.model';
import { logInfo, logError } from '../utils/SystemLogs';
import 'dotenv/config';

async function migrateQuoteCurrency() {
    try {
        await mongoose.connect(process.env.MONGODB_URI!);
        logInfo({ message: 'Connected to MongoDB', source: 'migrateQuoteCurrency' });

        const result = await QuoteModel.updateMany(
            { 
                $or: [
                    { currency: { $exists: false } },
                    { currency: null },
                    { currency: '' }
                ]
            },
            { 
                $set: { currency: 'usd' }
            }
        );

        const serviceItemResult = await QuoteModel.updateMany(
            { 'services.currency': { $exists: false } },
            { 
                $set: { 'services.$[].currency': 'usd' }
            }
        );

        logInfo({ 
            message: 'Quote currency migration completed', 
            source: 'migrateQuoteCurrency',
            additionalData: { 
                quotesUpdated: result.modifiedCount,
                serviceItemsUpdated: serviceItemResult.modifiedCount
            }
        });

        console.log(`✅ Migration completed successfully`);
        console.log(`   - Quotes updated: ${result.modifiedCount}`);
        console.log(`   - Service items updated: ${serviceItemResult.modifiedCount}`);

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        logError({ message: 'Quote currency migration failed', source: 'migrateQuoteCurrency', error });
        console.error('❌ Migration failed:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

migrateQuoteCurrency();
