import 'dotenv/config';
import { Pinecone } from '@pinecone-database/pinecone';

async function setupPineconeIndex() {
    const apiKey = process.env.PINECONE_API_KEY;
    
    if (!apiKey) {
        console.error('❌ PINECONE_API_KEY not found in environment variables');
        process.exit(1);
    }

    const pinecone = new Pinecone({ apiKey });
    const indexName = 'ycc-ai-context';

    try {
        console.log('🔍 Checking if index exists...');
        const indexes = await pinecone.listIndexes();
        const indexExists = indexes.indexes?.some(idx => idx.name === indexName);

        if (indexExists) {
            console.log('✅ Index already exists:', indexName);
        } else {
            console.log('📝 Creating new index:', indexName);
            await pinecone.createIndex({
                name: indexName,
                dimension: 1536,
                metric: 'cosine',
                spec: {
                    serverless: {
                        cloud: 'aws',
                        region: 'us-east-1'
                    }
                }
            });
            console.log('✅ Index created successfully');
        }

        console.log('\n📊 Index details:');
        const indexStats = await pinecone.index(indexName).describeIndexStats();
        console.log(JSON.stringify(indexStats, null, 2));

        console.log('\n✨ Setup complete! You can now use the AI Chat Service.');
    } catch (error: any) {
        console.error('❌ Error setting up Pinecone index:', error.message);
        process.exit(1);
    }
}

setupPineconeIndex();
