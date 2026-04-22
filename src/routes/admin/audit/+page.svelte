<script lang="ts">
	import type { PageData } from './$types';
	import {
		Shield,
		Search,
		Filter,
		Clock,
		User,
		HardDrive,
		Terminal,
		ChevronRight,
		AlertCircle
	} from 'lucide-svelte';
	import { slide } from 'svelte/transition';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state('');
	let selectedLog = $state<any | null>(null);

	let filteredLogs = $derived(
		searchQuery
			? data.logs.filter(
					(l) =>
						l.event.toLowerCase().includes(searchQuery.toLowerCase()) ||
						l.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
						l.id.toLowerCase().includes(searchQuery.toLowerCase())
				)
			: data.logs
	);

	function getEventColor(event: string) {
		if (event.includes('FAILURE') || event.includes('DENIED') || event.includes('REVOKED'))
			return 'text-signal-red';
		if (event.includes('OVERRIDE') || event.includes('LOGIN')) return 'text-signal-orange';
		if (event.includes('CREATE') || event.includes('UPLOAD')) return 'text-signal-green';
		return 'text-signal-blue';
	}
</script>

<div class="flex h-full flex-col space-y-6 overflow-hidden p-4 lg:p-8">
	<!-- Header Control Region -->
	<div class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
		<div>
			<h2 class="flex items-center gap-2 text-xl font-bold text-foreground uppercase">
				<Shield class="text-signal-orange" size={20} />
				Audit / <span class="text-signal-orange">Vault</span>
			</h2>
			<p class="mt-1 text-[10px] tracking-widest text-muted-foreground uppercase">
				Immutable Operational Intelligence Ledger & Compliance Stream
			</p>
		</div>

		<div class="group relative w-full md:w-64">
			<Search
				class="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-signal-blue"
				size={14}
			/>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="FILTER BY EVENT, USER, OR ID..."
				class="w-full rounded-sm border border-border bg-muted/40 py-2 pr-4 pl-9 font-mono text-[10px] tracking-widest text-foreground uppercase transition-all outline-none focus:border-signal-blue focus:bg-muted/60"
			/>
		</div>
	</div>

	<!-- Main Workspace: Split View -->
	<div class="grid flex-1 grid-cols-12 gap-6 overflow-hidden">
		<!-- Log Stream -->
		<div
			class="col-span-12 flex flex-col overflow-hidden rounded-sm border border-border bg-muted/10 backdrop-blur-sm lg:col-span-8"
		>
			<div class="flex items-center justify-between border-b border-border bg-muted/50 p-3">
				<div class="flex items-center gap-2">
					<Terminal size={14} class="text-muted-foreground" />
					<span class="text-[10px] font-bold tracking-widest text-muted-foreground uppercase"
						>Security Event Stream</span
					>
				</div>
				<span class="font-mono text-[9px] text-muted-foreground uppercase"
					>{filteredLogs.length} EVENTS LOADED</span
				>
			</div>

			<div class="custom-scrollbar flex-1 overflow-x-auto">
				<table class="w-full border-collapse text-left">
					<thead>
						<tr
							class="border-b border-border bg-muted/20 text-[9px] font-bold tracking-widest text-muted-foreground uppercase"
						>
							<th class="p-3">Timestamp</th>
							<th class="p-3">Event Identity</th>
							<th class="p-3">Operator</th>
							<th class="p-3">Impact</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border/50 font-mono">
						{#each filteredLogs as log}
							<tr
								class="cursor-pointer transition-colors hover:bg-muted/30 {selectedLog?.id ===
								log.id
									? 'border-l-2 border-l-signal-blue bg-signal-blue/10'
									: ''}"
								onclick={() => (selectedLog = log)}
							>
								<td class="p-3">
									<div class="flex flex-col">
										<span class="text-[10px] font-bold text-foreground"
											>{new Date(log.timestamp).toLocaleTimeString()}</span
										>
										<span class="text-[8px] text-muted-foreground uppercase"
											>{new Date(log.timestamp).toLocaleDateString()}</span
										>
									</div>
								</td>
								<td class="p-3">
									<div class="flex flex-col">
										<span
											class="text-[10px] font-bold tracking-tight uppercase {getEventColor(
												log.event
											)}">{log.event}</span
										>
										<span class="font-mono text-[8px] text-muted-foreground uppercase"
											>ID: {log.id.slice(0, 8)}</span
										>
									</div>
								</td>
								<td class="p-3">
									<div class="flex items-center gap-2">
										<div
											class="flex h-5 w-5 items-center justify-center rounded-full border border-border bg-muted"
										>
											<User size={10} class="text-muted-foreground" />
										</div>
										<span class="max-w-[120px] truncate text-[10px] text-foreground uppercase"
											>{log.userName || 'SYSTEM'}</span
										>
									</div>
								</td>
								<td class="p-3">
									{#if log.event.includes('OVERRIDE') || log.event.includes('REVOKED')}
										<div class="flex items-center gap-1.5">
											<span
												class="h-1.5 w-1.5 rounded-full bg-signal-orange shadow-[0_0_8px_rgba(249,115,22,0.5)]"
											></span>
											<span class="text-[9px] font-bold text-signal-orange uppercase">Critical</span
											>
										</div>
									{:else}
										<div class="flex items-center gap-1.5">
											<span class="h-1.5 w-1.5 rounded-full bg-muted-foreground opacity-30"></span>
											<span
												class="text-[9px] font-bold tracking-widest text-muted-foreground uppercase"
												>Normal</span
											>
										</div>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<!-- Detail Explorer -->
		<div
			class="col-span-12 flex flex-col overflow-hidden rounded-sm border border-border bg-muted/10 backdrop-blur-sm lg:col-span-4"
		>
			<div class="flex items-center justify-between border-b border-border bg-muted/50 p-3">
				<span class="text-[10px] font-bold tracking-widest text-muted-foreground uppercase"
					>Metadata Explorer</span
				>
				<HardDrive size={14} class="text-muted-foreground" />
			</div>

			<div class="custom-scrollbar flex-1 overflow-y-auto p-4">
				{#if selectedLog}
					<div class="space-y-6">
						<div>
							<h3 class="mb-1 text-xs font-bold tracking-widest text-foreground uppercase">
								Event Deep Scan
							</h3>
							<p class="font-mono text-[10px] text-muted-foreground uppercase italic">
								Atomic Record: {selectedLog.id}
							</p>
						</div>

						<div class="space-y-4">
							<div class="space-y-3 rounded-sm border border-border bg-muted/30 p-3">
								<div class="flex items-center justify-between">
									<span class="text-[9px] font-bold tracking-widest text-muted-foreground uppercase"
										>Resource Impact</span
									>
									<span class="font-mono text-[10px] font-bold text-signal-blue"
										>{selectedLog.metadata.resourceId ? 'TARGETED' : 'BROAD'}</span
									>
								</div>
								{#if selectedLog.metadata.resourceId}
									<div class="flex flex-col rounded-sm border border-border bg-neutral-950 p-2">
										<span class="mb-1 text-[8px] tracking-widest text-muted-foreground uppercase"
											>Asset ID</span
										>
										<span class="font-mono text-[10px] break-all text-foreground"
											>{selectedLog.metadata.resourceId}</span
										>
									</div>
								{/if}
							</div>

							<div class="space-y-2">
								<h4
									class="flex items-center gap-2 text-[9px] font-bold tracking-widest text-muted-foreground uppercase"
								>
									<Terminal size={10} />
									Raw Telemetry (JSON)
								</h4>
								<pre
									class="w-full overflow-x-auto rounded-sm border border-border bg-neutral-950 p-4 font-mono text-[10px] text-signal-green selection:bg-signal-green/20">
{JSON.stringify(selectedLog.metadata, null, 2)}
								</pre>
							</div>

							{#if selectedLog.event.includes('OVERRIDE')}
								<div
									class="flex gap-3 rounded-sm border border-signal-orange/30 bg-signal-orange/10 p-3"
								>
									<AlertCircle size={16} class="shrink-0 text-signal-orange" />
									<div>
										<h5
											class="mb-1 text-[9px] font-bold tracking-widest text-signal-orange uppercase"
										>
											Security Alert
										</h5>
										<p class="text-[10px] leading-relaxed text-muted-foreground">
											This event represents a manual override of automated security protocols.
											Verify the Operator's intent against internal SOC2 compliance logs.
										</p>
									</div>
								</div>
							{/if}
						</div>
					</div>
				{:else}
					<div class="flex h-full flex-col items-center justify-center text-center opacity-40">
						<Clock size={32} class="mb-2" />
						<p class="font-mono text-[10px] tracking-widest uppercase">
							Select event from stream<br />to analyze telemetry
						</p>
					</div>
				{/if}
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
