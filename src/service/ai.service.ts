import 'dotenv/config';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import fs from 'fs';
import path from 'path';
import ChatModel from '../models/chat.model';
import OrderModel from '../models/order.model';
import BookingModel from '../models/booking.model';
import ProductModel from '../models/product.model';
import ServiceModel from '../models/service.model';
import BusinessModel from '../models/business.model';
import { addEmailJob } from '../integration/QueueManager';
import { logError, logInfo } from '../utils/SystemLogs';
import catchError from '../utils/catchError';
import uuid from '../utils/uuid';

export class AIService {
    private static openai: OpenAI | null = null;
    private static pinecone: Pinecone | null = null;
    private static contextIndexName = 'ycc-ai-context';
    private static contextInitialized = false;

    static initialize() {
        const openaiKey = process.env.OPENAI_API_KEY;
        const pineconeKey = process.env.PINECONE_API_KEY;

        if (!openaiKey || !pineconeKey) {
            logError({ message: 'AI service keys not configured', source: 'AIService.initialize' });
            return;
        }

        this.openai = new OpenAI({ apiKey: openaiKey });
        this.pinecone = new Pinecone({ apiKey: pineconeKey });
    }

    private static async generateEmbedding(text: string): Promise<number[] | null> {
        if (!this.openai) return null;

        const model = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
        const [error, response] = await catchError(
            this.openai.embeddings.create({ model, input: text })
        );

        if (error) {
            await logError({ message: 'Failed to generate embedding', source: 'AIService.generateEmbedding', error });
            return null;
        }

        return response.data[0].embedding;
    }

    static async indexAIContext(forceReindex = false) {
        if (!this.pinecone) return;
        if (this.contextInitialized && !forceReindex) return;

        const contextPath = path.join(process.cwd(), 'ai-context.md');
        if (!fs.existsSync(contextPath)) {
            await logError({ message: 'ai-context.md not found', source: 'AIService.indexAIContext' });
            return;
        }

        const content = fs.readFileSync(contextPath, 'utf-8');
        const chunks = this.chunkText(content, 1000);

        const index = this.pinecone.index(this.contextIndexName);

        if (forceReindex) {
            await logInfo({ message: 'Deleting old context vectors', source: 'AIService.indexAIContext' });
            const [deleteError] = await catchError(
                index.deleteAll()
            );
            if (deleteError) {
                await logError({ message: 'Failed to delete old vectors', source: 'AIService.indexAIContext', error: deleteError });
            }
        }

        for (let i = 0; i < chunks.length; i++) {
            const embedding = await this.generateEmbedding(chunks[i]);
            if (!embedding) continue;

            await catchError(
                index.upsert([{
                    id: `context-${i}`,
                    values: embedding,
                    metadata: { text: chunks[i], chunk: i }
                }])
            );
        }

        this.contextInitialized = true;
        await logInfo({ message: 'AI context indexed', source: 'AIService.indexAIContext', additionalData: { chunks: chunks.length, reindexed: forceReindex } });
    }

    private static chunkText(text: string, maxLength: number): string[] {
        const chunks: string[] = [];
        const paragraphs = text.split('\n\n');
        let currentChunk = '';

        for (const para of paragraphs) {
            if ((currentChunk + para).length > maxLength && currentChunk) {
                chunks.push(currentChunk.trim());
                currentChunk = para;
            } else {
                currentChunk += (currentChunk ? '\n\n' : '') + para;
            }
        }

        if (currentChunk) chunks.push(currentChunk.trim());
        return chunks;
    }

    private static async retrieveContext(query: string): Promise<string> {
        if (!this.pinecone) return '';

        const embedding = await this.generateEmbedding(query);
        if (!embedding) return '';

        const [error, results] = await catchError(
            this.pinecone.index(this.contextIndexName).query({
                vector: embedding,
                topK: 3,
                includeMetadata: true
            })
        );

        if (error || !results?.matches) return '';

        return results.matches
            .map((match: any) => match.metadata?.text)
            .filter(Boolean)
            .join('\n\n');
    }

    private static async getOrders({ userId, status, limit = 10 }: { userId: string; status?: string; limit?: number }) {
        const query: any = { userId };
        if (status) query.status = status;

        const orders = await OrderModel.find(query)
            .populate('items.productId', 'name price')
            .populate('items.businessId', 'businessName')
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        return { orders, total: orders.length };
    }

    private static async getBookings({ userId, status, limit = 10 }: { userId: string; status?: string; limit?: number }) {
        const query: any = { userId };
        if (status) query.status = status;

        const bookings = await BookingModel.find(query)
            .populate('serviceId', 'name price')
            .populate('businessId', 'businessName')
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        return { bookings, total: bookings.length };
    }

    private static async getProducts({ userId, userRole, productName, limit = 20 }: { userId?: string; userRole?: string; productName?: string; limit?: number }) {
        let query: any = {};

        if (productName) {
            query.$or = [
                { name: { $regex: productName, $options: 'i' } },
                { description: { $regex: productName, $options: 'i' } }
            ];
        }

        if (userRole === 'distributor' || userRole === 'manufacturer') {
            query.userId = userId;
        }

        const products = await ProductModel.find(query)
            .populate('businessId', 'businessName businessType phone email address website')
            .populate('category', 'name')
            .limit(limit)
            .lean();

        return {
            status: true,
            message: `Found ${products.length} product(s)${productName ? ` matching "${productName}"` : ''}`,
            data: products.map(p => ({
                _id: p._id,
                name: p.name,
                category: (p.category as any)?.name,
                description: p.description,
                sku: p.sku,
                price: p.price,
                productImage: p.imageURLs?.[0],
                hsCode: p.hsCode,
                countryOfOrigin: p.wareHouseAddress?.country,
                dimensions: { weight: p.weight, height: p.height, length: p.length, width: p.width },
                supplier: (p.businessId as any),
                inventory: { quantity: p.quantity, warehouseLocation: p.wareHouseAddress },
                createdAt: p.createdAt,
                updatedAt: p.updatedAt
            })),
            total: products.length,
            searchTerm: productName
        };
    }

    private static async getServices({ serviceName, limit = 20 }: { serviceName?: string; limit?: number }) {
        let query: any = {};

        if (serviceName) {
            query.$or = [
                { name: { $regex: serviceName, $options: 'i' } },
                { description: { $regex: serviceName, $options: 'i' } }
            ];
        }

        const services = await ServiceModel.find(query)
            .populate('businessId', 'businessName phone email address website ratings')
            .populate('categoryId', 'name')
            .limit(limit)
            .lean();

        return {
            status: true,
            message: `Found ${services.length} service(s)${serviceName ? ` matching "${serviceName}"` : ''}`,
            data: services.map(s => ({
                id: s._id,
                name: s.name,
                description: s.description,
                price: s.price,
                vendor: (s.businessId as any),
                createdAt: s.createdAt,
                updatedAt: s.updatedAt
            })),
            total: services.length,
            searchTerm: serviceName,
            searchType: serviceName ? 'search' : 'random'
        };
    }

    private static async escalateToSupport(userMessage: string, userId?: string) {
        await addEmailJob({
            email: 'support@yachtcrewcenter.com',
            subject: 'AI Chat Escalation - Unable to Answer Query',
            html: `
                <h2>AI Chat Escalation</h2>
                <p><strong>User ID:</strong> ${userId || 'Anonymous'}</p>
                <p><strong>User Query:</strong></p>
                <p>${userMessage}</p>
                <p><strong>Reason:</strong> No relevant context found in knowledge base</p>
                <p><strong>Time:</strong> ${new Date().toISOString()}</p>
            `
        });

        return "I couldn't find specific information about that in our knowledge base. I've escalated your query to our support team at support@yachtcrewcenter.com, and they'll get back to you shortly!";
    }

    static async chat({ message, userId, sessionId, stream = false }: { message: string; userId?: string; sessionId?: string; stream?: boolean }) {
        if (!this.openai) {
            this.initialize();
            if (!this.openai) throw new Error('AI service not initialized');
        }

        if (!this.contextInitialized) {
            await this.indexAIContext();
        }

        const sid = sessionId || uuid();
        const context = await this.retrieveContext(message);

        const chatHistory = userId ? await ChatModel.findOne({ userId, sessionId: sid }).lean() : null;
        const previousMessages = chatHistory?.messages.slice(-10).map(m => ({
            role: m.type === 'human' ? 'user' as const : 'assistant' as const,
            content: m.data.content
        })) || [];

        const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = userId ? [
            {
                type: 'function',
                function: {
                    name: 'get_orders',
                    description: 'Fetch user orders with optional filtering',
                    parameters: {
                        type: 'object',
                        properties: {
                            status: { type: 'string', enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] },
                            limit: { type: 'number', default: 10 }
                        }
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'get_bookings',
                    description: 'Fetch user bookings with optional filtering',
                    parameters: {
                        type: 'object',
                        properties: {
                            status: { type: 'string', enum: ['pending', 'confirmed', 'cancelled', 'completed'] },
                            limit: { type: 'number', default: 10 }
                        }
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'get_products',
                    description: 'Search products by name or get random products',
                    parameters: {
                        type: 'object',
                        properties: {
                            productName: { type: 'string', description: 'Product name to search for' },
                            limit: { type: 'number', default: 20 }
                        }
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'get_services',
                    description: 'Search services by name or get random services',
                    parameters: {
                        type: 'object',
                        properties: {
                            serviceName: { type: 'string', description: 'Service name or type to search for' },
                            limit: { type: 'number', default: 20 }
                        }
                    }
                }
            }
        ] : [];

        const systemPrompt = `${context}\n\nYou are a helpful customer service agent for Yacht Crew Center. Use the provided context to answer questions accurately. If you cannot find relevant information, indicate that you need to escalate.`;

        const [error, completion] = await catchError(
            this.openai.chat.completions.create({
                model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...previousMessages,
                    { role: 'user', content: message }
                ],
                tools: tools.length > 0 ? tools : undefined,
                tool_choice: tools.length > 0 ? 'auto' : undefined,
                stream
            })
        );

        if (error) {
            await logError({ message: 'OpenAI API error', source: 'AIService.chat', error });
            throw new Error('Failed to generate response');
        }

        if (stream) {
            return { stream: completion, sessionId: sid };
        }

        const responseMessage = (completion as any).choices[0].message;
        let finalResponse = responseMessage.content || '';
        const toolCalls = responseMessage.tool_calls || [];

        if (toolCalls.length > 0 && userId) {
            const user = await BusinessModel.findOne({ userId }).lean();
            const userRole = user ? 'distributor' : 'user';

            for (const toolCall of toolCalls) {
                const functionName = toolCall.function.name;
                const args = JSON.parse(toolCall.function.arguments);

                let functionResult: any;

                switch (functionName) {
                    case 'get_orders':
                        functionResult = await this.getOrders({ userId, ...args });
                        break;
                    case 'get_bookings':
                        functionResult = await this.getBookings({ userId, ...args });
                        break;
                    case 'get_products':
                        functionResult = await this.getProducts({ userId, userRole, ...args });
                        break;
                    case 'get_services':
                        functionResult = await this.getServices(args);
                        break;
                }

                const [, followUp] = await catchError(
                    this.openai.chat.completions.create({
                        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                        messages: [
                            { role: 'system', content: systemPrompt },
                            ...previousMessages,
                            { role: 'user', content: message },
                            responseMessage,
                            { role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(functionResult) }
                        ]
                    })
                );

                finalResponse = followUp?.choices[0].message.content || finalResponse;
            }
        }

        if (!context && !toolCalls.length) {
            finalResponse = await this.escalateToSupport(message, userId);
        }

        if (userId) {
            await ChatModel.findOneAndUpdate(
                { userId, sessionId: sid },
                {
                    $push: {
                        messages: {
                            $each: [
                                { type: 'human', data: { content: message, tool_calls: [], invalid_tool_calls: [], additional_kwargs: {}, response_metadata: {} }, createdAt: new Date() },
                                { type: 'ai', data: { content: finalResponse, tool_calls: toolCalls, invalid_tool_calls: [], additional_kwargs: {}, response_metadata: {} }, createdAt: new Date() }
                            ]
                        }
                    },
                    $setOnInsert: { createdAt: new Date() }
                },
                { upsert: true, new: true }
            );

            await ChatModel.deleteMany({
                userId,
                createdAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            });
        }

        return { response: finalResponse, sessionId: sid };
    }
}

AIService.initialize();
