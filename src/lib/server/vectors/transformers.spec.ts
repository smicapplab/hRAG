import { describe, it, expect } from 'vitest';
import { TransformersEmbeddingProvider } from './transformers';

describe('TransformersEmbeddingProvider', () => {
    it('should generate embeddings of correct dimension', async () => {
        const provider = new TransformersEmbeddingProvider();
        const vector = await provider.embed('Hello Control Room');
        expect(vector.length).toBe(384);
        expect(Array.isArray(vector)).toBe(true);
    }, 30000); // 30s timeout for model download
});
