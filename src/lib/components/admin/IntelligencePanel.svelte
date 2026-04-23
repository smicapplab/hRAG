<script lang="ts">
	import { fade, slide } from 'svelte/transition';
	import { getHelp, type HelpGuide } from './RegistryHelpManifest';
	import { 
		Info, 
		TrendingUp, 
		AlertTriangle, 
		Lightbulb, 
		DollarSign,
		ShieldCheck,
		Zap,
		Cpu
	} from 'lucide-svelte';

	let { activeKey = null } = $props<{ activeKey: string | null }>();

	let guide = $derived(activeKey ? getHelp(activeKey) : null);
</script>

<div class="h-full border-l border-border bg-muted/10 p-6 font-mono">
	{#if guide}
		<div class="space-y-8" in:fade={{ duration: 200 }}>
			<!-- Header -->
			<div class="space-y-2 border-b border-border pb-4">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2 text-signal-blue">
						<Info size={16} />
						<span class="text-[10px] font-bold uppercase tracking-widest">Intelligence Report</span>
					</div>
					{#if guide.cost}
						<div class="flex items-center gap-1 rounded-sm border border-border bg-neutral-900 px-2 py-0.5 text-[8px] font-bold uppercase">
							<DollarSign size={10} class={guide.cost === 'FREE' ? 'text-signal-green' : 'text-signal-orange'} />
							<span class={guide.cost === 'FREE' ? 'text-signal-green' : 'text-foreground'}>{guide.cost} COST</span>
						</div>
					{/if}
				</div>
				<h2 class="text-sm font-bold uppercase tracking-wider text-foreground">{guide.title}</h2>
			</div>

			<!-- Description -->
			<div class="space-y-3">
				<div class="flex items-center gap-2 text-muted-foreground">
					<Cpu size={14} />
					<span class="text-[9px] font-bold uppercase tracking-widest">Functionality</span>
				</div>
				<p class="text-[11px] leading-relaxed text-muted-foreground">
					{guide.description}
				</p>
			</div>

			<!-- Pros & Cons -->
			<div class="grid grid-cols-1 gap-6">
				<div class="space-y-3">
					<div class="flex items-center gap-2 text-signal-green">
						<TrendingUp size={14} />
						<span class="text-[9px] font-bold uppercase tracking-widest">Advantages</span>
					</div>
					<ul class="space-y-2">
						{#each guide.pros as pro}
							<li class="flex items-start gap-2 text-[10px] text-foreground/80">
								<span class="mt-1 block h-1 w-1 shrink-0 rounded-full bg-signal-green"></span>
								{pro}
							</li>
						{/each}
					</ul>
				</div>

				<div class="space-y-3">
					<div class="flex items-center gap-2 text-signal-orange">
						<AlertTriangle size={14} />
						<span class="text-[9px] font-bold uppercase tracking-widest">Trade-offs</span>
					</div>
					<ul class="space-y-2">
						{#each guide.cons as con}
							<li class="flex items-start gap-2 text-[10px] text-foreground/80">
								<span class="mt-1 block h-1 w-1 shrink-0 rounded-full bg-signal-orange"></span>
								{con}
							</li>
						{/each}
					</ul>
				</div>
			</div>

			<!-- Tip -->
			<div class="rounded-sm border border-signal-blue/20 bg-signal-blue/5 p-4">
				<div class="mb-2 flex items-center gap-2 text-signal-blue">
					<Lightbulb size={14} />
					<span class="text-[9px] font-bold uppercase tracking-widest">Expert Protocol</span>
				</div>
				<p class="text-[10px] italic leading-relaxed text-muted-foreground">
					"{guide.tip}"
				</p>
			</div>
		</div>
	{:else}
		<div class="flex h-full flex-col items-center justify-center space-y-4 opacity-30" in:fade>
			<div class="relative">
				<ShieldCheck size={48} class="text-muted-foreground" />
				<div class="absolute -right-1 -top-1">
					<Zap size={16} class="animate-pulse text-signal-blue" />
				</div>
			</div>
			<div class="text-center space-y-1">
				<p class="text-[10px] font-bold uppercase tracking-widest">Registry Standby</p>
				<p class="text-[8px] uppercase tracking-tighter">Hover or focus a field for intelligence</p>
			</div>
		</div>
	{/if}
</div>
