import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { CategoryService, ICategoryInput } from '../service/category.service';
import Validate from '../utils/Validate';
import { IUploadedFile } from '../integration/fileUpload';

export class CategoryController {
    static async createCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
        const { name, description, type, isApproved } = req.body;
        const files = req.files as { [fieldname: string]: IUploadedFile[] } | undefined;

        if (!name || !Validate.stringLength(name, 2, 100)) {
            res.status(400).json({
                success: false,
                message: 'Category name is required and must be 2-100 characters',
                code: 'VALIDATION_ERROR'
            });
            return;
        }
        if(type && !['service', 'product'].includes(type)){
            res.status(400).json({
                success: false,
                message: 'Invalid category type',
                code: 'VALIDATION_ERROR'
            });
            return;
        }

        const existingCategory = await CategoryService.getCategoryByName(name);
        if (existingCategory) {
            res.status(409).json({
                success: false,
                message: 'Category with this name already exists',
                code: 'CATEGORY_EXISTS'
            });
            return;
        }

        const categoryData: ICategoryInput = {
            name: name.trim(),
            description: description?.trim(),
            type: type ? type : null,
            isApproved: isApproved == 'true' ? true : false
        };

        if (files?.categoryImage?.[0]) {
            categoryData.imageURL = files.categoryImage[0].location;
        }

        const category = await CategoryService.createCategory(categoryData);
        if (!category) {
            res.status(500).json({
                success: false,
                message: 'Failed to create category',
                code: 'CREATE_FAILED'
            });
            return;
        }

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: category
        });
    }

    static async getAllCategories(_req: AuthenticatedRequest, res: Response): Promise<void> {
        const categories = await CategoryService.getAllCategories();

        res.json({
            success: true,
            message: 'Categories retrieved successfully',
            data: categories
        });
    }

    static async getCategoryById(req: AuthenticatedRequest, res: Response): Promise<void> {
        const { id } = req.params;

        if (!Validate.mongoId(id)) {
            res.status(400).json({
                success: false,
                message: 'Invalid category ID',
                code: 'VALIDATION_ERROR'
            });
            return;
        }

        const category = await CategoryService.getCategoryById(id);
        if (!category) {
            res.status(404).json({
                success: false,
                message: 'Category not found',
                code: 'CATEGORY_NOT_FOUND'
            });
            return;
        }

        res.json({
            success: true,
            message: 'Category retrieved successfully',
            data: category
        });
    }

    static async updateCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
        const { id } = req.params;
        const { name, description, type, isApproved } = req.body;
        const files = req.files as { [fieldname: string]: IUploadedFile[] } | undefined;

        if (!Validate.mongoId(id)) {
            res.status(400).json({
                success: false,
                message: 'Invalid category ID',
                code: 'VALIDATION_ERROR'
            });
            return;
        }

        const existingCategory = await CategoryService.getCategoryById(id);
        if (!existingCategory) {
            res.status(404).json({
                success: false,
                message: 'Category not found',
                code: 'CATEGORY_NOT_FOUND'
            });
            return;
        }

        const updateData: Partial<ICategoryInput> = {};

        if (name) {
            if (!Validate.stringLength(name, 2, 100)) {
                res.status(400).json({
                    success: false,
                    message: 'Category name must be 2-100 characters',
                    code: 'VALIDATION_ERROR'
                });
                return;
            }

            if (name !== existingCategory.name) {
                const nameExists = await CategoryService.getCategoryByName(name);
                if (nameExists) {
                    res.status(409).json({
                        success: false,
                        message: 'Category with this name already exists',
                        code: 'CATEGORY_EXISTS'
                    });
                    return;
                }
            }

            updateData.name = name.trim();
        }

        if (description !== undefined) {
            updateData.description = description?.trim();
        }
        if(type){
            if(type && !['service', 'product'].includes(type)){
                res.status(400).json({
                    success: false,
                    message: 'Invalid category type',
                    code: 'VALIDATION_ERROR'
                });
                return;
            }
            updateData.type = type;
        }

        if (files?.categoryImage?.[0]) {
            updateData.imageURL = files.categoryImage[0].location;
        }
        if(isApproved !== undefined){
            updateData.isApproved = isApproved == 'true' ? true : false;
        }
        console.log({updateData}, {req: req.body});

        const updatedCategory = await CategoryService.updateCategory(id, updateData);
        if (!updatedCategory) {
            res.status(500).json({
                success: false,
                message: 'Failed to update category',
                code: 'UPDATE_FAILED'
            });
            return;
        }

        res.json({
            success: true,
            message: 'Category updated successfully',
            data: updatedCategory
        });
    }

    static async deleteCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
        const { id } = req.params;

        if (!Validate.mongoId(id)) {
            res.status(400).json({
                success: false,
                message: 'Invalid category ID',
                code: 'VALIDATION_ERROR'
            });
            return;
        }

        const category = await CategoryService.getCategoryById(id);
        if (!category) {
            res.status(404).json({
                success: false,
                message: 'Category not found',
                code: 'CATEGORY_NOT_FOUND'
            });
            return;
        }

        const deleted = await CategoryService.deleteCategory(id);
        if (!deleted) {
            res.status(500).json({
                success: false,
                message: 'Failed to delete category',
                code: 'DELETE_FAILED'
            });
            return;
        }

        res.json({
            success: true,
            message: 'Category deleted successfully'
        });
    }
}