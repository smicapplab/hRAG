<script lang="ts">
	import type { PageData } from './$types';
	import { Shield, Search, Filter, Clock, User, HardDrive, Terminal, ChevronRight, AlertCircle } from 'lucide-svelte';
	import { slide } from 'svelte/transition';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state('');
	let selectedLog = $state<any | null>(null);

	let filteredLogs = $derived(
		searchQuery 
			? data.logs.filter(l => 
				l.event.toLowerCase().includes(searchQuery.toLowerCase()) || 
				l.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				l.id.toLowerCase().includes(searchQuery.toLowerCase())
			)
			: data.logs
	);

	function getEventColor(event: string) {
		if (event.includes('FAILURE') || event.includes('DENIED') || event.includes('REVOKED')) return 'text-signal-red';
		if (event.includes('OVERRIDE') || event.includes('LOGIN')) return 'text-signal-orange';
		if (event.includes('CREATE') || event.includes('UPLOAD')) return 'text-signal-green';
		return 'text-signal-blue';
	}
</script>

<div class="h-full flex flex-col space-y-6 p-4 lg:p-8 overflow-hidden">
	<!-- Header Control Region -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
		<div>
			<h2 class="text-xl font-bold text-foreground flex items-center gap-2 uppercase">
				<Shield class="text-signal-orange" size={20} />
				Audit / <span class="text-signal-orange">Vault</span>
			</h2>
			<p class="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Immutable Operational Intelligence Ledger & Compliance Stream</p>
		</div>
		
		<div class="relative w-full md:w-64 group">
			<Search class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-signal-blue transition-colors" size={14} />
			<input 
				type="text" 
				bind:value={searchQuery}
				placeholder="FILTER BY EVENT, USER, OR ID..."
				class="w-full bg-muted/40 border border-border rounded-sm py-2 pl-9 pr-4 text-[10px] font-mono text-foreground outline-none focus:border-signal-blue focus:bg-muted/60 transition-all uppercase tracking-widest"
			/>
		</div>
	</div>

	<!-- Main Workspace: Split View -->
	<div class="flex-1 grid grid-cols-12 gap-6 overflow-hidden">
		
		<!-- Log Stream -->
		<div class="col-span-12 lg:col-span-8 flex flex-col border border-border rounded-sm bg-muted/10 backdrop-blur-sm overflow-hidden">
			<div class="p-3 border-b border-border bg-muted/50 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<Terminal size={14} class="text-muted-foreground" />
					<span class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Security Event Stream</span>
				</div>
				<span class="text-[9px] font-mono text-muted-foreground uppercase">{filteredLogs.length} EVENTS LOADED</span>
			</div>
			
			<div class="flex-1 overflow-x-auto custom-scrollbar">
				<table class="w-full text-left border-collapse">
					<thead>
						<tr class="bg-muted/20 text-[9px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border">
							<th class="p-3">Timestamp</th>
							<th class="p-3">Event Identity</th>
							<th class="p-3">Operator</th>
							<th class="p-3">Impact</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border/50 font-mono">
						{#each filteredLogs as log}
							<tr 
								class="hover:bg-muted/30 transition-colors cursor-pointer {selectedLog?.id === log.id ? 'bg-signal-blue/10 border-l-2 border-l-signal-blue' : ''}"
								onclick={() => selectedLog = log}
							>
								<td class="p-3">
									<div class="flex flex-col">
										<span class="text-[10px] text-foreground font-bold">{new Date(log.timestamp).toLocaleTimeString()}</span>
										<span class="text-[8px] text-muted-foreground uppercase">{new Date(log.timestamp).toLocaleDateString()}</span>
									</div>
								</td>
								<td class="p-3">
									<div class="flex flex-col">
										<span class="text-[10px] font-bold uppercase tracking-tight {getEventColor(log.event)}">{log.event}</span>
										<span class="text-[8px] text-muted-foreground uppercase font-mono">ID: {log.id.slice(0, 8)}</span>
									</div>
								</td>
								<td class="p-3">
									<div class="flex items-center gap-2">
										<div class="w-5 h-5 rounded-full bg-muted flex items-center justify-center border border-border">
											<User size={10} class="text-muted-foreground" />
										</div>
										<span class="text-[10px] text-foreground uppercase truncate max-w-[120px]">{log.userName || 'SYSTEM'}</span>
									</div>
								</td>
								<td class="p-3">
									{#if log.event.includes('OVERRIDE') || log.event.includes('REVOKED')}
										<div class="flex items-center gap-1.5">
											<span class="w-1.5 h-1.5 rounded-full bg-signal-orange shadow-[0_0_8px_rgba(249,115,22,0.5)]"></span>
											<span class="text-[9px] text-signal-orange font-bold uppercase">Critical</span>
										</div>
									{:else}
										<div class="flex items-center gap-1.5">
											<span class="w-1.5 h-1.5 rounded-full bg-muted-foreground opacity-30"></span>
											<span class="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">Normal</span>
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
		<div class="col-span-12 lg:col-span-4 flex flex-col border border-border rounded-sm bg-muted/10 backdrop-blur-sm overflow-hidden">
			<div class="p-3 border-b border-border bg-muted/50 flex items-center justify-between">
				<span class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Metadata Explorer</span>
				<HardDrive size={14} class="text-muted-foreground" />
			</div>

			<div class="flex-1 p-4 overflow-y-auto custom-scrollbar">
				{#if selectedLog}
					<div class="space-y-6">
						<div>
							<h3 class="text-xs font-bold uppercase tracking-widest text-foreground mb-1">Event Deep Scan</h3>
							<p class="text-[10px] font-mono text-muted-foreground italic uppercase">Atomic Record: {selectedLog.id}</p>
						</div>

						<div class="space-y-4">
							<div class="p-3 bg-muted/30 border border-border rounded-sm space-y-3">
								<div class="flex items-center justify-between">
									<span class="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Resource Impact</span>
									<span class="text-[10px] font-mono font-bold text-signal-blue">{selectedLog.metadata.resourceId ? 'TARGETED' : 'BROAD'}</span>
								</div>
								{#if selectedLog.metadata.resourceId}
									<div class="flex flex-col p-2 bg-neutral-950 border border-border rounded-sm">
										<span class="text-[8px] text-muted-foreground uppercase mb-1 tracking-widest">Asset ID</span>
										<span class="text-[10px] font-mono text-foreground break-all">{selectedLog.metadata.resourceId}</span>
									</div>
								{/if}
							</div>

							<div class="space-y-2">
								<h4 class="text-[9px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
									<Terminal size={10} />
									Raw Telemetry (JSON)
								</h4>
								<pre class="w-full p-4 bg-neutral-950 border border-border rounded-sm text-[10px] font-mono text-signal-green overflow-x-auto selection:bg-signal-green/20">
{JSON.stringify(selectedLog.metadata, null, 2)}
								</pre>
							</div>

							{#if selectedLog.event.includes('OVERRIDE')}
								<div class="p-3 bg-signal-orange/10 border border-signal-orange/30 rounded-sm flex gap-3">
									<AlertCircle size={16} class="text-signal-orange shrink-0" />
									<div>
										<h5 class="text-[9px] font-bold text-signal-orange uppercase tracking-widest mb-1">Security Alert</h5>
										<p class="text-[10px] text-muted-foreground leading-relaxed">This event represents a manual override of automated security protocols. Verify the Operator's intent against internal SOC2 compliance logs.</p>
									</div>
								</div>
							{/if}
						</div>
					</div>
				{:else}
					<div class="h-full flex flex-col items-center justify-center text-center opacity-40">
						<Clock size={32} class="mb-2" />
						<p class="text-[10px] font-mono uppercase tracking-widest">Select event from stream<br/>to analyze telemetry</p>
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
