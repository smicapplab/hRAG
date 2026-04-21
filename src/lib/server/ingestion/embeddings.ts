import { OllamaEmbeddings } from '@langchain/ollama';
import { OpenAIEmbeddings } from '@langchain/openai';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { HuggingFaceTransformersEmbeddings } from '@langchain/community/embeddings/huggingface_transformers';
import { env } from '$env/dynamic/private';
import type { Embeddings } from '@langchain/core/embeddings';

let providerInstance: Embeddings | null = null;

export function getEmbeddingProvider(): Embeddings {
    if (providerInstance) return providerInstance;
    
    const provider = env.EMBEDDING_PROVIDER || 'local';

    switch (provider.toLowerCase()) {
        case 'ollama':
            providerInstance = new OllamaEmbeddings({
                model: env.OLLAMA_MODEL || 'nomic-embed-text',
                baseUrl: env.OLLAMA_BASE_URL || 'http://localhost:11434',
            });
            break;
            
        case 'openai':
            if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is missing");
            providerInstance = new OpenAIEmbeddings({
                apiKey: env.OPENAI_API_KEY,
                modelName: env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
            });
            break;

        case 'gemini':
            if (!env.GOOGLE_API_KEY) throw new Error("GOOGLE_API_KEY is missing");
            providerInstance = new GoogleGenerativeAIEmbeddings({
                apiKey: env.GOOGLE_API_KEY,
                model: env.GOOGLE_EMBEDDING_MODEL || 'text-embedding-004',
            });
            break;

        case 'local':
        default:
            providerInstance = new HuggingFaceTransformersEmbeddings({
                model: env.LOCAL_EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2',
            });
            break;
    }
    return providerInstance;
}

/**
 * Generate embeddings for an array of text chunks.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const provider = getEmbeddingProvider();
    return await provider.embedDocuments(texts);
}

/**
 * Generate an embedding for a single search query.
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
    const provider = getEmbeddingProvider();
    return await provider.embedQuery(query);
}
