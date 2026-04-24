/**
 * hRAG Intelligence Panel Manifest
 * Provides "Layman's Intelligence" for system settings.
 * Aesthetic: Industrial, Plain English, Technical but Accessible.
 */

export interface HelpGuide {
	title: string;
	description: string;
	pros: string[];
	cons: string[];
	tip: string;
	cost?: 'FREE' | 'LOW' | 'VARIABLE' | 'HIGH';
}

export const HELP_DATA: Record<string, HelpGuide> = {
	'embeddings.provider': {
		title: 'Embedding Provider (The Translator)',
		description:
			'This is the "brain" that converts your document text into math (vectors) so the search engine can understand meaning, not just keywords.',
		pros: [
			'Enables "Smart Search" (e.g., finding "car" when searching for "vehicle")',
			'Allows AI to cross-reference concepts'
		],
		cons: ['Choosing cloud providers sends data outside your server', 'Can be slow on older CPUs'],
		tip: 'Use "LOCAL" for maximum privacy, or "OPENAI" for the highest possible search accuracy.',
		cost: 'VARIABLE'
	},
	'embeddings.openai.key': {
		title: 'OpenAI API Key',
		description: 'Your secret key from the OpenAI Dashboard.',
		pros: ['Industry-leading accuracy', 'No server load (handled by OpenAI)'],
		cons: ['Paid service', 'Data leaves your server'],
		tip: 'Ensure you have enabled the "text-embedding-3-small" model in your OpenAI usage limits.',
		cost: 'VARIABLE'
	},
	'embeddings.google.key': {
		title: 'Google Gemini API Key',
		description: 'Your API key from the Google AI Studio or Cloud Console.',
		pros: ['Massive context window', 'High performance on semantic tasks'],
		cons: ['Paid service', 'Data leaves your server'],
		tip: 'Commonly used with the \"text-embedding-004\" model.',
		cost: 'VARIABLE'
	},
	'embeddings.ollama.url': {
		title: 'Ollama Base URL',
		description: 'The network address of your local Ollama instance.',
		pros: ['100% Private', 'Faster than CPU-based local embeddings if you have a GPU'],
		cons: ['Requires managing a separate Ollama installation'],
		tip: 'Default is usually http://localhost:11434.',
		cost: 'FREE'
	},
	'vectors.engine': {
		title: 'Vector Engine (The Memory Bank)',
		description: 'Where the translated "meaning" of your documents is stored for fast retrieval.',
		pros: [
			'LanceDB: Zero setup, stores data directly on S3 (Recommended)',
			'PgVector: Great if you already have a Postgres database',
			'Qdrant: Built for extreme scale and millions of documents'
		],
		cons: ['Switching engines requires a full data migration'],
		tip: 'Stick with LanceDB for most use cases; it is built specifically for hRAG statelessness.',
		cost: 'LOW'
	},
	'vectors.qdrant.url': {
		title: 'Qdrant API Endpoint',
		description: 'The network address of your Qdrant cluster.',
		pros: ['Built for extreme speed and millions of documents', 'Highly scalable'],
		cons: ['Requires separate infrastructure management'],
		tip: 'Ensure the collection is pre-created or the service has auto-creation permissions.',
		cost: 'VARIABLE'
	},
	'ingestion.chunk_size': {
		title: 'Chunk Size (Slicing the Bread)',
		description: 'The number of characters per piece of text the AI analyzes at once.',
		pros: [
			'Smaller chunks: More precise search results',
			'Larger chunks: Better context for the AI'
		],
		cons: ['Too small: Loses context', 'Too large: Search becomes "blurry"'],
		tip: '512 characters is the industry standard "sweet spot" for document RAG.',
		cost: 'FREE'
	},
	'ingestion.max_file_size': {
		title: 'Max File Size',
		description: 'The hard limit for individual document uploads.',
		pros: ['Prevents server crashes from massive files'],
		cons: ['Large PDFs might get rejected'],
		tip: 'Keep this under 50MB unless you have a very powerful server for OCR.',
		cost: 'FREE'
	},
	'system.maintenance_mode': {
		title: 'Maintenance Mode',
		description: 'Locks the system for regular users while allowing admins to make changes.',
		pros: ['Prevents data corruption during upgrades'],
		cons: ['Users cannot access documents'],
		tip: 'Always enable this before running "hrag update" on a production cluster.',
		cost: 'FREE'
	},
	'classification.auto_enabled': {
		title: 'Auto-Classification Engine',
		description: 'Enables real-time AI scanning of documents during ingestion to suggest security levels and discovery tags.',
		pros: ['Automates tedious metadata entry', 'Detects sensitive data (SSN, CC) automatically'],
		cons: ['Increases ingestion time', 'Requires LLM or CPU resources'],
		tip: 'Keep this enabled to ensure "High-Water Mark" security compliance.',
		cost: 'LOW'
	},
	'classification.tier': {
		title: 'Classification AI Tier',
		description: 'Selects the intelligence level used for scanning document content.',
		pros: [
			'LOCAL: Zero-cost, 100% private, regex-based.',
			'OLLAMA: GPU-accelerated local intelligence.',
			'CLOUD: Highest accuracy using OpenAI/Gemini.'
		],
		cons: ['Cloud tiers involve data transfer costs'],
		tip: 'Use OLLAMA for the best balance of privacy and intelligence.',
		cost: 'VARIABLE'
	},
	'chat.engine': {
		title: 'Chat Engine (The Intelligence)',
		description: 'The Large Language Model (LLM) that generates answers based on retrieved document fragments.',
		pros: [
			'OLLAMA: Fully private, runs on your hardware.',
			'OPENAI: Highest analytical capability and reasoning.',
			'GOOGLE: Large context window and balanced performance.'
		],
		cons: [
			'OPENAI/GOOGLE: Data leaves the cluster for processing.'
		],
		tip: 'You can use OpenAI/Google for Chat while keeping Embeddings local for maximum cost efficiency.',
		cost: 'VARIABLE'
	},
	'chat.openai.key': {
		title: 'Chat OpenAI API Key',
		description: 'Specific key for the Chat LLM. Falls back to Embedding key if empty.',
		pros: ['Allows isolating chat costs from ingestion costs.'],
		cons: ['Requires separate configuration.'],
		tip: 'Leave empty to share the same key as the Embedding Provider.',
		cost: 'VARIABLE'
	},
	'chat.ollama.model': {
		title: 'Chat Ollama Model',
		description: 'The specific model name to use within Ollama for chat dialogue.',
		pros: ['"llama3" or "mistral" are excellent general-purpose choices.'],
		cons: ['Larger models require more VRAM.'],
		tip: 'Ensure the model is pre-downloaded on your Ollama server using "ollama pull".',
		cost: 'FREE'
	}
};

/**
 * Maps setting keys to help categories if a direct match isn't found.
 */
export function getHelp(key: string): HelpGuide | undefined {
	if (HELP_DATA[key]) return HELP_DATA[key];

	// Fallback mapping for dynamic fields
	if (key.startsWith('embeddings.openai')) return HELP_DATA['embeddings.openai.key'];
	if (key.startsWith('embeddings.ollama')) return HELP_DATA['embeddings.ollama.url'];
	if (key.startsWith('embeddings.google')) return HELP_DATA['embeddings.google.key'];
	if (key.startsWith('vectors.qdrant')) return HELP_DATA['vectors.qdrant.url'];
	if (key.startsWith('ingestion.chunk')) return HELP_DATA['ingestion.chunk_size'];
	if (key.startsWith('chat.openai')) return HELP_DATA['chat.openai.key'];
	if (key.startsWith('chat.ollama')) return HELP_DATA['chat.ollama.model'];

	return undefined;
}
