<script lang="ts">
	import type { PageData } from './$types';
	import { 
		FileText, Download, Share2, Trash2, Tag, 
		Shield, User, Calendar, Database, Activity,
		Plus, X, ChevronLeft, AlertTriangle, Cpu
	} from 'lucide-svelte';
	import { invalidateAll, goto } from '$app/navigation';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';

	let { data }: { data: PageData } = $props();
	
	let isAddingTag = $state(false);
	let newTagName = $state('');

	async function addTag(tagName: string) {
		if (!tagName.trim()) return;
		try {
			const response = await fetch(`/api/v1/documents/${data.document.id}/tags`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ tagName })
			});
			if (response.ok) {
				await invalidateAll();
				newTagName = '';
				isAddingTag = false;
			}
		} catch (err) {
			console.error('Failed to add tag:', err);
		}
	}

	async function removeTag(tagName: string) {
		try {
			const response = await fetch(`/api/v1/documents/${data.document.id}/tags`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ tagName })
			});
			if (response.ok) {
				await invalidateAll();
			}
		} catch (err) {
			console.error('Failed to remove tag:', err);
		}
	}

	async function handleDelete() {
		if (!confirm(`Permanently purge intelligence fragment "${data.document.name}"?`)) return;
		try {
			const response = await fetch(`/api/v1/documents/${data.document.id}`, {
				method: 'DELETE'
			});
			if (response.ok) {
				goto('/documents');
			}
		} catch (err) {
			console.error('Delete failed:', err);
		}
	}

	function getClassificationClass(cls: string) {
		switch (cls) {
			case 'CONFIDENTIAL': return 'border-signal-orange/30 text-signal-orange bg-signal-orange/10';
			case 'RESTRICTED': return 'border-signal-red/30 text-signal-red bg-signal-red/10';
			case 'PUBLIC': return 'border-signal-green/30 text-signal-green bg-signal-green/10';
			default: return 'border-border text-muted-foreground bg-muted/50';
		}
	}
</script>

<div class="flex h-full flex-col overflow-hidden p-4 lg:p-8">
	<!-- Top Navigation -->
	<div class="mb-6">
		<a 
			href="/documents" 
			class="inline-flex items-center gap-2 text-[10px] font-bold tracking-widest text-muted-foreground uppercase hover:text-signal-blue transition-colors"
		>
			<ChevronLeft size={14} />
			Back to Intelligence Registry
		</a>
	</div>

	<!-- Header Region -->
	<div class="mb-8 flex flex-col justify-between gap-6 border-b border-border pb-8 md:flex-row md:items-end">
		<div class="flex-1 min-w-0">
			<div class="flex items-center gap-3 mb-2">
				<div class="w-10 h-10 rounded-sm bg-signal-blue/10 border border-signal-blue/20 flex items-center justify-center">
					<FileText class="text-signal-blue" size={24} />
				</div>
				<h1 class="text-2xl font-bold tracking-tight text-foreground uppercase truncate">
					{data.document.name}
				</h1>
			</div>
			<div class="flex flex-wrap items-center gap-4 text-[10px] tracking-widest text-muted-foreground uppercase font-mono">
				<div class="flex items-center gap-1.5">
					<Database size={12} class="text-signal-blue" />
					ID: <span class="text-foreground">{data.document.id.slice(0, 13)}...</span>
				</div>
				<div class="flex items-center gap-1.5">
					<Shield size={12} class="text-signal-orange" />
					Level: <span class="px-1.5 py-0.5 rounded-sm border {getClassificationClass(data.document.classification)}">{data.document.classification}</span>
				</div>
				<div class="flex items-center gap-1.5">
					<Activity size={12} class="text-signal-green" />
					Status: <StatusBadge 
						status={data.document.ingestionStatus === 'done' ? 'ok' : data.document.ingestionStatus === 'failed' ? 'error' : 'warn'} 
						label={data.document.ingestionStatus} 
					/>
				</div>
			</div>
		</div>

		<div class="flex items-center gap-3">
			<button 
				onclick={() => window.location.href = `/api/v1/documents/${data.document.id}/download`}
				class="flex h-9 items-center gap-2 rounded-sm border border-signal-blue/20 bg-signal-blue/10 px-4 text-xs font-bold tracking-widest text-signal-blue uppercase transition-all hover:bg-signal-blue hover:text-white"
			>
				<Download size={14} />
				Download
			</button>
			<button 
				class="flex h-9 items-center gap-2 rounded-sm border border-border bg-muted/50 px-4 text-xs font-bold tracking-widest text-muted-foreground uppercase transition-all hover:border-foreground hover:text-foreground"
			>
				<Share2 size={14} />
				Share
			</button>
			{#if data.isOwner}
				<button 
					onclick={handleDelete}
					class="flex h-9 items-center gap-2 rounded-sm border border-signal-red/20 bg-signal-red/10 px-4 text-xs font-bold tracking-widest text-signal-red uppercase transition-all hover:bg-signal-red hover:text-white"
				>
					<Trash2 size={14} />
					Purge
				</button>
			{/if}
		</div>
	</div>

	<div class="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-hidden">
		<!-- Left Column: Core Metadata & Tags -->
		<div class="lg:col-span-8 flex flex-col space-y-8 overflow-y-auto custom-scrollbar pr-2">
			<!-- Metadata Grid -->
			<section>
				<h3 class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
					<Shield size={12} /> Resource Integrity Details
				</h3>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-px bg-border border border-border rounded-sm overflow-hidden">
					<div class="bg-muted/10 p-4 space-y-1">
						<span class="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Uploader / Identity</span>
						<div class="flex items-center gap-2 text-sm font-mono text-foreground uppercase">
							<User size={14} class="text-signal-blue" />
							{data.document.uploader}
						</div>
					</div>
					<div class="bg-muted/10 p-4 space-y-1">
						<span class="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Access Group / Scope</span>
						<div class="flex items-center gap-2 text-sm font-mono text-foreground uppercase">
							<Database size={14} class="text-signal-blue" />
							{data.document.groupName}
						</div>
					</div>
					<div class="bg-muted/10 p-4 space-y-1">
						<span class="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Timestamp Added</span>
						<div class="flex items-center gap-2 text-sm font-mono text-foreground">
							<Calendar size={14} class="text-signal-blue" />
							{new Date(data.document.createdAt).toLocaleString()}
						</div>
					</div>
					<div class="bg-muted/10 p-4 space-y-1">
						<span class="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Last Intelligence Update</span>
						<div class="flex items-center gap-2 text-sm font-mono text-foreground">
							<Activity size={14} class="text-signal-green" />
							{new Date(data.document.updatedAt).toLocaleString()}
						</div>
					</div>
				</div>
			</section>

			<!-- Security Overrides & AI Insights -->
			{#if data.document.aiOverride}
				<section class="p-4 border border-signal-orange/30 bg-signal-orange/5 rounded-sm">
					<div class="flex items-start gap-3">
						<AlertTriangle class="text-signal-orange shrink-0" size={20} />
						<div>
							<h4 class="text-sm font-bold text-signal-orange uppercase mb-1">AI Security Override Active</h4>
							<p class="text-xs text-muted-foreground leading-relaxed">
								Internal classification engine detected higher sensitivity than provided metadata. 
								AI assessment: <span class="text-signal-orange font-bold font-mono">{data.document.aiClassification}</span>. 
								Access is restricted to authorized personnel with sufficient clearance.
							</p>
						</div>
					</div>
				</section>
			{/if}

			<!-- Multi-Label Content Discovery -->
			<section>
				<div class="flex items-center justify-between mb-4">
					<h3 class="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
						<Tag size={12} /> Discovery Taxonomy
					</h3>
					{#if data.canEdit}
						<button 
							onclick={() => isAddingTag = !isAddingTag}
							class="text-[10px] font-bold text-signal-blue uppercase tracking-widest flex items-center gap-1 hover:underline"
						>
							<Plus size={10} /> {isAddingTag ? 'Cancel' : 'Manage Tags'}
						</button>
					{/if}
				</div>

				<div class="flex flex-wrap gap-2 p-4 border border-border bg-muted/5 rounded-sm min-h-[60px]">
					{#each data.activeTags as tag}
						<div class="group flex items-center gap-2 px-2 py-1 rounded-sm border border-border bg-muted font-mono text-[11px] uppercase transition-colors hover:border-signal-blue">
							<Tag size={10} class={tag.isAiGenerated ? 'text-signal-green' : 'text-signal-blue'} />
							<span class="text-foreground">{tag.name}</span>
							{#if data.canEdit}
								<button 
									onclick={() => removeTag(tag.name)}
									class="text-muted-foreground hover:text-signal-red transition-colors"
								>
									<X size={10} />
								</button>
							{/if}
						</div>
					{:else}
						<p class="text-[10px] text-muted-foreground italic uppercase">No taxonomy labels assigned to this fragment.</p>
					{/each}
				</div>

				{#if isAddingTag && data.canEdit}
					<div class="mt-4 flex gap-2">
						<input 
							type="text" 
							bind:value={newTagName}
							placeholder="ENTER NEW TAXONOMY LABEL..."
							class="flex-1 h-9 rounded-sm border border-border bg-muted/50 px-4 font-mono text-[11px] uppercase outline-none focus:border-signal-blue"
							onkeydown={(e) => e.key === 'Enter' && addTag(newTagName)}
						/>
						<button 
							onclick={() => addTag(newTagName)}
							class="h-9 px-4 bg-signal-blue text-white text-[10px] font-bold uppercase tracking-widest rounded-sm hover:bg-blue-600"
						>
							Commit
						</button>
					</div>

					{#if data.suggestedTags.length > 0}
						<div class="mt-4">
							<span class="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Available Labels:</span>
							<div class="flex flex-wrap gap-2">
								{#each data.suggestedTags as tag}
									<button 
										onclick={() => addTag(tag.name)}
										class="px-2 py-1 rounded-sm border border-border bg-muted/30 text-[10px] font-mono text-muted-foreground uppercase hover:border-signal-blue hover:text-signal-blue transition-colors"
									>
										+ {tag.name}
									</button>
								{/each}
							</div>
						</div>
					{/if}
				{/if}
			</section>
		</div>

		<!-- Right Column: Process Log & Infrastructure Status -->
		<aside class="lg:col-span-4 space-y-8">
			<section class="border border-border rounded-sm bg-muted/10 overflow-hidden">
				<div class="p-3 border-b border-border bg-muted/30 flex items-center gap-2">
					<Cpu size={14} class="text-signal-blue" />
					<span class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Process Diagnostics</span>
				</div>
				<div class="p-4 space-y-4">
					<div class="flex items-center justify-between">
						<span class="text-[10px] text-muted-foreground uppercase tracking-widest">Vector Status</span>
						<span class="text-[10px] font-bold text-signal-green uppercase">Indexed</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-[10px] text-muted-foreground uppercase tracking-widest">OCR Fallback</span>
						<span class="text-[10px] font-bold text-muted-foreground uppercase">None</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-[10px] text-muted-foreground uppercase tracking-widest">Storage Node</span>
						<span class="text-[10px] font-bold text-foreground uppercase font-mono">garage-01</span>
					</div>
					<div class="pt-4 border-t border-border">
						<p class="text-[9px] text-muted-foreground leading-relaxed uppercase">
							This fragment is replicated across the cluster. Vector fragments are stored on S3-native LanceDB storage.
						</p>
					</div>
				</div>
			</section>

			<div class="p-4 border border-signal-blue/20 bg-signal-blue/5 rounded-sm">
				<div class="flex items-center gap-2 mb-2">
					<Shield size={14} class="text-signal-blue" />
					<span class="text-[10px] font-bold text-signal-blue uppercase tracking-widest">Audit Policy</span>
				</div>
				<p class="text-[9px] text-muted-foreground leading-relaxed uppercase">
					All access and modification of this intelligence fragment is logged in the Audit Vault. 
					Changes to classification or taxonomy trigger high-priority events.
				</p>
			</div>
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
