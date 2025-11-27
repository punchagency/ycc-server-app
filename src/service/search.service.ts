import UserModel from "../models/user.model"
import ProductModel from "../models/product.model"
import ServiceModel from "../models/service.model"
import BusinessModel from "../models/business.model"
import OrderModel from "../models/order.model"
import CategoryModel from "../models/category.model"
import BookingModel from "../models/booking.model"
import { RedisUtils } from "../utils/RedisUtils"
import catchError from "../utils/catchError"

export class SearchService {
    static async globalSearch({userId, userRole, query = '', type, status, sortBy = 'createdAt', order = 'desc' }:{userId: string, userRole: string, query?: string, type?: string, status?: string, sortBy?: string, order?: string}) {
        const page = 1;
        const limit = 50;
        const skip = (page - 1) * limit;
        const sortOrder = order === 'asc' ? 1 : -1;

        // Generate cache key
        const cacheKey = `search:${userId}:${query}:${type}:${status}:${sortBy}:${order}`;
        
        // Check cache
        const [cacheError, cachedResult] = await catchError(RedisUtils.getCachedQuery(cacheKey));
        if (!cacheError && cachedResult) {
            return cachedResult;
        }

        const searchRegex = query ? new RegExp(query.trim(), 'i') : null;
        const results: any = {};

        // Products search
        if (!type || type === 'products') {
            const productFilter: any = {};
            
            if (userRole === 'distributor' || userRole === 'manufacturer') {
                productFilter.userId = userId;
            }
            
            if (searchRegex) {
                productFilter.$or = [
                    { name: searchRegex },
                    { description: searchRegex },
                    { sku: searchRegex }
                ];
            }

            const [, products] = await catchError(
                ProductModel.find(productFilter)
                    .populate('category', 'name')
                    .populate('businessId', 'businessName')
                    .sort({ [sortBy]: sortOrder })
                    .limit(limit)
                    .skip(skip)
                    .lean()
            );

            results.products = products?.map((p: any) => ({
                type: 'product',
                id: p._id,
                name: p.name,
                price: p.price,
                quantity: p.quantity,
                category: p.category?.name,
                business: p.businessId?.businessName,
                imageUrl: p.imageURLs?.[0],
                description: p.description
            })) || [];
        }

        // Users search (admin only)
        if ((!type || type === 'users') && userRole === 'admin') {
            const userFilter: any = {};
            
            if (searchRegex) {
                userFilter.$or = [
                    { firstName: searchRegex },
                    { lastName: searchRegex },
                    { email: searchRegex },
                    { phone: searchRegex }
                ];
            }

            const [, users] = await catchError(
                UserModel.find(userFilter)
                    .select('-password -refreshToken -activationCode -resetPasswordCode')
                    .sort({ [sortBy]: sortOrder })
                    .limit(limit)
                    .skip(skip)
                    .lean()
            );

            results.users = users?.map((u: any) => ({
                type: 'user',
                id: u._id,
                name: `${u.firstName} ${u.lastName}`,
                email: u.email,
                phone: u.phone,
                role: u.role
            })) || [];
        }

        // Business search
        if (!type || type === 'businesses') {
            const businessFilter: any = {};
            
            if (userRole === 'distributor' || userRole === 'manufacturer') {
                businessFilter.userId = userId;
            }
            
            if (searchRegex) {
                businessFilter.$or = [
                    { businessName: searchRegex },
                    { email: searchRegex },
                    { phone: searchRegex }
                ];
            }

            const [, businesses] = await catchError(
                BusinessModel.find(businessFilter)
                    .sort({ [sortBy]: sortOrder })
                    .limit(limit)
                    .skip(skip)
                    .lean()
            );

            results.businesses = businesses?.map((b: any) => ({
                type: 'business',
                id: b._id,
                name: b.businessName,
                email: b.email,
                phone: b.phone,
                businessType: b.businessType
            })) || [];
        }

        // Orders search
        if (!type || type === 'orders') {
            const orderFilter: any = {};
            
            if (userRole !== 'admin') {
                orderFilter.userId = userId;
            }
            
            if (status) {
                orderFilter.status = status;
            }
            
            if (searchRegex) {
                orderFilter.$or = [
                    { trackingNumber: searchRegex },
                    { notes: searchRegex }
                ];
            }

            const [, orders] = await catchError(
                OrderModel.find(orderFilter)
                    .populate('userId', 'firstName lastName email')
                    .sort({ [sortBy]: sortOrder })
                    .limit(limit)
                    .skip(skip)
                    .lean()
            );

            results.orders = orders?.map((o: any) => ({
                type: 'order',
                id: o._id,
                totalAmount: o.totalAmount,
                status: o.status,
                paymentStatus: o.paymentStatus,
                trackingNumber: o.trackingNumber,
                user: o.userId ? `${o.userId.firstName} ${o.userId.lastName}` : null
            })) || [];
        }

        // Categories search
        if (!type || type === 'categories') {
            const categoryFilter: any = {};
            
            if (searchRegex) {
                categoryFilter.$or = [
                    { name: searchRegex },
                    { description: searchRegex }
                ];
            }

            const [, categories] = await catchError(
                CategoryModel.find(categoryFilter)
                    .sort({ [sortBy]: sortOrder })
                    .limit(limit)
                    .skip(skip)
                    .lean()
            );

            results.categories = categories?.map((c: any) => ({
                type: 'category',
                id: c._id,
                name: c.name,
                description: c.description,
                categoryType: c.type,
                imageUrl: c.imageURL
            })) || [];
        }

        // Services search
        if (!type || type === 'services') {
            const serviceFilter: any = {};
            
            if (userRole === 'distributor' || userRole === 'manufacturer') {
                serviceFilter.businessId = userId;
            }
            
            if (searchRegex) {
                serviceFilter.$or = [
                    { name: searchRegex },
                    { description: searchRegex }
                ];
            }

            const [, services] = await catchError(
                ServiceModel.find(serviceFilter)
                    .populate('categoryId', 'name')
                    .populate('businessId', 'businessName')
                    .sort({ [sortBy]: sortOrder })
                    .limit(limit)
                    .skip(skip)
                    .lean()
            );

            results.services = services?.map((s: any) => ({
                type: 'service',
                id: s._id,
                name: s.name,
                price: s.price,
                category: s.categoryId?.name,
                business: s.businessId?.businessName,
                imageUrl: s.imageURLs?.[0],
                description: s.description
            })) || [];
        }

        // Bookings search
        if (!type || type === 'bookings') {
            const bookingFilter: any = {};
            
            if (userRole !== 'admin') {
                bookingFilter.userId = userId;
            }
            
            if (status) {
                bookingFilter.status = status;
            }
            
            if (searchRegex) {
                bookingFilter.$or = [
                    { customerEmail: searchRegex },
                    { customerPhone: searchRegex },
                    { notes: searchRegex }
                ];
            }

            const [, bookings] = await catchError(
                BookingModel.find(bookingFilter)
                    .populate('userId', 'firstName lastName email')
                    .populate('serviceId', 'name')
                    .populate('businessId', 'businessName')
                    .sort({ [sortBy]: sortOrder })
                    .limit(limit)
                    .skip(skip)
                    .lean()
            );

            results.bookings = bookings?.map((b: any) => ({
                type: 'booking',
                id: b._id,
                service: b.serviceId?.name,
                business: b.businessId?.businessName,
                bookingDate: b.bookingDate,
                status: b.status,
                paymentStatus: b.paymentStatus,
                user: b.userId ? `${b.userId.firstName} ${b.userId.lastName}` : null
            })) || [];
        }

        const totalResults = Object.values(results).reduce((sum: number, arr: any) => sum + arr.length, 0);
        
        const response = {
            data: results,
            totalResults,
            query: query || 'all',
            filters: { type, status, sortBy, order }
        };

        // Cache result for 5 minutes
        await catchError(RedisUtils.cacheQuery(cacheKey, response, 300));

        return response;
    }
}