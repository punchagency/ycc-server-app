import Service from '../models/service.model';
import Product from '../models/product.model';
import Category from '../models/category.model';
import catchError from '../utils/catchError';

interface GetServicesOrProductsParams {
    type?: 'service' | 'product';
    category?: string;
    page?: number;
    limit?: number;
}

export class PublicService {
    static async getServicesOrProducts(params: GetServicesOrProductsParams) {
        const { type, category, page = 1, limit = 10 } = params;
        const skip = (page - 1) * limit;

        if (type === 'service') {
            const filter: any = {};

            if (category) {
                const [catError, categoryDoc] = await catchError(Category.findOne({ _id: category, type: 'service', isApproved: true }));
                if (catError || !categoryDoc) {
                    return { data: [], total: 0, page, pages: 0, limit };
                }
                filter.categoryId = category;
            }

            const [countError, total] = await catchError(Service.aggregate([
                { $match: filter },
                { $lookup: { from: 'businesses', localField: 'businessId', foreignField: '_id', as: 'business' } },
                { $unwind: '$business' },
                { $match: { 'business.isOnboarded': true } },
                { $count: 'total' }
            ]));

            const totalCount = countError || !total || total.length === 0 ? 0 : total[0].total;

            const [error, services] = await catchError(Service.aggregate([
                { $match: filter },
                { $lookup: { from: 'businesses', localField: 'businessId', foreignField: '_id', as: 'business' } },
                { $unwind: '$business' },
                { $match: { 'business.isOnboarded': true } },
                { $sample: { size: totalCount } },
                { $skip: skip },
                { $limit: limit },
                { $lookup: { from: 'categories', localField: 'categoryId', foreignField: '_id', as: 'category' } },
                { $unwind: '$category' },
                {
                    $project: {
                        name: 1,
                        description: 1,
                        imageURLs: 1,
                        price: 1,
                        isQuotable: 1,
                        business: {
                            _id: 1,
                            businessName: 1,
                            email: 1,
                            phone: 1,
                            website: 1,
                            address: 1,
                            ratings: 1
                        },
                        category: { _id: 1, name: 1, description: 1, imageURL: 1 }
                    }
                }
            ]));

            if (error) throw error;

            return {
                data: services || [],
                total: totalCount,
                page,
                pages: Math.ceil(totalCount / limit),
                limit
            };
        }

        if (type === 'product') {
            const filter: any = {};

            if (category) {
                const [catError, categoryDoc] = await catchError(Category.findOne({ _id: category, type: 'product', isApproved: true }));
                if (catError || !categoryDoc) {
                    return { data: [], total: 0, page, pages: 0, limit };
                }
                filter.category = category;
            }

            const [countError, total] = await catchError(Product.aggregate([
                { $match: filter },
                { $lookup: { from: 'businesses', localField: 'businessId', foreignField: '_id', as: 'business' } },
                { $unwind: '$business' },
                { $match: { 'business.isOnboarded': true } },
                { $count: 'total' }
            ]));

            const totalCount = countError || !total || total.length === 0 ? 0 : total[0].total;

            const [error, products] = await catchError(Product.aggregate([
                { $match: filter },
                { $lookup: { from: 'businesses', localField: 'businessId', foreignField: '_id', as: 'business' } },
                { $unwind: '$business' },
                { $match: { 'business.isOnboarded': true } },
                { $sample: { size: totalCount } },
                { $skip: skip },
                { $limit: limit },
                { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'categoryData' } },
                { $unwind: '$categoryData' },
                {
                    $project: {
                        name: 1,
                        description: 1,
                        imageURLs: 1,
                        price: 1,
                        sku: 1,
                        business: {
                            _id: 1,
                            businessName: 1,
                            email: 1,
                            phone: 1,
                            website: 1,
                            address: 1,
                            ratings: 1
                        },
                        category: { _id: '$categoryData._id', name: '$categoryData.name', description: '$categoryData.description', imageURL: '$categoryData.imageURL' }
                    }
                }
            ]));

            if (error) throw error;

            return {
                data: products || [],
                total: totalCount,
                page,
                pages: Math.ceil(totalCount / limit),
                limit
            };
        }

        return { data: [], total: 0, page, pages: 0, limit };
    }
}