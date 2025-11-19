import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import { EventEmitter } from 'events';
import { logError, logInfo } from '../utils/SystemLogs';
import catchError from '../utils/catchError';
import 'dotenv/config';

export const pineconeEmitter = new EventEmitter();

class PineconeService {
    private pinecone: Pinecone | null = null;
    private openai: OpenAI | null = null;
    private serviceIndexName: string = 'ycc-services';
    private productIndexName: string = 'ycc-products';

    constructor() {
        this.initialize();
    }

    private initialize() {
        try {
            const apiKey = process.env.PINECONE_API_KEY;
            const openaiKey = process.env.OPENAI_API_KEY;

            if (!apiKey || !openaiKey) {
                logError({
                    message: 'Pinecone or OpenAI API key not configured',
                    source: 'PineconeService.initialize',
                    additionalData: { hasApiKey: !!apiKey, hasOpenAI: !!openaiKey }
                });
                return;
            }

            this.pinecone = new Pinecone({ apiKey });
            this.openai = new OpenAI({ apiKey: openaiKey });
        } catch (error: any) {
            logError({
                message: 'Failed to initialize Pinecone',
                source: 'PineconeService.initialize',
                additionalData: { error: error.message }
            });
        }
    }

    private async generateEmbedding(text: string): Promise<number[] | null> {
        if (!this.openai) return null;

        const model = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
        const [error, response] = await catchError(
            this.openai.embeddings.create({ model, input: text })
        );

        if (error) {
            await logError({
                message: 'Failed to generate embedding',
                source: 'PineconeService.generateEmbedding',
                additionalData: { error: error.message }
            });
            return null;
        }

        return response.data[0].embedding;
    }

    async indexService(serviceId: string, name: string, description: string, categoryName: string, price: number): Promise<boolean> {
        if (!this.pinecone) return false;

        const text = `${name} ${description || ''} ${categoryName}`.trim();
        const embedding = await this.generateEmbedding(text);

        if (!embedding) return false;

        const [error] = await catchError(
            this.pinecone.index(this.serviceIndexName).upsert([{
                id: serviceId,
                values: embedding,
                metadata: { name, category: categoryName, price }
            }])
        );

        if (error) {
            await logError({
                message: 'Failed to index service in Pinecone',
                source: 'PineconeService.indexService',
                additionalData: { serviceId, error: error.message }
            });
            return false;
        }

        await logInfo({
            message: 'Service indexed in Pinecone',
            source: 'PineconeService.indexService',
            additionalData: { serviceId }
        });

        return true;
    }

    async updateService(serviceId: string, name: string, description: string, categoryName: string, price: number): Promise<boolean> {
        return this.indexService(serviceId, name, description, categoryName, price);
    }

    async indexProduct(productId: string, name: string, description: string, categoryName: string, price: number): Promise<boolean> {
        if (!this.pinecone) return false;

        const text = `${name} ${description || ''} ${categoryName}`.trim();
        const embedding = await this.generateEmbedding(text);

        if (!embedding) return false;

        const [error] = await catchError(
            this.pinecone.index(this.productIndexName).upsert([{
                id: productId,
                values: embedding,
                metadata: { name, category: categoryName, price }
            }])
        );

        if (error) {
            await logError({
                message: 'Failed to index product in Pinecone',
                source: 'PineconeService.indexProduct',
                additionalData: { productId, error: error.message }
            });
            return false;
        }

        await logInfo({
            message: 'Product indexed in Pinecone',
            source: 'PineconeService.indexProduct',
            additionalData: { productId }
        });

        return true;
    }

    async updateProduct(productId: string, name: string, description: string, categoryName: string, price: number): Promise<boolean> {
        return this.indexProduct(productId, name, description, categoryName, price);
    }

    async deleteProduct(productId: string): Promise<boolean> {
        if (!this.pinecone) return false;

        const [error] = await catchError(
            this.pinecone.index(this.productIndexName).deleteOne(productId)
        );

        if (error) {
            await logError({
                message: 'Failed to delete product from Pinecone',
                source: 'PineconeService.deleteProduct',
                additionalData: { productId, error: error.message }
            });
            return false;
        }

        await logInfo({
            message: 'Product deleted from Pinecone',
            source: 'PineconeService.deleteProduct',
            additionalData: { productId }
        });

        return true;
    }

    async deleteService(serviceId: string): Promise<boolean> {
        if (!this.pinecone) return false;

        const [error] = await catchError(
            this.pinecone.index(this.serviceIndexName).deleteOne(serviceId)
        );

        if (error) {
            await logError({
                message: 'Failed to delete service from Pinecone',
                source: 'PineconeService.deleteService',
                additionalData: { serviceId, error: error.message }
            });
            return false;
        }

        await logInfo({
            message: 'Service deleted from Pinecone',
            source: 'PineconeService.deleteService',
            additionalData: { serviceId }
        });

        return true;
    }

    async searchServices(query: string, topK: number = 10): Promise<string[]> {
        if (!this.pinecone) return [];

        const embedding = await this.generateEmbedding(query);
        if (!embedding) return [];

        const [error, results] = await catchError(
            this.pinecone.index(this.serviceIndexName).query({ vector: embedding, topK, includeMetadata: true })
        );

        if (error) {
            await logError({
                message: 'Failed to search services in Pinecone',
                source: 'PineconeService.searchServices',
                additionalData: { query, error: error.message }
            });
            return [];
        }

        return results?.matches?.map((match: any) => match.id) || [];
    }

    async searchProducts(query: string, topK: number = 10): Promise<string[]> {
        if (!this.pinecone) return [];

        const embedding = await this.generateEmbedding(query);
        if (!embedding) return [];

        const [error, results] = await catchError(
            this.pinecone.index(this.productIndexName).query({ vector: embedding, topK, includeMetadata: true })
        );

        if (error) {
            await logError({
                message: 'Failed to search products in Pinecone',
                source: 'PineconeService.searchProducts',
                additionalData: { query, error: error.message }
            });
            return [];
        }

        return results?.matches?.map((match: any) => match.id) || [];
    }
}

export const pineconeService = new PineconeService();

pineconeEmitter.on('index', async (data: { serviceId: string; name: string; description: string; categoryName: string; price: number }) => {
    await pineconeService.indexService(data.serviceId, data.name, data.description, data.categoryName, data.price);
});

pineconeEmitter.on('update', async (data: { serviceId: string; name: string; description: string; categoryName: string; price: number }) => {
    await pineconeService.updateService(data.serviceId, data.name, data.description, data.categoryName, data.price);
});

pineconeEmitter.on('delete', async (serviceId: string) => {
    await pineconeService.deleteService(serviceId);
});

pineconeEmitter.on('indexProduct', async (data: { productId: string; name: string; description: string; categoryName: string; price: number }) => {
    await pineconeService.indexProduct(data.productId, data.name, data.description, data.categoryName, data.price);
});

pineconeEmitter.on('updateProduct', async (data: { productId: string; name: string; description: string; categoryName: string; price: number }) => {
    await pineconeService.updateProduct(data.productId, data.name, data.description, data.categoryName, data.price);
});

pineconeEmitter.on('deleteProduct', async (productId: string) => {
    await pineconeService.deleteProduct(productId);
});

