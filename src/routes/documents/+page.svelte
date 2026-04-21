<script lang="ts">
	import type { PageData } from './$types';
	import { FileText, Upload, Search, Trash2, ChevronLeft, ChevronRight, Download, Share2 } from 'lucide-svelte';
	import { invalidateAll, goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';

	let { data }: { data: PageData } = $props();

	let isUploading = $state(false);
	let fileInput: HTMLInputElement;
	let pollInterval: ReturnType<typeof setInterval> | null = null;

	let pagination = $derived(data.pagination);

	// Auto-refresh while any document is still pending/processing
	function startPollingIfNeeded() {
		const hasPending = data.documents.some(
			(d: any) => d.ingestionStatus === 'pending' || d.ingestionStatus === 'processing'
		);
		if (hasPending && !pollInterval) {
			pollInterval = setInterval(async () => {
				await invalidateAll();
				const stillPending = data.documents.some(
					(d: any) => d.ingestionStatus === 'pending' || d.ingestionStatus === 'processing'
				);
				if (!stillPending && pollInterval) {
					clearInterval(pollInterval);
					pollInterval = null;
				}
			}, 2500);
		}
	}

	onMount(() => startPollingIfNeeded());
	onDestroy(() => {
		if (pollInterval) clearInterval(pollInterval);
	});

	$effect(() => {
		// Re-evaluate whenever data changes
		data.documents;
		startPollingIfNeeded();
	});

	async function handleFileUpload(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		isUploading = true;

		const formData = new FormData();
		formData.append('file', file);
		formData.append('classification', 'INTERNAL');

		try {
			const response = await fetch('/api/v1/documents', {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				const result = await response.json();
				if (result.success) {
					await invalidateAll();
					startPollingIfNeeded();
				}
			} else {
				alert('Upload failed.');
			}
		} catch (err) {
			console.error(err);
			alert('Upload failed.');
		} finally {
			isUploading = false;
			if (fileInput) fileInput.value = '';
		}
	}

	async function handleDelete(docId: string, name: string) {
		if (
			!confirm(
				`Are you sure you want to delete "${name}"? This will remove all associated vector data.`
			)
		) {
			return;
		}

		try {
			const response = await fetch(`/api/v1/documents/${docId}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				await invalidateAll();
			} else {
				const err = await response.json();
				alert(`Delete failed: ${err.error || 'Server error'}`);
			}
		} catch (err) {
			console.error(err);
			alert('Delete failed.');
		}
	}

	function changePage(newPage: number) {
		if (newPage < 1 || newPage > pagination.totalPages) return;
		const url = new URL(window.location.href);
		url.searchParams.set('page', newPage.toString());
		goto(url.toString(), { keepFocus: true });
	}

	function handleDownload(docId: string) {
		// Standard authenticated redirect to the secure issuing endpoint
		window.location.href = `/api/v1/documents/${docId}/download`;
	}
</script>

<div class="flex h-full flex-col pt-8 lg:p-8">
	<!-- Header Control Region -->
	<div class="mb-8 flex flex-col justify-between gap-4 px-8 md:flex-row md:items-center lg:px-0">
		<div>
			<h1
				class="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground uppercase"
			>
				<FileText class="text-signal-blue" size={20} />
				Intel / Documents
			</h1>
			<p class="mt-1 text-[10px] tracking-widest text-muted-foreground uppercase">
				Manage global knowledge fragments
			</p>
		</div>

		<div class="flex items-center gap-3">
			<div class="group relative hidden sm:block">
				<Search size={14} class="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
				<input
					type="text"
					placeholder="FILTER FRAGMENTS..."
					class="h-9 w-64 rounded-sm border border-border bg-muted pr-4 pl-9 font-mono text-xs uppercase transition-colors outline-none group-hover:bg-muted/80 focus:border-signal-blue"
				/>
			</div>

			<button
				onclick={() => fileInput?.click()}
				class="flex h-9 items-center gap-2 rounded-sm bg-signal-blue px-4 text-xs font-bold tracking-widest text-white uppercase transition-colors hover:bg-blue-600 disabled:opacity-50"
				disabled={isUploading}
			>
				{#if isUploading}
					<div
						class="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"
					></div>
					UPLOADING...
				{:else}
					<Upload size={14} />
					UPLOAD
				{/if}
			</button>
			<input type="file" bind:this={fileInput} class="hidden" onchange={handleFileUpload} />
		</div>
	</div>

	<!-- Document Grid / Table (Industrial Density) -->
	<div class="-mx-8 flex flex-1 flex-col overflow-hidden border-t border-border lg:mx-0 lg:border">
		<!-- Table Header -->
		<div
			class="hidden grid-cols-12 items-center gap-4 border-b border-border bg-muted/50 p-4 text-[9px] font-bold tracking-widest text-muted-foreground uppercase sm:grid"
		>
			<div class="col-span-5">Identifier</div>
			<div class="col-span-2">Classification</div>
			<div class="col-span-2">Status</div>
			<div class="col-span-2">Timestamp Added</div>
			<div class="col-span-1 text-right">Actions</div>
		</div>

		<!-- Table Body -->
		<div class="custom-scrollbar flex-1 overflow-y-auto bg-background">
			{#each data.documents as doc}
				<div
					class="group grid items-center gap-4 border-b border-border/50 p-4 transition-colors hover:bg-muted/20 sm:grid-cols-12"
				>
					<div class="col-span-12 flex items-center gap-3 sm:col-span-5">
						<FileText size={16} class="shrink-0 text-signal-blue" />
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<p
									class="cursor-pointer truncate font-mono text-sm tracking-tight text-foreground transition-colors group-hover:text-signal-blue"
								>
									{doc.name}
								</p>
								{#if !doc.isOwner}
									<span
										class="rounded-full border border-signal-blue/20 bg-signal-blue/10 px-1.5 py-0.5 text-[8px] font-bold tracking-widest text-signal-blue uppercase"
										>Shared</span
									>
								{/if}
							</div>
							<p class="mt-1 text-[9px] text-muted-foreground uppercase sm:hidden">
								{new Date(doc.createdAt).toISOString()}
							</p>
						</div>
					</div>

					<div class="col-span-4 flex items-center sm:col-span-2">
						<span
							class="rounded-sm border px-2 py-0.5 text-[9px] font-bold tracking-widest whitespace-nowrap uppercase
              {doc.classification === 'CONFIDENTIAL'
								? 'border-signal-orange/20 bg-signal-orange/10 text-signal-orange'
								: doc.classification === 'PUBLIC'
									? 'border-signal-green/20 bg-signal-green/10 text-signal-green'
									: 'border-border bg-muted text-muted-foreground'}"
						>
							{doc.classification}
						</span>
					</div>

					<!-- Ingestion Status Badge -->
					<div class="col-span-4 flex items-center gap-1.5 sm:col-span-2">
						{#if doc.ingestionStatus === 'done'}
							<span
								class="rounded-sm border border-signal-green/20 bg-signal-green/10 px-2 py-0.5 text-[9px] font-bold tracking-widest text-signal-green uppercase"
								>Done</span
							>
						{:else if doc.ingestionStatus === 'processing'}
							<div class="h-2 w-2 shrink-0 animate-pulse rounded-full bg-signal-blue"></div>
							<span class="font-mono text-[9px] tracking-widest text-signal-blue uppercase"
								>Processing</span
							>
						{:else if doc.ingestionStatus === 'failed'}
							<span
								class="rounded-sm border border-signal-orange/20 bg-signal-orange/10 px-2 py-0.5 text-[9px] font-bold tracking-widest text-signal-orange uppercase"
								>Failed</span
							>
						{:else}
							<div class="h-2 w-2 shrink-0 animate-pulse rounded-full bg-muted-foreground"></div>
							<span class="font-mono text-[9px] tracking-widest text-muted-foreground uppercase"
								>Pending</span
							>
						{/if}
					</div>

					<div class="col-span-2 hidden sm:block">
						<p class="font-mono text-[10px] text-muted-foreground">
							{new Date(doc.createdAt).toISOString()}
						</p>
					</div>

					<div class="absolute right-4 flex justify-end gap-1 sm:relative sm:right-auto sm:col-span-1">
						<button
							onclick={() => handleDownload(doc.id)}
							class="rounded-sm p-2 text-muted-foreground opacity-0 transition-colors group-hover:opacity-100 hover:bg-signal-blue/10 hover:text-signal-blue"
							title="SECURE DOWNLOAD (60S TTL)"
						>
							<Download size={14} />
						</button>
						<button
							class="rounded-sm p-2 text-muted-foreground opacity-0 transition-colors group-hover:opacity-100 hover:bg-muted/80 hover:text-foreground"
							title="SHARE DOCUMENT"
						>
							<Share2 size={14} />
						</button>
						{#if doc.isOwner}
							<button
								onclick={() => handleDelete(doc.id, doc.name)}
								class="rounded-sm p-2 text-muted-foreground opacity-0 transition-colors group-hover:opacity-100 hover:bg-signal-red/10 hover:text-signal-red disabled:opacity-0"
								title="DELETE DOCUMENT"
							>
								<Trash2 size={14} />
							</button>
						{/if}
					</div>
				</div>
			{:else}
				<div class="p-8 text-center border-b border-border/50">
					<p class="text-xs text-muted-foreground font-mono uppercase tracking-widest">
						No intelligence documents stored.
					</p>
				</div>
			{/each}
		</div>

		<!-- Pagination Footer -->
		{#if pagination.totalPages > 1}
			<div class="flex items-center justify-between border-t border-border bg-muted/30 p-4">
				<p class="text-[10px] tracking-widest text-muted-foreground uppercase">
					Showing <span class="text-foreground">{data.documents.length}</span> of
					<span class="text-foreground">{pagination.total}</span> fragments
				</p>

				<div class="flex items-center gap-2">
					<button
						onclick={() => changePage(pagination.page - 1)}
						disabled={pagination.page <= 1}
						class="p-1 text-muted-foreground transition-colors hover:text-signal-blue disabled:opacity-30"
					>
						<ChevronLeft size={16} />
					</button>

					<span class="font-mono text-[10px] font-bold tracking-tighter uppercase">
						PAGE {pagination.page} / {pagination.totalPages}
					</span>

					<button
						onclick={() => changePage(pagination.page + 1)}
						disabled={pagination.page >= pagination.totalPages}
						class="p-1 text-muted-foreground transition-colors hover:text-signal-blue disabled:opacity-30"
					>
						<ChevronRight size={16} />
					</button>
				</div>
			</div>
		{/if}
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
