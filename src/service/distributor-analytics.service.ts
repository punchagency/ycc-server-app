


import BusinessModel from "../models/business.model";
import ProductModel from "../models/product.model";
import ServiceModel from "../models/service.model";
import OrderModel from "../models/order.model";
import BookingModel from "../models/booking.model";
import InvoiceModel from "../models/invoice.model";

export class DistributorAnalyticsService {
    static async getTotalProducts(businessId: string) {
        return await ProductModel.countDocuments({ businessId });
    }
    static async getTotalServices(businessId: string) {
        return await ServiceModel.countDocuments({ businessId });
    }
    static async getLowStockItemsNumber(businessId: string) {
        return await ProductModel.countDocuments({
            businessId: businessId,
            $expr: { $lt: ["$quantity", "$minRestockLevel"] }
        });
    }
    static async getCustomerRating(userId: string) {
        const business = await BusinessModel.findOne({ userId });
        if (!business) return null;
        return business.ratings?.averageRating || 0;
    }
    static async getActiveOrdersNumber(businessId: string) {
        return await OrderModel.countDocuments({
            "items.businessId": businessId,
            status: { $in: ['pending', 'confirmed', 'processing', 'out_for_delivery', 'shipped'] }
        });
    }
    static async getTotalBookings(businessId: string) {
        return await BookingModel.countDocuments({ businessId: businessId });
    }
    static async getPopularServicesNumber(businessId: string) {        
        const popularServices = await BookingModel.aggregate([
            { $match: { businessId: businessId } },
            { $group: { _id: "$serviceId", bookingCount: { $sum: 1 } } },
            { $sort: { bookingCount: -1 } },
            { $limit: 10 },
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
        return popularServices;
    }
    static async getPopularProductsNumber(businessId: string) {
        
        const popularProducts = await OrderModel.aggregate([
            { $unwind: "$items" },
            { $match: { "items.businessId": businessId } },
            { $group: { _id: "$items.productId", orderCount: { $sum: 1 } } },
            { $sort: { orderCount: -1 } },
            { $limit: 10 },
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
        return popularProducts;
    }
    static async getTotalRevenue(businessId: string) {
        const result = await InvoiceModel.aggregate([
            { $match: { businessIds: businessId, status: 'paid' } },
            { $group: { _id: null, totalRevenue: { $sum: "$amount" } } }
        ]);
        return result[0]?.totalRevenue || 0;
    }
}