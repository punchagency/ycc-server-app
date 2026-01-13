import mongoose from 'mongoose';
import UserModel from '../models/user.model'
import { logInfo, logError } from '../utils/SystemLogs';
import 'dotenv/config';

async function migrateUserCurrency(){
    try {
        await mongoose.connect(process.env.MONGODB_URI!);
        logInfo({ message: 'Connected to MongoDB', source: 'migrateUserCurrency' });

        const result = await UserModel.updateMany(
            { 
                $or: [
                    { 'preferences.currency': { $exists: false } },
                    { 'preferences.currency': null },
                    { 'preferences.currency': '' }
                ]
            },
            { 
                $set: { 'preferences.currency': 'usd' }
            }
        );

        logInfo({ 
            message: 'User currency migration completed', 
            source: 'migrateUserCurrency',
            additionalData: { 
                usersUpdated: result.modifiedCount
            }
        });

        console.log(`✅ Migration completed successfully`);
        console.log(`   - Users updated: ${result.modifiedCount}`);

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        logError({ message: 'User currency migration failed', source: 'migrateUserCurrency', error });
        console.error('❌ Migration failed:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

migrateUserCurrency();