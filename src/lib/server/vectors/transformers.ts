import { pipeline } from '@xenova/transformers';
import type { EmbeddingProvider } from './interfaces';

export class TransformersEmbeddingProvider implements EmbeddingProvider {
    private extractorPromise: Promise<any> | null = null;
    private readonly model = 'Xenova/all-MiniLM-L6-v2';

    async embed(text: string): Promise<number[]> {
        if (!this.extractorPromise) {
            this.extractorPromise = pipeline('feature-extraction', this.model);
        }
        const extractor = await this.extractorPromise;
        const output = await extractor(text, { pooling: 'mean', normalize: true });
        return Array.from(output.data);
    }

    getDimensions(): number {
        return 384;
    }
}
