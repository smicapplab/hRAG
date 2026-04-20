import { pipeline } from '@xenova/transformers';
import type { EmbeddingProvider } from './interfaces';

export class TransformersEmbeddingProvider implements EmbeddingProvider {
    private extractor: any = null;
    private readonly model = 'Xenova/all-MiniLM-L6-v2';

    async embed(text: string): Promise<number[]> {
        if (!this.extractor) {
            this.extractor = await pipeline('feature-extraction', this.model);
        }
        const output = await this.extractor(text, { pooling: 'mean', normalize: true });
        return Array.from(output.data);
    }

    getDimensions(): number {
        return 384;
    }
}
