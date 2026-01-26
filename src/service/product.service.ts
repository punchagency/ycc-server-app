import ProductModel, { IProduct } from '../models/product.model';
import InventoryModel from '../models/inventory.model';
import { fileUploadService } from '../integration/fileUpload';
import { pineconeEmitter } from '../integration/pinecone';
import catchError from '../utils/catchError';
import { logError, logInfo } from '../utils/SystemLogs';
import { Types } from 'mongoose';
import { pineconeService } from '../integration/pinecone';
import StripeService from '../integration/stripe';
import { CategoryService } from "../service/category.service"
import OrderModel from '../models/order.model';
import BusinessModel from '../models/business.model';
import CONSTANTS from '../config/constant';
import { CurrencyHelper } from '../utils/currencyHelper';

export interface IProductInput {
    name: string;
    price?: number;
    isPriceOnRequest?: boolean;
    currency?: string;
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
    currency?: string;
    businessId?: string;
    businessName?: string;
    userRole?: string;
    page?: number;
    limit?: number;
    random?: boolean;
}

export class ProductService {
    static async createProduct(userId: string, businessId: string, productData: IProductInput, categoryInput: string): Promise<IProduct | null> {
        const stripeService = StripeService.getInstance();
        const currency = (productData.currency || 'usd').toLowerCase();

        if (!CONSTANTS.CURRENCIES_CODES.includes(currency.toUpperCase())) {
            throw new Error('Currency is not supported');
        }

        const business = await BusinessModel.findById(businessId).populate('userId');
        if (!business) throw new Error('Business not found');

        const businessOwner = business.userId as any;
        const businessType = businessOwner.role === 'manufacturer' ? 'manufacturer' : 'distributor';

        let categoryId: string;
        if (Types.ObjectId.isValid(categoryInput)) {
            categoryId = categoryInput;
        } else {
            let category = await CategoryService.getCategoryByName(categoryInput);
            if (!category) {
                category = await CategoryService.createCategory({
                    name: categoryInput,
                    type: 'product',
                    isApproved: false
                });
            }
            if (!category) throw new Error('Failed to create category');
            categoryId = category._id.toString();
        }

        const [stripeError, stripeProduct] = await catchError(
            stripeService.createProduct({
                name: productData.name,
                description: productData.description,
                images: productData.imageURLs
            })
        );

        if (stripeError) {
            logError({
                message: 'Failed to create Stripe product',
                source: 'ProductService.createProduct',
                additionalData: { productData, error: stripeError.message }
            });
            throw new Error('Failed to create Stripe product');
        }

        let stripePriceId: string | undefined;
        if (!productData.isPriceOnRequest && productData.price && productData.price > 0) {
            const [priceError, stripePrice] = await catchError(
                stripeService.createPrice({
                    productId: stripeProduct.id,
                    unitAmount: Math.round((productData?.price || 0) * 100),
                    currency
                })
            );

            if (priceError) {
                await logError({
                    message: 'Failed to create Stripe price',
                    source: 'ProductService.createProduct',
                    additionalData: { stripeProductId: stripeProduct.id, error: priceError.message }
                });
            } else {
                stripePriceId = stripePrice?.id;
            }
        }

        const [error, product] = await catchError(
            ProductModel.create({
                ...productData,
                price: productData.isPriceOnRequest ? null : (productData.price && typeof productData.price === "number" && productData.price > 0 ? productData.price : null),
                isPriceOnRequest: !!productData.isPriceOnRequest,
                currency,
                category: new Types.ObjectId(categoryId),
                userId: new Types.ObjectId(userId),
                businessId: new Types.ObjectId(businessId),
                businessType,
                stripeProductId: stripeProduct.id,
                stripePriceId: stripePriceId
            })
        );

        if (error) {
            await logError({
                message: 'Failed to create product',
                source: 'ProductService.createProduct',
                error,
                additionalData: { userId, businessId, productData, error: error.message }
            });
            throw new Error('Failed to create product');
        }

        await this.addToInventory(businessId, product._id.toString(), businessType);

        const category = product.category as any;
        pineconeEmitter.emit('indexProduct', {
            productId: product._id.toString(),
            name: product.name,
            description: product.description || '',
            categoryName: category?.name || '',
            price: product.price,
            isPriceOnRequest: product.isPriceOnRequest
        });

        await logInfo({
            message: 'Product created successfully',
            source: 'ProductService.createProduct',
            additionalData: { productId: product._id, name: product.name, businessType }
        });

        return product;
    }

    static async getProductById(id: string, userCurrency?: string): Promise<IProduct | any | null> {
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

        if (!product) return null;

        if (userCurrency && userCurrency.toLowerCase() !== (product.currency || 'usd').toLowerCase()) {
            const displayPrice = await CurrencyHelper.convertPriceToUserCurrency(
                product.price || 0,
                product.currency || 'usd',
                userCurrency
            );
            return {
                ...product.toObject(),
                displayPrice,
                displayCurrency: userCurrency.toUpperCase(),
                originalPrice: product.price,
                originalCurrency: product.currency
            };
        }

        return product;
    }

    static async getProductsByBusiness(businessId: string, page: number = 1, limit: number = 20, searchQuery?: string, stockLevel?: 'high' | 'medium' | 'low', category?: string, userCurrency?: string): Promise<{ products: any[]; total: number }> {
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
                mongoQuery.$expr = {
                    $and: [
                        { $gt: ['$quantity', '$minRestockLevel'] },
                        { $lte: ['$quantity', { $multiply: ['$minRestockLevel', 2] }] }
                    ]
                };
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
        
        if (userCurrency && products.length > 0) {
            const convertedProducts = await CurrencyHelper.convertProductsForDisplay(products, userCurrency);
            return { products: convertedProducts, total: total || 0 };
        }
        
        return { products: products || [], total: total || 0 };
    }

    static async searchProducts(query: IProductSearchQuery, userCurrency?: string): Promise<{ products: any[]; total: number }> {
        const { name, category, minPrice, maxPrice, currency = 'usd', businessId, userRole, page = 1, limit = 20, random = false } = query;
        const skip = (page - 1) * limit;

        const mongoQuery: any = {};

        if (userRole === 'user') {
            mongoQuery.businessType = 'distributor';
        }

        if (businessId && Types.ObjectId.isValid(businessId)) {
            mongoQuery.businessId = new Types.ObjectId(businessId);
        }

        if (name) {
            mongoQuery.name = { $regex: name, $options: 'i' };
        }

        if (category && Types.ObjectId.isValid(category)) {
            mongoQuery.category = new Types.ObjectId(category);
        }

        if (currency) {
            mongoQuery.currency = currency.toLowerCase();
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

        // Replace lines 325-333 with this:
        if (minPrice !== undefined || maxPrice !== undefined) {
            const filteredProducts = [];
            for (const product of products) {
                const productPrice = product.price || 0;
                const productCurrency = product.currency || 'usd';
                
                const priceInQueryCurrency = await CurrencyHelper.convertPrice(
                    productPrice,
                    productCurrency,
                    currency
                );
                
                const convertedPrice = priceInQueryCurrency.convertedPrice;
                
                if (minPrice !== undefined && convertedPrice < minPrice) continue;
                if (maxPrice !== undefined && convertedPrice > maxPrice) continue;
                
                filteredProducts.push(product);
            }
            products = filteredProducts;
            total = products.length;
        }

        if (userCurrency && products.length > 0) {
            const convertedProducts = await CurrencyHelper.convertProductsForDisplay(products, userCurrency);
            return { products: convertedProducts, total };
        }

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

    static async updateProduct(id: string, updateData: Partial<IProductInput & {[key: string]: string}>, categoryInput?: string): Promise<IProduct | null> {
        if (!Types.ObjectId.isValid(id)) {
            return null;
        }

        const existingProduct = await ProductModel.findById(id);
        if (!existingProduct) {
            throw new Error('Product not found');
        }

        if (updateData.currency && updateData.currency !== existingProduct.currency) {
            const [orderError, hasOrders] = await catchError(
                OrderModel.exists({ 'items.productId': new Types.ObjectId(id) })
            );

            if (orderError) {
                throw new Error('Failed to check product orders');
            }

            if (hasOrders) {
                throw new Error('Cannot change currency for product with existing orders');
            }

            if (!CONSTANTS.CURRENCIES_CODES.includes(updateData.currency.toUpperCase())) {
                throw new Error('Currency is not supported');
            }

            const stripeService = StripeService.getInstance();
            const [priceError, stripePrice] = await catchError(
                stripeService.createPrice({
                    productId: existingProduct.stripeProductId!,
                    unitAmount: Math.round((updateData.price || existingProduct.price || 0) * 100),
                    currency: updateData.currency.toLowerCase()
                })
            );

            if (priceError) {
                await logError({
                    message: 'Failed to create new Stripe price for currency change',
                    source: 'ProductService.updateProduct',
                    additionalData: { productId: id, error: priceError.message }
                });
            } else {
                updateData.stripePriceId = stripePrice.id as any;
            }
        }

        const isPriceOnRequest = updateData.isPriceOnRequest !== undefined ? updateData.isPriceOnRequest : existingProduct.isPriceOnRequest;
        const newPrice = updateData.price !== undefined ? updateData.price : existingProduct.price;
        const currency = (updateData.currency || existingProduct.currency || 'usd').toLowerCase();

        if (!isPriceOnRequest && newPrice && newPrice > 0 && !updateData.stripePriceId && (!existingProduct.stripePriceId || updateData.price !== undefined || updateData.isPriceOnRequest === false)) {
            // If we are moving from PriceOnRequest to fixed price, or price is updated, create/update Stripe price
            const stripeService = StripeService.getInstance();
            const [priceError, stripePrice] = await catchError(
                stripeService.createPrice({
                    productId: existingProduct.stripeProductId!,
                    unitAmount: Math.round(newPrice * 100),
                    currency
                })
            );

            if (priceError) {
                await logError({
                    message: 'Failed to create Stripe price during product update',
                    source: 'ProductService.updateProduct',
                    additionalData: { productId: id, error: priceError.message }
                });
            } else {
                updateData.stripePriceId = stripePrice.id as any;
            }
        }

        if (isPriceOnRequest) {
            updateData.price = null as any;
        }

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
                        type: 'product',
                        isApproved: false
                    });
                }
                if (!category) {
                    await logError({
                        message: 'Failed to create category during product update',
                        source: 'ProductService.updateProduct',
                        additionalData: { productId: id, categoryInput }
                    });
                    return null;
                }
                categoryId = category._id.toString();
            }
            finalUpdateData.category = categoryId as any;
        }

        const [error, product] = await catchError(
            ProductModel.findByIdAndUpdate(id, {...finalUpdateData, currency: finalUpdateData.currency?.toLowerCase()}, { new: true }).populate('category', 'name')
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
                price: product.price,
                isPriceOnRequest: product.isPriceOnRequest
            });
        }

        return product;
    }

    static async deleteProduct(id: string): Promise<{ status: boolean; message: string; source: string; additionalData?: any }> {
        if (!Types.ObjectId.isValid(id)) {
            return {
                status: false,
                message: 'Invalid product ID',
                source: 'ProductService.deleteProduct',
                additionalData: { productId: id }
            };
        }

        const product = await this.getProductById(id);
        if (!product) {
            return {
                status: false,
                message: 'Product not found',
                source: 'ProductService.deleteProduct',
                additionalData: { productId: id }
            };
        }

        const [orderError, hasOrders] = await catchError(
            OrderModel.exists({ 'items.productId': new Types.ObjectId(id) })
        );

        if (orderError) {
            return {
                status: false,
                message: 'Failed to check product orders',
                source: 'ProductService.deleteProduct',
                additionalData: { productId: id, error: orderError.message }
            };
        }

        if (hasOrders) {
            return {
                status: false,
                message: 'Cannot delete product with existing orders',
                source: 'ProductService.deleteProduct',
                additionalData: { productId: id }
            };
        }

        const [error] = await catchError(
            ProductModel.findByIdAndDelete(id)
        );

        if (error) {
            return {
                status: false,
                message: 'Failed to delete product',
                source: 'ProductService.deleteProduct',
                additionalData: { productId: id, error: error.message }
            };
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

        return {
            status: true,
            message: 'Product deleted successfully',
            source: 'ProductService.deleteProduct',
            additionalData: { productId: id }
        };
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

    static async getManufacturerProducts(page: number = 1, limit: number = 20, searchQuery?: string, category?: string): Promise<{ products: IProduct[]; total: number }> {
        const skip = (page - 1) * limit;
        const mongoQuery: any = { businessType: 'manufacturer' };

        if (searchQuery) {
            mongoQuery.name = { $regex: searchQuery, $options: 'i' };
        }

        if (category && Types.ObjectId.isValid(category)) {
            mongoQuery.category = new Types.ObjectId(category);
        }

        const [error, result] = await catchError(
            Promise.all([
                ProductModel.find(mongoQuery).populate('category', 'name').populate('businessId', 'businessName').skip(skip).limit(limit).sort({ createdAt: -1 }),
                ProductModel.countDocuments(mongoQuery)
            ])
        );

        if (error) {
            await logError({
                message: 'Failed to fetch manufacturer products',
                source: 'ProductService.getManufacturerProducts',
                additionalData: { error: error.message }
            });
            return { products: [], total: 0 };
        }

        const [products, total] = result;
        return { products: products || [], total: total || 0 };
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

    private static async addToInventory(businessId: string, productId: string, businessType: 'distributor' | 'manufacturer'): Promise<void> {
        const [error] = await catchError(
            InventoryModel.findOneAndUpdate(
                { businessId },
                { $addToSet: { products: { productId } }, $setOnInsert: { businessType } },
                { upsert: true }
            )
        );

        if (error) {
            await logError({
                message: 'Failed to add product to inventory',
                source: 'ProductService.addToInventory',
                additionalData: { businessId, productId, businessType, error: error.message }
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

    static async createMultipleProducts(userId: string, businessId: string, productsData: Array<{ name: string; price?: number; isPriceOnRequest?: boolean; currency?: string; categoryName: string; sku?: string; quantity: number; minRestockLevel: number; description?: string; wareHouseAddress: { street?: string; zipcode?: string; city?: string; state: string; country: string }; hsCode: string; weight: number; length: number; width: number; height: number }>): Promise<{ successful: IProduct[]; failed: Array<{ product: any; error: string }>; newCategories: string[] }> {
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

                let stripePriceId: string | undefined;
                if (!productData.isPriceOnRequest && productData.price && productData.price > 0) {
                    const [priceError, stripePrice] = await catchError(
                        stripeService.createPrice({
                            productId: stripeProduct.id,
                            unitAmount: Math.round((productData?.price || 0) * 100),
                            currency: (productData.currency || 'usd').toLowerCase()
                        })
                    );

                    if (priceError) {
                        logError({
                            message: 'Failed to create Stripe price',
                            source: 'ProductService.createMultipleProducts',
                            additionalData: { productId: stripeProduct.id, error: priceError.message }
                        });
                    } else {
                        stripePriceId = stripePrice?.id;
                    }
                }

                const business = await BusinessModel.findById(businessId).populate('userId');
                const businessOwner = business?.userId as any;
                const businessType = businessOwner?.role === 'manufacturer' ? 'manufacturer' : 'distributor';

                const [error, product] = await catchError(
                    ProductModel.create({
                        name: productData.name,
                        price: productData.isPriceOnRequest ? null : productData.price,
                        isPriceOnRequest: !!productData.isPriceOnRequest,
                        currency: (productData.currency || 'usd').toLowerCase(),
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
                        businessType,
                        stripeProductId: stripeProduct.id,
                        stripePriceId: stripePriceId
                    })
                );

                if (error || !product) {
                    failed.push({ product: productData, error: error?.message || 'Product creation failed' });
                    continue;
                }

                await this.addToInventory(businessId, product._id.toString(), businessType);

                const category = await CategoryService.getCategoryById(categoryId);
                if (category) {
                    pineconeEmitter.emit('indexProduct', {
                        productId: product._id.toString(),
                        name: product.name,
                        description: product.description || '',
                        categoryName: category.name,
                        price: product.price,
                        isPriceOnRequest: product.isPriceOnRequest
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