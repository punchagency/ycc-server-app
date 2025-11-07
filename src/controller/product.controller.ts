import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ProductService, IProductInput } from '../service/product.service';
import { CreateProductDTO, UpdateProductDTO, ProductSearchDTO, UpdateStockDTO } from '../dto/product.dto';
import Validate from '../utils/Validate';
import { IUploadedFile } from '../utils/fileUpload';

export class ProductController {
    static async createProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
        const productData: CreateProductDTO = req.body;
        const files = req.files as { [fieldname: string]: IUploadedFile[] } | undefined;
        const userId = req.user!._id;
        const businessId = req.user!.businessId;

        if (!businessId) {
            res.status(400).json({
                success: false,
                message: 'Business ID is required',
                code: 'BUSINESS_REQUIRED'
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

        if (!productData.category || !Validate.mongoId(productData.category)) {
            res.status(400).json({
                success: false,
                message: 'Valid category ID is required',
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

        const product = await ProductService.createProduct(userId, businessId, productInput);
        if (!product) {
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

        if (!businessId) {
            res.status(400).json({
                success: false,
                message: 'Business ID is required',
                code: 'BUSINESS_REQUIRED'
            });
            return;
        }

        const result = await ProductService.getProductsByBusiness(businessId, page, limit);

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

        // Add business filter for business users
        const searchQuery = {
            ...query,
            businessId: businessId || query.businessId,
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
        const businessId = req.user!.businessId;

        if (!Validate.mongoId(id)) {
            res.status(400).json({
                success: false,
                message: 'Invalid product ID',
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

        if (updateData.category && !Validate.mongoId(updateData.category)) {
            res.status(400).json({
                success: false,
                message: 'Invalid category ID',
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

        const updatedProduct = await ProductService.updateProduct(id, productInput);
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

        if (!Validate.mongoId(id)) {
            res.status(400).json({
                success: false,
                message: 'Invalid product ID',
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

        const deleted = await ProductService.deleteProduct(id);
        if (!deleted) {
            res.status(500).json({
                success: false,
                message: 'Failed to delete product',
                code: 'DELETE_FAILED'
            });
            return;
        }

        res.json({
            success: true,
            message: 'Product deleted successfully'
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
}