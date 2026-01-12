import mongoose from 'mongoose';
import BookingModel from '../models/booking.model';
import { logInfo, logError } from '../utils/SystemLogs';
import 'dotenv/config';

async function migrateBookingCurrency() {
    try {
        await mongoose.connect(process.env.MONGODB_URI!);
        logInfo({ message: 'Connected to MongoDB', source: 'migrateBookingCurrency' });

        const result = await BookingModel.updateMany(
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

        logInfo({ 
            message: 'Booking currency migration completed', 
            source: 'migrateBookingCurrency',
            additionalData: { 
                bookingsUpdated: result.modifiedCount
            }
        });

        console.log(`✅ Migration completed successfully`);
        console.log(`   - Bookings updated: ${result.modifiedCount}`);

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        logError({ message: 'Booking currency migration failed', source: 'migrateBookingCurrency', error });
        console.error('❌ Migration failed:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

migrateBookingCurrency();
