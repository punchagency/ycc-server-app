import { Response, Request } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ProductService, IProductInput } from '../service/product.service';
import { CreateProductDTO, UpdateProductDTO, ProductSearchDTO, UpdateStockDTO, BulkProductInput } from '../dto/product.dto';
import Validate from '../utils/Validate';
import { IUploadedFile } from '../integration/fileUpload';
import { logError } from '../utils/SystemLogs';
import catchError from '../utils/catchError';
import { Types } from 'mongoose';
import UserModel from '../models/user.model';
import BusinessModel from '../models/business.model';

export class ProductController {
    static async createProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
        const productData: CreateProductDTO = req.body;
        const files = req.files as { [fieldname: string]: IUploadedFile[] } | undefined;
        const userRole = req.user!.role;
        let userId = req.user!._id;
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
            if (!businessOwner || !['distributor', 'manufacturer'].includes(businessOwner.role)) {
                res.status(400).json({
                    success: false,
                    message: 'Business must belong to a distributor or manufacturer',
                    code: 'VALIDATION_ERROR'
                });
                return;
            }

            userId = businessOwner._id;
            businessId = business._id.toString();
        } else if (userRole === 'distributor' || userRole === 'manufacturer') {
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
                message: 'Only distributors, manufacturers and admins can create products',
                code: 'FORBIDDEN'
            });
            return;
        }

        // Validation
        if (!productData.name || !Validate.stringLength(productData.name, 2, 200)) {
            res.status(400).json({
                success: false,
                message: 'Product name is required and must be 2-200 characters',
                code: 'VALIDATION_ERROR'
            });
            return;
        }

        if (!productData.price || productData.price <= 0) {
            res.status(400).json({
                success: false,
                message: 'Valid price is required',
                code: 'VALIDATION_ERROR'
            });
            return;
        }

        if (!productData.category || !Validate.string(productData.category)) {
            res.status(400).json({
                success: false,
                message: 'Category is required',
                code: 'VALIDATION_ERROR'
            });
            return;
        }

        if (productData.quantity < 0 || productData.minRestockLevel < 0) {
            res.status(400).json({
                success: false,
                message: 'Quantity and restock level must be non-negative',
                code: 'VALIDATION_ERROR'
            });
            return;
        }

        if (!productData.wareHouseAddress?.state || !productData.wareHouseAddress?.country) {
            res.status(400).json({
                success: false,
                message: 'Warehouse state and country are required',
                code: 'VALIDATION_ERROR'
            });
            return;
        }

        if (!productData.hsCode || !productData.weight || !productData.length || !productData.width || !productData.height) {
            res.status(400).json({
                success: false,
                message: 'HS code and dimensions (weight, length, width, height) are required',
                code: 'VALIDATION_ERROR'
            });
            return;
        }

        const productInput: IProductInput = {
            ...productData,
            imageURLs: files?.productImage?.map(file => file.location) || []
        };

        const [error, product] = await catchError(
            ProductService.createProduct(userId, businessId, productInput, productData.category)
        );
        if (error) {
            logError({ message: "Creating a product failed!", source: "ProductController.createProduct", error })
            res.status(500).json({
                success: false,
                message: 'Failed to create product',
                code: 'CREATE_FAILED'
            });
            return;
        }

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: product
        });
    }
    static async getProductById(req: AuthenticatedRequest, res: Response): Promise<void> {
        const { id } = req.params;

        if (!Validate.mongoId(id)) {
            res.status(400).json({
                success: false,
                message: 'Invalid product ID',
                code: 'VALIDATION_ERROR'
            });
            return;
        }

        const product = await ProductService.getProductById(id);
        if (!product) {
            res.status(404).json({
                success: false,
                message: 'Product not found',
                code: 'PRODUCT_NOT_FOUND'
            });
            return;
        }

        res.json({
            success: true,
            message: 'Product retrieved successfully',
            data: product
        });
    }
    static async getBusinessProducts(req: AuthenticatedRequest, res: Response): Promise<void> {
        const businessId = req.user!.businessId;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const searchQuery = req.query.search as string;
        const stockLevel = req.query.stockLevel as 'high' | 'medium' | 'low' | undefined;
        const category = req.query.category as string;

        if (!businessId) {
            res.status(400).json({
                success: false,
                message: 'Business ID is required',
                code: 'BUSINESS_REQUIRED'
            });
            return;
        }

        if (stockLevel && !['high', 'medium', 'low'].includes(stockLevel)) {
            res.status(400).json({
                success: false,
                message: 'Stock level must be high, medium, or low',
                code: 'VALIDATION_ERROR'
            });
            return;
        }

        if (category && !Validate.mongoId(category)) {
            res.status(400).json({
                success: false,
                message: 'Invalid category ID',
                code: 'VALIDATION_ERROR'
            });
            return;
        }

        const result = await ProductService.getProductsByBusiness(businessId, page, limit, searchQuery, stockLevel, category);

        res.json({
            success: true,
            message: 'Products retrieved successfully',
            data: result.products,
            pagination: {
                total: result.total,
                page,
                pages: Math.ceil(result.total / limit),
                limit
            }
        });
    }
    static async searchProducts(req: AuthenticatedRequest, res: Response): Promise<void> {
        const query: ProductSearchDTO = req.query;
        const businessId = req.user?.businessId;
        const userRole = req.user?.role;

        const searchQuery = {
            ...query,
            businessId: query.businessId ? query.businessId : businessId,
            userRole,
            page: Number(query.page) || 1,
            limit: Number(query.limit) || 20
        };

        if (searchQuery.minPrice && searchQuery.minPrice < 0) {
            res.status(400).json({
                success: false,
                message: 'Minimum price must be non-negative',
                code: 'VALIDATION_ERROR'
            });
            return;
        }

        if (searchQuery.maxPrice && searchQuery.maxPrice < 0) {
            res.status(400).json({
                success: false,
                message: 'Maximum price must be non-negative',
                code: 'VALIDATION_ERROR'
            });
            return;
        }

        if (searchQuery.minPrice && searchQuery.maxPrice && searchQuery.minPrice > searchQuery.maxPrice) {
            res.status(400).json({
                success: false,
                message: 'Minimum price cannot be greater than maximum price',
                code: 'VALIDATION_ERROR'
            });
            return;
        }

        const result = await ProductService.searchProducts(searchQuery);

        res.json({
            success: true,
            message: 'Products search completed',
            data: result.products,
            pagination: {
                total: result.total,
                page: searchQuery.page,
                pages: Math.ceil(result.total / searchQuery.limit),
                limit: searchQuery.limit
            }
        });
    }
    static async updateProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
        const { id } = req.params;
        const updateData: UpdateProductDTO = req.body;
        const files = req.files as { [fieldname: string]: IUploadedFile[] } | undefined;
        const userRole = req.user!.role;
        const businessId = req.user!.businessId;

        if (!Validate.mongoId(id)) {
            res.status(400).json({
                success: false,
                message: 'Invalid product ID',
                code: 'VALIDATION_ERROR'
            });
            return;
        }

        // Check if product exists
        const existingProduct = await ProductService.getProductById(id);
        if (!existingProduct) {
            res.status(404).json({
                success: false,
                message: 'Product not found',
                code: 'PRODUCT_NOT_FOUND'
            });
            return;
        }

        // Authorization check
        if (userRole === 'admin') {
            const business = await BusinessModel.findById(existingProduct.businessId).populate('userId');
            if (!business) {
                res.status(404).json({
                    success: false,
                    message: 'Business not found',
                    code: 'BUSINESS_NOT_FOUND'
                });
                return;
            }

            const businessOwner = business.userId as any;
            if (!businessOwner || !['distributor', 'manufacturer'].includes(businessOwner.role)) {
                res.status(403).json({
                    success: false,
                    message: 'Can only update products for distributors or manufacturers',
                    code: 'ACCESS_DENIED'
                });
                return;
            }
        } else if (userRole === 'distributor' || userRole === 'manufacturer') {
            if (existingProduct.businessId.toString() !== businessId) {
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
                message: 'Only distributors, manufacturers and admins can update products',
                code: 'FORBIDDEN'
            });
            return;
        }

        // Validation
        if (updateData.name && !Validate.stringLength(updateData.name, 2, 200)) {
            res.status(400).json({
                success: false,
                message: 'Product name must be 2-200 characters',
                code: 'VALIDATION_ERROR'
            });
            return;
        }

        if (updateData.price !== undefined && updateData.price <= 0) {
            res.status(400).json({
                success: false,
                message: 'Price must be greater than 0',
                code: 'VALIDATION_ERROR'
            });
            return;
        }

        if (updateData.category && !Validate.string(updateData.category)) {
            res.status(400).json({
                success: false,
                message: 'Invalid category',
                code: 'VALIDATION_ERROR'
            });
            return;
        }

        if ((updateData.quantity !== undefined && updateData.quantity < 0) ||
            (updateData.minRestockLevel !== undefined && updateData.minRestockLevel < 0)) {
            res.status(400).json({
                success: false,
                message: 'Quantity and restock level must be non-negative',
                code: 'VALIDATION_ERROR'
            });
            return;
        }

        const { wareHouseAddress, ...restUpdateData } = updateData;
        const productInput: Partial<IProductInput> = {
            ...restUpdateData,
            ...(wareHouseAddress && {
                wareHouseAddress: {
                    ...wareHouseAddress,
                    state: wareHouseAddress.state || existingProduct.wareHouseAddress.state,
                    country: wareHouseAddress.country || existingProduct.wareHouseAddress.country
                }
            })
        };

        if (files?.productImage?.length) {
            productInput.imageURLs = files.productImage.map(file => file.location);
        }

        const updatedProduct = await ProductService.updateProduct(id, productInput, updateData.category);
        if (!updatedProduct) {
            res.status(500).json({
                success: false,
                message: 'Failed to update product',
                code: 'UPDATE_FAILED'
            });
            return;
        }

        res.json({
            success: true,
            message: 'Product updated successfully',
            data: updatedProduct
        });
    }
    static async deleteProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
        const { id } = req.params;
        const businessId = req.user!.businessId;
        const userRole = req.user!.role;

        if (!Validate.mongoId(id)) {
            res.status(400).json({
                success: false,
                message: 'Invalid product ID',
                code: 'VALIDATION_ERROR'
            });
            return;
        }

        const existingProduct = await ProductService.getProductById(id);
        if (!existingProduct) {
            res.status(404).json({
                success: false,
                message: 'Product not found',
                code: 'PRODUCT_NOT_FOUND'
            });
            return;
        }

        // Authorization check
        if (userRole === 'admin') {
            const business = await BusinessModel.findById(existingProduct.businessId).populate('userId');
            if (!business) {
                res.status(404).json({
                    success: false,
                    message: 'Business not found',
                    code: 'BUSINESS_NOT_FOUND'
                });
                return;
            }

            const businessOwner = business.userId as any;
            if (!businessOwner || !['distributor', 'manufacturer'].includes(businessOwner.role)) {
                res.status(403).json({
                    success: false,
                    message: 'Can only delete products for distributors or manufacturers',
                    code: 'ACCESS_DENIED'
                });
                return;
            }
        } else if (userRole === 'distributor' || userRole === 'manufacturer') {
            if (existingProduct.businessId.toString() !== businessId) {
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
                message: 'Only distributors, manufacturers and admins can delete products',
                code: 'FORBIDDEN'
            });
            return;
        }

        const deleted = await ProductService.deleteProduct(id);
        if(!deleted.status){
            res.status(400).json({
                success: false,
                message: deleted.message,
                code: 'DELETE_FAILED'
            });
            return;
        }
            
        res.json({
            success: true,
            message: deleted.message
        });
    }
    static async updateStock(req: AuthenticatedRequest, res: Response): Promise<void> {
        const { id } = req.params;
        const { quantity }: UpdateStockDTO = req.body;
        const businessId = req.user!.businessId;

        if (!Validate.mongoId(id)) {
            res.status(400).json({
                success: false,
                message: 'Invalid product ID',
                code: 'VALIDATION_ERROR'
            });
            return;
        }

        if (quantity === undefined || quantity < 0) {
            res.status(400).json({
                success: false,
                message: 'Valid quantity is required',
                code: 'VALIDATION_ERROR'
            });
            return;
        }

        // Check if product exists and belongs to user's business
        const existingProduct = await ProductService.getProductById(id);
        if (!existingProduct) {
            res.status(404).json({
                success: false,
                message: 'Product not found',
                code: 'PRODUCT_NOT_FOUND'
            });
            return;
        }

        if (existingProduct.businessId.toString() !== businessId) {
            res.status(403).json({
                success: false,
                message: 'Access denied',
                code: 'ACCESS_DENIED'
            });
            return;
        }

        const updatedProduct = await ProductService.updateStock(id, quantity);
        if (!updatedProduct) {
            res.status(500).json({
                success: false,
                message: 'Failed to update stock',
                code: 'UPDATE_FAILED'
            });
            return;
        }

        res.json({
            success: true,
            message: 'Stock updated successfully',
            data: updatedProduct
        });
    }
    static async getManufacturerProducts(req: AuthenticatedRequest, res: Response): Promise<void> {
        const userRole = req.user!.role;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const searchQuery = req.query.search as string;
        const category = req.query.category as string;

        if (!['distributor', 'admin'].includes(userRole)) {
            res.status(403).json({
                success: false,
                message: 'Only distributors and admins can view manufacturer products',
                code: 'FORBIDDEN'
            });
            return;
        }

        if (category && !Validate.mongoId(category)) {
            res.status(400).json({
                success: false,
                message: 'Invalid category ID',
                code: 'VALIDATION_ERROR'
            });
            return;
        }

        const result = await ProductService.getManufacturerProducts(page, limit, searchQuery, category);

        res.json({
            success: true,
            message: 'Manufacturer products retrieved successfully',
            data: result.products,
            pagination: {
                total: result.total,
                page,
                pages: Math.ceil(result.total / limit),
                limit
            }
        });
    }
    static async getLowStockProducts(req: AuthenticatedRequest, res: Response): Promise<void> {
        const businessId = req.user!.businessId;

        if (!businessId) {
            res.status(400).json({
                success: false,
                message: 'Business ID is required',
                code: 'BUSINESS_REQUIRED'
            });
            return;
        }

        const products = await ProductService.getLowStockProducts(businessId);

        res.json({
            success: true,
            message: 'Low stock products retrieved successfully',
            data: products
        });
    }
    static async createMultipleProducts(req: Request, res: Response): Promise<void> {
        const { products, userId }: { products: BulkProductInput, userId: string } = req.body;


        if (!userId || !Types.ObjectId.isValid(userId)) {
            res.status(400).json({ success: false, message: 'Valid user ID is required', code: 'VALIDATION_ERROR' });
            return;
        }
        const user = await UserModel.findById(userId);
        if (!user || !['distributor', 'manufacturer'].includes(user.role)) {
            res.status(403).json({ success: false, message: 'User must be a distributor or manufacturer', code: 'FORBIDDEN' });
            return;
        }

        const business = await BusinessModel.findOne({ userId });
        if (!business) {
            res.status(400).json({ success: false, message: 'Business not found for user', code: 'BUSINESS_NOT_FOUND' });
            return;
        }

        if (!products || !Array.isArray(products) || products.length === 0) {
            res.status(400).json({
                success: false,
                message: 'Products array is required and must not be empty',
                code: 'VALIDATION_ERROR'
            });
            return;
        }

        for (const product of products) {
            if (!product.name || !Validate.stringLength(product.name, 2, 200)) {
                res.status(400).json({ success: false, message: 'Each product name must be 2-200 characters', code: 'VALIDATION_ERROR' });
                return;
            }
            if (!product.price || product.price <= 0) {
                res.status(400).json({ success: false, message: 'Each product must have a valid price', code: 'VALIDATION_ERROR' });
                return;
            }
            if (!product.categoryName || !Validate.string(product.categoryName)) {
                res.status(400).json({ success: false, message: 'Each product must have a category name', code: 'VALIDATION_ERROR' });
                return;
            }
            if (product.quantity < 0 || product.minRestockLevel < 0) {
                res.status(400).json({ success: false, message: 'Quantity and restock level must be non-negative', code: 'VALIDATION_ERROR' });
                return;
            }
            if (!product.wareHouseAddress?.state || !product.wareHouseAddress?.country) {
                res.status(400).json({ success: false, message: 'Warehouse state and country are required', code: 'VALIDATION_ERROR' });
                return;
            }
            if (!product.hsCode || !product.weight || !product.length || !product.width || !product.height) {
                res.status(400).json({ success: false, message: 'HS code and dimensions are required', code: 'VALIDATION_ERROR' });
                return;
            }
        }

        const [error, result] = await catchError(
            ProductService.createMultipleProducts(userId, business._id.toString(), products)
        );

        if (error) {
            logError({ message: 'Bulk product creation failed', source: 'ProductController.createMultipleProducts', error });
            res.status(500).json({
                success: false,
                message: 'Failed to create products',
                code: 'CREATE_FAILED'
            });
            return;
        }

        res.status(201).json({
            success: true,
            message: 'Bulk upload completed',
            data: {
                created: result.successful,
                failed: result.failed,
                newCategories: result.newCategories
            },
            summary: {
                total: products.length,
                successful: result.successful.length,
                failed: result.failed.length,
                newCategoriesCreated: result.newCategories.length
            }
        });
    }
}