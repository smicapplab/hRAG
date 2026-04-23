<script lang="ts">
	import type { PageData } from './$types';
	import { Download, Search, Filter, Database, Tag, ChevronRight, X } from 'lucide-svelte';
	import { goto } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	let query = $state('');
	let isSearching = $state(false);
	let results = $state<any[]>([]);
	let selectedTags = $state<string[]>([]);
	let selectedClassification = $state<string>('');
	let offset = $state(0);
	const limit = 20;

	// Remove the $effect that calls handleSearch on tag change to avoid redundancy
	// We will call handleSearch explicitly when filters change

	async function handleSearch(e?: KeyboardEvent | { resetOffset?: boolean }) {
		if (e && 'key' in e && e.key !== 'Enter') return;
		
		const shouldResetOffset = (e && 'resetOffset' in e && e.resetOffset) || (e && 'key' in e);
		if (shouldResetOffset) {
			offset = 0;
		}

		if (!query.trim() && selectedTags.length === 0 && !selectedClassification) {
			results = [];
			return;
		}

		isSearching = true;
		try {
			const response = await fetch('/api/v1/search', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					query, 
					tags: selectedTags,
					classification: selectedClassification || undefined,
					limit,
					offset
				})
			});
			if (response.ok) {
				const data = await response.json();
				results = data.results || [];
			}
		} catch (err) {
			console.error('Search failed:', err);
		} finally {
			isSearching = false;
		}
	}

	function toggleTag(tagName: string) {
		if (selectedTags.includes(tagName)) {
			selectedTags = selectedTags.filter(t => t !== tagName);
		} else {
			selectedTags = [...selectedTags, tagName];
		}
		handleSearch({ resetOffset: true });
	}

	function changeClassification(cls: string) {
		selectedClassification = selectedClassification === cls ? '' : cls;
		handleSearch({ resetOffset: true });
	}

	function nextPage() {
		if (results.length < limit) return;
		offset += limit;
		handleSearch();
	}

	function prevPage() {
		if (offset === 0) return;
		offset = Math.max(0, offset - limit);
		handleSearch();
	}

	function getClassificationClass(cls: string) {
		switch (cls) {
			case 'CONFIDENTIAL':
				return 'bg-signal-orange/10 text-signal-orange border-signal-orange/20';
			case 'INTERNAL':
				return 'bg-signal-blue/10 text-signal-blue border-signal-blue/20';
			case 'RESTRICTED':
				return 'bg-signal-red/10 text-signal-red border-signal-red/20';
			default:
				return 'bg-signal-green/10 text-signal-green border-signal-green/20';
		}
	}
</script>

<div class="flex h-full overflow-hidden">
	<!-- Discovery Sidebar -->
	<aside class="w-64 border-r border-border bg-muted/10 backdrop-blur-md flex flex-col hidden lg:flex">
		<div class="p-4 border-b border-border bg-muted/40">
			<div class="flex items-center gap-2">
				<Filter size={14} class="text-signal-blue" />
				<span class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Discovery Filters</span>
			</div>
		</div>
		
		<div class="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
			<div>
				<h4 class="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Content Tags</h4>
				<div class="flex flex-wrap gap-2">
					{#each data.tags as tag}
						<button 
							onclick={() => toggleTag(tag.name)}
							class="px-2 py-1 rounded-sm text-[10px] font-mono border transition-all
							{selectedTags.includes(tag.name) 
								? 'bg-signal-blue text-white border-signal-blue shadow-[0_0_8px_rgba(37,99,235,0.4)]' 
								: 'bg-muted/50 text-muted-foreground border-border hover:border-signal-blue/50'}"
						>
							{tag.name}
						</button>
					{/each}
				</div>
			</div>

			<div>
				<h4 class="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Clearance Level</h4>
				<div class="space-y-2">
					{#each ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'] as cls}
						<button 
							onclick={() => changeClassification(cls)}
							class="w-full flex items-center justify-between p-2 border rounded-sm transition-all
							{selectedClassification === cls 
								? 'bg-signal-blue/10 border-signal-blue text-signal-blue' 
								: 'bg-muted/30 border-border text-muted-foreground hover:border-signal-blue/30 hover:text-foreground'}"
						>
							<span class="text-[9px] font-mono uppercase">{cls}</span>
							{#if selectedClassification === cls}
								<div class="w-1.5 h-1.5 rounded-full bg-signal-blue animate-pulse"></div>
							{/if}
						</button>
					{/each}
				</div>
			</div>

			<div>
				<h4 class="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Search Logic</h4>
				<div class="space-y-2">
					<div class="flex items-center justify-between p-2 bg-muted/30 border border-border rounded-sm">
						<span class="text-[9px] font-mono uppercase">Multi-Tag Mode</span>
						<span class="text-[9px] font-mono font-bold text-signal-green">OR</span>
					</div>
					<div class="flex items-center justify-between p-2 bg-muted/30 border border-border rounded-sm opacity-50">
						<span class="text-[9px] font-mono uppercase">Semantic Only</span>
						<div class="w-2 h-2 rounded-full bg-border"></div>
					</div>
				</div>
			</div>
		</div>

		<div class="p-4 border-t border-border bg-muted/20">
			<div class="p-3 border border-signal-blue/20 bg-signal-blue/5 rounded-sm">
				<p class="text-[9px] text-muted-foreground leading-relaxed uppercase">AI-generated tags are filtered based on your effective clearance level.</p>
			</div>
		</div>
	</aside>

	<!-- Main Search Area -->
	<div class="flex-1 flex flex-col space-y-6 overflow-hidden p-4 lg:p-8">
		<!-- Header -->
		<div class="flex items-center justify-between">
			<div>
				<h2 class="text-xl font-bold text-foreground">
					Search <span class="text-signal-blue uppercase">Terminal</span>
				</h2>
				<p class="mt-1 text-[10px] tracking-widest text-muted-foreground uppercase">
					Direct Vector & Relational Query Engine
				</p>
			</div>
			<div class="flex gap-2">
				{#if selectedTags.length > 0 || selectedClassification}
					<button 
						onclick={() => { selectedTags = []; selectedClassification = ''; handleSearch({ resetOffset: true }); }}
						class="flex items-center gap-2 rounded-sm border border-signal-red/20 bg-signal-red/10 px-3 py-1.5 text-[10px] font-bold tracking-widest text-signal-red uppercase transition-colors hover:bg-signal-red hover:text-white"
					>
						<X size={12} />
						Clear Filters
					</button>
				{/if}
				<button
					class="flex items-center gap-2 rounded-sm border border-signal-blue/20 bg-signal-blue/10 px-3 py-1.5 text-[10px] font-bold tracking-widest text-signal-blue uppercase transition-colors hover:bg-signal-blue hover:text-white"
				>
					<Database size={12} />
					Export Audit Trail
				</button>
			</div>
		</div>

		<!-- Search Bar -->
		<div class="relative group">
			<Search class="absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-signal-blue transition-colors" size={18} />
			<input
				type="text"
				bind:value={query}
				onkeydown={handleSearch}
				placeholder={isSearching ? 'SEARCHING...' : 'QUERY THE INTELLIGENCE VAULT...'}
				class="w-full rounded-sm border border-border bg-muted/30 p-4 pl-12 font-mono text-sm tracking-wider text-foreground uppercase transition-colors outline-none focus:border-signal-blue focus:bg-muted/50"
				disabled={isSearching}
			/>
			{#if selectedTags.length > 0 || selectedClassification}
				<div class="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
					<span class="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Active Filters:</span>
					<div class="flex items-center gap-2">
						{#if selectedClassification}
							<div class="px-1.5 py-0.5 rounded-sm bg-signal-blue/20 border border-signal-blue/30 text-[8px] text-signal-blue font-bold uppercase">
								{selectedClassification}
							</div>
						{/if}
						{#if selectedTags.length > 0}
							<div class="flex -space-x-1">
								{#each selectedTags.slice(0, 3) as tag}
									<div class="w-4 h-4 rounded-full bg-signal-blue border border-background flex items-center justify-center text-[8px] text-white font-bold" title={tag}>
										{tag[0]}
									</div>
								{/each}
								{#if selectedTags.length > 3}
									<div class="w-4 h-4 rounded-full bg-muted border border-background flex items-center justify-center text-[8px] text-muted-foreground font-bold">
										+{selectedTags.length - 3}
									</div>
								{/if}
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<!-- Results Grid -->
		<div
			class="flex flex-1 flex-col overflow-hidden rounded-sm border border-border bg-muted/10 backdrop-blur-sm"
		>
			<div class="overflow-x-auto custom-scrollbar">
				<table class="w-full border-collapse text-left">
					<thead>
						<tr
							class="border-b border-border bg-muted/50 text-[10px] font-bold tracking-widest text-muted-foreground uppercase"
						>
							<th class="p-4">Resource / Identity</th>
							<th class="p-4">Uploader</th>
							<th class="p-4">Classification</th>
							<th class="p-4">Relevance</th>
							<th class="p-4">Timestamp</th>
							<th class="p-4 text-right">Operations</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border font-mono">
						{#each results as result}
							<tr 
								onclick={() => goto(`/documents/${result.docId}`)}
								class="group transition-colors hover:bg-signal-blue/5 cursor-pointer"
							>
								<td class="max-w-md p-4">
									<div class="flex flex-col">
										<div class="flex items-center gap-2 mb-2">
											<span class="text-xs leading-none font-bold text-foreground uppercase"
												>{result.name}</span
											>
											{#if result.tags}
												<div class="flex gap-1">
													{#each result.tags as tag}
														<span class="px-1 py-0.5 rounded-sm bg-muted text-[8px] text-muted-foreground border border-border">{tag}</span>
													{/each}
												</div>
											{/if}
										</div>
										<span class="line-clamp-2 text-[10px] text-muted-foreground italic leading-relaxed">
											MATCH: "{result.text}"
										</span>
									</div>
								</td>
								<td class="p-4 text-[11px] tracking-tighter text-muted-foreground uppercase">
									{result.ownerId.slice(0, 8)}
								</td>
								<td class="p-4">
									<span
										class="rounded-sm border px-2 py-0.5 text-[9px] font-bold {getClassificationClass(
											result.classification
										)}"
									>
										{result.classification}
									</span>
								</td>
								<td class="p-4 text-[11px] font-bold text-signal-blue">
									{result.score.toFixed(3)}
								</td>
								<td class="p-4 text-[11px] text-muted-foreground">
									{new Date(result.updatedAt).toISOString().split('T')[0]}
								</td>
								<td class="p-4 text-right">
									<button
										onclick={(e) => { e.stopPropagation(); window.location.href = `/api/v1/documents/${result.docId}/download`; }}
										class="text-muted-foreground transition-colors hover:text-signal-blue"
										title="SECURE DOWNLOAD (60S TTL)"
									>
										<Download size={16} />
									</button>
								</td>
							</tr>
						{:else}
							<tr>
								<td
									colspan="6"
									class="p-12 text-center"
								>
									<div class="flex flex-col items-center justify-center opacity-40">
										<Tag size={32} class="mb-2" />
										<p class="text-[10px] uppercase tracking-[0.2em] text-foreground">
											{#if isSearching}
												Processing vector query...
											{:else if query || selectedTags.length > 0}
												No authorized records match this discovery cluster.
											{:else}
												Awaiting query pattern or tag selection...
											{/if}
										</p>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Empty State / Footer -->
			<div class="mt-auto flex items-center justify-between border-t border-border bg-muted/30 p-4">
				<p class="text-[10px] tracking-widest text-muted-foreground uppercase">
					Showing <span class="text-foreground">{results.length}</span> fragments (Offset: {offset})
				</p>
				<div class="flex gap-1">
					<button
						onclick={prevPage}
						disabled={offset === 0}
						class="rounded-sm border border-border bg-muted px-2 py-1 text-[10px] text-muted-foreground font-bold hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
						>PREV</button
					>
					<button
						onclick={nextPage}
						disabled={results.length < limit}
						class="rounded-sm border border-border bg-muted px-2 py-1 text-[10px] text-muted-foreground font-bold hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
						>NEXT</button
					>
				</div>
			</div>
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
