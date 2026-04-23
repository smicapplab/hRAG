<script lang="ts">
	import type { PageData } from './$types';
	import { 
		FileText, Download, Share2, Trash2, Tag, 
		Shield, User, Calendar, Database, Activity,
		Plus, X, ChevronLeft, AlertTriangle, Cpu,
		Check, Users, Eye, Layout, Maximize, ChevronRight
	} from 'lucide-svelte';
	import { invalidateAll, goto } from '$app/navigation';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';

	let { data }: { data: PageData } = $props();
	
	let isAddingTag = $state(false);
	let newTagName = $state('');

	let isSharing = $state(false);
	let shareTab = $state<'user' | 'group'>('user');
	let shareEmail = $state('');
	let sharePermission = $state('VIEW');
	let shareGroupId = $state('');
	
	let autocompleteResults = $state<any[]>([]);
	let showAutocomplete = $state(false);

	let showReader = $state(false);
	let readerFragments = $state<any[]>([]);
	let readerPage = $state(1);
	let readerTotalPages = $state(1);
	let readerLoading = $state(false);

	async function fetchFragments(page: number) {
		readerLoading = true;
		try {
			const res = await fetch(`/api/v1/documents/${data.document.id}/fragments?page=${page}&limit=5`);
			const resData = await res.json();
			readerFragments = resData.fragments || [];
			readerPage = resData.pagination.page;
			readerTotalPages = resData.pagination.totalPages;
		} catch (err) {
			console.error('Failed to fetch fragments:', err);
		} finally {
			readerLoading = false;
		}
	}

	$effect(() => {
		if (showReader) {
			fetchFragments(1);
		}
	});

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

	async function promoteTag(tagId: string) {
		try {
			const response = await fetch(`/api/v1/admin/tags/${tagId}/promote`, {
				method: 'POST'
			});
			if (response.ok) {
				await invalidateAll();
			}
		} catch (err) {
			console.error('Promotion failed:', err);
		}
	}

	async function searchUsers(q: string) {
		if (q.length < 2) {
			autocompleteResults = [];
			showAutocomplete = false;
			return;
		}
		const res = await fetch(`/api/v1/users/search?q=${encodeURIComponent(q)}`);
		const data = await res.json();
		autocompleteResults = data.users || [];
		showAutocomplete = true;
	}

	async function handleShare() {
		if (shareTab === 'user' && !shareEmail) return;
		if (shareTab === 'group' && !shareGroupId) return;

		try {
			const response = await fetch(`/api/v1/documents/${data.document.id}/share`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					email: shareTab === 'user' ? shareEmail : undefined, 
					groupId: shareTab === 'group' ? shareGroupId : undefined,
					permission: sharePermission 
				})
			});
			if (response.ok) {
				isSharing = false;
				shareEmail = '';
				await invalidateAll();
			} else {
				const err = await response.json();
				alert(`Sharing failed: ${err.error}`);
			}
		} catch (err) {
			console.error(err);
		}
	}

	async function revokeAccess(email: string) {
		if (!confirm(`Revoke access for ${email}?`)) return;
		try {
			const response = await fetch(`/api/v1/documents/${data.document.id}/share`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'REVOKE', email })
			});
			if (response.ok) {
				await invalidateAll();
			}
		} catch (err) {
			console.error(err);
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
	<div class="mb-6 flex items-center justify-between">
		<a 
			href="/documents" 
			class="inline-flex items-center gap-2 text-[10px] font-bold tracking-widest text-muted-foreground uppercase hover:text-signal-blue transition-colors"
		>
			<ChevronLeft size={14} />
			Back to Intelligence Registry
		</a>

		<div class="flex border border-border rounded-sm overflow-hidden">
			<button 
				onclick={() => showReader = false}
				class="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2
				{ !showReader ? 'bg-signal-blue text-white' : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'}"
			>
				<Layout size={12} /> Integrity
			</button>
			<button 
				onclick={() => showReader = true}
				class="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2
				{ showReader ? 'bg-signal-blue text-white' : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'}"
			>
				<Eye size={12} /> Fragment Reader
			</button>
		</div>
	</div>

	{#if !showReader}
		<!-- Header Region -->
		<div class="mb-8 flex flex-col justify-between gap-6 border-b border-border pb-8 md:flex-row md:items-end animate-in fade-in duration-300">
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
					onclick={() => isSharing = true}
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

		<div class="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-400">
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
								{#if tag.isAiGenerated && data.canEdit}
									<button 
										onclick={() => promoteTag(tag.id)}
										class="text-signal-green hover:text-green-400 transition-colors"
										title="PROMOTE TO CANONICAL"
									>
										<Check size={10} />
									</button>
								{/if}
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
						<div class="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
							<div class="flex gap-2">
								<input 
									type="text" 
									bind:value={newTagName}
									placeholder={data.canCreateTag ? "SEARCH OR CREATE NEW LABEL..." : "SEARCH EXISTING LABELS..."}
									class="flex-1 h-9 rounded-sm border border-border bg-muted/50 px-4 font-mono text-[11px] uppercase outline-none focus:border-signal-blue"
									onkeydown={(e) => e.key === 'Enter' && (data.canCreateTag || data.suggestedTags.some(t => t.name === newTagName.trim().toUpperCase())) && addTag(newTagName)}
								/>
								{#if data.canCreateTag}
									<button 
										onclick={() => addTag(newTagName)}
										class="h-9 px-4 bg-signal-blue text-white text-[10px] font-bold uppercase tracking-widest rounded-sm hover:bg-blue-600 transition-colors"
									>
										Commit
									</button>
								{/if}
							</div>

							{#if data.suggestedTags.length > 0}
								<div>
									<span class="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-3 block">
										{data.canCreateTag ? 'Available System Taxonomy' : 'Select from Registry'}
									</span>
									<div class="flex flex-wrap gap-2">
										{#each data.suggestedTags.filter(t => t.name.includes(newTagName.trim().toUpperCase())) as tag}
											<button 
												onclick={() => addTag(tag.name)}
												class="px-2 py-1.5 rounded-sm border border-border bg-muted/30 text-[10px] font-mono text-muted-foreground uppercase hover:border-signal-blue hover:text-signal-blue hover:bg-signal-blue/5 transition-all flex items-center gap-2 group"
											>
												<Plus size={10} class="text-signal-blue opacity-0 group-hover:opacity-100 transition-opacity" />
												{tag.name}
											</button>
										{/each}
									</div>
								</div>
							{/if}
						</div>
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
	{:else}
		<!-- Fragment Reader View -->
		<div class="flex-1 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
			<div class="mb-4 flex items-center justify-between">
				<div>
					<h2 class="text-sm font-bold text-foreground uppercase tracking-[0.2em] flex items-center gap-2">
						<Eye size={16} class="text-signal-blue" /> Content Fragment Stream
					</h2>
					<p class="text-[9px] text-muted-foreground uppercase font-mono mt-0.5">
						Source: {data.document.name} // Page {readerPage} of {readerTotalPages}
					</p>
				</div>

				<div class="flex items-center gap-3">
					<div class="flex items-center gap-1 bg-muted/30 border border-border rounded-sm p-1">
						<button 
							onclick={() => readerPage > 1 && fetchFragments(readerPage - 1)}
							disabled={readerPage <= 1 || readerLoading}
							class="p-1 text-muted-foreground hover:text-signal-blue disabled:opacity-30 transition-colors"
						>
							<ChevronLeft size={16} />
						</button>
						<span class="px-3 font-mono text-[10px] font-bold text-foreground">
							{readerPage.toString().padStart(2, '0')} / {readerTotalPages.toString().padStart(2, '0')}
						</span>
						<button 
							onclick={() => readerPage < readerTotalPages && fetchFragments(readerPage + 1)}
							disabled={readerPage >= readerTotalPages || readerLoading}
							class="p-1 text-muted-foreground hover:text-signal-blue disabled:opacity-30 transition-colors"
						>
							<ChevronRight size={16} />
						</button>
					</div>
					<button 
						onclick={() => window.open(`/api/v1/documents/${data.document.id}/download`, '_blank')}
						class="flex h-8 items-center gap-2 rounded-sm border border-signal-blue/20 bg-signal-blue/10 px-3 text-[10px] font-bold tracking-widest text-signal-blue uppercase hover:bg-signal-blue hover:text-white transition-all"
					>
						<Maximize size={12} /> Full Document
					</button>
				</div>
			</div>

			<div class="flex-1 bg-muted/5 border border-border rounded-sm overflow-y-auto custom-scrollbar p-6 space-y-8">
				{#if readerLoading}
					<div class="h-full flex flex-col items-center justify-center space-y-4 opacity-40">
						<div class="w-8 h-8 border-2 border-signal-blue border-t-transparent rounded-full animate-spin"></div>
						<p class="text-[10px] font-mono uppercase tracking-widest">Decrypting Fragments...</p>
					</div>
				{:else}
					{#each readerFragments as fragment, i}
						<div class="relative group">
							<div class="absolute -left-4 top-0 bottom-0 w-px bg-signal-blue/20 group-hover:bg-signal-blue transition-colors"></div>
							<div class="space-y-3">
								<div class="flex items-center gap-3">
									<span class="text-[8px] font-bold font-mono px-1.5 py-0.5 bg-signal-blue/10 text-signal-blue border border-signal-blue/20 rounded-sm">
										FRAG_{(readerPage - 1) * 5 + i + 1}
									</span>
									{#if fragment.metadata?.page}
										<span class="text-[8px] font-bold font-mono text-muted-foreground uppercase">Original Page: {fragment.metadata.page}</span>
									{/if}
								</div>
								<p class="text-sm leading-relaxed text-foreground/90 font-sans selection:bg-signal-blue/30 whitespace-pre-wrap">
									{fragment.text}
								</p>
							</div>
						</div>
					{:else}
						<div class="h-full flex flex-col items-center justify-center opacity-40">
							<AlertTriangle size={32} class="text-signal-orange mb-3" />
							<p class="text-[10px] font-mono uppercase tracking-widest">No text fragments indexed for this resource.</p>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	{/if}
</div>

{#if isSharing}
	<div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
		<div class="w-full max-w-lg border border-border bg-background shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
			<!-- Modal Header -->
			<div class="p-6 border-b border-border space-y-1">
				<h3 class="text-sm font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
					<Share2 size={16} class="text-signal-blue" />
					Share Intelligence Fragment
				</h3>
				<p class="text-[10px] text-muted-foreground uppercase font-mono truncate">{data.document.name}</p>
			</div>

			<!-- Tab Navigation -->
			<div class="flex border-b border-border bg-muted/20">
				<button 
					onclick={() => shareTab = 'user'}
					class="flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2
					{shareTab === 'user' ? 'bg-background text-signal-blue border-b-2 border-signal-blue' : 'text-muted-foreground hover:bg-muted/40'}"
				>
					<User size={12} /> Share with User
				</button>
				<button 
					onclick={() => shareTab = 'group'}
					class="flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2
					{shareTab === 'group' ? 'bg-background text-signal-blue border-b-2 border-signal-blue' : 'text-muted-foreground hover:bg-muted/40'}"
				>
					<Users size={12} /> Share with Group
				</button>
			</div>

			<div class="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
				{#if shareTab === 'user'}
					<div class="space-y-4">
						<div class="space-y-2 relative">
							<label for="share-email-id" class="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Recipient Identity (Email)</label>
							<input 
								id="share-email-id"
								type="email" 
								bind:value={shareEmail}
								oninput={(e) => searchUsers((e.target as HTMLInputElement).value)}
								placeholder="user@hrag.local"
								class="w-full h-10 bg-muted/30 border border-border rounded-sm px-4 text-xs outline-none focus:border-signal-blue font-mono"
							/>
							{#if showAutocomplete && autocompleteResults.length > 0}
								<div class="absolute z-10 w-full mt-1 bg-background border border-border shadow-xl rounded-sm overflow-hidden animate-in fade-in slide-in-from-top-1">
									{#each autocompleteResults as user}
										<button 
											onclick={() => { shareEmail = user.email; showAutocomplete = false; }}
											class="w-full p-3 text-left hover:bg-muted/50 transition-colors border-b border-border last:border-0"
										>
											<p class="text-xs font-bold text-foreground">{user.name}</p>
											<p class="text-[10px] text-muted-foreground font-mono">{user.email}</p>
										</button>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				{:else}
					<div class="space-y-4">
						<div class="space-y-2">
							<label for="share-group-id" class="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Select Target Group Scope</label>
							<select 
								id="share-group-id"
								bind:value={shareGroupId}
								class="w-full h-10 bg-muted/30 border border-border rounded-sm px-4 text-xs outline-none focus:border-signal-blue font-mono uppercase"
							>
								<option value="">Select a Group...</option>
								{#each data.userGroups as group}
									<option value={group.id}>{group.name}</option>
								{/each}
							</select>
						</div>
					</div>
				{/if}

				<div class="space-y-2">
					<span class="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Permission Scope</span>
					<div class="grid grid-cols-2 gap-2">
						<button 
							onclick={() => sharePermission = 'VIEW'}
							class="h-10 border text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all
							{sharePermission === 'VIEW' ? 'bg-signal-blue text-white border-signal-blue' : 'border-border text-muted-foreground hover:border-foreground'}"
						>
							View Only
						</button>
						<button 
							onclick={() => sharePermission = 'EDIT'}
							class="h-10 border text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all
							{sharePermission === 'EDIT' ? 'bg-signal-blue text-white border-signal-blue' : 'border-border text-muted-foreground hover:border-foreground'}"
						>
							Edit Access
						</button>
					</div>
				</div>

				<!-- Active Shares List -->
				{#if data.currentPermissions.length > 0}
					<div class="pt-4 border-t border-border">
						<span class="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-3 block">Active Authorizations</span>
						<div class="space-y-2">
							{#each data.currentPermissions as perm}
								<div class="flex items-center justify-between p-2 rounded-sm bg-muted/20 border border-border/50">
									<div class="min-w-0">
										<p class="text-[10px] font-bold text-foreground truncate">{perm.user.name}</p>
										<p class="text-[9px] text-muted-foreground font-mono truncate">{perm.user.email}</p>
									</div>
									<div class="flex items-center gap-3">
										<span class="text-[8px] font-bold border border-signal-blue/20 bg-signal-blue/10 text-signal-blue px-1.5 py-0.5 rounded-sm uppercase">
											{perm.permission}
										</span>
										<button 
											onclick={() => revokeAccess(perm.user.email)}
											class="text-muted-foreground hover:text-signal-red transition-colors"
											title="REVOKE ACCESS"
										>
											<X size={14} />
										</button>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<div class="p-6 border-t border-border flex gap-3">
				<button 
					onclick={() => { isSharing = false; showAutocomplete = false; }}
					class="flex-1 h-10 border border-border text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted transition-colors rounded-sm"
				>
					Close
				</button>
				<button 
					onclick={handleShare}
					disabled={(shareTab === 'user' && !shareEmail) || (shareTab === 'group' && !shareGroupId)}
					class="flex-1 h-10 bg-signal-blue text-white text-[10px] font-bold uppercase tracking-widest hover:bg-blue-600 disabled:opacity-50 transition-all rounded-sm"
				>
					Grant Access
				</button>
			</div>
		</div>
	</div>
{/if}

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
