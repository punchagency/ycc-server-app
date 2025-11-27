import UserModel from "../models/user.model";
import OrderModel from "../models/order.model";
import InvoiceModel from "../models/invoice.model";

export class AdminAnalyticsService {

    static async getUsersTotal() {
        const totalUsers = await UserModel.countDocuments();
        const usersByRole = await UserModel.aggregate([
            { $group: { _id: "$role", count: { $sum: 1 } } },
            { $project: { role: "$_id", count: 1, _id: 0 } }
        ]);
        return { totalUsers, usersByRole };
    }
    static async getTotalOrderOverTime(startDate?: Date, endDate?: Date, interval: 'day' | 'week' | 'month' = 'day') {
        const matchStage: any = {};
        if (startDate || endDate) {
            matchStage.createdAt = {};
            if (startDate) matchStage.createdAt.$gte = startDate;
            if (endDate) matchStage.createdAt.$lte = endDate;
        }

        const groupFormat = interval === 'day' ? '%Y-%m-%d' : interval === 'week' ? '%Y-W%U' : '%Y-%m';
        
        const orders = await OrderModel.aggregate([
            ...(Object.keys(matchStage).length ? [{ $match: matchStage }] : []),
            {
                $group: {
                    _id: { $dateToString: { format: groupFormat, date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } },
            { $project: { period: "$_id", count: 1, _id: 0 } }
        ]);
        return orders;
    }
    static async getTotalInvoicesByStatus() {
        const invoicesByStatus = await InvoiceModel.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } },
            { $project: { status: "$_id", count: 1, _id: 0 } }
        ]);
        return invoicesByStatus;
    }
    static async getUserGrowthOverTime(startDate?: Date, endDate?: Date, interval: 'day' | 'week' | 'month' = 'day') {
        const matchStage: any = {};
        if (startDate || endDate) {
            matchStage.createdAt = {};
            if (startDate) matchStage.createdAt.$gte = startDate;
            if (endDate) matchStage.createdAt.$lte = endDate;
        }

        const groupFormat = interval === 'day' ? '%Y-%m-%d' : interval === 'week' ? '%Y-W%U' : '%Y-%m';
        
        const userGrowth = await UserModel.aggregate([
            ...(Object.keys(matchStage).length ? [{ $match: matchStage }] : []),
            {
                $group: {
                    _id: { $dateToString: { format: groupFormat, date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } },
            { $project: { period: "$_id", count: 1, _id: 0 } }
        ]);
        return userGrowth;
    }
    static async getTopUsers(startDate?: Date, endDate?: Date, limit: number = 10) {
        const matchStage: any = { "userId": { $exists: true } };
        if (startDate || endDate) {
            matchStage.createdAt = {};
            if (startDate) matchStage.createdAt.$gte = startDate;
            if (endDate) matchStage.createdAt.$lte = endDate;
        }

        const topUsers = await OrderModel.aggregate([
            { $match: matchStage },
            { $group: { _id: "$userId", orderCount: { $sum: 1 } } },
            { $sort: { orderCount: -1 } },
            { $limit: limit },
            { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
            { $unwind: "$user" },
            {
                $project: {
                    userId: "$_id",
                    orderCount: 1,
                    firstName: "$user.firstName",
                    lastName: "$user.lastName",
                    email: "$user.email",
                    _id: 0
                }
            }
        ]);
        return topUsers;
    }
    static async getTopDistributors(startDate?: Date, endDate?: Date, limit: number = 10) {
        const matchStage: any = { "items.businessId": { $exists: true } };
        if (startDate || endDate) {
            matchStage.createdAt = {};
            if (startDate) matchStage.createdAt.$gte = startDate;
            if (endDate) matchStage.createdAt.$lte = endDate;
        }

        const topDistributors = await OrderModel.aggregate([
            { $match: matchStage },
            { $unwind: "$items" },
            { $group: { _id: "$items.businessId", orderCount: { $sum: 1 } } },
            { $sort: { orderCount: -1 } },
            { $limit: limit },
            { $lookup: { from: "businesses", localField: "_id", foreignField: "_id", as: "business" } },
            { $unwind: "$business" },
            { $match: { "business.businessType": "distributor" } },
            {
                $project: {
                    businessId: "$_id",
                    orderCount: 1,
                    businessName: "$business.businessName",
                    email: "$business.email",
                    _id: 0
                }
            }
        ]);
        return topDistributors;
    }
    static async getTopManufacturers(startDate?: Date, endDate?: Date, limit: number = 10) {
        const matchStage: any = { "items.businessId": { $exists: true } };
        if (startDate || endDate) {
            matchStage.createdAt = {};
            if (startDate) matchStage.createdAt.$gte = startDate;
            if (endDate) matchStage.createdAt.$lte = endDate;
        }

        const topManufacturers = await OrderModel.aggregate([
            { $match: matchStage },
            { $unwind: "$items" },
            { $group: { _id: "$items.businessId", orderCount: { $sum: 1 } } },
            { $sort: { orderCount: -1 } },
            { $limit: limit },
            { $lookup: { from: "businesses", localField: "_id", foreignField: "_id", as: "business" } },
            { $unwind: "$business" },
            { $match: { "business.businessType": "manufacturer" } },
            {
                $project: {
                    businessId: "$_id",
                    orderCount: 1,
                    businessName: "$business.businessName",
                    email: "$business.email",
                    _id: 0
                }
            }
        ]);
        return topManufacturers;
    }
}