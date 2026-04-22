<script lang="ts">
	import type { PageData } from './$types';
	import { Settings, Shield, Zap, Lock, Database, Info, CheckCircle2, AlertTriangle, ChevronRight } from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { slide } from 'svelte/transition';

	let { data }: { data: PageData } = $props();

	let activeTab = $state('policies');
</script>

<div class="flex h-full flex-col space-y-6 overflow-hidden p-4 lg:p-8">
	<div class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
		<div>
			<h2 class="flex items-center gap-2 text-xl font-bold text-foreground uppercase">
				<Settings class="text-signal-blue" size={20} />
				Cluster / <span class="text-signal-blue">Registry</span>
			</h2>
			<p class="mt-1 text-[10px] tracking-widest text-muted-foreground uppercase">
				Shared State Configuration & Security Policy Orchestrator
			</p>
		</div>

		<div class="flex rounded-sm border border-border bg-muted p-1">
			<button
				onclick={() => (activeTab = 'policies')}
				class="px-3 py-1 text-[10px] font-bold tracking-widest uppercase transition-all {activeTab === 'policies' ? 'bg-signal-blue text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'}"
			>
				Policies
			</button>
			<button
				onclick={() => (activeTab = 'quarantine')}
				class="relative px-3 py-1 text-[10px] font-bold tracking-widest uppercase transition-all {activeTab === 'quarantine' ? 'bg-signal-blue text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'}"
			>
				Quarantine
				{#if data.quarantine.length > 0}
					<span class="absolute -top-1 -right-1 h-2 w-2 animate-pulse rounded-full bg-signal-orange"></span>
				{/if}
			</button>
			<button
				onclick={() => (activeTab = 'system')}
				class="px-3 py-1 text-[10px] font-bold tracking-widest uppercase transition-all {activeTab === 'system' ? 'bg-signal-blue text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'}"
			>
				System
			</button>
		</div>
	</div>

	<div class="flex flex-1 flex-col overflow-hidden rounded-sm border border-border bg-muted/10 backdrop-blur-sm">
		{#if activeTab === 'system'}
			<div class="flex items-center justify-between border-b border-border bg-muted/50 p-3">
				<div class="flex items-center gap-2">
					<Database size={14} class="text-signal-blue" />
					<span class="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">System Setting Registry</span>
				</div>
				<span class="font-mono text-[9px] text-muted-foreground italic">Stateless Propagation (TTL: 5m)</span>
			</div>

			<div class="custom-scrollbar flex-1 overflow-y-auto p-4">
				<div class="max-w-2xl space-y-6">
					<div class="rounded-sm border border-border bg-muted/30 p-4">
						<div class="mb-4 flex items-center gap-2">
							<Info size={14} class="text-signal-blue" />
							<p class="font-mono text-[10px] text-muted-foreground uppercase">System-wide settings are shared across all compute nodes.</p>
						</div>

						<div class="space-y-4">
							<form method="POST" action="?/updateSetting" use:enhance class="grid grid-cols-12 items-start gap-4 border-b border-border/50 pb-6">
								<div class="col-span-12 lg:col-span-4">
									<div class="font-mono text-[11px] font-bold text-foreground">EMBEDDING_PROVIDER</div>
									<input type="hidden" name="key" value="embeddings.provider" />
								</div>
								<div class="col-span-12 lg:col-span-6">
									<select name="value" value={data.settings['embeddings.provider'] || 'local'} class="w-full rounded-sm border border-border bg-neutral-950 p-3 font-mono text-[10px] outline-none focus:border-signal-blue">
										<option value="local">LOCAL WASM</option>
										<option value="ollama">OLLAMA</option>
										<option value="openai">OPENAI</option>
										<option value="google">GOOGLE GENAI</option>
									</select>
								</div>
								<div class="col-span-12 lg:col-span-2">
									<button class="w-full border border-border bg-muted py-3 text-[9px] font-bold uppercase hover:bg-signal-blue hover:text-white transition-all">Update</button>
								</div>
							</form>
						</div>
					</div>

					<div class="flex items-start gap-4 rounded-sm border border-signal-blue/20 bg-signal-blue/5 p-4">
						<Lock size={20} class="mt-1 shrink-0 text-signal-blue" />
						<p class="text-[10px] text-muted-foreground">System-level secrets are locked via Master Passphrase.</p>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
