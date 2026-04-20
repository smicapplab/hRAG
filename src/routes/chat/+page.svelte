<script lang="ts">
	import { Send, Bot, FileText, ChevronRight } from 'lucide-svelte';
	import { getContext } from 'svelte';

	let query = $state('');
	const chatHistory = getContext<{
		isOpen: () => boolean;
		toggle: () => void;
		close: () => void;
	}>('chatHistory');

	const messages = [
		{
			role: 'user',
			content: 'How did our Asian revenue grow in Q4?'
		},
		{
			role: 'assistant',
			content:
				'Asian revenue grew by 14% in Q4, primarily driven by enterprise software licensing in Singapore and Vietnam. Key growth factors included new government contracts and infrastructure logistics optimization.',
			evidence: [
				{
					name: 'field_ops_logistics.md',
					page: 'Page 12',
					snippet: 'Singapore revenue increased from $4.2M to $5.1M in Q4 period...'
				},
				{
					name: 'rag_survey.pdf',
					page: 'Page 4',
					snippet: 'Optimization of logistics using vector search reduced overhead by 8%...'
				}
			]
		}
	];
</script>

<div class="flex h-full flex-1 flex-col overflow-hidden">
	<!-- Mobile History Toggle -->
	{#if !chatHistory.isOpen()}
		<div class="px-8 pt-4 lg:hidden">
			<button
				class="flex items-center gap-2 text-[10px] font-bold tracking-widest text-signal-blue uppercase"
				onclick={() => chatHistory.toggle()}
			>
				<ChevronRight size={14} class="rotate-180" />
				View History
			</button>
		</div>
	{:else}
		<div class="h-14 lg:hidden"></div>
		<!-- Spacer when history is open -->
	{/if}

	<!-- Messages Area -->
	<div class="custom-scrollbar flex-1 space-y-8 overflow-y-auto p-8">
		{#each messages as msg (msg.content)}
			<div class="mx-auto flex max-w-4xl gap-6 {msg.role === 'user' ? 'opacity-90' : ''}">
				<div
					class="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border
          {msg.role === 'user' ? 'border-border bg-muted' : 'border-signal-blue/20 bg-signal-blue'}"
				>
					{#if msg.role === 'user'}
						<span class="text-[10px] font-bold text-muted-foreground uppercase">ID</span>
					{:else}
						<Bot size={20} class="text-white" />
					{/if}
				</div>

				<div class="flex-1 space-y-6 pt-2">
					<div class="text-sm leading-relaxed text-foreground selection:bg-signal-blue/30">
						{msg.content}
					</div>

					{#if msg.evidence}
						<div class="space-y-3">
							<h4
								class="flex items-center gap-2 text-[10px] font-bold tracking-widest text-muted-foreground uppercase"
							>
								<ChevronRight size={10} />
								Supporting Intelligence
							</h4>
							<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
								{#each msg.evidence as doc (doc.name)}
									<button
										class="group rounded-sm border border-border bg-muted/30 p-3 text-left transition-all hover:border-signal-blue hover:bg-muted/50"
									>
										<div class="mb-2 flex items-center gap-2">
											<FileText
												size={14}
												class="text-muted-foreground group-hover:text-signal-blue"
											/>
											<span class="truncate font-mono text-[10px] font-bold text-foreground"
												>{doc.name} ({doc.page})</span
											>
										</div>
										<p class="line-clamp-2 text-[10px] leading-tight text-muted-foreground italic">
											"...{doc.snippet}"
										</p>
									</button>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>

	<!-- Input Area -->
	<div class="border-t border-border bg-background/80 p-8 backdrop-blur-md">
		<div class="group relative mx-auto max-w-4xl">
			<textarea
				bind:value={query}
				rows="1"
				placeholder="Query the Intelligence Vault..."
				class="w-full resize-none rounded-sm border border-border bg-muted/40 p-4 pr-14 font-mono text-sm tracking-wider text-foreground uppercase transition-all outline-none focus:border-signal-blue focus:bg-muted/60"
			></textarea>
			<button
				class="absolute right-3 bottom-3 rounded-sm bg-signal-blue p-2 text-white shadow-lg shadow-blue-900/20 transition-colors hover:bg-blue-500"
				disabled={!query.trim()}
			>
				<Send size={18} />
			</button>
		</div>
		<div class="mt-2 text-center">
			<p class="text-[9px] tracking-[0.2em] text-muted-foreground uppercase">
				hRAG Core: Intelligence Layer Active
			</p>
		</div>
	</div>
</div>

<style>
	.custom-scrollbar::-webkit-scrollbar {
		width: 4px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: transparent;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: var(--color-border);
		border-radius: 2px;
	}
</style>
