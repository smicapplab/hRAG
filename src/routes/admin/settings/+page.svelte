<script lang="ts">
	import type { PageData } from './$types';
	import {
		Settings,
		Shield,
		Zap,
		Lock,
		Database,
		Info,
		CheckCircle2,
		AlertTriangle,
		ChevronRight
	} from 'lucide-svelte';
	import { enhance } from '$app/forms';

	let { data }: { data: PageData } = $props();

	let activeTab = $state('policies');
</script>

<div class="flex h-full flex-col space-y-6 overflow-hidden p-4 lg:p-8">
	<!-- Header Control Region -->
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
				class="px-3 py-1 text-[10px] font-bold tracking-widest uppercase transition-all {activeTab ===
				'policies'
					? 'bg-signal-blue text-white shadow-lg'
					: 'text-muted-foreground hover:text-foreground'}"
			>
				Policies
			</button>
			<button
				onclick={() => (activeTab = 'quarantine')}
				class="relative px-3 py-1 text-[10px] font-bold tracking-widest uppercase transition-all {activeTab ===
				'quarantine'
					? 'bg-signal-blue text-white shadow-lg'
					: 'text-muted-foreground hover:text-foreground'}"
			>
				Quarantine
				{#if data.quarantine.length > 0}
					<span class="absolute -top-1 -right-1 h-2 w-2 animate-pulse rounded-full bg-signal-orange"
					></span>
				{/if}
			</button>
			<button
				onclick={() => (activeTab = 'system')}
				class="px-3 py-1 text-[10px] font-bold tracking-widest uppercase transition-all {activeTab ===
				'system'
					? 'bg-signal-blue text-white shadow-lg'
					: 'text-muted-foreground hover:text-foreground'}"
			>
				System
			</button>
		</div>
	</div>

	<!-- Main Workspace -->
	<div
		class="flex flex-1 flex-col overflow-hidden rounded-sm border border-border bg-muted/10 backdrop-blur-sm"
	>
		{#if activeTab === 'policies'}
			<div class="flex items-center justify-between border-b border-border bg-muted/50 p-3">
				<div class="flex items-center gap-2">
					<Shield size={14} class="text-signal-blue" />
					<span class="text-[10px] font-bold tracking-widest text-muted-foreground uppercase"
						>Classification Security Policies</span
					>
				</div>
				<span class="font-mono text-[9px] text-muted-foreground italic"
					>Mandatory High-Water Mark Logic Active</span
				>
			</div>

			<div class="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-4">
				<div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
					{#each data.policies.sort((a, b) => a.severityWeight - b.severityWeight) as policy}
						<form
							method="POST"
							action="?/updatePolicy"
							use:enhance
							class="group space-y-4 rounded-sm border border-border bg-muted/30 p-4"
						>
							<input type="hidden" name="id" value={policy.id} />

							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									<div
										class="border border-signal-blue/30 bg-signal-blue/10 px-2 py-0.5 font-mono text-[10px] font-bold text-signal-blue"
									>
										{policy.code}
									</div>
									<input
										type="text"
										name="displayName"
										value={policy.displayName}
										class="border-none bg-transparent text-sm font-bold uppercase transition-colors outline-none focus:text-signal-blue"
									/>
								</div>
								<div class="flex items-center gap-2">
									<span class="text-[9px] font-bold tracking-widest text-muted-foreground uppercase"
										>Weight</span
									>
									<input
										type="number"
										name="severityWeight"
										value={policy.severityWeight}
										class="w-12 rounded-sm border border-border bg-neutral-950 p-1 text-center font-mono text-[10px] outline-none focus:border-signal-blue"
									/>
								</div>
							</div>

							<div class="grid grid-cols-2 gap-4">
								<div class="space-y-1">
									<label
										class="text-[9px] font-bold tracking-widest text-muted-foreground uppercase"
										>Min Role Required</label
									>
									<select
										name="minRoleRequired"
										value={policy.minRoleRequired}
										class="w-full rounded-sm border border-border bg-neutral-950 p-2 font-mono text-[10px] outline-none focus:border-signal-blue"
									>
										<option value="VIEWER">VIEWER</option>
										<option value="EDITOR">EDITOR</option>
										<option value="MANAGER">MANAGER</option>
									</select>
								</div>
								<div class="space-y-1">
									<label
										class="text-[9px] font-bold tracking-widest text-muted-foreground uppercase"
										>Audit Requirement</label
									>
									<div
										class="flex h-9 items-center gap-2 rounded-sm border border-border bg-neutral-950/50 px-2"
									>
										<input
											type="checkbox"
											checked={policy.requiresAudit}
											class="accent-signal-blue"
										/>
										<span class="font-mono text-[10px] text-muted-foreground uppercase"
											>Log Access</span
										>
									</div>
								</div>
							</div>

							<div class="space-y-1">
								<label class="text-[9px] font-bold tracking-widest text-muted-foreground uppercase"
									>Policy Description</label
								>
								<textarea
									name="description"
									value={policy.description}
									rows="2"
									class="w-full resize-none rounded-sm border border-border bg-neutral-950 p-2 font-mono text-[10px] outline-none focus:border-signal-blue"
								></textarea>
							</div>

							<button
								type="submit"
								class="w-full border border-border bg-muted py-2 text-[9px] font-bold tracking-widest uppercase opacity-0 transition-all group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-signal-blue hover:text-white"
							>
								Commit Policy Changes
							</button>
						</form>
					{/each}
				</div>
			</div>
		{:else if activeTab === 'quarantine'}
			<div class="flex items-center justify-between border-b border-border bg-muted/50 p-3">
				<div class="flex items-center gap-2">
					<AlertTriangle size={14} class="text-signal-orange" />
					<span class="text-[10px] font-bold tracking-widest text-muted-foreground uppercase"
						>Security Quarantine / Needs Review</span
					>
				</div>
				<span class="font-mono text-[9px] text-muted-foreground italic"
					>{data.quarantine.length} ASSETS REQUIRE ATTENTION</span
				>
			</div>

			<div class="custom-scrollbar flex-1 overflow-y-auto">
				{#if data.quarantine.length === 0}
					<div class="flex h-full flex-col items-center justify-center text-center opacity-40">
						<CheckCircle2 size={32} class="mb-2 text-signal-green" />
						<p class="font-mono text-[10px] tracking-widest text-foreground uppercase">
							All Security Assessments Clear
						</p>
					</div>
				{:else}
					<table class="w-full border-collapse text-left">
						<thead>
							<tr
								class="border-b border-border bg-muted/20 text-[9px] font-bold tracking-widest text-muted-foreground uppercase"
							>
								<th class="p-3">Asset Identity</th>
								<th class="p-3">Conflict State</th>
								<th class="p-3">AI Assessment</th>
								<th class="p-3">Actions</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-border/50 font-mono">
							{#each data.quarantine as doc}
								<tr class="transition-colors hover:bg-signal-orange/5">
									<td class="p-3">
										<div class="flex flex-col">
											<span
												class="mb-1 text-xs leading-none font-bold tracking-tight text-foreground uppercase"
												>{doc.name}</span
											>
											<span class="text-[9px] text-muted-foreground uppercase"
												>DOC_ID: {doc.id.slice(0, 8)}</span
											>
										</div>
									</td>
									<td class="p-3">
										<div class="flex items-center gap-2">
											<span class="text-[10px] text-muted-foreground">{doc.classification}</span>
											<ChevronRight size={10} class="text-muted-foreground" />
											<span class="font-mono text-[10px] font-bold text-signal-orange"
												>{doc.aiClassification}</span
											>
										</div>
									</td>
									<td class="p-3">
										<div
											class="inline-flex items-center gap-2 rounded-sm border border-signal-orange/30 bg-signal-orange/10 p-2"
										>
											<Zap size={10} class="text-signal-orange" />
											<span class="text-[9px] font-bold text-signal-orange uppercase"
												>AI OVERRIDE ACTIVE</span
											>
										</div>
									</td>
									<td class="p-3">
										<form method="POST" action="?/resolveQuarantine" use:enhance class="flex gap-2">
											<input type="hidden" name="id" value={doc.id} />
											<input type="hidden" name="classification" value={doc.aiClassification} />
											<button
												name="status"
												value="APPROVED"
												class="rounded-sm bg-signal-green px-3 py-1 text-[9px] font-bold text-white uppercase transition-colors hover:bg-green-600"
												>Confirm AI</button
											>
											<button
												name="status"
												value="OVERRIDDEN"
												class="rounded-sm border border-border bg-muted px-3 py-1 text-[9px] font-bold text-muted-foreground uppercase transition-colors hover:text-foreground"
												>Manual Reject</button
											>
										</form>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</div>
		{:else}
			<div class="flex items-center justify-between border-b border-border bg-muted/50 p-3">
				<div class="flex items-center gap-2">
					<Database size={14} class="text-signal-blue" />
					<span class="text-[10px] font-bold tracking-widest text-muted-foreground uppercase"
						>System Setting Registry</span
					>
				</div>
				<span class="font-mono text-[9px] text-muted-foreground italic"
					>Stateless Propagation (TTL: 5m)</span
				>
			</div>

			<div class="custom-scrollbar flex-1 overflow-y-auto p-4">
				<div class="max-w-2xl space-y-6">
					<div class="rounded-sm border border-border bg-muted/30 p-4">
						<div class="mb-4 flex items-center gap-2">
							<Info size={14} class="text-signal-blue" />
							<p class="font-mono text-[10px] text-muted-foreground uppercase">
								System-wide settings are shared across all compute nodes via the metadata database.
							</p>
						</div>

						<div class="space-y-4">
							<form
								method="POST"
								action="?/updateSetting"
								use:enhance
								class="grid grid-cols-12 items-start gap-4 border-b border-border/50 pb-6"
							>
								<div class="col-span-12 lg:col-span-4">
									<label
										class="mb-2 block text-[9px] font-bold tracking-widest text-muted-foreground uppercase"
										>Setting Key</label
									>
									<div class="font-mono text-[11px] font-bold text-foreground">
										EMBEDDING_PROVIDER
									</div>
									<p class="mt-2 text-[9px] leading-relaxed text-muted-foreground italic">
										Defines the mathematical engine for text-to-vector transformation. Local WASM is
										the most secure; Cloud offers highest accuracy.
									</p>
									<input type="hidden" name="key" value="embeddings.provider" />
								</div>
								<div class="col-span-12 lg:col-span-6">
									<label
										class="mb-2 block text-[9px] font-bold tracking-widest text-muted-foreground uppercase"
										>Active Engine</label
									>
									<select
										name="value"
										value={data.settings['embeddings.provider'] || 'local'}
										class="w-full rounded-sm border border-border bg-neutral-950 p-3 font-mono text-[10px] outline-none focus:border-signal-blue"
									>
										<option value="local">LOCAL WASM (XENOVA/MINILM)</option>
										<option value="ollama">OLLAMA (ON-PREMISE GPU)</option>
										<option value="openai">OPENAI (THIRD-PARTY / EXTERNAL)</option>
										<option value="google">GOOGLE GENAI (THIRD-PARTY / EXTERNAL)</option>
									</select>
								</div>
								<div class="col-span-12 lg:col-span-2">
									<button
										class="w-full border border-border bg-muted py-3 text-[9px] font-bold uppercase transition-all hover:bg-signal-blue hover:text-white"
										>Update</button
									>
								</div>
							</form>

							<form
								method="POST"
								action="?/updateSetting"
								use:enhance
								class="grid grid-cols-12 items-start gap-4 border-b border-border/50 pb-6"
							>
								<div class="col-span-12 lg:col-span-4">
									<label
										class="mb-2 block text-[9px] font-bold tracking-widest text-muted-foreground uppercase"
										>Setting Key</label
									>
									<div class="font-mono text-[11px] font-bold text-foreground">
										INGEST_MAX_FILE_SIZE
									</div>
									<p class="mt-2 text-[9px] leading-relaxed text-muted-foreground italic">
										Defines the hard-cap for document uploads. Large files increase extraction
										latency and memory pressure on stateless nodes.
									</p>
									<input type="hidden" name="key" value="ingestion.max_file_size" />
								</div>
								<div class="col-span-12 lg:col-span-6">
									<label
										class="mb-2 block text-[9px] font-bold tracking-widest text-muted-foreground uppercase"
										>Value (MB)</label
									>
									<input
										type="number"
										name="value"
										value={data.settings['ingestion.max_file_size'] || 50}
										class="w-full rounded-sm border border-border bg-neutral-950 p-3 font-mono text-xs transition-colors outline-none focus:border-signal-blue"
									/>
								</div>
								<div class="col-span-12 lg:col-span-2">
									<button
										class="w-full border border-border bg-muted py-3 text-[9px] font-bold uppercase shadow-lg transition-all hover:bg-signal-blue hover:text-white"
										>Update</button
									>
								</div>
							</form>

							<!-- Vector Provider Configuration -->
							<div class="space-y-4 border-b border-border/50 pb-6">
								<form
									method="POST"
									action="?/updateSetting"
									use:enhance
									class="grid grid-cols-12 items-start gap-4"
								>
									<div class="col-span-12 lg:col-span-4">
										<label
											class="mb-2 block text-[9px] font-bold tracking-widest text-muted-foreground uppercase"
											>Setting Key</label
										>
										<div class="font-mono text-[11px] font-bold text-foreground">
											VECTOR_STORAGE_ENGINE
										</div>
										<p class="mt-2 text-[9px] leading-relaxed text-muted-foreground italic">
											Determines the primary storage for intelligence fragments. Note: Switching
											engines may require a full cluster re-index.
										</p>
										<input type="hidden" name="key" value="vectors.provider" />
									</div>
									<div class="col-span-12 lg:col-span-6">
										<label
											class="mb-2 block text-[9px] font-bold tracking-widest text-muted-foreground uppercase"
											>Active Provider</label
										>
										<select
											name="value"
											value={data.settings['vectors.provider'] || 'lancedb'}
											class="w-full rounded-sm border border-border bg-neutral-950 p-3 font-mono text-[10px] outline-none focus:border-signal-blue"
										>
											<option value="lancedb">LANCEDB (S3-NATIVE / PORTABLE)</option>
											<option value="qdrant">QDRANT (ENTERPRISE / CLUSTER)</option>
											<option value="pgvector">PGVECTOR (RELATIONAL / LEGACY)</option>
										</select>
									</div>
									<div class="col-span-12 lg:col-span-2">
										<button
											class="w-full border border-border bg-muted py-3 text-[9px] font-bold uppercase transition-all hover:bg-signal-blue hover:text-white"
											>Switch</button
										>
									</div>
								</form>

								{#if data.settings['vectors.provider'] === 'qdrant'}
									<div
										class="ml-4 space-y-4 border-l-2 border-signal-blue bg-signal-blue/5 p-4"
										transition:slide
									>
										<h5 class="text-[9px] font-bold tracking-widest text-signal-blue uppercase">
											Qdrant Connection Protocol
										</h5>
										<div class="grid grid-cols-2 gap-4">
											<div class="space-y-1">
												<label class="text-[8px] font-bold text-muted-foreground uppercase"
													>Endpoint URL</label
												>
												<input
													type="text"
													placeholder="http://qdrant:6333"
													class="w-full border border-border bg-neutral-950 p-2 font-mono text-[10px] outline-none"
												/>
											</div>
											<div class="space-y-1">
												<label class="text-[8px] font-bold text-muted-foreground uppercase"
													>API Key (Optional)</label
												>
												<input
													type="password"
													placeholder="••••••••"
													class="w-full border border-border bg-neutral-950 p-2 font-mono text-[10px] outline-none"
												/>
											</div>
										</div>
									</div>
								{/if}
							</div>

							<!-- Intelligence Tiering (Classification) -->
							<div class="space-y-4 border-b border-border/50 pb-6">
								<form
									method="POST"
									action="?/updateSetting"
									use:enhance
									class="grid grid-cols-12 items-start gap-4"
								>
									<div class="col-span-12 lg:col-span-4">
										<label
											class="mb-2 block text-[9px] font-bold tracking-widest text-muted-foreground uppercase"
											>Setting Key</label
										>
										<div class="font-mono text-[11px] font-bold text-foreground">
											AUTO_CLASSIFICATION
										</div>
										<p class="mt-2 text-[9px] leading-relaxed text-muted-foreground italic">
											Enables the 'High-Water Mark' safety net. AI will independently audit document
											sensitivity during ingestion.
										</p>
										<input type="hidden" name="key" value="classification.auto_enabled" />
									</div>
									<div class="col-span-12 lg:col-span-6">
										<label
											class="mb-2 block text-[9px] font-bold tracking-widest text-muted-foreground uppercase"
											>Engine State</label
										>
										<select
											name="value"
											value={data.settings['classification.auto_enabled'] || 'true'}
											class="w-full rounded-sm border border-border bg-neutral-950 p-3 font-mono text-[10px] outline-none focus:border-signal-blue"
										>
											<option value="true">ENABLED (AI Sentry Active)</option>
											<option value="false">DISABLED (Manual Triage Only)</option>
										</select>
									</div>
									<div class="col-span-12 lg:col-span-2">
										<button
											class="w-full border border-border bg-muted py-3 text-[9px] font-bold uppercase transition-all hover:bg-signal-blue hover:text-white"
											>Update</button
										>
									</div>
								</form>

								<div class="ml-4 grid grid-cols-3 gap-4">
									<button
										class="border p-3 {data.settings['classification.tier'] === 'local'
											? 'border-signal-green bg-signal-green/5'
											: 'border-border bg-muted/30'} group rounded-sm text-left"
									>
										<div class="mb-2 flex items-center justify-between">
											<span class="text-[10px] font-bold tracking-widest uppercase">Local WASM</span
											>
											<div class="h-2 w-2 rounded-full bg-signal-green"></div>
										</div>
										<p class="text-[8px] leading-tight text-muted-foreground uppercase">
											Private-by-default. Zero data leaves the cluster.
										</p>
									</button>
									<button
										class="border p-3 {data.settings['classification.tier'] === 'ollama'
											? 'border-signal-blue bg-signal-blue/5'
											: 'border-border bg-muted/30'} group rounded-sm text-left"
									>
										<div class="mb-2 flex items-center justify-between">
											<span class="text-[10px] font-bold tracking-widest uppercase"
												>Ollama Sidecar</span
											>
											<div class="h-2 w-2 rounded-full bg-signal-blue"></div>
										</div>
										<p class="text-[8px] leading-tight text-muted-foreground uppercase">
											On-premise GPU acceleration. High precision.
										</p>
									</button>
									<button
										class="border p-3 {data.settings['classification.tier'] === 'cloud'
											? 'border-signal-red bg-signal-red/5'
											: 'border-border bg-muted/30'} group rounded-sm text-left"
									>
										<div class="mb-2 flex items-center justify-between">
											<span class="text-[10px] font-bold tracking-widest uppercase">Cloud AI</span>
											<div class="h-2 w-2 rounded-full bg-signal-red"></div>
										</div>
										<p class="text-[8px] leading-tight font-bold text-signal-red uppercase">
											External Data Transfer. Maximum intelligence.
										</p>
									</button>
								</div>
							</div>
						</div>
					</div>

					<div
						class="flex items-start gap-4 rounded-sm border border-signal-blue/20 bg-signal-blue/5 p-4"
					>
						<Lock size={20} class="mt-1 shrink-0 text-signal-blue" />
						<div>
							<h4 class="mb-1 text-[10px] font-bold tracking-widest text-foreground uppercase">
								Passphrase Integrity
							</h4>
							<p class="text-[10px] leading-relaxed text-muted-foreground">
								System-level secrets (JWT, S3 Keys) are locked via the Master Passphrase. These can
								only be changed by updating the environment variables and performing a cluster-wide
								reboot.
							</p>
						</div>
					</div>
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
