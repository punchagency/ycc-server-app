import mongoose from 'mongoose';
import Order from '../models/order.model';
import Booking from '../models/booking.model';

export class CrewReportService {
    private getDateFilter(period?: string, startDate?: string, endDate?: string) {
        if (startDate && endDate) {
            return {
                createdAt: {
                    $gte: new Date(startDate),
                    $lt: new Date(new Date(endDate).setDate(new Date(endDate).getDate() + 1))
                }
            };
        }

        if (!period || period === 'all') return {};

        const now = new Date();
        let filterStartDate: Date, filterEndDate: Date;

        switch (period) {
            case 'today':
                filterStartDate = new Date(now.setHours(0, 0, 0, 0));
                filterEndDate = new Date(now.setHours(23, 59, 59, 999));
                break;
            case 'week':
                const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
                filterStartDate = new Date(weekStart.setHours(0, 0, 0, 0));
                filterEndDate = new Date();
                break;
            case 'month':
                filterStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
                filterEndDate = new Date();
                break;
            case 'year':
                filterStartDate = new Date(now.getFullYear(), 0, 1);
                filterEndDate = new Date();
                break;
            default:
                return {};
        }

        return { createdAt: { $gte: filterStartDate, $lt: filterEndDate } };
    }

    async getDashboardSummary(userId: string, query: any) {
        const {
            orderPeriod = 'all',
            bookingPeriod = 'all',
            activityPeriod = 'all',
            orderStartDate,
            orderEndDate,
            bookingStartDate,
            bookingEndDate,
            activityStartDate,
            activityEndDate
        } = query;

        const orderDateFilter = this.getDateFilter(orderPeriod, orderStartDate, orderEndDate);
        const bookingDateFilter = this.getDateFilter(bookingPeriod, bookingStartDate, bookingEndDate);
        const activityDateFilter = this.getDateFilter(activityPeriod, activityStartDate, activityEndDate);

        const [orderResults, bookingResults] = await Promise.all([
            Order.aggregate([
                { $match: { userId: new mongoose.Types.ObjectId(userId), ...orderDateFilter } },
                {
                    $facet: {
                        stats: [
                            {
                                $group: {
                                    _id: '$status',
                                    count: { $sum: 1 },
                                    totalValue: { $sum: '$total' }
                                }
                            }
                        ],
                        recent: [
                            { $match: activityDateFilter },
                            { $sort: { createdAt: -1 } },
                            { $limit: 5 },
                            { $unwind: '$items' },
                            {
                                $lookup: {
                                    from: 'businesses',
                                    localField: 'items.businessId',
                                    foreignField: '_id',
                                    as: 'business'
                                }
                            },
                            { $unwind: { path: '$business', preserveNullAndEmptyArrays: true } },
                            {
                                $group: {
                                    _id: '$_id',
                                    status: { $first: '$status' },
                                    total: { $first: '$total' },
                                    deliveryAddress: { $first: '$deliveryAddress' },
                                    createdAt: { $first: '$createdAt' },
                                    businesses: { $addToSet: '$business.businessName' }
                                }
                            }
                        ]
                    }
                }
            ]),
            Booking.aggregate([
                { $match: { userId: new mongoose.Types.ObjectId(userId), ...bookingDateFilter } },
                {
                    $lookup: {
                        from: 'quotes',
                        localField: 'quoteId',
                        foreignField: '_id',
                        as: 'quote'
                    }
                },
                { $unwind: { path: '$quote', preserveNullAndEmptyArrays: true } },
                {
                    $facet: {
                        stats: [
                            {
                                $group: {
                                    _id: '$status',
                                    count: { $sum: 1 },
                                    totalValue: { $sum: { $ifNull: ['$quote.amount', 0] } }
                                }
                            }
                        ],
                        recent: [
                            { $match: activityDateFilter },
                            { $sort: { createdAt: -1 } },
                            { $limit: 5 },
                            {
                                $lookup: {
                                    from: 'services',
                                    localField: 'serviceId',
                                    foreignField: '_id',
                                    as: 'service'
                                }
                            },
                            { $unwind: { path: '$service', preserveNullAndEmptyArrays: true } },
                            {
                                $lookup: {
                                    from: 'businesses',
                                    localField: 'businessId',
                                    foreignField: '_id',
                                    as: 'business'
                                }
                            },
                            { $unwind: { path: '$business', preserveNullAndEmptyArrays: true } },
                            {
                                $project: {
                                    status: 1,
                                    bookingDate: 1,
                                    serviceLocation: 1,
                                    createdAt: 1,
                                    amount: '$quote.amount',
                                    serviceId: { _id: '$service._id', name: '$service.name' },
                                    businessId: { _id: '$business._id', businessName: '$business.businessName' }
                                }
                            }
                        ]
                    }
                }
            ])
        ]);

        const orderStats = orderResults[0]?.stats || [];
        const recentOrders = orderResults[0]?.recent || [];
        const bookingStats = bookingResults[0]?.stats || [];
        const recentBookings = bookingResults[0]?.recent || [];

        const orderSummary: any = {
            pending: 0, declined: 0, confirmed: 0, processing: 0,
            out_for_delivery: 0, shipped: 0, delivered: 0, cancelled: 0,
            total: 0, totalValue: 0, period: orderPeriod
        };

        orderStats.forEach((stat: any) => {
            if (orderSummary.hasOwnProperty(stat._id)) {
                orderSummary[stat._id] = stat.count;
            }
            orderSummary.total += stat.count;
            orderSummary.totalValue += stat.totalValue || 0;
        });

        const bookingSummary: any = {
            pending: 0, confirmed: 0, completed: 0, cancelled: 0, declined: 0,
            total: 0, totalValue: 0, period: bookingPeriod
        };

        bookingStats.forEach((stat: any) => {
            if (bookingSummary.hasOwnProperty(stat._id)) {
                bookingSummary[stat._id] = stat.count;
            }
            bookingSummary.total += stat.count;
            bookingSummary.totalValue += stat.totalValue || 0;
        });

        return {
            orders: orderSummary,
            bookings: bookingSummary,
            recentActivity: {
                orders: recentOrders,
                bookings: recentBookings,
                period: activityPeriod
            }
        };
    }

    async generateReport(userId: string, body: any) {
        const { reportType = 'all', startDate, endDate } = body;

        const dateFilter = this.getDateFilter(undefined, startDate, endDate);
        const reportData: any = {};

        const queries = [];

        if (reportType === 'all' || reportType === 'orders') {
            queries.push(
                Order.aggregate([
                    { $match: { userId: new mongoose.Types.ObjectId(userId), ...dateFilter } },
                    { $sort: { createdAt: -1 } },
                    { $unwind: '$items' },
                    {
                        $lookup: {
                            from: 'businesses',
                            localField: 'items.businessId',
                            foreignField: '_id',
                            as: 'business'
                        }
                    },
                    { $unwind: { path: '$business', preserveNullAndEmptyArrays: true } },
                    {
                        $group: {
                            _id: '$_id',
                            status: { $first: '$status' },
                            total: { $first: '$total' },
                            deliveryAddress: { $first: '$deliveryAddress' },
                            shippingMethod: { $first: '$shippingMethod' },
                            createdAt: { $first: '$createdAt' },
                            businesses: { $addToSet: '$business.businessName' }
                        }
                    },
                    { $sort: { createdAt: -1 } }
                ])
            );
        }

        if (reportType === 'all' || reportType === 'bookings') {
            queries.push(
                Booking.aggregate([
                    { $match: { userId: new mongoose.Types.ObjectId(userId), ...dateFilter } },
                    { $sort: { createdAt: -1 } },
                    {
                        $lookup: {
                            from: 'quotes',
                            localField: 'quoteId',
                            foreignField: '_id',
                            as: 'quote'
                        }
                    },
                    { $unwind: { path: '$quote', preserveNullAndEmptyArrays: true } },
                    {
                        $lookup: {
                            from: 'services',
                            localField: 'serviceId',
                            foreignField: '_id',
                            as: 'service'
                        }
                    },
                    { $unwind: { path: '$service', preserveNullAndEmptyArrays: true } },
                    {
                        $lookup: {
                            from: 'businesses',
                            localField: 'businessId',
                            foreignField: '_id',
                            as: 'business'
                        }
                    },
                    { $unwind: { path: '$business', preserveNullAndEmptyArrays: true } },
                    {
                        $project: {
                            status: 1,
                            bookingDate: 1,
                            serviceLocation: 1,
                            createdAt: 1,
                            amount: '$quote.amount',
                            serviceId: { _id: '$service._id', name: '$service.name' },
                            businessId: { _id: '$business._id', businessName: '$business.businessName' }
                        }
                    }
                ])
            );
        }

        const results = await Promise.all(queries);

        if (reportType === 'all') {
            reportData.orders = results[0];
            reportData.bookings = results[1];
        } else if (reportType === 'orders') {
            reportData.orders = results[0];
        } else if (reportType === 'bookings') {
            reportData.bookings = results[0];
        }

        return reportData;
    }
}