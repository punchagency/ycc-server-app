import Product from '../models/product.model';
import Order from '../models/order.model';
import Business from '../models/business.model';

type TimeRange = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_year' | 'all_time' | 'custom';

interface DateRangeParams {
    timeRange?: TimeRange;
    startDate?: Date;
    endDate?: Date;
}

export class ManufacturerAnalyticsService {

    private static getDateRange(params: DateRangeParams): { start: Date; end: Date } | null {
        const now = new Date();
        const { timeRange, startDate, endDate } = params;

        if (timeRange === 'custom' && startDate && endDate) {
            return { start: new Date(startDate), end: new Date(endDate) };
        }

        const start = new Date();
        const end = new Date();

        switch (timeRange) {
            case 'today':
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                break;
            case 'yesterday':
                start.setDate(now.getDate() - 1);
                start.setHours(0, 0, 0, 0);
                end.setDate(now.getDate() - 1);
                end.setHours(23, 59, 59, 999);
                break;
            case 'this_week':
                const dayOfWeek = now.getDay();
                start.setDate(now.getDate() - dayOfWeek);
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                break;
            case 'last_week':
                const lastWeekStart = now.getDate() - now.getDay() - 7;
                start.setDate(lastWeekStart);
                start.setHours(0, 0, 0, 0);
                end.setDate(lastWeekStart + 6);
                end.setHours(23, 59, 59, 999);
                break;
            case 'this_month':
                start.setDate(1);
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                break;
            case 'last_month':
                start.setMonth(now.getMonth() - 1);
                start.setDate(1);
                start.setHours(0, 0, 0, 0);
                end.setMonth(now.getMonth());
                end.setDate(0);
                end.setHours(23, 59, 59, 999);
                break;
            case 'this_year':
                start.setMonth(0);
                start.setDate(1);
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                break;
            default:
                return null;
        }

        return { start, end };
    }

    static async productCount(userId: string, params: DateRangeParams) {
        const query: any = { userId };
        const dateRange = this.getDateRange(params);
        if (dateRange) {
            query.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
        }
        return await Product.countDocuments(query);
    }

    static async activeOrderCount(userId: string, params: DateRangeParams) {
        const business = await Business.findOne({ userId });
        if (!business) return 0;

        const query: any = {
            'items.businessId': business._id,
            'items.status': { $in: ['pending', 'confirmed', 'processing', 'out_for_delivery', 'shipped'] }
        };

        const dateRange = this.getDateRange(params);
        if (dateRange) {
            query.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
        }

        return await Order.countDocuments(query);
    }

    static async lowStockCount(userId: string) {
        return await Product.countDocuments({
            userId,
            $expr: { $lte: ['$quantity', '$minRestockLevel'] }
        });
    }

    static async totalRevenue(userId: string, params: DateRangeParams) {
        const business = await Business.findOne({ userId });
        if (!business) return 0;

        const matchQuery: any = {
            'items.businessId': business._id,
            paymentStatus: 'paid'
        };

        const dateRange = this.getDateRange(params);
        if (dateRange) {
            matchQuery.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
        }

        const result = await Order.aggregate([
            { $match: matchQuery },
            { $unwind: '$items' },
            { $match: { 'items.businessId': business._id } },
            { $group: { _id: null, total: { $sum: '$items.totalPriceOfItems' } } }
        ]);

        return result[0]?.total || 0;
    }

    static async popularProducts(userId: string, params: DateRangeParams, limit: number = 10) {
        const business = await Business.findOne({ userId });
        if (!business) return [];

        const matchQuery: any = { 'items.businessId': business._id };
        const dateRange = this.getDateRange(params);
        if (dateRange) {
            matchQuery.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
        }

        return await Order.aggregate([
            { $match: matchQuery },
            { $unwind: '$items' },
            { $match: { 'items.businessId': business._id } },
            { $group: { _id: '$items.productId', totalQuantity: { $sum: '$items.quantity' } } },
            { $sort: { totalQuantity: -1 } },
            { $limit: limit },
            { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
            { $unwind: '$product' },
            { $project: { _id: 1, totalQuantity: 1, name: '$product.name', price: '$product.price', imageURLs: '$product.imageURLs' } }
        ]);
    }

    static async topDistributors(userId: string, params: DateRangeParams, limit: number = 10) {
        const business = await Business.findOne({ userId });
        if (!business) return [];

        const matchQuery: any = {
            'items.businessId': business._id,
            userType: 'distributor'
        };

        const dateRange = this.getDateRange(params);
        if (dateRange) {
            matchQuery.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
        }

        return await Order.aggregate([
            { $match: matchQuery },
            { $group: { _id: '$userId', orderCount: { $sum: 1 } } },
            { $sort: { orderCount: -1 } },
            { $limit: limit },
            { $lookup: { from: 'businesses', localField: '_id', foreignField: 'userId', as: 'business' } },
            { $unwind: '$business' },
            { $project: { _id: 1, orderCount: 1, businessName: '$business.businessName', email: '$business.email', phone: '$business.phone', businessId: '$business._id' } }
        ]);
    }
}