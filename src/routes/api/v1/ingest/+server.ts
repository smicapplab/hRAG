import { json, error } from '@sveltejs/kit';
import { ingestDocument } from '$lib/server/ingestion';
import { LanceDBVectorStore } from '$lib/server/vectors/lancedb';
import { TransformersEmbeddingProvider } from '$lib/server/vectors/transformers';

export const POST = async ({ request, locals }) => {
	if (!locals.user) throw error(401);

	const formData = await request.formData();
	const file = formData.get('file') as File;
	if (!file) throw error(400, 'No file provided');

	const buffer = Buffer.from(await file.arrayBuffer());
	const result = await ingestDocument(buffer, file.type);

	// Embedding and Storage
	const embedder = new TransformersEmbeddingProvider();
	const store = new LanceDBVectorStore(process.env.HRAG_VECTOR_STORE_PATH || './lancedb');

	const chunksWithVectors = await Promise.all(
		result.chunks.map(async (c) => ({
			text: c.text,
			vector: await embedder.embed(c.text)
		}))
	);

	await store.addDocument(
		crypto.randomUUID(), // docId
		chunksWithVectors,
		locals.user.id,
		[] // accessIds
	);

	return json({
		success: true,
		chunkCount: result.chunks.length,
		metadata: result.metadata
	});
};
