<script lang="ts">
	import type { PageData } from './$types';
	import { 
		Tag, Shield, ArrowRightLeft, CheckCircle, 
		AlertCircle, Trash2, Info, Search
	} from 'lucide-svelte';
	import { invalidateAll } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state('');
	let selectedSourceId = $state('');
	let selectedTargetId = $state('');
	let isProcessing = $state(false);

	const filteredTags = $derived(
		data.allTags.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
	);

	async function promoteTag(id: string) {
		if (isProcessing) return;
		isProcessing = true;
		try {
			const response = await fetch(`/api/v1/admin/tags/${id}/promote`, {
				method: 'POST'
			});
			if (response.ok) {
				await invalidateAll();
			}
		} catch (err) {
			console.error('Promotion failed:', err);
		} finally {
			isProcessing = false;
		}
	}

	async function mergeTags() {
		if (!selectedSourceId || !selectedTargetId || selectedSourceId === selectedTargetId) return;
		if (isProcessing) return;

		const source = data.allTags.find(t => t.id === selectedSourceId);
		const target = data.allTags.find(t => t.id === selectedTargetId);

		if (!confirm(`Merge "${source?.name}" into "${target?.name}"? This will move all document associations and delete "${source?.name}".`)) return;

		isProcessing = true;
		try {
			const response = await fetch('/api/v1/admin/tags/merge', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					sourceTagId: selectedSourceId, 
					targetTagId: selectedTargetId 
				})
			});
			if (response.ok) {
				selectedSourceId = '';
				selectedTargetId = '';
				await invalidateAll();
			}
		} catch (err) {
			console.error('Merge failed:', err);
		} finally {
			isProcessing = false;
		}
	}
</script>

<div class="flex h-full flex-col overflow-hidden p-4 lg:p-8 space-y-8">
	<!-- Header -->
	<div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border pb-8">
		<div>
			<h1 class="text-2xl font-bold text-foreground flex items-center gap-3">
				<Tag class="text-signal-blue" size={28} />
				Taxonomy <span class="text-signal-blue uppercase">Registry</span>
			</h1>
			<p class="mt-1 text-[10px] tracking-widest text-muted-foreground uppercase font-mono">
				Governance Loop: Canonical Promotion & Relational Merging
			</p>
		</div>

		<div class="flex gap-4">
			<div class="p-3 border border-signal-blue/20 bg-signal-blue/5 rounded-sm max-w-sm">
				<div class="flex items-center gap-2 mb-1">
					<Info size={12} class="text-signal-blue" />
					<span class="text-[9px] font-bold text-signal-blue uppercase tracking-widest">Taxonomy Rule</span>
				</div>
				<p class="text-[9px] text-muted-foreground leading-relaxed uppercase">
					Canonical tags are used as primary targets for AI auto-tagging. AI-generated tags are provisional.
				</p>
			</div>
		</div>
	</div>

	<div class="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-hidden">
		<!-- Left: Tag Table -->
		<div class="lg:col-span-8 flex flex-col space-y-4 overflow-hidden">
			<div class="relative">
				<label for="taxonomy-search" class="sr-only text-[9px]">Search Taxonomy</label>
				<Search class="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" size={14} />
				<input 
					id="taxonomy-search"
					type="text" 
					bind:value={searchQuery}
					placeholder="SEARCH TAXONOMY..."
					class="w-full h-10 bg-muted/20 border border-border rounded-sm pl-10 pr-4 text-[11px] font-mono uppercase outline-none focus:border-signal-blue transition-colors"
				/>
			</div>

			<div class="flex-1 border border-border rounded-sm bg-muted/10 overflow-hidden flex flex-col">
				<div class="overflow-x-auto custom-scrollbar flex-1">
					<table class="w-full border-collapse text-left">
						<thead>
							<tr class="border-b border-border bg-muted/50 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
								<th class="p-4">Label</th>
								<th class="p-4">Status</th>
								<th class="p-4">Usage</th>
								<th class="p-4 text-right">Actions</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-border font-mono">
							{#each filteredTags as tag}
								<tr class="group hover:bg-signal-blue/5 transition-colors">
									<td class="p-4">
										<div class="flex items-center gap-2">
											<div class="w-2 h-2 rounded-full {tag.color.replace('text-', 'bg-')}"></div>
											<span class="text-xs font-bold text-foreground uppercase">{tag.name}</span>
										</div>
									</td>
									<td class="p-4">
										{#if tag.isAiGenerated}
											<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border border-signal-orange/20 bg-signal-orange/10 text-[9px] font-bold text-signal-orange uppercase">
												<AlertCircle size={10} /> AI Provisional
											</span>
										{:else}
											<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border border-signal-green/20 bg-signal-green/10 text-[9px] font-bold text-signal-green uppercase">
												<CheckCircle size={10} /> Canonical
											</span>
										{/if}
									</td>
									<td class="p-4 text-[11px] text-muted-foreground uppercase">
										{tag.docCount} Documents
									</td>
									<td class="p-4 text-right">
										<div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
											{#if tag.isAiGenerated}
												<button 
													onclick={() => promoteTag(tag.id)}
													disabled={isProcessing}
													class="p-1.5 rounded-sm border border-signal-green/20 text-signal-green hover:bg-signal-green hover:text-white transition-all"
													title="PROMOTE TO CANONICAL"
												>
													<CheckCircle size={14} />
												</button>
											{/if}
											<button 
												onclick={() => selectedSourceId = tag.id}
												class="p-1.5 rounded-sm border border-signal-blue/20 text-signal-blue hover:bg-signal-blue hover:text-white transition-all"
												title="USE AS MERGE SOURCE"
											>
												<ArrowRightLeft size={14} />
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>

		<!-- Right: Governance Tools -->
		<aside class="lg:col-span-4 space-y-6">
			<section class="border border-border rounded-sm bg-muted/20 p-6 space-y-6">
				<div class="flex items-center gap-2 mb-2 border-b border-border pb-4">
					<ArrowRightLeft size={16} class="text-signal-blue" />
					<h3 class="text-[11px] font-bold text-foreground uppercase tracking-widest">Merge Processor</h3>
				</div>

				<div class="space-y-4">
					<div class="space-y-2">
						<label for="source-tag" class="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Source Tag (Redundant)</label>
						<select 
							id="source-tag"
							bind:value={selectedSourceId}
							class="w-full h-10 bg-muted/40 border border-border rounded-sm px-3 text-[11px] font-mono uppercase outline-none focus:border-signal-red transition-colors"
						>
							<option value="">SELECT SOURCE...</option>
							{#each data.allTags as tag}
								<option value={tag.id}>{tag.name} ({tag.docCount})</option>
							{/each}
						</select>
					</div>

					<div class="flex justify-center py-2">
						<ArrowRightLeft size={20} class="text-muted-foreground rotate-90" />
					</div>

					<div class="space-y-2">
						<label for="target-tag" class="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Target Tag (Canonical)</label>
						<select 
							id="target-tag"
							bind:value={selectedTargetId}
							class="w-full h-10 bg-muted/40 border border-border rounded-sm px-3 text-[11px] font-mono uppercase outline-none focus:border-signal-green transition-colors"
						>
							<option value="">SELECT TARGET...</option>
							{#each data.allTags as tag}
								<option value={tag.id}>{tag.name} ({tag.docCount})</option>
							{/each}
						</select>
					</div>

					<button 
						onclick={mergeTags}
						disabled={!selectedSourceId || !selectedTargetId || selectedSourceId === selectedTargetId || isProcessing}
						class="w-full h-10 bg-signal-blue text-white text-[10px] font-bold uppercase tracking-widest rounded-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-4"
					>
						EXECUTE ATOMIC MERGE
					</button>

					<p class="text-[9px] text-muted-foreground leading-relaxed uppercase italic">
						Note: Merging is permanent. Document associations will be updated and the source tag will be purged.
					</p>
				</div>
			</section>

			<section class="border border-signal-orange/20 bg-signal-orange/5 rounded-sm p-6">
				<div class="flex items-center gap-2 mb-4">
					<Shield size={16} class="text-signal-orange" />
					<h3 class="text-[11px] font-bold text-signal-orange uppercase tracking-widest">Security Advisory</h3>
				</div>
				<p class="text-[10px] text-muted-foreground leading-relaxed uppercase">
					Taxonomy changes affect document discovery across the entire fleet. Large-scale merges should be performed during maintenance windows.
				</p>
			</section>
		</aside>
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
