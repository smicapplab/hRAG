<script lang="ts">
	import { FileUp, CheckCircle2, AlertCircle, Clock, Trash2 } from 'lucide-svelte';

	const mockDocs = [
		{
			name: 'internal_infra_roadmap.md',
			status: 'indexing',
			tags: ['ROADMAP', 'INFRASTRUCTURE ?'],
			owner: 'Auto-assigned',
			date: '2026-04-20'
		},
		{
			name: 'failed_boiler_tube.pdf',
			status: 'complete',
			tags: ['INDUSTRIAL', 'FAILURE_ANALYSIS'],
			owner: 's.torrefranca',
			date: '2026-04-19'
		},
		{
			name: 'rag_survey.pdf',
			status: 'complete',
			tags: ['RESEARCH', 'AI'],
			owner: 'intel.analyst',
			date: '2026-04-18'
		}
	];

	function getStatusIcon(status: string) {
		switch (status) {
			case 'complete':
				return { icon: CheckCircle2, class: 'text-signal-green' };
			case 'error':
				return { icon: AlertCircle, class: 'text-signal-red' };
			default:
				return { icon: Clock, class: 'text-signal-orange' };
		}
	}
</script>

<div class="flex h-full flex-col space-y-6 overflow-hidden p-4 lg:p-8">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h2 class="text-xl font-bold text-foreground">
				Document <span class="text-signal-blue uppercase">Operations</span>
			</h2>
			<p class="mt-1 text-[10px] tracking-widest text-muted-foreground uppercase">
				Ingestion Queue & AI Classification Lab
			</p>
		</div>
		<button
			class="flex items-center gap-2 rounded-sm bg-signal-blue px-4 py-2 text-xs font-bold tracking-widest text-white uppercase shadow-lg shadow-blue-900/20 transition-colors hover:bg-blue-500"
		>
			<FileUp size={16} />
			Upload Intelligence
		</button>
	</div>

	<!-- Stats Grid -->
	<div class="grid grid-cols-3 gap-4">
		<div class="rounded-sm border border-border bg-muted/20 p-4">
			<p class="mb-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
				Total Vaulted
			</p>
			<p class="font-mono text-2xl font-bold text-foreground">142</p>
		</div>
		<div class="rounded-sm border border-border bg-muted/20 p-4">
			<p class="mb-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
				Active Ingestion
			</p>
			<div class="flex items-center gap-2">
				<p class="font-mono text-2xl font-bold text-signal-orange">3</p>
				<span class="h-2 w-2 animate-pulse rounded-full bg-signal-orange"></span>
			</div>
		</div>
		<div class="rounded-sm border border-border bg-muted/20 p-4">
			<p class="mb-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
				Storage Delta
			</p>
			<p class="font-mono text-2xl font-bold text-signal-blue">+1.2 GB</p>
		</div>
	</div>

	<!-- Ingestion Table -->
	<div
		class="flex flex-1 flex-col overflow-hidden rounded-sm border border-border bg-muted/10 backdrop-blur-sm"
	>
		<div class="overflow-x-auto">
			<table class="w-full border-collapse text-left">
				<thead>
					<tr
						class="border-b border-border bg-muted/50 text-[10px] font-bold tracking-widest text-muted-foreground uppercase"
					>
						<th class="p-4">Resource Identifier</th>
						<th class="p-4">Process Status</th>
						<th class="p-4">Intelligence Tags (AI Suggested)</th>
						<th class="p-4 text-right">Operations</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-border font-mono">
					{#each mockDocs as doc (doc.name)}
						{@const status = getStatusIcon(doc.status)}
						<tr class="group transition-colors hover:bg-muted/30">
							<td class="p-4">
								<div class="flex flex-col">
									<span class="mb-1 text-xs font-bold text-foreground">{doc.name}</span>
									<span class="text-[9px] text-muted-foreground uppercase"
										>{doc.owner} | {doc.date}</span
									>
								</div>
							</td>
							<td class="p-4">
								<div class="flex items-center gap-2 text-[10px] font-bold uppercase {status.class}">
									<status.icon size={12} class={doc.status === 'indexing' ? 'animate-spin' : ''} />
									{doc.status}
								</div>
							</td>
							<td class="p-4">
								<div class="flex flex-wrap gap-2">
									{#each doc.tags as tag (tag)}
										<span
											class="rounded-sm border px-2 py-0.5 text-[9px] font-bold
                      {tag.includes('?')
												? 'cursor-help border-signal-blue/20 bg-signal-blue/5 text-signal-blue italic'
												: 'border-border bg-muted text-muted-foreground'}"
										>
											{tag}
										</span>
									{/each}
								</div>
							</td>
							<td class="p-4 text-right">
								<div class="flex justify-end gap-2">
									<button
										class="rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-signal-blue"
									>
										<CheckCircle2 size={16} />
									</button>
									<button
										class="rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-signal-red"
									>
										<Trash2 size={16} />
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
