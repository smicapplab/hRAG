<script lang="ts">
	import { Download, Search, Filter, Database } from 'lucide-svelte';

	const mockResults = [
		{
			name: 'field_ops_logistics.md',
			uploader: 's.torrefranca',
			classification: 'CONFIDENTIAL',
			score: '0.984',
			updated: '2026-04-20',
			match: 'quarterly revenue trends in Asia-Pacific region...'
		},
		{
			name: 'security_audit_hq.txt',
			uploader: 'auditor.hq',
			classification: 'INTERNAL',
			score: '0.912',
			updated: '2026-03-15',
			match: 'physical security perimeter of HQ is intact...'
		},
		{
			name: 'rag_survey.pdf',
			uploader: 'intel.analyst',
			classification: 'PUBLIC',
			score: '0.845',
			updated: '2026-01-10',
			match: 'large language models for document retrieval...'
		}
	];

	function getClassificationClass(cls: string) {
		switch (cls) {
			case 'CONFIDENTIAL':
				return 'bg-signal-orange/10 text-signal-orange border-signal-orange/20';
			case 'INTERNAL':
				return 'bg-signal-blue/10 text-signal-blue border-signal-blue/20';
			default:
				return 'bg-signal-green/10 text-signal-green border-signal-green/20';
		}
	}
</script>

<div class="flex h-full flex-col space-y-6 overflow-hidden p-4 lg:p-8">
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
			<button
				class="flex items-center gap-2 rounded-sm border border-border bg-muted px-3 py-1.5 text-[10px] font-bold tracking-widest text-muted-foreground uppercase transition-colors hover:text-foreground"
			>
				<Filter size={12} />
				Advanced Filters
			</button>
			<button
				class="flex items-center gap-2 rounded-sm border border-signal-blue/20 bg-signal-blue/10 px-3 py-1.5 text-[10px] font-bold tracking-widest text-signal-blue uppercase transition-colors hover:bg-signal-blue hover:text-white"
			>
				<Database size={12} />
				Export Audit Trail
			</button>
		</div>
	</div>

	<!-- Search Bar -->
	<div class="relative">
		<Search class="absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground" size={18} />
		<input
			type="text"
			placeholder="QUERY THE INTELLIGENCE VAULT..."
			class="w-full rounded-sm border border-border bg-muted/30 p-4 pl-12 font-mono text-sm tracking-wider text-foreground uppercase transition-colors outline-none focus:border-signal-blue"
		/>
	</div>

	<!-- Results Grid -->
	<div
		class="flex flex-1 flex-col overflow-hidden rounded-sm border border-border bg-muted/10 backdrop-blur-sm"
	>
		<div class="overflow-x-auto">
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
					{#each mockResults as result (result.name)}
						<tr class="group transition-colors hover:bg-signal-blue/5">
							<td class="max-w-md p-4">
								<div class="flex flex-col">
									<span class="mb-2 text-xs leading-none font-bold text-foreground"
										>{result.name}</span
									>
									<span class="truncate text-[10px] text-muted-foreground italic">
										MATCH: "{result.match}"
									</span>
								</div>
							</td>
							<td class="p-4 text-[11px] tracking-tighter text-muted-foreground uppercase">
								{result.uploader}
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
								{result.score}
							</td>
							<td class="p-4 text-[11px] text-muted-foreground">
								{result.updated}
							</td>
							<td class="p-4 text-right">
								<button class="text-muted-foreground transition-colors hover:text-signal-blue">
									<Download size={16} />
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Empty State / Footer -->
		<div class="mt-auto flex items-center justify-between border-t border-border bg-muted/30 p-4">
			<p class="text-[10px] tracking-widest text-muted-foreground uppercase">
				Showing <span class="text-foreground">3</span> matching resources in cluster
			</p>
			<div class="flex gap-1">
				<button
					class="cursor-not-allowed rounded-sm border border-border bg-muted px-2 py-1 text-[10px] text-muted-foreground opacity-50"
					>PREV</button
				>
				<button
					class="rounded-sm border border-border bg-muted px-2 py-1 text-[10px] text-muted-foreground"
					>NEXT</button
				>
			</div>
		</div>
	</div>
</div>
