import { OllamaEmbeddings } from '@langchain/ollama';
import { OpenAIEmbeddings } from '@langchain/openai';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { HuggingFaceTransformersEmbeddings } from '@langchain/community/embeddings/huggingface_transformers';
import { env } from '$env/dynamic/private';
import type { Embeddings } from '@langchain/core/embeddings';

import { getSetting } from '../admin/registry';

let providerInstance: Embeddings | null = null;
let currentConfigHash: string | null = null;

/**
 * hRAG Embedding Factory
 * Provides a singleton embedding provider with config-based cache invalidation.
 */
export async function getEmbeddingProvider(): Promise<Embeddings> {
    const provider = await getSetting('embeddings.provider', env.EMBEDDING_PROVIDER || 'local');
    const config: Record<string, string | undefined> = { provider: provider.toLowerCase() };

    // 1. Resolve Provider-Specific Config
    switch (config.provider) {
        case 'ollama':
            config.model = await getSetting('embeddings.ollama.model', env.OLLAMA_MODEL || 'nomic-embed-text');
            config.baseUrl = await getSetting('embeddings.ollama.url', env.OLLAMA_BASE_URL || 'http://localhost:11434');
            break;
        case 'openai':
            config.apiKey = await getSetting('embeddings.openai.key', env.OPENAI_API_KEY);
            config.model = await getSetting('embeddings.openai.model', env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small');
            break;
        case 'google':
            config.apiKey = await getSetting('embeddings.google.key', env.GOOGLE_API_KEY);
            config.model = await getSetting('embeddings.google.model', env.GOOGLE_EMBEDDING_MODEL || 'text-embedding-004');
            break;
        case 'local':
        default:
            config.model = await getSetting('embeddings.local.model', env.LOCAL_EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2');
            break;
    }

    // 2. Cache Invalidation Logic (Config-Based)
    const newConfigHash = JSON.stringify(config);
    if (providerInstance && currentConfigHash === newConfigHash) {
        return providerInstance;
    }

    // 3. Instantiate New Provider
    console.log(`[Embeddings] Initializing new ${config.provider} provider...`);
    
    switch (config.provider) {
        case 'ollama':
            providerInstance = new OllamaEmbeddings({
                model: config.model,
                baseUrl: config.baseUrl,
            });
            break;
            
        case 'openai':
            if (!config.apiKey) throw new Error("OPENAI_API_KEY is missing from registry and environment");
            providerInstance = new OpenAIEmbeddings({
                apiKey: config.apiKey,
                modelName: config.model,
            });
            break;

        case 'google':
            if (!config.apiKey) throw new Error("GOOGLE_API_KEY is missing from registry and environment");
            providerInstance = new GoogleGenerativeAIEmbeddings({
                apiKey: config.apiKey,
                model: config.model,
            });
            break;

        case 'local':
        default:
            providerInstance = new HuggingFaceTransformersEmbeddings({
                model: config.model,
            });
            break;
    }

    currentConfigHash = newConfigHash;
    return providerInstance!;
}

/**
 * Generate embeddings for an array of text chunks.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const provider = await getEmbeddingProvider();
    return await provider.embedDocuments(texts);
}

/**
 * Generate an embedding for a single search query.
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
    const provider = await getEmbeddingProvider();
    return await provider.embedQuery(query);
}
