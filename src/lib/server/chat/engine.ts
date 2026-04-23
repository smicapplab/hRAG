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
        const apiKey = await getSetting('gateways.openai.key', '');
        const model = await getSetting('chat.model', 'gpt-4o');

        if (!apiKey) {
            console.warn('[ChatEngine] OpenAI Gateway key missing, falling back to OLLAMA');
        } else {
            return new ChatOpenAI({ 
                openAIApiKey: apiKey, 
                modelName: model,
                temperature: 0 
            });
        }
    }
    
    // Default: Ollama
    const ollamaUrl = await getSetting('gateways.ollama.url', 'http://localhost:11434');
    const ollamaModel = await getSetting('chat.model', 'llama3');
    
    return new ChatOllama({ 
        baseUrl: ollamaUrl, 
        model: ollamaModel,
        temperature: 0
    });
}
