import ServiceModel, { IService } from '../models/service.model';
import { CategoryService } from './category.service';
import { CreateServiceDTO, UpdateServiceDTO } from '../dto/service.dto';
import { pineconeEmitter } from '../integration/pinecone';
import { logError, logInfo } from '../utils/SystemLogs';
import catchError from '../utils/catchError';
import { Types } from 'mongoose';
import { pineconeService } from '../integration/pinecone';

export class ServiceService {
    static async createService(serviceData: CreateServiceDTO, imageURLs?: string[]): Promise<IService | null> {
        const category = await CategoryService.getCategoryById(serviceData.categoryId);
        if (!category) {
            await logError({
                message: 'Category not found',
                source: 'ServiceService.createService',
                additionalData: { categoryId: serviceData.categoryId }
            });
            return null;
        }

        const [error, service] = await catchError(
            ServiceModel.create({ ...serviceData, imageURLs: imageURLs || [] })
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

    static async updateService(id: string, businessId: string, updateData: UpdateServiceDTO, imageURLs?: string[]): Promise<IService | null> {
        if (!Types.ObjectId.isValid(id)) return null;

        const service = await ServiceModel.findOne({ _id: id, businessId });
        if (!service) return null;

        if (updateData.categoryId) {
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

        const updates: any = { ...updateData };
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

    static async deleteService(id: string, businessId: string): Promise<boolean> {
        if (!Types.ObjectId.isValid(id)) return false;

        const service = await ServiceModel.findOne({ _id: id, businessId });
        if (!service) return false;

        const [error] = await catchError(ServiceModel.findByIdAndDelete(id));

        if (error) {
            await logError({
                message: 'Failed to delete service',
                source: 'ServiceService.deleteService',
                additionalData: { serviceId: id, error: error.message }
            });
            return false;
        }

        await logInfo({
            message: 'Service deleted successfully',
            source: 'ServiceService.deleteService',
            additionalData: { serviceId: id }
        });

        pineconeEmitter.emit('delete', id);

        return true;
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
}
