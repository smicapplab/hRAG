import { describe, it, expect } from 'vitest';
import { TextProcessor } from './text';

describe('TextProcessor', () => {
	it('should process plain text and chunk it', async () => {
		const processor = new TextProcessor();
		const buffer = Buffer.from('Line 1\nLine 2\n' + 'a'.repeat(1000));
		const result = await processor.process(buffer, 'text/plain');
		expect(result.chunks.length).toBeGreaterThan(1);
		expect(result.chunks[0].text).toContain('Line 1');
	});
});
