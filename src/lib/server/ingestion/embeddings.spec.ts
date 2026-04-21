import { getEmbeddingProvider } from './embeddings';
import { describe, it, expect, vi } from 'vitest';

// Mock SvelteKit's $env/dynamic/private
vi.mock('$env/dynamic/private', () => ({
    env: {
        EMBEDDING_PROVIDER: 'local',
        LOCAL_EMBEDDING_MODEL: 'Xenova/all-MiniLM-L6-v2'
    }
}));

describe('Embedding Singleton', () => {
    it('returns the same instance (singleton) on multiple calls', () => {
        const p1 = getEmbeddingProvider();
        const p2 = getEmbeddingProvider();
        
        // This should fail before the fix because new instances are created every time
        expect(p1).toBe(p2);
    });
});
