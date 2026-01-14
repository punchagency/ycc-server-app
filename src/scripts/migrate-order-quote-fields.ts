import mongoose from 'mongoose';
import 'dotenv/config';

async function migrateOrderQuoteFields() {
    try {
        await mongoose.connect(process.env.MONGODB_URI!);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;
        if (!db) throw new Error('Database connection not established');

        // Migrate Order items: pricePerItem -> originalPrice, currency -> originalCurrency
        const orderResult = await db.collection('orders').updateMany(
            { 'items.pricePerItem': { $exists: true } },
            [
                {
                    $set: {
                        items: {
                            $map: {
                                input: '$items',
                                as: 'item',
                                in: {
                                    $mergeObjects: [
                                        '$$item',
                                        {
                                            originalPrice: '$$item.pricePerItem',
                                            originalCurrency: '$$item.currency'
                                        }
                                    ]
                                }
                            }
                        }
                    }
                },
                {
                    $set: {
                        items: {
                            $map: {
                                input: '$items',
                                as: 'item',
                                in: {
                                    $unsetField: {
                                        field: 'pricePerItem',
                                        input: {
                                            $unsetField: {
                                                field: 'currency',
                                                input: '$$item'
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            ]
        );

        // Migrate Quote services: unitPrice -> originalUnitPrice, currency -> originalCurrency
        const quoteResult = await db.collection('quotes').updateMany(
            { 'services.unitPrice': { $exists: true } },
            [
                {
                    $set: {
                        services: {
                            $map: {
                                input: '$services',
                                as: 'service',
                                in: {
                                    $mergeObjects: [
                                        '$$service',
                                        {
                                            originalUnitPrice: '$$service.unitPrice',
                                            originalCurrency: '$$service.currency'
                                        }
                                    ]
                                }
                            }
                        }
                    }
                },
                {
                    $set: {
                        services: {
                            $map: {
                                input: '$services',
                                as: 'service',
                                in: {
                                    $unsetField: {
                                        field: 'unitPrice',
                                        input: {
                                            $unsetField: {
                                                field: 'currency',
                                                input: '$$service'
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            ]
        );

        console.log('✅ Migration completed successfully');
        console.log(`   - Orders updated: ${orderResult.modifiedCount}`);
        console.log(`   - Quotes updated: ${quoteResult.modifiedCount}`);

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

migrateOrderQuoteFields();
