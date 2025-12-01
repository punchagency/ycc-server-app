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

        const orderStats = await Order.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId), ...orderDateFilter } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalValue: { $sum: '$total' }
                }
            }
        ]);

        const bookingStats = await Booking.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId), ...bookingDateFilter } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const orderSummary: any = {
            pending: 0, declined: 0, confirmed: 0, processing: 0,
            out_for_delivery: 0, shipped: 0, delivered: 0, cancelled: 0,
            total: 0, totalValue: 0, period: orderPeriod
        };

        orderStats.forEach(stat => {
            if (orderSummary.hasOwnProperty(stat._id)) {
                orderSummary[stat._id] = stat.count;
            }
            orderSummary.total += stat.count;
            orderSummary.totalValue += stat.totalValue || 0;
        });

        const bookingSummary: any = {
            pending: 0, confirmed: 0, completed: 0, cancelled: 0, declined: 0,
            total: 0, period: bookingPeriod
        };

        bookingStats.forEach(stat => {
            if (bookingSummary.hasOwnProperty(stat._id)) {
                bookingSummary[stat._id] = stat.count;
            }
            bookingSummary.total += stat.count;
        });

        const recentOrders = await Order.find({ userId, ...activityDateFilter })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('status total deliveryAddress createdAt');

        const recentBookings = await Booking.find({ userId, ...activityDateFilter })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('serviceId', 'name')
            .populate('businessId', 'businessName')
            .select('status bookingDate serviceLocation createdAt');

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
        const { reportType = 'all', startDate, endDate, fileType } = body;

        if (!fileType || !['pdf', 'csv'].includes(fileType)) {
            throw new Error('Invalid file type');
        }

        const dateFilter = this.getDateFilter(undefined, startDate, endDate);
        const reportData: any = {};

        if (reportType === 'all' || reportType === 'orders') {
            reportData.orders = await Order.find({ userId, ...dateFilter })
                .select('status total deliveryAddress shippingMethod createdAt')
                .sort({ createdAt: -1 });
        }

        if (reportType === 'all' || reportType === 'bookings') {
            reportData.bookings = await Booking.find({ userId, ...dateFilter })
                .populate('serviceId', 'name')
                .populate('businessId', 'businessName')
                .select('status bookingDate serviceLocation createdAt')
                .sort({ createdAt: -1 });
        }

        if (reportType === 'all' || reportType === 'activities') {
            const orders = await Order.find({ userId, ...dateFilter })
                .select('status total deliveryAddress createdAt')
                .sort({ createdAt: -1 });

            const bookings = await Booking.find({ userId, ...dateFilter })
                .populate('serviceId', 'name')
                .populate('businessId', 'businessName')
                .select('status bookingDate serviceLocation createdAt')
                .sort({ createdAt: -1 });

            reportData.activities = { orders, bookings };
        }

        return reportData;
    }
}