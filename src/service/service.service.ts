import ServiceModel, { IService } from '../models/service.model';
import { CategoryService } from './category.service';
import { CreateServiceDTO, UpdateServiceDTO } from '../dto/service.dto';
import { pineconeEmitter } from '../integration/pinecone';
import { logError, logInfo } from '../utils/SystemLogs';
import catchError from '../utils/catchError';
import { Types } from 'mongoose';
import { pineconeService } from '../integration/pinecone';

export class ServiceService {
    static async createService(serviceData: CreateServiceDTO, imageURLs?: string[], categoryInput?: string): Promise<IService | null> {
        let categoryId: string;
        
        if (categoryInput) {
            if (Types.ObjectId.isValid(categoryInput)) {
                categoryId = categoryInput;
            } else {
                let category = await CategoryService.getCategoryByName(categoryInput);
                if (!category) {
                    category = await CategoryService.createCategory({
                        name: categoryInput,
                        type: 'service',
                        isApproved: false
                    });
                }
                if (!category) {
                    await logError({
                        message: 'Failed to create category',
                        source: 'ServiceService.createService',
                        additionalData: { categoryInput }
                    });
                    return null;
                }
                categoryId = category._id.toString();
            }
        } else {
            categoryId = serviceData.categoryId;
        }

        const category = await CategoryService.getCategoryById(categoryId);
        if (!category) {
            await logError({
                message: 'Category not found',
                source: 'ServiceService.createService',
                additionalData: { categoryId }
            });
            return null;
        }

        const [error, service] = await catchError(
            ServiceModel.create({ ...serviceData, categoryId, imageURLs: imageURLs || [] })
        );

        if (error) {
            await logError({
                message: 'Failed to create service',
                source: 'ServiceService.createService',
                additionalData: { serviceData, error: error.message }
            });
            return null;
        }

        await logInfo({
            message: 'Service created successfully',
            source: 'ServiceService.createService',
            additionalData: { serviceId: service._id, name: service.name }
        });

        pineconeEmitter.emit('index', {
            serviceId: service._id.toString(),
            name: service.name,
            description: service.description || '',
            categoryName: category.name,
            price: service.price
        });

        return service;
    }

    static async uploadMultipleServices(userId: string, services: Array<{ name: string; description?: string; price?: number; categoryName: string; isQuotable?: boolean }>) {
        const categoryCache = new Map<string, string>();
        const newCategories: string[] = [];
        const createdServices: IService[] = [];
        const failedServices: Array<{ service: any; reason: string }> = [];

        for (const serviceData of services) {
            try {
                let categoryId = categoryCache.get(serviceData.categoryName.toLowerCase());

                if (!categoryId) {
                    let category = await CategoryService.getCategoryByName(serviceData.categoryName);
                    
                    if (!category) {
                        category = await CategoryService.createCategory({
                            name: serviceData.categoryName,
                            type: 'service',
                            isApproved: false
                        });
                        
                        if (category) {
                            newCategories.push(category.name);
                        }
                    }

                    if (!category) {
                        failedServices.push({ service: serviceData, reason: 'Failed to create category' });
                        continue;
                    }

                    categoryId = category._id.toString();
                    categoryCache.set(serviceData.categoryName.toLowerCase(), categoryId);
                }

                const [error, service] = await catchError(
                    ServiceModel.create({
                        name: serviceData.name,
                        description: serviceData.description,
                        price: serviceData.price,
                        businessId: userId,
                        categoryId,
                        isQuotable: serviceData.isQuotable || false,
                        imageURLs: []
                    })
                );

                if (error || !service) {
                    failedServices.push({ service: serviceData, reason: error?.message || 'Failed to create service' });
                } else {
                    createdServices.push(service);
                    const category = await CategoryService.getCategoryById(categoryId);
                    if (category) {
                        pineconeEmitter.emit('index', {
                            serviceId: service._id.toString(),
                            name: service.name,
                            description: service.description || '',
                            categoryName: category.name,
                            price: service.price
                        });
                    }
                }
            } catch (err: any) {
                failedServices.push({ service: serviceData, reason: err.message || 'Unknown error' });
            }
        }

        await logInfo({
            message: 'Bulk service upload completed',
            source: 'ServiceService.uploadMultipleServices',
            additionalData: { userId, total: services.length, created: createdServices.length, failed: failedServices.length }
        });

        return { createdServices, failedServices, newCategories };
    }

    static async getServiceById(id: string): Promise<IService | null> {
        if (!Types.ObjectId.isValid(id)) return null;

        const [error, service] = await catchError(
            ServiceModel.findById(id).populate('categoryId', 'name').populate('businessId', 'bunsinessName')
        );

        if (error) {
            await logError({
                message: 'Failed to fetch service',
                source: 'ServiceService.getServiceById',
                additionalData: { serviceId: id, error: error.message }
            });
            return null;
        }

        return service;
    }

    static async getServicesByBusiness(businessId: string, page: number = 1, limit: number = 10) {
        if (!Types.ObjectId.isValid(businessId)) {
            return { services: [], total: 0, page, pages: 0 };
        }

        const skip = (page - 1) * limit;

        const [error, result] = await catchError(
            Promise.all([
                ServiceModel.find({ businessId }).populate('categoryId', 'name').skip(skip).limit(limit).sort({ createdAt: -1 }),
                ServiceModel.countDocuments({ businessId })
            ])
        );

        if (error) {
            await logError({
                message: 'Failed to fetch services by business',
                source: 'ServiceService.getServicesByBusiness',
                additionalData: { businessId, error: error.message }
            });
            return { services: [], total: 0, page, pages: 0 };
        }

        const [services, total] = result;
        return { services, total, page, pages: Math.ceil(total / limit) };
    }

    static async updateService(id: string, updateData: UpdateServiceDTO, imageURLs?: string[], categoryInput?: string): Promise<IService | null> {
        if (!Types.ObjectId.isValid(id)) return null;

        const service = await ServiceModel.findById(id);
        if (!service) return null;

        const finalUpdateData = { ...updateData };

        if (categoryInput) {
            let categoryId: string;
            if (Types.ObjectId.isValid(categoryInput)) {
                categoryId = categoryInput;
            } else {
                let category = await CategoryService.getCategoryByName(categoryInput);
                if (!category) {
                    category = await CategoryService.createCategory({
                        name: categoryInput,
                        type: 'service',
                        isApproved: false
                    });
                }
                if (!category) {
                    await logError({
                        message: 'Failed to create category during service update',
                        source: 'ServiceService.updateService',
                        additionalData: { serviceId: id, categoryInput }
                    });
                    return null;
                }
                categoryId = category._id.toString();
            }
            finalUpdateData.categoryId = categoryId;
        } else if (updateData.categoryId) {
            const category = await CategoryService.getCategoryById(updateData.categoryId);
            if (!category) {
                await logError({
                    message: 'Category not found',
                    source: 'ServiceService.updateService',
                    additionalData: { categoryId: updateData.categoryId }
                });
                return null;
            }
        }

        const updates: any = { ...finalUpdateData };
        if (imageURLs) updates.imageURLs = imageURLs;

        const [error, updatedService] = await catchError(
            ServiceModel.findByIdAndUpdate(id, updates, { new: true }).populate('categoryId', 'name')
        );

        if (error) {
            await logError({
                message: 'Failed to update service',
                source: 'ServiceService.updateService',
                additionalData: { serviceId: id, error: error.message }
            });
            return null;
        }

        if (updatedService) {
            await logInfo({
                message: 'Service updated successfully',
                source: 'ServiceService.updateService',
                additionalData: { serviceId: id }
            });

            const category = updatedService.categoryId as any;
            pineconeEmitter.emit('update', {
                serviceId: updatedService._id.toString(),
                name: updatedService.name,
                description: updatedService.description || '',
                categoryName: category?.name || '',
                price: updatedService.price
            });
        }

        return updatedService;
    }

    static async deleteService(id: string): Promise<{status: boolean; message: string; source: string; additionalData?: any}> {
        if (!Types.ObjectId.isValid(id)){
            return {
                status: false,
                message: 'Invalid service ID',
                source: 'ServiceService.deleteService',
                additionalData: { serviceId: id }
            };
        }

        const service = await ServiceModel.findById(id);
        if (!service) return {
            status: false,
            message: 'Service not found',
            source: 'ServiceService.deleteService',
            additionalData: { serviceId: id }
        };

        const BookingModel = require('../models/booking.model').default;
        const [bookingError, hasBookings] = await catchError(
            BookingModel.exists({ serviceId: new Types.ObjectId(id) })
        );

        if (bookingError) {
            return {
                status: false,
                message: 'Failed to check service bookings',
                source: 'ServiceService.deleteService',
                additionalData: { serviceId: id, error: bookingError.message }
            };
        }

        if (hasBookings) {
            return {
                status: false,
                message: 'Cannot delete service with existing bookings',
                source: 'ServiceService.deleteService',
                additionalData: { serviceId: id }
            };
        }

        const [error] = await catchError(ServiceModel.findByIdAndDelete(id));

        if (error) {
            return {
                status: false,
                message: 'Failed to delete service',
                source: 'ServiceService.deleteService',
                additionalData: { serviceId: id, error: error.message }
            };
        }

        await logInfo({
            message: 'Service deleted successfully',
            source: 'ServiceService.deleteService',
            additionalData: { serviceId: id }
        });

        pineconeEmitter.emit('delete', id);

        return {
            status: true,
            message: 'Service deleted successfully',
            source: 'ServiceService.deleteService',
            additionalData: { serviceId: id }
        };
    }

    static async vectorSearchServices(query: string, limit: number = 10): Promise<IService[]> {

        const serviceIds = await pineconeService.searchServices(query, limit);

        if (!serviceIds.length) return [];

        const [error, services] = await catchError(
            ServiceModel.find({ _id: { $in: serviceIds.map(id => new Types.ObjectId(id)) } }).populate('categoryId', 'name')
        );

        if (error) {
            await logError({
                message: 'Failed to fetch services from vector search',
                source: 'ServiceService.vectorSearchServices',
                additionalData: { query, error: error.message }
            });
            return [];
        }

        return services || [];
    }

    static async aggregateServices(pipeline: any[]): Promise<any[]> {
        const [error, result] = await catchError(
            ServiceModel.aggregate(pipeline)
        );

        if (error) {
            await logError({
                message: 'Failed to execute service aggregation',
                source: 'ServiceService.aggregateServices',
                additionalData: { error: error.message }
            });
            return [];
        }

        return result || [];
    }
}
