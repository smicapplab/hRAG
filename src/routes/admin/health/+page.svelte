<script lang="ts">
	import type { PageData } from './$types';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import { Activity, Cpu, Database, HardDrive, RefreshCw, Server, Zap } from 'lucide-svelte';
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';

	let { data }: { data: PageData } = $props();

	// Auto-refresh logic
	let lastRefresh = $state(new Date());
	
	onMount(() => {
		const interval = setInterval(async () => {
			await invalidateAll();
			lastRefresh = new Date();
		}, 10000); // 10s poll

		return () => clearInterval(interval);
	});

	function getStatus(lastSeen: Date) {
		const diff = Date.now() - new Date(lastSeen).getTime();
		if (diff < 90000) return 'ok'; // 90s (account for slight delay)
		if (diff < 300000) return 'warn'; // 5 mins
		return 'error';
	}

	function formatBytes(mem: number) {
		return `${(mem * 100).toFixed(1)}%`;
	}
</script>

<div class="h-full flex flex-col space-y-6 p-4 lg:p-8 overflow-hidden">
	<!-- Header Control Region -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
		<div>
			<h2 class="text-xl font-bold text-foreground flex items-center gap-2 uppercase">
				<Activity class="text-signal-green" size={20} />
				Fleet / <span class="text-signal-green">Telemetry</span>
			</h2>
			<p class="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Real-time Stateless Compute Health & Orchestration</p>
		</div>
		<div class="flex items-center gap-4">
			<div class="text-right hidden sm:block">
				<p class="text-[9px] text-muted-foreground uppercase tracking-wider font-mono">Last Sync</p>
				<p class="text-[10px] text-foreground font-mono">{lastRefresh.toLocaleTimeString()}</p>
			</div>
			<button 
				onclick={() => { invalidateAll(); lastRefresh = new Date(); }}
				class="flex items-center gap-2 px-3 py-1.5 bg-muted border border-border rounded-sm text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest"
			>
				<RefreshCw size={12} class="animate-spin-slow" />
				RESCAN FLEET
			</button>
		</div>
	</div>

	<!-- System Overview Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="p-4 border border-border bg-muted/10 rounded-sm">
			<div class="flex items-center justify-between mb-4">
				<span class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Nodes</span>
				<Server size={14} class="text-signal-blue" />
			</div>
			<div class="text-2xl font-bold text-foreground font-mono">{data.nodes.filter(n => getStatus(n.lastSeen) !== 'error').length}</div>
			<p class="text-[9px] text-muted-foreground uppercase mt-1">Operational Fragments</p>
		</div>

		<div class="p-4 border border-border bg-muted/10 rounded-sm">
			<div class="flex items-center justify-between mb-4">
				<span class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Storage Link</span>
				<Database size={14} class="text-signal-green" />
			</div>
			<div class="text-2xl font-bold text-foreground font-mono">ACTIVE</div>
			<p class="text-[9px] text-muted-foreground uppercase mt-1">Garage S3 Connectivity: OK</p>
		</div>

		<div class="p-4 border border-border bg-muted/10 rounded-sm">
			<div class="flex items-center justify-between mb-4">
				<span class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ingestion Queue</span>
				<Zap size={14} class="text-signal-orange" />
			</div>
			<div class="text-2xl font-bold text-foreground font-mono">IDLE</div>
			<p class="text-[9px] text-muted-foreground uppercase mt-1">Worker Pool Stable</p>
		</div>

		<div class="p-4 border border-border bg-muted/10 rounded-sm">
			<div class="flex items-center justify-between mb-4">
				<span class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Cluster Role</span>
				<HardDrive size={14} class="text-signal-blue" />
			</div>
			<div class="text-2xl font-bold text-foreground font-mono">{data.nodes.some(n => n.isPrimary) ? 'ESTABLISHED' : 'PENDING'}</div>
			<p class="text-[9px] text-muted-foreground uppercase mt-1">Primary Node Elected</p>
		</div>
	</div>

	<!-- Node Registry Table -->
	<div class="flex-1 flex flex-col border border-border rounded-sm bg-muted/10 backdrop-blur-sm overflow-hidden">
		<div class="p-3 border-b border-border bg-muted/50 flex items-center justify-between">
			<span class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Node Registry</span>
			<span class="text-[9px] font-mono text-muted-foreground italic">Heartbeat Window: 60s</span>
		</div>
		<div class="flex-1 overflow-x-auto custom-scrollbar">
			<table class="w-full text-left border-collapse">
				<thead>
					<tr class="bg-muted/20 text-[9px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border">
						<th class="p-3">Node Identity / Hostname</th>
						<th class="p-3">Role</th>
						<th class="p-3">Metrics (CPU/MEM)</th>
						<th class="p-3">Uptime</th>
						<th class="p-3">Last Heartbeat</th>
						<th class="p-3">Status</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-border/50 font-mono">
					{#each data.nodes as node}
						<tr class="hover:bg-signal-blue/5 transition-colors">
							<td class="p-3">
								<div class="flex flex-col">
									<span class="text-xs font-bold text-foreground leading-none mb-1 uppercase tracking-tight">{node.nodeId}</span>
									<span class="text-[9px] text-muted-foreground uppercase">HOST: {node.hostname}</span>
								</div>
							</td>
							<td class="p-3">
								{#if node.isPrimary}
									<span class="px-1.5 py-0.5 rounded-sm bg-signal-blue/10 border border-signal-blue/30 text-signal-blue text-[9px] font-bold uppercase tracking-widest">PRIMARY</span>
								{:else}
									<span class="px-1.5 py-0.5 rounded-sm bg-muted border border-border text-muted-foreground text-[9px] font-bold uppercase tracking-widest">REPLICA</span>
								{/if}
							</td>
							<td class="p-3">
								<div class="flex items-center gap-4">
									<div class="flex items-center gap-2">
										<Cpu size={12} class="text-muted-foreground" />
										<span class="text-[10px] text-foreground font-bold">{(node.metrics.cpu * 100).toFixed(0)}%</span>
									</div>
									<div class="flex items-center gap-2">
										<HardDrive size={12} class="text-muted-foreground" />
										<span class="text-[10px] text-foreground font-bold">{formatBytes(node.metrics.memory)}</span>
									</div>
								</div>
							</td>
							<td class="p-3">
								<span class="text-[10px] text-muted-foreground uppercase">
									{Math.floor(node.metrics.uptime / 3600)}h {Math.floor((node.metrics.uptime % 3600) / 60)}m
								</span>
							</td>
							<td class="p-3">
								<span class="text-[10px] text-foreground font-bold">{new Date(node.lastSeen).toLocaleTimeString()}</span>
							</td>
							<td class="p-3">
								<StatusBadge 
									status={getStatus(node.lastSeen)} 
									label={getStatus(node.lastSeen) === 'ok' ? 'Online' : getStatus(node.lastSeen) === 'warn' ? 'Lagging' : 'Offline'} 
								/>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
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
	:global(.animate-spin-slow) {
		animation: spin 3s linear infinite;
	}
	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
</style>
