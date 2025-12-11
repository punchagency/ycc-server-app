import { Response, Request } from 'express';
import { ServiceService } from '../service/service.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { CreateServiceDTO, UpdateServiceDTO, BulkServiceInput } from '../dto/service.dto';
import Validate from '../utils/Validate';
import UserModel from '../models/user.model';
import BusinessModel from '../models/business.model';
import { Types } from 'mongoose';

export class ServiceController {
    static async createService(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const userRole = req.user!.role;
            let businessId = req.user!.businessId;

            // Admin flow: validate and fetch business details
            if (userRole === 'admin') {
                const adminProvidedBusinessId = req.body.businessId;
                
                if (!adminProvidedBusinessId || !Validate.mongoId(adminProvidedBusinessId)) {
                    res.status(400).json({
                        success: false,
                        message: 'As an admin, you should provide a business owner.',
                        code: 'VALIDATION_ERROR'
                    });
                    return;
                }

                const business = await BusinessModel.findById(adminProvidedBusinessId).populate('userId');
                if (!business) {
                    res.status(404).json({
                        success: false,
                        message: 'Business not found',
                        code: 'BUSINESS_NOT_FOUND'
                    });
                    return;
                }

                const businessOwner = business.userId as any;
                if (!businessOwner || businessOwner.role !== 'distributor') {
                    res.status(400).json({
                        success: false,
                        message: 'Business must belong to a distributor',
                        code: 'VALIDATION_ERROR'
                    });
                    return;
                }

                businessId = business._id.toString();
            } else if (userRole === 'distributor') {
                // Distributor flow: use their own businessId
                if (!businessId) {
                    res.status(400).json({
                        success: false,
                        message: 'Business ID is required',
                        code: 'BUSINESS_REQUIRED'
                    });
                    return;
                }
            } else {
                res.status(403).json({
                    success: false,
                    message: 'Only distributors and admins can create services',
                    code: 'FORBIDDEN'
                });
                return;
            }

            const { name, description, price, categoryId, isQuotable } = req.body;

            if (!name || !Validate.stringLength(name, 2, 50)) {
                res.status(400).json({ success: false, message: 'Service name must be 2-50 characters', code: 'VALIDATION_ERROR' });
                return;
            }

            if (description && !Validate.stringLength(description, 2, 500)) {
                res.status(400).json({ success: false, message: 'Description must be 2-500 characters', code: 'VALIDATION_ERROR' });
                return;
            }

            if (!price || typeof Number(price) !== 'number' || Number(price) < 1) {
                res.status(400).json({ success: false, message: 'Valid price is required', code: 'VALIDATION_ERROR' });
                return;
            }

            if (!categoryId || !Validate.string(categoryId)) {
                res.status(400).json({ success: false, message: 'Category is required', code: 'VALIDATION_ERROR' });
                return;
            }

            const files = req.files as { [fieldname: string]: Express.MulterS3.File[] };
            const imageURLs = files?.serviceImage?.map(file => file.location) || [];

            if (imageURLs.length > 10) {
                res.status(400).json({ success: false, message: 'Maximum 10 images allowed', code: 'VALIDATION_ERROR' });
                return;
            }

            const serviceData: CreateServiceDTO = {
                name: name.trim(),
                description: description?.trim(),
                price: Number(price),
                businessId,
                categoryId,
                isQuotable: isQuotable || false
            };

            const service = await ServiceService.createService(serviceData, imageURLs, categoryId);

            if (!service) {
                res.status(400).json({ success: false, message: 'Failed to create service. Category may not exist.' });
                return;
            }

            res.status(201).json({
                success: true,
                message: 'Service created successfully',
                data: { service }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to create service' });
        }
    }

    static async uploadMultipleServices(req: Request, res: Response): Promise<void> {
        try {
            const { userId, services }: { userId: string; services: BulkServiceInput[] } = req.body;

            if (!userId || !Types.ObjectId.isValid(userId)) {
                res.status(400).json({ success: false, message: 'Valid user ID is required', code: 'VALIDATION_ERROR' });
                return;
            }

            if (!services || !Array.isArray(services) || services.length === 0) {
                res.status(400).json({ success: false, message: 'Services array is required', code: 'VALIDATION_ERROR' });
                return;
            }

            const user = await UserModel.findById(userId);
            if (!user || user.role !== 'distributor') {
                res.status(403).json({ success: false, message: 'User must be a distributor', code: 'FORBIDDEN' });
                return;
            }

            const business = await BusinessModel.findOne({ userId });
            if (!business) {
                res.status(400).json({ success: false, message: 'Business not found for user', code: 'BUSINESS_NOT_FOUND' });
                return;
            }

            for (const service of services) {
                if (!service.name || !Validate.stringLength(service.name, 2, 50)) {
                    res.status(400).json({ success: false, message: 'Each service name must be 2-50 characters', code: 'VALIDATION_ERROR' });
                    return;
                }
                if (!service.price || typeof Number(service.price) !== 'number' || Number(service.price) < 1) {
                    res.status(400).json({ success: false, message: 'Each service must have a valid price', code: 'VALIDATION_ERROR' });
                    return;
                }
                if (!service.categoryName || !Validate.string(service.categoryName)) {
                    res.status(400).json({ success: false, message: 'Each service must have a category name', code: 'VALIDATION_ERROR' });
                    return;
                }
            }

            const result = await ServiceService.uploadMultipleServices(business._id.toString(), services);

            res.status(201).json({
                success: true,
                message: 'Bulk upload completed',
                data: {
                    created: result.createdServices,
                    failed: result.failedServices,
                    newCategories: result.newCategories
                },
                summary: {
                    total: services.length,
                    successful: result.createdServices.length,
                    failed: result.failedServices.length,
                    newCategoriesCreated: result.newCategories.length
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to upload services' });
        }
    }

    static async getService(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            const service = await ServiceService.getServiceById(id);

            if (!service) {
                res.status(404).json({ success: false, message: 'Service not found', code: 'SERVICE_NOT_FOUND' });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Service retrieved successfully',
                data: { service }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to retrieve service' });
        }
    }

    static async getBusinessServices(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.user || req.user.role !== 'distributor') {
                res.status(403).json({ success: false, message: 'Only distributors can view their services', code: 'FORBIDDEN' });
                return;
            }

            const businessId = req.user.businessId;
            if (!businessId) {
                res.status(400).json({ success: false, message: 'Business not found for user', code: 'BUSINESS_NOT_FOUND' });
                return;
            }

            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;

            const result = await ServiceService.getServicesByBusiness(businessId, page, limit);

            res.status(200).json({
                success: true,
                message: 'Services retrieved successfully',
                data: result.services,
                pagination: {
                    total: result.total,
                    page: result.page,
                    pages: result.pages,
                    limit
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to retrieve services' });
        }
    }

    static async updateService(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const userRole = req.user!.role;
            const businessId = req.user!.businessId;

            if (!Validate.mongoId(id)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid service ID',
                    code: 'VALIDATION_ERROR'
                });
                return;
            }

            // Check if service exists
            const existingService = await ServiceService.getServiceById(id);
            if (!existingService) {
                res.status(404).json({
                    success: false,
                    message: 'Service not found',
                    code: 'SERVICE_NOT_FOUND'
                });
                return;
            }

            // Authorization check
            if (userRole === 'admin') {
                // Admin can update any distributor's service
                const business = await BusinessModel.findById(existingService.businessId).populate('userId');
                if (!business) {
                    res.status(404).json({
                        success: false,
                        message: 'Business not found',
                        code: 'BUSINESS_NOT_FOUND'
                    });
                    return;
                }

                const businessOwner = business.userId as any;
                if (!businessOwner || businessOwner.role !== 'distributor') {
                    res.status(403).json({
                        success: false,
                        message: 'Can only update services for distributors',
                        code: 'ACCESS_DENIED'
                    });
                    return;
                }
            } else if (userRole === 'distributor') {
                // Distributor can only update their own services
                if (!businessId) {
                    res.status(400).json({
                        success: false,
                        message: 'Business ID is required',
                        code: 'BUSINESS_REQUIRED'
                    });
                    return;
                }

                if (existingService.businessId.toString() !== businessId) {
                    res.status(403).json({
                        success: false,
                        message: 'Access denied',
                        code: 'ACCESS_DENIED'
                    });
                    return;
                }
            } else {
                res.status(403).json({
                    success: false,
                    message: 'Only distributors and admins can update services',
                    code: 'FORBIDDEN'
                });
                return;
            }
            const { name, description, price, categoryId, isQuotable } = req.body;

            if (name && !Validate.stringLength(name, 2, 50)) {
                res.status(400).json({ success: false, message: 'Service name must be 2-50 characters', code: 'VALIDATION_ERROR' });
                return;
            }

            if (description && !Validate.stringLength(description, 2, 500)) {
                res.status(400).json({ success: false, message: 'Description must be 2-500 characters', code: 'VALIDATION_ERROR' });
                return;
            }

            if (price !== undefined && (typeof Number(price) !== 'number' || Number(price) < 0)) {
                res.status(400).json({ success: false, message: 'Valid price is required', code: 'VALIDATION_ERROR' });
                return;
            }

            const files = req.files as { [fieldname: string]: Express.MulterS3.File[] };
            const imageURLs = files?.serviceImage?.map(file => file.location);

            if (imageURLs && imageURLs.length > 10) {
                res.status(400).json({ success: false, message: 'Maximum 10 images allowed', code: 'VALIDATION_ERROR' });
                return;
            }

            const updateData: UpdateServiceDTO = {};
            if (name) updateData.name = name.trim();
            if (description) updateData.description = description.trim();
            if (price !== undefined) updateData.price = Number(price);
            if (categoryId) updateData.categoryId = categoryId;
            if (isQuotable !== undefined) updateData.isQuotable = isQuotable;

            const serviceBusinessId = userRole === 'admin' ? existingService.businessId.toString() : businessId!;
            const service = await ServiceService.updateService(id, serviceBusinessId, updateData, imageURLs, categoryId);

            if (!service) {
                res.status(404).json({ success: false, message: 'Service not found or unauthorized', code: 'SERVICE_NOT_FOUND' });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Service updated successfully',
                data: { service }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to update service' });
        }
    }

    static async deleteService(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.user || req.user.role !== 'distributor') {
                res.status(403).json({ success: false, message: 'Only distributors can delete services', code: 'FORBIDDEN' });
                return;
            }

            const businessId = req.user.businessId;
            if (!businessId) {
                res.status(400).json({ success: false, message: 'Business not found for user', code: 'BUSINESS_NOT_FOUND' });
                return;
            }

            const { id } = req.params;

            const deleted = await ServiceService.deleteService(id, businessId);

            if (!deleted) {
                res.status(404).json({ success: false, message: 'Service not found or unauthorized', code: 'SERVICE_NOT_FOUND' });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Service deleted successfully'
            });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to delete service' });
        }
    }

    static async fetchServicesForCrew(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(403).json({ success: false, message: 'Only crew members can access services', code: 'FORBIDDEN' });
                return;
            }

            const {
                search = '',
                category = '',
                minPrice,
                maxPrice,
                page = '1',
                limit = '12',
                sortBy = 'random'
            } = req.query;

            const pageNum = parseInt(page as string) || 1;
            const limitNum = parseInt(limit as string) || 12;
            const skip = (pageNum - 1) * limitNum;

            // Build match query
            const matchQuery: any = {};

            // Search functionality
            if (search) {
                matchQuery.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } }
                ];
            }

            // Price range filter
            if (minPrice !== undefined || maxPrice !== undefined) {
                matchQuery.price = {};
                if (minPrice !== undefined) matchQuery.price.$gte = parseFloat(minPrice as string);
                if (maxPrice !== undefined) matchQuery.price.$lte = parseFloat(maxPrice as string);
            }

            // Build aggregation pipeline
            const aggregationPipeline: any[] = [
                { $match: matchQuery },
                {
                    // Join with category collection
                    $lookup: {
                        from: 'categories',
                        localField: 'categoryId',
                        foreignField: '_id',
                        as: 'category'
                    }
                },
                { $unwind: '$category' },
                {
                    // Filter only approved categories
                    $match: { 'category.isApproved': true }
                },
                {
                    // Join with business collection
                    $lookup: {
                        from: 'businesses',
                        localField: 'businessId',
                        foreignField: '_id',
                        as: 'business'
                    }
                },
                { $unwind: '$business' }
            ];

            // Add category filter after lookups
            if (category) {
                aggregationPipeline.push({
                    $match: { 'category.name': { $regex: category, $options: 'i' } }
                });
            }

            // Project fields
            aggregationPipeline.push({
                $project: {
                    _id: 1,
                    name: 1,
                    description: 1,
                    price: 1,
                    imageURLs: 1,
                    isQuotable: 1,
                    category: {
                        _id: '$category._id',
                        name: '$category.name',
                        description: '$category.description',
                        imageURL: '$category.imageURL'
                    },
                    business: {
                        _id: '$business._id',
                        businessName: '$business.businessName',
                        businessPhone: '$business.businessPhone',
                        businessEmail: '$business.businessEmail',
                        address: '$business.address',
                        website: '$business.website'
                    },
                    createdAt: 1,
                    updatedAt: 1
                }
            });

            // Add sorting
            if (sortBy === 'price_asc') {
                aggregationPipeline.push({ $sort: { price: 1 } });
            } else if (sortBy === 'price_desc') {
                aggregationPipeline.push({ $sort: { price: -1 } });
            } else if (sortBy === 'name') {
                aggregationPipeline.push({ $sort: { name: 1 } });
            } else {
                // Random order
                aggregationPipeline.push({
                    $addFields: { randomSort: { $rand: {} } }
                });
                aggregationPipeline.push({ $sort: { randomSort: 1 } });
            }

            // Get total count
            const countPipeline = [...aggregationPipeline];
            countPipeline.push({ $count: 'total' });
            const countResult = await ServiceService.aggregateServices(countPipeline);
            const totalServices = countResult[0]?.total || 0;

            // Add pagination
            aggregationPipeline.push({ $skip: skip });
            aggregationPipeline.push({ $limit: limitNum });

            // Execute aggregation
            const services = await ServiceService.aggregateServices(aggregationPipeline);

            // Calculate pagination info
            const totalPages = Math.ceil(totalServices / limitNum);
            const hasNextPage = pageNum < totalPages;
            const hasPrevPage = pageNum > 1;

            res.status(200).json({
                success: true,
                message: 'Services fetched successfully',
                data: {
                    services,
                    pagination: {
                        currentPage: pageNum,
                        totalPages,
                        totalServices,
                        hasNextPage,
                        hasPrevPage,
                        limit: limitNum
                    }
                }
            });
        } catch (error) {
            console.error('Error in fetchServicesForCrew:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch services',
                error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
            });
        }
    }
}
