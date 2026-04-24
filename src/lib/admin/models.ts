export interface DiscoveredModel {
    id: string;
    name: string;
    type: 'CHAT' | 'EMBEDDING' | 'BOTH';
}

/**
 * High-signal static defaults for each provider.
 * Used as fallback if discovery hasn't been run or is empty.
 */
export const STATIC_RECOMMENDED_MODELS: Record<string, DiscoveredModel[]> = {
    openai: [
        { id: 'gpt-4o', name: 'GPT-4o (Reasoning)', type: 'BOTH' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast/Cheap)', type: 'BOTH' },
        { id: 'text-embedding-3-small', name: 'Text Embedding 3 Small', type: 'EMBEDDING' },
        { id: 'text-embedding-3-large', name: 'Text Embedding 3 Large', type: 'EMBEDDING' }
    ],
    google: [
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', type: 'CHAT' },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Fast/Cheap)', type: 'CHAT' },
        { id: 'text-embedding-004', name: 'Text Embedding 004', type: 'EMBEDDING' }
    ],
    ollama: [
        { id: 'llama3', name: 'Llama 3 (8B)', type: 'BOTH' },
        { id: 'mistral', name: 'Mistral (7B)', type: 'BOTH' },
        { id: 'gemma2', name: 'Gemma 2 (9B)', type: 'BOTH' },
        { id: 'phi3', name: 'Phi-3 Mini', type: 'BOTH' }
    ]
};

const RECOMMENDED_PATTERNS = [
    'gpt-4o', 'gpt-4-turbo', 'gemini-1.5', 'gemini-1.0-pro', 
    'llama3', 'mistral', 'phi3', 'gemma2',
    'text-embedding-3', 'text-embedding-004'
];

/**
 * Filter and sort models to show ONLY the latest/recommended ones.
 */
export function filterRecommendedModels(models: DiscoveredModel[], type: 'CHAT' | 'EMBEDDING', provider?: string): DiscoveredModel[] {
    const list = [...(models || [])];
    
    // Inject static defaults for the provider if list is thin
    if (provider && STATIC_RECOMMENDED_MODELS[provider.toLowerCase()]) {
        const defaults = STATIC_RECOMMENDED_MODELS[provider.toLowerCase()]
            .filter(d => d.type === type || d.type === 'BOTH');
            
        for (const d of defaults) {
            if (!list.some(m => m.id === d.id)) {
                list.push(d);
            }
        }
    }

    return list
        .filter(m => {
            const matchesType = m.type === type || m.type === 'BOTH';
            const isRecommended = RECOMMENDED_PATTERNS.some(p => m.id.toLowerCase().includes(p.toLowerCase()));
            return matchesType && isRecommended;
        })
        .sort((a, b) => a.id.localeCompare(b.id));
}
