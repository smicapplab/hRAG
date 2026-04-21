import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { createWorker } from 'tesseract.js';
import * as fs from 'fs/promises';

export interface ExtractionResult {
    text: string;
    method: 'text' | 'ocr';
}

/**
 * Extracts text from a file buffer natively or using WASM OCR if it is an image.
 */
export async function extractText(filePath: string, mimeType: string): Promise<ExtractionResult> {
    const buffer = await fs.readFile(filePath);

    if (mimeType.startsWith('image/')) {
        // Tesseract.js WASM OCR for images
        const worker = await createWorker('eng');
        try {
            const ret = await worker.recognize(buffer);
            return { text: ret.data.text, method: 'ocr' };
        } finally {
            await worker.terminate();
        }
    } else if (mimeType === 'application/pdf') {
        // Here we would use pdf-parse normally. For now we will return placeholder 
        // to be expanded when a pdf parsing module is explicitly installed.
        // E.g. const data = await pdfParse(buffer);
        // return { text: data.text, method: 'text' };
        return { text: "PDF text extraction placeholder.", method: 'text' };
    } else {
        // Assume plain text / markdown
        return { text: buffer.toString('utf-8'), method: 'text' };
    }
}

/**
 * Chunks text using recursive character splitting.
 * Default 512 tokens (chars roughly here) / 64 overlap
 */
export async function chunkText(text: string, chunkSize = 512, chunkOverlap = 64): Promise<string[]> {
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize,
        chunkOverlap,
    });
    
    const docs = await splitter.createDocuments([text]);
    return docs.map((d: any) => d.pageContent);
}
