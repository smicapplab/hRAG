import { OllamaEmbeddings } from '@langchain/ollama';
import { OpenAIEmbeddings } from '@langchain/openai';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { HuggingFaceTransformersEmbeddings } from '@langchain/community/embeddings/huggingface_transformers';
import type { Embeddings } from '@langchain/core/embeddings';
import { getSetting } from '../admin/registry';

// Safety helper for script execution outside of SvelteKit
async function getEnvValue(key: string, defaultValue: string): Promise<string> {
    if (typeof process !== 'undefined' && process.env[key]) {
        return process.env[key]!;
    }
    try {
        // Dynamic import to avoid build-time errors in non-SvelteKit environments
        const { env } = await import('$env/dynamic/private');
        return (env as any)[key] || defaultValue;
    } catch {
        return defaultValue;
    }
}

let providerInstance: Embeddings | null = null;
let currentConfigHash: string | null = null;

/**
 * hRAG Embedding Factory
 * Provides a singleton embedding provider with config-based cache invalidation.
 */
export async function getEmbeddingProvider(): Promise<Embeddings> {
    const provider = await getSetting('embeddings.provider', await getEnvValue('EMBEDDING_PROVIDER', 'local'));
    const config: Record<string, string | undefined> = { provider: provider.toLowerCase() };

    // 1. Resolve Provider-Specific Config
    switch (config.provider) {
        case 'ollama':
            config.model = await getSetting('embeddings.model', 'nomic-embed-text');
            config.baseUrl = await getSetting('gateways.ollama.url', 'http://localhost:11434');
            break;
        case 'openai':
            config.apiKey = await getSetting('gateways.openai.key', '');
            config.model = await getSetting('embeddings.model', 'text-embedding-3-small');
            break;
        case 'google':
            config.apiKey = await getSetting('gateways.google.key', '');
            config.model = await getSetting('embeddings.model', 'text-embedding-004');
            break;
        case 'local':
        default:
            config.model = await getSetting('embeddings.model', 'Xenova/all-MiniLM-L6-v2');
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
