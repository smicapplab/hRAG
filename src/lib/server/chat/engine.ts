import { getSetting } from '$lib/server/admin/registry';
import { ChatOllama } from '@langchain/ollama';
import { ChatOpenAI } from '@langchain/openai';

/**
 * Initializes and returns the correct LLM provider (Ollama or OpenAI)
 * based on the system registry settings.
 */
export async function getChatModel() {
    const engine = await getSetting('chat.engine', 'OLLAMA');
    
    if (engine === 'OPENAI') {
        const apiKey = await getSetting('chat.openai.key', '');
        if (!apiKey) {
            console.warn('[ChatEngine] OpenAI key missing, falling back to OLLAMA');
        } else {
            return new ChatOpenAI({ 
                openAIApiKey: apiKey, 
                modelName: 'gpt-4o',
                temperature: 0 
            });
        }
    }
    
    // Default: Ollama
    const ollamaUrl = await getSetting('embeddings.ollama.url', 'http://localhost:11434');
    return new ChatOllama({ 
        baseUrl: ollamaUrl, 
        model: 'llama3', // or another robust model
        temperature: 0
    });
}
