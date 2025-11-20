import CategoryModel, { ICategory } from '../models/category.model';
import { fileUploadService } from '../integration/fileUpload';
import catchError from '../utils/catchError';
import { logError, logInfo } from '../utils/SystemLogs';
import { Types } from 'mongoose';

export interface ICategoryInput {
    name: string;
    description?: string;
    imageURL?: string;
    type?: 'service' | 'product';
    isApproved?: boolean;
}

export class CategoryService {
    static async createCategory(categoryData: ICategoryInput): Promise<ICategory | null> {
        const [error, category] = await catchError(
            CategoryModel.create(categoryData)
        );

        if (error) {
            await logError({
                message: 'Failed to create category',
                source: 'CategoryService.createCategory',
                additionalData: { categoryData, error: error.message }
            });
            return null;
        }

        await logInfo({
            message: 'Category created successfully',
            source: 'CategoryService.createCategory',
            additionalData: { categoryId: category._id, name: category.name }
        });

        return category;
    }

    static async getAllCategories(query?: { type?: string; isApproved?: boolean }): Promise<ICategory[]> {
        const filter: any = {};

        if (query?.type) {
            filter.$or = [
                { type: query.type },
                { type: null }
            ];
        }

        if (query?.isApproved !== undefined) {
            filter.isApproved = query.isApproved;
        }

        const [error, categories] = await catchError(
            CategoryModel.find(filter).sort({ createdAt: -1 })
        );

        if (error) {
            await logError({
                message: 'Failed to fetch categories',
                source: 'CategoryService.getAllCategories',
                additionalData: { error: error.message, query }
            });
            return [];
        }

        return categories || [];
    }

    static async getCategoryById(id: string): Promise<ICategory | null> {
        if (!Types.ObjectId.isValid(id)) {
            return null;
        }

        const [error, category] = await catchError(
            CategoryModel.findById(id)
        );

        if (error) {
            await logError({
                message: 'Failed to fetch category by ID',
                source: 'CategoryService.getCategoryById',
                additionalData: { categoryId: id, error: error.message }
            });
            return null;
        }

        return category;
    }

    static async updateCategory(id: string, updateData: Partial<ICategoryInput>): Promise<ICategory | null> {
        if (!Types.ObjectId.isValid(id)) {
            return null;
        }

        const [error, category] = await catchError(
            CategoryModel.findByIdAndUpdate(id, updateData, { new: true })
        );

        if (error) {
            await logError({
                message: 'Failed to update category',
                source: 'CategoryService.updateCategory',
                additionalData: { categoryId: id, updateData, error: error.message }
            });
            return null;
        }

        if (category) {
            await logInfo({
                message: 'Category updated successfully',
                source: 'CategoryService.updateCategory',
                additionalData: { categoryId: id, name: category.name }
            });
        }

        return category;
    }

    static async deleteCategory(id: string): Promise<boolean> {
        if (!Types.ObjectId.isValid(id)) {
            return false;
        }

        const category = await this.getCategoryById(id);

        const [error, deletedCategory] = await catchError(
            CategoryModel.findByIdAndDelete(id)
        );

        if (error) {
            await logError({
                message: 'Failed to delete category',
                source: 'CategoryService.deleteCategory',
                additionalData: { categoryId: id, error: error.message }
            });
            return false;
        }

        if (!deletedCategory) {
            return false;
        }

        if (category?.imageURL) {
            const key = category.imageURL.split('/').pop();
            if (key) {
                await fileUploadService.deleteFile(`categoryImage/${key}`);
            }
        }

        await logInfo({
            message: 'Category deleted successfully',
            source: 'CategoryService.deleteCategory',
            additionalData: { categoryId: id, name: deletedCategory.name }
        });

        return true;
    }

    static async getCategoryByName(name: string): Promise<ICategory | null> {
        const [error, category] = await catchError(
            CategoryModel.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } })
        );

        if (error) {
            await logError({
                message: 'Failed to fetch category by name',
                source: 'CategoryService.getCategoryByName',
                additionalData: { name, error: error.message }
            });
            return null;
        }

        return category;
    }
}
