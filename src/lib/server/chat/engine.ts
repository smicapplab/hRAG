import { getSetting } from '$lib/server/admin/registry';
import { ChatOllama } from '@langchain/ollama';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

/**
 * Initializes and returns the correct LLM provider (Ollama, OpenAI, or Google)
 * based on the system registry settings.
 */
export async function getChatModel(): Promise<{ model: any, name: string }> {
    const engine = await getSetting('chat.engine', 'OLLAMA');
    
    try {
        if (engine === 'OPENAI') {
            const apiKey = await getSetting('gateways.openai.key', '');
            const modelName = await getSetting('chat.model', 'gpt-4o-mini');

            if (!apiKey) {
                throw new Error('OpenAI API Key is missing in system settings.');
            }
            
            console.log(`[ChatEngine] Initializing OPENAI (${modelName})`);
            return {
                model: new ChatOpenAI({ 
                    apiKey: apiKey, 
                    modelName: modelName,
                    temperature: 0.3, // Slightly higher for more natural reasoning
                    maxRetries: 2
                }),
                name: `OpenAI ${modelName}`
            };
        }

        if (engine === 'GOOGLE') {
            const apiKey = await getSetting('gateways.google.key', '');
            const modelName = await getSetting('chat.model', 'gemini-1.5-flash');

            if (!apiKey) {
                throw new Error('Google Gemini API Key is missing in system settings.');
            }
            
            console.log(`[ChatEngine] Initializing GOOGLE (${modelName})`);
            return {
                model: new ChatGoogleGenerativeAI({ 
                    apiKey: apiKey, 
                    modelName: modelName,
                    temperature: 0.3,
                    maxRetries: 2
                }),
                name: `Gemini ${modelName}`
            };
        }
        
        // Default: Ollama
        const ollamaUrl = await getSetting('gateways.ollama.url', 'http://localhost:11434');
        const modelName = await getSetting('chat.model', 'llama3');
        
        console.log(`[ChatEngine] Initializing OLLAMA (${modelName}) at ${ollamaUrl}`);
        return {
            model: new ChatOllama({ 
                baseUrl: ollamaUrl, 
                model: modelName,
                temperature: 0.3
            }),
            name: `Ollama ${modelName}`
        };
    } catch (err: any) {
        console.error(`[ChatEngine] Failed to initialize ${engine}:`, err.message);
        // If cloud fails, try to fallback to Ollama as a last resort if it's not already the engine
        if (engine !== 'OLLAMA') {
            console.log('[ChatEngine] Attempting last-resort fallback to OLLAMA...');
            const ollamaUrl = await getSetting('gateways.ollama.url', 'http://localhost:11434');
            const ollamaModel = await getSetting('chat.model', 'llama3');
            return {
                model: new ChatOllama({ baseUrl: ollamaUrl, model: ollamaModel, temperature: 0.3 }),
                name: `Ollama ${ollamaModel} (Fallback)`
            };
        }
        throw err;
    }
}
