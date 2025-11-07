import { Response } from 'express';
import { ServiceService } from '../service/service.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { CreateServiceDTO, UpdateServiceDTO } from '../dto/service.dto';
import Validate from '../utils/Validate';

export class ServiceController {
    static async createService(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.user || req.user.role !== 'distributor') {
                res.status(403).json({ success: false, message: 'Only distributors can create services', code: 'FORBIDDEN' });
                return;
            }

            const businessId = req.user.businessId;
            if (!businessId) {
                res.status(400).json({ success: false, message: 'Business not found for user', code: 'BUSINESS_NOT_FOUND' });
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

            if (!price || typeof price !== 'number' || price < 0) {
                res.status(400).json({ success: false, message: 'Valid price is required', code: 'VALIDATION_ERROR' });
                return;
            }

            if (!categoryId || !Validate.string(categoryId)) {
                res.status(400).json({ success: false, message: 'Category ID is required', code: 'VALIDATION_ERROR' });
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
                price,
                businessId,
                categoryId,
                isQuotable: isQuotable || false
            };

            const service = await ServiceService.createService(serviceData, imageURLs);

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
            if (!req.user || req.user.role !== 'distributor') {
                res.status(403).json({ success: false, message: 'Only distributors can update services', code: 'FORBIDDEN' });
                return;
            }

            const businessId = req.user.businessId;
            if (!businessId) {
                res.status(400).json({ success: false, message: 'Business not found for user', code: 'BUSINESS_NOT_FOUND' });
                return;
            }

            const { id } = req.params;
            const { name, description, price, categoryId, isQuotable } = req.body;

            if (name && !Validate.stringLength(name, 2, 50)) {
                res.status(400).json({ success: false, message: 'Service name must be 2-50 characters', code: 'VALIDATION_ERROR' });
                return;
            }

            if (description && !Validate.stringLength(description, 2, 500)) {
                res.status(400).json({ success: false, message: 'Description must be 2-500 characters', code: 'VALIDATION_ERROR' });
                return;
            }

            if (price !== undefined && (typeof price !== 'number' || price < 0)) {
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
            if (price !== undefined) updateData.price = price;
            if (categoryId) updateData.categoryId = categoryId;
            if (isQuotable !== undefined) updateData.isQuotable = isQuotable;

            const service = await ServiceService.updateService(id, businessId, updateData, imageURLs);

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
}
