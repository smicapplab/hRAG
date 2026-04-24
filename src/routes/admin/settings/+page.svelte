<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { 
		Settings, Shield, Zap, Lock, Database, Info, 
		CheckCircle2, AlertTriangle, ChevronRight, 
		Plus, Trash2, Save, Search, Filter, Eye, AlertCircle, Key,
		Cpu, ShieldCheck, Bot
	} from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { slide, fade } from 'svelte/transition';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import RegistryField from '$lib/components/admin/RegistryField.svelte';
	import IntelligencePanel from '$lib/components/admin/IntelligencePanel.svelte';
	import { filterRecommendedModels } from '$lib/admin/models';

	let { data, form }: { data: PageData, form: ActionData } = $props();

	let activeTab = $state('policies');
	let filterQuery = $state('');
	let showNewKey = $state(false);
	let activeHelpKey = $state<string | null>(null);
	let showLegacyModels = $state(false);

	// Local overrides for reactive UI updates before saving
	let overrides = $state<Record<string, any>>({});
	
	// Merged settings: server data + local overrides
	const settings = $derived.by(() => {
		const base = { ...(data.settings || {}) };
		for (const [key, value] of Object.entries(overrides)) {
			if (value !== undefined) {
				base[key] = value;
			}
		}
		return base;
	});

	function handleSettingChange(key: string, value: any) {
		overrides[key] = value;

		// UX: If engine changes, reset model to prevent invalid config
		if (key === 'chat.engine') {
			overrides['chat.model'] = ''; 
		}
		if (key === 'embeddings.provider') {
			overrides['embeddings.model'] = '';
		}
	}

	function handleSettingSave(key: string) {
		// Explicitly set to undefined to clear override and use data.settings
		overrides[key] = undefined;
	}

	/**
	 * Checks if a specific section has pending changes.
	 */
	function hasChanges(keys: string[]) {
		return keys.some(k => overrides[k] !== undefined);
	}

	/**
	 * Saves all pending changes for a section.
	 */
	async function saveSection(keys: string[]) {
		const pending = keys.filter(k => overrides[k] !== undefined);
		if (pending.length === 0) return;

		for (const key of pending) {
			const value = overrides[key];
			const formData = new FormData();
			formData.append('key', key);
			formData.append('value', value);

			await fetch('?/updateSetting', {
				method: 'POST',
				body: formData
			});
			handleSettingSave(key);
		}
		
		// Optional: Trigger a full page invalidate if needed, but handled by handleSettingSave
	}

	const filteredPolicies = $derived(
		(data?.policies || []).filter(p => 
			p.code.toLowerCase().includes(filterQuery.toLowerCase()) || 
			p.displayName.toLowerCase().includes(filterQuery.toLowerCase())
		)
	);

	const filteredQuarantine = $derived(
		(data?.quarantine || []).filter(d => 
			d.name.toLowerCase().includes(filterQuery.toLowerCase())
		)
	);

	const filteredKeys = $derived(
		(data?.apiKeys || []).filter(k => 
			k.name.toLowerCase().includes(filterQuery.toLowerCase())
		)
	);
</script>

<div class="flex h-full flex-col space-y-6 overflow-hidden p-4 lg:p-8">
	<!-- Header -->
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
				onclick={() => { activeTab = 'policies'; filterQuery = ''; }}
				class="px-3 py-1 text-[10px] font-bold tracking-widest uppercase transition-all {activeTab === 'policies' ? 'bg-signal-blue text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'}"
			>
				Policies
			</button>
			<button
				onclick={() => { activeTab = 'quarantine'; filterQuery = ''; }}
				class="relative px-3 py-1 text-[10px] font-bold tracking-widest uppercase transition-all {activeTab === 'quarantine' ? 'bg-signal-blue text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'}"
			>
				Quarantine
				{#if data.quarantine?.length > 0}
					<span class="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-signal-orange text-[8px] font-bold text-white shadow-lg">
						{data.quarantine?.length}
					</span>
				{/if}
			</button>
			<button
				onclick={() => { activeTab = 'keys'; filterQuery = ''; }}
				class="px-3 py-1 text-[10px] font-bold tracking-widest uppercase transition-all {activeTab === 'keys' ? 'bg-signal-blue text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'}"
			>
				API Keys
			</button>
			<button
				onclick={() => { activeTab = 'system'; filterQuery = ''; }}
				class="px-3 py-1 text-[10px] font-bold tracking-widest uppercase transition-all {activeTab === 'system' ? 'bg-signal-blue text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'}"
			>
				System
			</button>
		</div>
	</div>

	<!-- Main Content Area -->
	<div class="flex flex-1 flex-col overflow-hidden rounded-sm border border-border bg-muted/10 backdrop-blur-sm">
		
		<!-- Tab Header with Search -->
		<div class="flex items-center justify-between border-b border-border bg-muted/50 p-3">
			<div class="flex items-center gap-2">
				{#if activeTab === 'policies'}
					<Shield size={14} class="text-signal-blue" />
					<span class="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Classification Policies</span>
				{:else if activeTab === 'quarantine'}
					<AlertTriangle size={14} class="text-signal-orange" />
					<span class="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Review Required (AI Override)</span>
				{:else if activeTab === 'keys'}
					<Key size={14} class="text-signal-blue" />
					<span class="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Machine Access (API Keys)</span>
				{:else}
					<Database size={14} class="text-signal-blue" />
					<span class="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">System Setting Registry</span>
				{/if}
			</div>

			<div class="flex items-center gap-4">
				<div class="relative hidden md:block">
					<Search class="absolute top-1/2 left-2 -translate-y-1/2 text-muted-foreground" size={12} />
					<input 
						type="text" 
						placeholder="Search registry..." 
						bind:value={filterQuery}
						class="rounded-sm border border-border bg-neutral-950 py-1.5 pr-3 pl-8 font-mono text-[9px] uppercase tracking-tighter outline-none focus:border-signal-blue"
					/>
				</div>
				<span class="font-mono text-[9px] text-muted-foreground italic">Stateless Propagation (TTL: 5m)</span>
			</div>
		</div>

		<!-- Tab Panels -->
		<div class="flex-1 overflow-hidden">
			
			<!-- POLICIES TAB -->
			{#if activeTab === 'policies'}
				<div class="h-full overflow-y-auto p-4 custom-scrollbar" in:fade={{ duration: 150 }}>
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{#each filteredPolicies as policy}
							<div class="group relative flex flex-col rounded-sm border border-border bg-muted/30 p-4 transition-all hover:border-signal-blue/50">
								<div class="mb-4 flex items-start justify-between">
									<div class="space-y-1">
										<div class="font-mono text-[8px] tracking-widest text-muted-foreground uppercase">Policy Code</div>
										<div class="text-xs font-bold text-foreground">{policy.code}</div>
									</div>
									<div class="h-8 w-8 rounded-sm bg-signal-blue/10 p-2 text-signal-blue">
										<Shield size={16} />
									</div>
								</div>

								<form method="POST" action="?/updatePolicy" use:enhance class="space-y-4">
									<input type="hidden" name="id" value={policy.id} />
									
									<div class="space-y-1">
										<label class="flex flex-col gap-1">
											<span class="font-mono text-[8px] tracking-widest text-muted-foreground uppercase">Display Name</span>
											<input 
												name="displayName" 
												value={policy.displayName} 
												class="w-full rounded-sm border border-border bg-neutral-950 p-2 font-mono text-[10px] outline-none focus:border-signal-blue"
											/>
										</label>
									</div>

									<div class="grid grid-cols-2 gap-4">
										<div class="space-y-1">
											<label class="flex flex-col gap-1">
												<span class="font-mono text-[8px] tracking-widest text-muted-foreground uppercase">Min Role</span>
												<select name="minRoleRequired" value={policy.minRoleRequired} class="w-full rounded-sm border border-border bg-neutral-950 p-2 font-mono text-[9px] outline-none focus:border-signal-blue">
													<option value="VIEWER">VIEWER</option>
													<option value="EDITOR">EDITOR</option>
													<option value="MANAGER">MANAGER</option>
												</select>
											</label>
										</div>
										<div class="space-y-1">
											<label class="flex flex-col gap-1">
												<span class="font-mono text-[8px] tracking-widest text-muted-foreground uppercase">Severity</span>
												<input 
													name="severityWeight" 
													type="number" 
													value={policy.severityWeight || 1} 
													class="w-full rounded-sm border border-border bg-neutral-950 p-2 font-mono text-[10px] outline-none focus:border-signal-blue"
												/>
											</label>
										</div>
									</div>

									<div class="space-y-1">
										<label class="flex flex-col gap-1">
											<span class="font-mono text-[8px] tracking-widest text-muted-foreground uppercase">Description</span>
											<textarea 
												name="description" 
												rows="3"
												class="w-full resize-none rounded-sm border border-border bg-neutral-950 p-2 font-mono text-[10px] leading-relaxed outline-none focus:border-signal-blue"
											>{policy.description || ''}</textarea>
										</label>
									</div>

									<button class="mt-2 w-full flex items-center justify-center gap-2 border border-border bg-muted/50 py-2 text-[9px] font-bold uppercase tracking-widest transition-all hover:bg-signal-blue hover:text-white">
										<Save size={12} />
										Update Engine Policy
									</button>
								</form>
							</div>
						{/each}

						<!-- Add New Placeholder -->
						<button class="flex flex-col items-center justify-center gap-3 rounded-sm border border-dashed border-border bg-muted/5 p-8 transition-all hover:bg-muted/10 hover:border-signal-blue/50">
							<div class="rounded-full border border-border p-3 text-muted-foreground group-hover:text-signal-blue">
								<Plus size={20} />
							</div>
							<span class="font-mono text-[9px] font-bold tracking-widest text-muted-foreground uppercase">Register New Policy</span>
						</button>
					</div>
				</div>

			<!-- QUARANTINE TAB -->
			{:else if activeTab === 'quarantine'}
				<div class="h-full flex flex-col overflow-hidden" in:fade={{ duration: 150 }}>
					{#if !data.quarantine || data.quarantine.length === 0}
						<div class="flex flex-1 flex-col items-center justify-center space-y-4 opacity-50">
							<CheckCircle2 size={48} class="text-signal-green" />
							<p class="font-mono text-[10px] tracking-widest uppercase">Registry Clean: No pending security reviews</p>
						</div>
					{:else}
						<div class="flex-1 overflow-y-auto custom-scrollbar">
							<table class="w-full border-collapse font-mono text-[10px]">
								<thead class="sticky top-0 z-10 bg-muted/80 backdrop-blur-md">
									<tr class="text-left uppercase tracking-widest text-muted-foreground">
										<th class="border-b border-border p-4 font-bold">Document Artifact</th>
										<th class="border-b border-border p-4 font-bold">User Target</th>
										<th class="border-b border-border p-4 font-bold">AI Assessment</th>
										<th class="border-b border-border p-4 font-bold text-center">Conflict Severity</th>
										<th class="border-b border-border p-4 font-bold text-right">Action Cluster</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-border/50">
									{#each filteredQuarantine as doc}
										<tr class="group hover:bg-muted/30">
											<td class="p-4">
												<div class="flex flex-col">
													<span class="font-bold text-foreground">{doc.name}</span>
													<span class="text-[9px] text-muted-foreground uppercase italic">{doc.id.slice(0, 8)}...</span>
												</div>
											</td>
											<td class="p-4">
												<div class="flex items-center gap-2">
													<span class="rounded bg-muted px-1.5 py-0.5 text-[9px] border border-border">
														{doc.classification}
													</span>
												</div>
											</td>
											<td class="p-4">
												<div class="flex items-center gap-2 text-signal-orange">
													<Zap size={10} />
													<span class="font-bold">{doc.aiClassification || 'PENDING'}</span>
												</div>
											</td>
											<td class="p-4 text-center">
												<span class="inline-block h-1.5 w-12 rounded-full bg-muted overflow-hidden">
													<span class="block h-full bg-signal-orange" style="width: 85%"></span>
												</span>
											</td>
											<td class="p-4">
												<div class="flex items-center justify-end gap-2">
													<form method="POST" action="?/resolveQuarantine" use:enhance>
														<input type="hidden" name="id" value={doc.id} />
														<input type="hidden" name="status" value="APPROVED" />
														<input type="hidden" name="classification" value={doc.aiClassification} />
														<button class="rounded-sm border border-border bg-muted/50 px-3 py-1.5 text-[9px] font-bold uppercase hover:bg-signal-green hover:text-white transition-all">
															Accept AI
														</button>
													</form>
													<form method="POST" action="?/resolveQuarantine" use:enhance>
														<input type="hidden" name="id" value={doc.id} />
														<input type="hidden" name="status" value="OVERRIDDEN" />
														<input type="hidden" name="classification" value={doc.classification} />
														<button class="rounded-sm border border-border bg-muted/50 px-3 py-1.5 text-[9px] font-bold uppercase hover:bg-signal-orange hover:text-white transition-all text-signal-orange hover:text-white">
															Override
														</button>
													</form>
												</div>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</div>

			<!-- API KEYS TAB -->
			{:else if activeTab === 'keys'}
				<div class="h-full flex flex-col overflow-hidden p-4 space-y-4" in:fade={{ duration: 150 }}>
					<div class="flex items-center justify-between">
						<div class="space-y-1">
							<h3 class="font-bold tracking-widest text-foreground uppercase">Machine Identities</h3>
							<p class="text-[9px] text-muted-foreground uppercase">Manage API keys for external agents and worker nodes.</p>
						</div>
						<button 
							onclick={() => showNewKey = !showNewKey}
							class="flex items-center gap-2 border border-border bg-muted/50 px-4 py-2 text-[9px] font-bold uppercase tracking-widest transition-all hover:bg-signal-blue hover:text-white"
						>
							<Plus size={14} />
							Generate Key
						</button>
					</div>

					{#if showNewKey}
						<div class="rounded-sm border border-signal-blue/30 bg-signal-blue/5 p-4" transition:slide>
							<form method="POST" action="?/createApiKey" use:enhance={() => { return async ({ update }) => { await update(); showNewKey = false; }; }} class="flex flex-col md:flex-row items-end gap-4">
								<div class="flex-1 space-y-1 w-full">
									<label class="flex flex-col gap-1">
										<span class="font-mono text-[8px] tracking-widest text-muted-foreground uppercase">Key Name (e.g., OCR-Worker-01)</span>
										<input name="name" required class="w-full rounded-sm border border-border bg-neutral-950 p-2 font-mono text-[10px] outline-none focus:border-signal-blue" />
									</label>
								</div>
								<div class="space-y-1 w-full md:w-48">
									<label class="flex flex-col gap-1">
										<span class="font-mono text-[8px] tracking-widest text-muted-foreground uppercase">Access Level</span>
										<select name="role" class="w-full rounded-sm border border-border bg-neutral-950 p-2 font-mono text-[9px] outline-none focus:border-signal-blue">
											<option value="AGENT">AGENT (Read/Write Documents)</option>
											<option value="ADMIN">ADMIN (Full Access)</option>
										</select>
									</label>
								</div>
								<button class="bg-signal-blue text-white px-6 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-signal-blue/80 transition-all h-[38px]">
									Generate
								</button>
							</form>
						</div>
					{/if}

					{#if form?.newKey}
						<div class="rounded-sm border border-signal-orange/30 bg-signal-orange/5 p-4 space-y-2" transition:slide>
							<div class="flex items-center gap-2 text-signal-orange">
								<AlertCircle size={14} />
								<span class="text-[9px] font-bold uppercase tracking-widest">Secret Key Generated - Copy Now (It won't be shown again)</span>
							</div>
							<div class="flex items-center gap-2">
								<code class="flex-1 bg-neutral-950 border border-border p-3 font-mono text-xs text-foreground select-all">{form.newKey}</code>
							</div>
						</div>
					{/if}

					<div class="flex-1 overflow-y-auto custom-scrollbar rounded-sm border border-border bg-muted/10">
						<table class="w-full border-collapse font-mono text-[10px]">
							<thead class="sticky top-0 z-10 bg-muted/80 backdrop-blur-md">
								<tr class="text-left uppercase tracking-widest text-muted-foreground">
									<th class="border-b border-border p-4 font-bold">Identity</th>
									<th class="border-b border-border p-4 font-bold">Role</th>
									<th class="border-b border-border p-4 font-bold">Last Used</th>
									<th class="border-b border-border p-4 font-bold">Created</th>
									<th class="border-b border-border p-4 font-bold text-right">Control</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-border/50">
								{#each filteredKeys as key}
									<tr class="group hover:bg-muted/30">
										<td class="p-4">
											<div class="flex flex-col">
												<span class="font-bold text-foreground">{key.name}</span>
												<span class="text-[9px] text-muted-foreground uppercase italic">{key.id.slice(0, 8)}...</span>
											</div>
										</td>
										<td class="p-4">
											<span class="rounded bg-muted px-1.5 py-0.5 text-[9px] border border-border">
												{key.role}
											</span>
										</td>
										<td class="p-4 text-muted-foreground">
											{key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : 'NEVER'}
										</td>
										<td class="p-4 text-muted-foreground">
											{new Date(key.createdAt).toLocaleDateString()}
										</td>
										<td class="p-4">
											<div class="flex items-center justify-end">
												<form method="POST" action="?/deleteApiKey" use:enhance>
													<input type="hidden" name="id" value={key.id} />
													<button class="text-muted-foreground hover:text-signal-orange transition-all p-2">
														<Trash2 size={14} />
													</button>
												</form>
											</div>
										</td>
									</tr>
								{/each}
								{#if filteredKeys.length === 0}
									<tr>
										<td colspan="5" class="p-12 text-center text-muted-foreground opacity-50 italic uppercase tracking-widest text-[9px]">
											No machine identities found in registry
										</td>
									</tr>
								{/if}
							</tbody>
						</table>
					</div>
				</div>

			<!-- SYSTEM TAB -->
			{:else}
				<div class="h-full flex overflow-hidden" in:fade={{ duration: 150 }}>
					<!-- Registry Forms (Left) -->
					<div class="flex-1 overflow-y-auto p-6 custom-scrollbar">
						<div class="max-w-4xl space-y-12">
							
							<!-- AI SERVICE GATEWAYS -->
							<section class="space-y-6">
								<div class="flex items-center justify-between border-b border-border pb-2">
									<div class="flex items-center gap-2">
										<Key size={14} class="text-signal-blue" />
										<h3 class="font-bold tracking-widest text-foreground uppercase text-xs">AI Service Gateways (Credentials)</h3>
									</div>
									{#if hasChanges(['gateways.openai.key', 'gateways.google.key', 'gateways.ollama.url'])}
										<button 
											onclick={() => saveSection(['gateways.openai.key', 'gateways.google.key', 'gateways.ollama.url'])}
											class="flex items-center gap-2 bg-signal-blue text-white px-3 py-1 rounded-sm text-[10px] font-bold uppercase tracking-widest hover:bg-signal-blue/80 transition-all shadow-lg shadow-signal-blue/20"
											in:fade
										>
											<Save size={12} /> Commit Changes
										</button>
									{/if}
								</div>

								<div class="space-y-2">
									<RegistryField 
										key="gateways.openai.key"
										label="OPENAI_API_KEY"
										description="Private key for OpenAI services (GPT & Embeddings)."
										type="password"
										value={settings['gateways.openai.key'] || ''}
										onFocus={(k) => activeHelpKey = k}
										onBlur={() => activeHelpKey = null}
										onChange={handleSettingChange}
										onSave={handleSettingSave}
									/>
									<RegistryField 
										key="gateways.google.key"
										label="GOOGLE_API_KEY"
										description="Secret key for Google Gemini services."
										type="password"
										value={settings['gateways.google.key'] || ''}
										onFocus={(k) => activeHelpKey = k}
										onBlur={() => activeHelpKey = null}
										onChange={handleSettingChange}
										onSave={handleSettingSave}
									/>
									<RegistryField 
										key="gateways.ollama.url"
										label="OLLAMA_BASE_URL"
										description="Network address for Ollama API."
										value={settings['gateways.ollama.url'] || 'http://localhost:11434'}
										onFocus={(k) => activeHelpKey = k}
										onBlur={() => activeHelpKey = null}
										onChange={handleSettingChange}
										onSave={handleSettingSave}
									/>
								</div>
							</section>

							<!-- INFRASTRUCTURE SECTION -->
							<section class="space-y-6">
								<div class="flex items-center justify-between border-b border-border pb-2">
									<div class="flex items-center gap-2">
										<Cpu size={14} class="text-signal-blue" />
										<h3 class="font-bold tracking-widest text-foreground uppercase text-xs">Semantic Embedding Engine</h3>
									</div>
									{#if hasChanges(['embeddings.provider', 'embeddings.model'])}
										<button 
											onclick={() => saveSection(['embeddings.provider', 'embeddings.model'])}
											class="flex items-center gap-2 bg-signal-blue text-white px-3 py-1 rounded-sm text-[10px] font-bold uppercase tracking-widest hover:bg-signal-blue/80 transition-all shadow-lg shadow-signal-blue/20"
											in:fade
										>
											<Save size={12} /> Commit Changes
										</button>
									{/if}
								</div>

								<div class="space-y-2">
									<!-- Embedding Provider -->
									<RegistryField 
										key="embeddings.provider"
										label="EMBEDDING_PROVIDER"
										description="Core text-to-vector translation engine."
										type="select"
										value={settings['embeddings.provider'] || 'local'}
										options={[
											{ value: 'local', label: 'LOCAL WASM (@xenova)' },
											{ value: 'ollama', label: 'OLLAMA (Local API)' },
											{ value: 'openai', label: 'OPENAI (Cloud)' },
											{ value: 'google', label: 'GOOGLE GEMINI (Cloud)' }
										]}
										syncAction={['openai', 'ollama', 'google'].includes(settings['embeddings.provider']) ? 'syncModels' : null}
										onFocus={(k) => activeHelpKey = k}
										onBlur={() => activeHelpKey = null}
										onChange={handleSettingChange}
										onSave={handleSettingSave}
									/>

									<!-- Dynamic Embedding Model -->
									<RegistryField 
										key="embeddings.model"
										label="EMBEDDING_MODEL"
										description="Specific embedding model artifact."
										type={settings['embeddings.provider'] === 'ollama' ? 'text' : 'select'}
										value={settings['embeddings.model'] || ''}
										options={[
											...filterRecommendedModels(
												settings[`gateways.${settings['embeddings.provider']}.models`] || [], 
												'EMBEDDING',
												settings['embeddings.provider']
											).map((m: any) => ({ value: m.id, label: m.name })),
											{ value: settings['embeddings.model'], label: settings['embeddings.model'] }
										].filter((v, i, a) => v.value && a.findIndex(t => t.value === v.value) === i)}
										onFocus={(k) => activeHelpKey = k}
										onBlur={() => activeHelpKey = null}
										onChange={handleSettingChange}
										onSave={handleSettingSave}
									/>
								</div>
							</section>

							<!-- INTELLIGENCE CHAT SECTION -->
							<section class="space-y-6">
								<div class="flex items-center justify-between border-b border-border pb-2">
									<div class="flex items-center gap-2">
										<Bot size={14} class="text-signal-blue" />
										<h3 class="font-bold tracking-widest text-foreground uppercase text-xs">Intelligence Chat Orchestrator</h3>
									</div>
									{#if hasChanges(['chat.engine', 'chat.model'])}
										<button 
											onclick={() => saveSection(['chat.engine', 'chat.model'])}
											class="flex items-center gap-2 bg-signal-blue text-white px-3 py-1 rounded-sm text-[10px] font-bold uppercase tracking-widest hover:bg-signal-blue/80 transition-all shadow-lg shadow-signal-blue/20"
											in:fade
										>
											<Save size={12} /> Commit Changes
										</button>
									{/if}
								</div>

								<div class="space-y-2">
									<!-- Chat Engine -->
									<RegistryField 
										key="chat.engine"
										label="CHAT_ENGINE"
										description="Analytical LLM used for generating RAG responses."
										type="select"
										value={settings['chat.engine'] || 'OLLAMA'}
										options={[
											{ value: 'OLLAMA', label: 'OLLAMA (Local Intelligence)' },
											{ value: 'OPENAI', label: 'OPENAI (Cloud Reasoning)' },
											{ value: 'GOOGLE', label: 'GOOGLE GEMINI (Intelligence)' }
										]}
										syncAction={['OPENAI', 'OLLAMA', 'GOOGLE'].includes(settings['chat.engine']) ? 'syncModels' : null}
										onFocus={(k) => activeHelpKey = k}
										onBlur={() => activeHelpKey = null}
										onChange={handleSettingChange}
										onSave={handleSettingSave}
									/>

									<!-- Dynamic Chat Model -->
									<RegistryField 
										key="chat.model"
										label="CHAT_MODEL"
										description="Target model for chat dialogue."
										type={settings['chat.engine'] === 'OLLAMA' ? 'text' : 'select'}
										value={settings['chat.model'] || ''}
										options={[
											...filterRecommendedModels(
												settings[`gateways.${settings['chat.engine']?.toLowerCase()}.models`] || [], 
												'CHAT',
												settings['chat.engine']?.toLowerCase()
											).map((m: any) => ({ value: m.id, label: m.name })),
											{ value: settings['chat.model'], label: settings['chat.model'] }
										].filter((v, i, a) => v.value && a.findIndex(t => t.value === v.value) === i)}
										onFocus={(k) => activeHelpKey = k}
										onBlur={() => activeHelpKey = null}
										onChange={handleSettingChange}
										onSave={handleSettingSave}
									/>
								</div>
							</section>

							<div class="pt-4"></div>

							<!-- Vector Engine -->
							<section class="space-y-6">
								<div class="flex items-center gap-2 border-b border-border pb-2">
									<Database size={14} class="text-signal-blue" />
									<h3 class="font-bold tracking-widest text-foreground uppercase text-xs">Vector Memory Bank</h3>
								</div>
								
								<div class="space-y-2">
									<RegistryField 
										key="vectors.engine"
										label="VECTOR_ENGINE"
										description="Primary storage backend for semantic chunks."
										type="select"
										value={settings['vectors.engine'] || 'lancedb'}
										options={[
											{ value: 'lancedb', label: 'LANCEDB (S3-Native)' },
											{ value: 'pgvector', label: 'PGVECTOR (Enterprise)' },
											{ value: 'qdrant', label: 'QDRANT (Distributed)' }
										]}
										onFocus={(k) => activeHelpKey = k}
										onBlur={() => activeHelpKey = null}
										onChange={handleSettingChange}
										onSave={handleSettingSave}
									/>

									{#if settings['vectors.engine'] === 'pgvector'}
										<div class="ml-4 border-l-2 border-signal-blue/20 pl-4 space-y-2" transition:slide>
											<RegistryField 
												key="vectors.pg.url"
												label="PG_CONNECTION_URL"
												description="Postgres connection string (with pgvector)."
												type="password"
												value={settings['vectors.pg.url'] || ''}
												onFocus={(k) => activeHelpKey = k}
												onBlur={() => activeHelpKey = null}
												onChange={handleSettingChange}
												onSave={handleSettingSave}
											/>
										</div>
									{:else if settings['vectors.engine'] === 'qdrant'}
										<div class="ml-4 border-l-2 border-signal-blue/20 pl-4 space-y-2" transition:slide>
											<RegistryField 
												key="vectors.qdrant.url"
												label="QDRANT_API_ENDPOINT"
												description="URL for the Qdrant service."
												value={settings['vectors.qdrant.url'] || ''}
												onFocus={(k) => activeHelpKey = k}
												onBlur={() => activeHelpKey = null}
												onChange={handleSettingChange}
												onSave={handleSettingSave}
											/>
											<RegistryField 
												key="vectors.qdrant.key"
												label="QDRANT_API_KEY"
												description="Secret key for Qdrant (if enabled)."
												type="password"
												value={settings['vectors.qdrant.key'] || ''}
												onFocus={(k) => activeHelpKey = k}
												onBlur={() => activeHelpKey = null}
												onChange={handleSettingChange}
												onSave={handleSettingSave}
											/>
										</div>
									{/if}
								</div>
							</section>

							<!-- INGESTION SECTION -->
							<section class="space-y-6">
								<div class="flex items-center gap-2 border-b border-border pb-2">
									<Database size={14} class="text-signal-blue" />
									<h3 class="font-bold tracking-widest text-foreground uppercase text-xs">Ingestion Protocol</h3>
								</div>

								<div class="space-y-2">
									<RegistryField 
										key="ingestion.max_file_size"
										label="INGESTION_MAX_SIZE (MB)"
										description="Upper limit for individual artifact uploads."
										type="number"
										value={Math.round((settings['ingestion.max_file_size'] || 52428800) / (1024 * 1024))}
										onFocus={(k) => activeHelpKey = k}
										onBlur={() => activeHelpKey = null}
										onChange={handleSettingChange}
									/>
									<div class="grid grid-cols-2 gap-4">
										<RegistryField 
											key="ingestion.chunk_size"
											label="CHUNK_SIZE"
											description="Tokens per semantic fragment."
											type="number"
											value={settings['ingestion.chunk_size'] || 512}
											onFocus={(k) => activeHelpKey = k}
											onBlur={() => activeHelpKey = null}
											onChange={handleSettingChange}
										/>
										<RegistryField 
											key="ingestion.chunk_overlap"
											label="CHUNK_OVERLAP"
											description="Context preservation window."
											type="number"
											value={settings['ingestion.chunk_overlap'] || 64}
											onFocus={(k) => activeHelpKey = k}
											onBlur={() => activeHelpKey = null}
											onChange={handleSettingChange}
										/>
									</div>
								</div>
							</section>
						</div>
					</div>

					<div class="hidden xl:block w-96 shrink-0">
						<IntelligencePanel activeKey={activeHelpKey} />
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.custom-scrollbar::-webkit-scrollbar {
		width: 4px;
		height: 4px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: transparent;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: var(--color-border);
		border-radius: 2px;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb:hover {
		background: var(--color-signal-blue);
	}
</style>
