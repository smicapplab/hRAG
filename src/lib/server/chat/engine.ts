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
        // Try chat-specific key first, then fallback to global embeddings key
        let apiKey = await getSetting('chat.openai.key', '');
        if (!apiKey) {
            apiKey = await getSetting('embeddings.openai.key', '');
        }

        if (!apiKey) {
            console.warn('[ChatEngine] OpenAI key missing, falling back to OLLAMA');
        } else {
            const model = await getSetting('chat.openai.model', 'gpt-4o');
            return new ChatOpenAI({ 
                openAIApiKey: apiKey, 
                modelName: model,
                temperature: 0 
            });
        }
    }
    
    // Default: Ollama
    const ollamaUrl = await getSetting('chat.ollama.url', await getSetting('embeddings.ollama.url', 'http://localhost:11434'));
    const ollamaModel = await getSetting('chat.ollama.model', 'llama3');
    
    return new ChatOllama({ 
        baseUrl: ollamaUrl, 
        model: ollamaModel,
        temperature: 0
    });
}
