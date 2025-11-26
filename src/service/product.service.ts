import ProductModel, { IProduct } from '../models/product.model';
import InventoryModel from '../models/inventory.model';
import { fileUploadService } from '../integration/fileUpload';
import { pineconeEmitter } from '../integration/pinecone';
import catchError from '../utils/catchError';
import { logError, logInfo } from '../utils/SystemLogs';
import { Types } from 'mongoose';
import { pineconeService } from '../integration/pinecone';
import StripeService from '../integration/stripe';

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
    businessName?: string;
    page?: number;
    limit?: number;
    random?: boolean;
}

export class ProductService {

    static async createProduct(userId: string, businessId: string, productData: IProductInput): Promise<IProduct | null> {
        const stripeService = StripeService.getInstance();

        const [stripeError, stripeProduct] = await catchError(
            stripeService.createProduct({
                name: productData.name,
                description: productData.description,
                images: productData.imageURLs
            })
        );

        if (stripeError) {
            await logError({
                message: 'Failed to create Stripe product',
                source: 'ProductService.createProduct',
                additionalData: { productData, error: stripeError.message }
            });
            throw new Error('Failed to create Stripe product');
        }

        const [priceError, stripePrice] = await catchError(
            stripeService.createPrice({
                productId: stripeProduct.id,
                unitAmount: Math.round(productData.price * 100)
            })
        );

        if (priceError) {
            await logError({
                message: 'Failed to create Stripe price',
                source: 'ProductService.createProduct',
                additionalData: { stripeProductId: stripeProduct.id, error: priceError.message }
            });
            throw new Error('Failed to create Stripe price');
        }

        const [error, product] = await catchError(
            ProductModel.create({
                ...productData,
                userId: new Types.ObjectId(userId),
                businessId: new Types.ObjectId(businessId),
                stripeProductId: stripeProduct.id,
                stripePriceId: stripePrice.id
            })
        );

        if (error) {
            await logError({
                message: 'Failed to create product',
                source: 'ProductService.createProduct',
                additionalData: { userId, businessId, productData, error: error.message }
            });
            throw new Error('Failed to create product');
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

    static async getProductsByBusiness(businessId: string, page: number = 1, limit: number = 20, searchQuery?: string, stockLevel?: 'high' | 'medium' | 'low', category?: string): Promise<{ products: IProduct[]; total: number }> {
        if (!Types.ObjectId.isValid(businessId)) {
            return { products: [], total: 0 };
        }

        const skip = (page - 1) * limit;
        const mongoQuery: any = { businessId };

        if (searchQuery) {
            mongoQuery.name = { $regex: searchQuery, $options: 'i' };
        }

        if (category && Types.ObjectId.isValid(category)) {
            mongoQuery.category = new Types.ObjectId(category);
        }

        if (stockLevel) {
            if (stockLevel === 'low') {
                mongoQuery.$expr = { $lte: ['$quantity', '$minRestockLevel'] };
            } else if (stockLevel === 'medium') {
                mongoQuery.$expr = { $and: [
                    { $gt: ['$quantity', '$minRestockLevel'] },
                    { $lte: ['$quantity', { $multiply: ['$minRestockLevel', 2] }] }
                ]};
            } else if (stockLevel === 'high') {
                mongoQuery.$expr = { $gt: ['$quantity', { $multiply: ['$minRestockLevel', 2] }] };
            }
        }

        const [error, result] = await catchError(
            Promise.all([
                ProductModel.find(mongoQuery).populate('category', 'name').skip(skip).limit(limit).sort({ createdAt: -1 }),
                ProductModel.countDocuments(mongoQuery)
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
        const { name, category, minPrice, maxPrice, businessId, page = 1, limit = 20, random = false } = query;
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

        let productQuery = ProductModel.find(mongoQuery)
            .populate('category', 'name')
            .populate('businessId', 'businessName email phone address businessType');

        if (random) {
            const [countError, totalCount] = await catchError(ProductModel.countDocuments(mongoQuery));
            if (countError || !totalCount) {
                return { products: [], total: 0 };
            }
            const randomSkip = Math.floor(Math.random() * Math.max(0, totalCount - limit));
            productQuery = productQuery.skip(randomSkip).limit(limit);
        } else {
            productQuery = productQuery.skip(skip).limit(limit).sort({ createdAt: -1 });
        }

        const [error, result] = await catchError(
            Promise.all([
                productQuery.exec(),
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

        let [products, total] = result;

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

    static async createMultipleProducts(userId: string, businessId: string, productsData: Array<{ name: string; price: number; categoryName: string; sku?: string; quantity: number; minRestockLevel: number; description?: string; wareHouseAddress: { street?: string; zipcode?: string; city?: string; state: string; country: string }; hsCode: string; weight: number; length: number; width: number; height: number }>): Promise<{ successful: IProduct[]; failed: Array<{ product: any; error: string }>; newCategories: string[] }> {
        const stripeService = StripeService.getInstance();
        const CategoryService = require('./category.service').CategoryService;
        const categoryCache = new Map<string, string>();
        const newCategories: string[] = [];
        const successful: IProduct[] = [];
        const failed: Array<{ product: any; error: string }> = [];

        for (const productData of productsData) {
            try {
                let categoryId = categoryCache.get(productData.categoryName.toLowerCase()) as string;

                if (!categoryId) {
                    let category = await CategoryService.getCategoryByName(productData.categoryName);

                    if (!category) {
                        category = await CategoryService.createCategory({
                            name: productData.categoryName,
                            type: 'product',
                            isApproved: false
                        });

                        if (category) {
                            newCategories.push(category.name);
                        }
                    }

                    if (!category) {
                        failed.push({ product: productData, error: 'Failed to create category' });
                        continue;
                    }

                    categoryId = category._id.toString();
                    categoryCache.set(productData.categoryName.toLowerCase(), categoryId);
                }

                const [stripeError, stripeProduct] = await catchError(
                    stripeService.createProduct({
                        name: productData.name,
                        description: productData.description || undefined,
                        images: []
                    })
                );

                if (stripeError) {
                    failed.push({ product: productData, error: `Stripe product creation failed: ${stripeError.message}` });
                    continue;
                }

                const [priceError, stripePrice] = await catchError(
                    stripeService.createPrice({
                        productId: stripeProduct.id,
                        unitAmount: Math.round(productData.price * 100)
                    })
                );

                if (priceError) {
                    failed.push({ product: productData, error: `Stripe price creation failed: ${priceError.message}` });
                    continue;
                }

                const [error, product] = await catchError(
                    ProductModel.create({
                        name: productData.name,
                        price: productData.price,
                        category: new Types.ObjectId(categoryId),
                        sku: productData.sku,
                        quantity: productData.quantity,
                        minRestockLevel: productData.minRestockLevel,
                        description: productData.description,
                        imageURLs: [],
                        wareHouseAddress: productData.wareHouseAddress,
                        hsCode: productData.hsCode,
                        weight: productData.weight,
                        length: productData.length,
                        width: productData.width,
                        height: productData.height,
                        userId: new Types.ObjectId(userId),
                        businessId: new Types.ObjectId(businessId),
                        stripeProductId: stripeProduct.id,
                        stripePriceId: stripePrice.id
                    })
                );

                if (error || !product) {
                    failed.push({ product: productData, error: error?.message || 'Product creation failed' });
                    continue;
                }

                await this.addToInventory(businessId, product._id.toString());

                const category = await CategoryService.getCategoryById(categoryId);
                if (category) {
                    pineconeEmitter.emit('indexProduct', {
                        productId: product._id.toString(),
                        name: product.name,
                        description: product.description || '',
                        categoryName: category.name,
                        price: product.price
                    });
                }

                successful.push(product);
            } catch (err: any) {
                failed.push({ product: productData, error: err.message || 'Unknown error' });
            }
        }

        await logInfo({
            message: 'Bulk product creation completed',
            source: 'ProductService.createMultipleProducts',
            additionalData: { total: productsData.length, successful: successful.length, failed: failed.length, newCategories: newCategories.length }
        });

        return { successful, failed, newCategories };
    }
}