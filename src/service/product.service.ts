import ProductModel, { IProduct } from '../models/product.model';
import InventoryModel from '../models/inventory.model';
import { fileUploadService } from '../integration/fileUpload';
import { pineconeEmitter } from '../integration/pinecone';
import catchError from '../utils/catchError';
import { logError, logInfo } from '../utils/SystemLogs';
import { Types } from 'mongoose';
import { pineconeService } from '../integration/pinecone';

export interface IProductInput {
    name: string;
    price: number;
    category: string;
    sku?: string;
    quantity: number;
    minRestockLevel: number;
    description?: string;
    imageURLs?: string[];
    wareHouseAddress: {
        street?: string;
        zipcode?: string;
        city?: string;
        state: string;
        country: string;
    };
    hsCode: string;
    weight: number;
    length: number;
    width: number;
    height: number;
}

export interface IProductSearchQuery {
    name?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    businessId?: string;
    page?: number;
    limit?: number;
}

export class ProductService {

    static async createProduct(userId: string, businessId: string, productData: IProductInput): Promise<IProduct | null> {
        const [error, product] = await catchError(
            ProductModel.create({
                ...productData,
                userId: new Types.ObjectId(userId),
                businessId: new Types.ObjectId(businessId)
            })
        );

        if (error) {
            await logError({
                message: 'Failed to create product',
                source: 'ProductService.createProduct',
                additionalData: { userId: userId as string, businessId, productData, error: error.message }
            });
            return null;
        }

        await this.addToInventory(businessId, product._id.toString());

        const category = product.category as any;
        pineconeEmitter.emit('indexProduct', {
            productId: product._id.toString(),
            name: product.name,
            description: product.description || '',
            categoryName: category?.name || '',
            price: product.price
        });

        await logInfo({
            message: 'Product created successfully',
            source: 'ProductService.createProduct',
            additionalData: { productId: product._id, name: product.name }
        });

        return product;
    }

    static async getProductById(id: string): Promise<IProduct | null> {
        if (!Types.ObjectId.isValid(id)) {
            return null;
        }

        const [error, product] = await catchError(
            ProductModel.findById(id).populate('category', 'name')
        );

        if (error) {
            await logError({
                message: 'Failed to fetch product by ID',
                source: 'ProductService.getProductById',
                additionalData: { productId: id, error: error.message }
            });
            return null;
        }

        return product;
    }

    static async getProductsByBusiness(businessId: string, page: number = 1, limit: number = 20): Promise<{ products: IProduct[]; total: number }> {
        if (!Types.ObjectId.isValid(businessId)) {
            return { products: [], total: 0 };
        }

        const skip = (page - 1) * limit;

        const [error, result] = await catchError(
            Promise.all([
                ProductModel.find({ businessId }).populate('category', 'name').skip(skip).limit(limit).sort({ createdAt: -1 }),
                ProductModel.countDocuments({ businessId })
            ])
        );

        if (error) {
            await logError({
                message: 'Failed to fetch products by business',
                source: 'ProductService.getProductsByBusiness',
                additionalData: { businessId, error: error.message }
            });
            return { products: [], total: 0 };
        }

        const [products, total] = result;
        return { products: products || [], total: total || 0 };
    }

    static async searchProducts(query: IProductSearchQuery): Promise<{ products: IProduct[]; total: number }> {
        const { name, category, minPrice, maxPrice, businessId, page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;

        const mongoQuery: any = {};

        if (businessId && Types.ObjectId.isValid(businessId)) {
            mongoQuery.businessId = new Types.ObjectId(businessId);
        }

        if (name) {
            mongoQuery.name = { $regex: name, $options: 'i' };
        }

        if (category && Types.ObjectId.isValid(category)) {
            mongoQuery.category = new Types.ObjectId(category);
        }

        if (minPrice !== undefined || maxPrice !== undefined) {
            mongoQuery.price = {};
            if (minPrice !== undefined) mongoQuery.price.$gte = minPrice;
            if (maxPrice !== undefined) mongoQuery.price.$lte = maxPrice;
        }

        const [error, result] = await catchError(
            Promise.all([
                ProductModel.find(mongoQuery).populate('category', 'name').skip(skip).limit(limit).sort({ createdAt: -1 }),
                ProductModel.countDocuments(mongoQuery)
            ])
        );

        if (error) {
            await logError({
                message: 'Failed to search products',
                source: 'ProductService.searchProducts',
                additionalData: { query, error: error.message }
            });
            return { products: [], total: 0 };
        }

        const [products, total] = result;
        return { products: products || [], total: total || 0 };
    }

    static async vectorSearchProducts(query: string, limit: number = 20): Promise<IProduct[]> {
        
        const productIds = await pineconeService.searchProducts(query, limit);

        if (!productIds.length) return [];

        const [error, products] = await catchError(
            ProductModel.find({ _id: { $in: productIds.map(id => new Types.ObjectId(id)) } }).populate('category', 'name')
        );

        if (error) {
            await logError({
                message: 'Failed to fetch products from vector search',
                source: 'ProductService.vectorSearchProducts',
                additionalData: { query, error: error.message }
            });
            return [];
        }

        return products || [];
    }

    static async updateProduct(id: string, updateData: Partial<IProductInput>): Promise<IProduct | null> {
        if (!Types.ObjectId.isValid(id)) {
            return null;
        }

        const [error, product] = await catchError(
            ProductModel.findByIdAndUpdate(id, updateData, { new: true }).populate('category', 'name')
        );

        if (error) {
            await logError({
                message: 'Failed to update product',
                source: 'ProductService.updateProduct',
                additionalData: { productId: id, updateData, error: error.message }
            });
            return null;
        }

        if (product) {
            await logInfo({
                message: 'Product updated successfully',
                source: 'ProductService.updateProduct',
                additionalData: { productId: id, name: product.name }
            });

            const category = product.category as any;
            pineconeEmitter.emit('updateProduct', {
                productId: product._id.toString(),
                name: product.name,
                description: product.description || '',
                categoryName: category?.name || '',
                price: product.price
            });
        }

        return product;
    }

    static async deleteProduct(id: string): Promise<boolean> {
        if (!Types.ObjectId.isValid(id)) {
            return false;
        }

        const product = await this.getProductById(id);
        if (!product) {
            return false;
        }

        const [error] = await catchError(
            ProductModel.findByIdAndDelete(id)
        );

        if (error) {
            await logError({
                message: 'Failed to delete product',
                source: 'ProductService.deleteProduct',
                additionalData: { productId: id, error: error.message }
            });
            return false;
        }

        await this.removeFromInventory(product.businessId.toString(), id);

        if (product.imageURLs?.length) {
            for (const imageUrl of product.imageURLs) {
                const key = imageUrl.split('/').pop();
                if (key) {
                    await fileUploadService.deleteFile(`productImage/${key}`);
                }
            }
        }

        pineconeEmitter.emit('deleteProduct', id);

        await logInfo({
            message: 'Product deleted successfully',
            source: 'ProductService.deleteProduct',
            additionalData: { productId: id, name: product.name }
        });

        return true;
    }

    static async updateStock(id: string, quantity: number): Promise<IProduct | null> {
        if (!Types.ObjectId.isValid(id)) {
            return null;
        }

        const [error, product] = await catchError(
            ProductModel.findByIdAndUpdate(id, { quantity }, { new: true })
        );

        if (error) {
            await logError({
                message: 'Failed to update product stock',
                source: 'ProductService.updateStock',
                additionalData: { productId: id, quantity, error: error.message }
            });
            return null;
        }

        return product;
    }

    static async getLowStockProducts(businessId: string): Promise<IProduct[]> {
        if (!Types.ObjectId.isValid(businessId)) {
            return [];
        }

        const [error, products] = await catchError(
            ProductModel.find({
                businessId,
                $expr: { $lte: ['$quantity', '$minRestockLevel'] }
            }).populate('category', 'name')
        );

        if (error) {
            await logError({
                message: 'Failed to fetch low stock products',
                source: 'ProductService.getLowStockProducts',
                additionalData: { businessId, error: error.message }
            });
            return [];
        }

        return products || [];
    }

    private static async addToInventory(businessId: string, productId: string): Promise<void> {
        const [error] = await catchError(
            InventoryModel.findOneAndUpdate(
                { businessId },
                { $addToSet: { products: { productId } } },
                { upsert: true }
            )
        );

        if (error) {
            await logError({
                message: 'Failed to add product to inventory',
                source: 'ProductService.addToInventory',
                additionalData: { businessId, productId, error: error.message }
            });
        }
    }

    private static async removeFromInventory(businessId: string, productId: string): Promise<void> {
        const [error] = await catchError(
            InventoryModel.findOneAndUpdate(
                { businessId },
                { $pull: { products: { productId } } }
            )
        );

        if (error) {
            await logError({
                message: 'Failed to remove product from inventory',
                source: 'ProductService.removeFromInventory',
                additionalData: { businessId, productId, error: error.message }
            });
        }
    }
}