import { getEmbeddingProvider } from './embeddings';
import { describe, it, expect, vi } from 'vitest';

// Mock the registry
vi.mock('../admin/registry', () => ({
    getSetting: vi.fn().mockImplementation((key, fallback) => Promise.resolve(fallback))
}));

// Mock SvelteKit's $env/dynamic/private
vi.mock('$env/dynamic/private', () => ({
    env: {
        EMBEDDING_PROVIDER: 'local',
        LOCAL_EMBEDDING_MODEL: 'Xenova/all-MiniLM-L6-v2'
    }
}));

describe('Embedding Singleton', () => {
    it('returns the same instance (singleton) on multiple calls', async () => {
        const p1 = await getEmbeddingProvider();
        const p2 = await getEmbeddingProvider();
        
        expect(p1).toBe(p2);
    });
});
