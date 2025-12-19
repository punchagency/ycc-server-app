import BusinessModel from "../models/business.model";
import ProductModel from "../models/product.model";
import ServiceModel from "../models/service.model";
import OrderModel from "../models/order.model";
import BookingModel from "../models/booking.model";
import InvoiceModel from "../models/invoice.model";
import { Types } from "mongoose";

type TimeRange = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_year' | 'all_time' | 'custom';

interface DateRangeParams {
    timeRange?: TimeRange;
    startDate?: Date;
    endDate?: Date;
}

export class DistributorAnalyticsService {

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

    static async getTotalProducts(businessId: string, params: DateRangeParams) {
        const query: any = { businessId };
        const dateRange = this.getDateRange(params);
        if (dateRange) {
            query.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
        }
        return await ProductModel.countDocuments(query);
    }

    static async getTotalServices(businessId: string, params: DateRangeParams) {
        const query: any = { businessId };
        const dateRange = this.getDateRange(params);
        if (dateRange) {
            query.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
        }
        return await ServiceModel.countDocuments(query);
    }

    static async getLowStockItemsNumber(businessId: string) {
        return await ProductModel.countDocuments({
            businessId: new Types.ObjectId(businessId),
            $expr: { $lt: ["$quantity", "$minRestockLevel"] }
        });
    }

    static async getCustomerRating(userId: string) {
        const business = await BusinessModel.findOne({ userId });
        if (!business) return null;
        return business.ratings?.averageRating || 0;
    }

    static async getActiveOrdersNumber(businessId: string, params: DateRangeParams) {
        const query: any = {
            "items.businessId": new Types.ObjectId(businessId),
            status: { $in: ['pending', 'confirmed', 'processing', 'out_for_delivery', 'shipped'] }
        };
        const dateRange = this.getDateRange(params);
        if (dateRange) {
            query.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
        }
        return await OrderModel.countDocuments(query);
    }

    static async getTotalBookings(businessId: string, params: DateRangeParams) {
        const query: any = { businessId: businessId };
        const dateRange = this.getDateRange(params);
        if (dateRange) {
            query.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
        }
        return await BookingModel.countDocuments(query);
    }

    static async getPopularServicesNumber(businessId: string, params: DateRangeParams, limit: number = 10) {
        const matchQuery: any = { businessId: new Types.ObjectId(businessId) };
        const dateRange = this.getDateRange(params);
        if (dateRange) {
            matchQuery.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
        }

        return await BookingModel.aggregate([
            { $match: matchQuery },
            { $group: { _id: "$serviceId", bookingCount: { $sum: 1 } } },
            { $sort: { bookingCount: -1 } },
            { $limit: limit },
            { $lookup: { from: "services", localField: "_id", foreignField: "_id", as: "service" } },
            { $unwind: "$service" },
            {
                $project: {
                    serviceId: "$_id",
                    bookingCount: 1,
                    name: "$service.name",
                    price: "$service.price",
                    _id: 0
                }
            }
        ]);
    }

    static async getPopularProductsNumber(businessId: string, params: DateRangeParams, limit: number = 10) {
        const matchQuery: any = { "items.businessId": new Types.ObjectId(businessId) };
        const dateRange = this.getDateRange(params);
        if (dateRange) {
            matchQuery.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
        }

        return await OrderModel.aggregate([
            { $match: matchQuery },
            { $unwind: "$items" },
            { $match: { "items.businessId": new Types.ObjectId(businessId) } },
            { $group: { _id: "$items.productId", orderCount: { $sum: 1 } } },
            { $sort: { orderCount: -1 } },
            { $limit: limit },
            { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "product" } },
            { $unwind: "$product" },
            {
                $project: {
                    productId: "$_id",
                    orderCount: 1,
                    name: "$product.name",
                    price: "$product.price",
                    _id: 0
                }
            }
        ]);
    }

    static async getTotalRevenue(businessId: string, params: DateRangeParams) {
        const matchQuery: any = { businessIds: businessId, status: 'paid' };
        const dateRange = this.getDateRange(params);
        if (dateRange) {
            matchQuery.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
        }

        const result = await InvoiceModel.aggregate([
            { $match: matchQuery },
            { $group: { _id: null, totalRevenue: { $sum: "$amount" } } }
        ]);
        return result[0]?.totalRevenue || 0;
    }
}