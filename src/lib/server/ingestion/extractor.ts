import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { createWorker } from 'tesseract.js';
import * as fs from 'fs/promises';
import { createRequire } from 'node:module';

export interface ExtractionResult {
    text: string;
    method: 'text' | 'ocr';
}

/**
 * Returns true if a string is mostly binary/non-printable content.
 * Used to discard garbage chunks from impure binary extraction.
 */
function isBinaryGarbage(text: string, threshold = 0.3): boolean {
    if (text.length === 0) return true;
    let nonPrintable = 0;
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        // Allow tab (9), newline (10), carriage return (13), and printable ASCII + extended latin
        if (code < 9 || (code > 13 && code < 32)) {
            nonPrintable++;
        }
    }
    return nonPrintable / text.length > threshold;
}

/**
 * Extracts text from a file buffer natively or using WASM OCR if it is an image.
 */
export async function extractText(filePath: string, mimeType: string): Promise<ExtractionResult> {
    const buffer = await fs.readFile(filePath);

    // --- Image: OCR via Tesseract.js WASM ---
    if (mimeType.startsWith('image/')) {
        const worker = await createWorker('eng');
        try {
            const ret = await worker.recognize(buffer);
            return { text: ret.data.text, method: 'ocr' };
        } finally {
            await worker.terminate();
        }
    }

    // --- PDF ---
    if (mimeType === 'application/pdf') {
        const require = createRequire(import.meta.url);
        const pdfParse = require('pdf-parse');
        const data = await pdfParse(buffer);
        const text = data.text?.trim();
        if (text && text.length > 50) {
            return { text, method: 'text' };
        }
        // No extractable text → fall back to OCR on the PDF pages
        // For now return empty to trigger the "no text" guard in the queue
        return { text: '', method: 'text' };
    }

    // --- DOCX (OOXML / ZIP-based) ---
    if (
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        filePath.endsWith('.docx')
    ) {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer });
        const text = result.value?.trim();
        if (!text) throw new Error('DOCX produced no extractable text.');
        return { text, method: 'text' };
    }

    // --- DOC (Legacy OLE2 binary) ---
    if (
        mimeType === 'application/msword' ||
        filePath.endsWith('.doc')
    ) {
        const require = createRequire(import.meta.url);
        const WordExtractor = require('word-extractor');
        const extractor = new WordExtractor();
        const extracted = await extractor.extract(filePath);
        const text = extracted.getBody()?.trim();
        if (!text) throw new Error('DOC produced no extractable text.');
        return { text, method: 'text' };
    }

    // --- Excel (.xlsx / .xls / .csv) ---
    if (
        mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        mimeType === 'application/vnd.ms-excel' ||
        filePath.endsWith('.xlsx') ||
        filePath.endsWith('.xls')
    ) {
        const require = createRequire(import.meta.url);
        const XLSX = require('xlsx');
        const workbook = XLSX.readFile(filePath);
        let text = '';
        for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            text += `Sheet: ${sheetName}\n`;
            text += XLSX.utils.sheet_to_csv(sheet) + '\n\n';
        }
        if (!text.trim()) throw new Error('Excel produced no extractable text.');
        return { text, method: 'text' };
    }

    // --- PowerPoint & OpenDocument formats (PPTX, ODP, ODS, ODT, ODF) ---
    // Note: Legacy .ppt is NOT supported by officeparser (only .pptx)
    const PRESENTATION_MIMES = new Set([
        'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
        'application/vnd.oasis.opendocument.presentation', // .odp
        'application/vnd.oasis.opendocument.spreadsheet',  // .ods
        'application/vnd.oasis.opendocument.text',          // .odt
    ]);
    const PRESENTATION_EXTS = ['.pptx', '.odp', '.ods', '.odt'];
    if (
        PRESENTATION_MIMES.has(mimeType) ||
        PRESENTATION_EXTS.some(ext => filePath.endsWith(ext))
    ) {
        const require = createRequire(import.meta.url);
        const { OfficeParser } = require('officeparser');
        try {
            // In v6.x+, parseOffice is an async static method that returns an AST object.
            // We need to call .toText() on the result to get the actual text.
            const data = await OfficeParser.parseOffice(filePath);
            
            let text = '';
            if (typeof data === 'string') {
                text = data;
            } else if (data && typeof data.toText === 'function') {
                text = data.toText();
            } else if (data && typeof data === 'object') {
                text = data.text || data.value || JSON.stringify(data);
            } else if (data) {
                text = String(data);
            }
            
            const trimmed = text.trim();
            
            if (!trimmed || trimmed.length < 10) {
                throw new Error(`${mimeType} produced no significant extractable text.`);
            }
            return { text: trimmed, method: 'text' };
        } catch (err: any) {
            throw new Error(`Office extraction failed: ${err.message || err}`);
        }
    }

    if (filePath.endsWith('.ppt') || mimeType === 'application/vnd.ms-powerpoint') {
        throw new Error('Legacy .ppt files are not supported. Please convert to .pptx');
    }

    // --- Plain text / Markdown / CSV / JSON ---
    if (
        mimeType.startsWith('text/') ||
        mimeType === 'application/json' ||
        mimeType === 'application/csv'
    ) {
        const text = buffer.toString('utf-8').trim();
        return { text, method: 'text' };
    }

    // --- Unknown: attempt UTF-8, but guard against binary garbage ---
    const text = buffer.toString('utf-8').trim();
    if (isBinaryGarbage(text)) {
        throw new Error(`Unsupported or binary file type: ${mimeType}`);
    }
    return { text, method: 'text' };
}

/**
 * Chunks text using recursive character splitting.
 * Default 512 chars / 64 overlap.
 * Filters out chunks that are mostly binary/non-printable garbage.
 */
export async function chunkText(text: string, chunkSize = 512, chunkOverlap = 64): Promise<string[]> {
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize,
        chunkOverlap,
    });
    
    const docs = await splitter.createDocuments([text]);
    return docs
        .map((d: any) => d.pageContent as string)
        .filter(chunk => !isBinaryGarbage(chunk) && chunk.trim().length > 20);
}
