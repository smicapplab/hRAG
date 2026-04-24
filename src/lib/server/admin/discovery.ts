import { getSetting } from './registry';
import type { DiscoveredModel } from '$lib/admin/models';

/**
 * hRAG Model Discovery Service
 * Securely fetches available models from AI providers using stored gateway credentials.
 */

export async function fetchOpenAIModels(apiKey: string): Promise<DiscoveredModel[]> {
    if (!apiKey) return [];
    
    const res = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    
    if (!res.ok) throw new Error(`OpenAI Discovery Failed: ${res.statusText}`);
    
    const data = await res.json();
    return data.data.map((m: any) => ({
        id: m.id,
        name: m.id,
        type: m.id.includes('gpt') ? 'CHAT' : m.id.includes('embed') ? 'EMBEDDING' : 'BOTH'
    }));
}

export async function fetchOllamaModels(baseUrl: string): Promise<DiscoveredModel[]> {
    const url = baseUrl.endsWith('/') ? `${baseUrl}api/tags` : `${baseUrl}/api/tags`;
    const res = await fetch(url);
    
    if (!res.ok) throw new Error(`Ollama Discovery Failed: ${res.statusText}`);
    
    const data = await res.json();
    return data.models.map((m: any) => ({
        id: m.name,
        name: m.name,
        type: 'BOTH' // Ollama models are generally multi-purpose in hRAG context
    }));
}

export async function fetchGoogleModels(apiKey: string): Promise<DiscoveredModel[]> {
    if (!apiKey) return [];
    
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    
    if (!res.ok) throw new Error(`Google Discovery Failed: ${res.statusText}`);
    
    const data = await res.json();
    return data.models.map((m: any) => {
        const id = m.name.replace('models/', '');
        const isEmbedding = m.supportedGenerationMethods?.includes('embedContent') || id.includes('embed');
        const isChat = m.supportedGenerationMethods?.includes('generateContent') || id.includes('gemini');
        
        let type: 'CHAT' | 'EMBEDDING' | 'BOTH' = 'CHAT';
        if (isEmbedding && isChat) type = 'BOTH';
        else if (isEmbedding) type = 'EMBEDDING';
        else type = 'CHAT';
        
        return {
            id,
            name: m.displayName || id,
            type
        };
    });
}
