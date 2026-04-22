<script lang="ts">
	import type { PageData } from './$types';
	import { Settings, Shield, Zap, Lock, Database, Info, CheckCircle2, AlertTriangle, ChevronRight } from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { slide } from 'svelte/transition';

	let { data }: { data: PageData } = $props();

	let activeTab = $state('policies');
</script>

<div class="h-full flex flex-col space-y-6 p-4 lg:p-8 overflow-hidden">
	<!-- Header Control Region -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
		<div>
			<h2 class="text-xl font-bold text-foreground flex items-center gap-2 uppercase">
				<Settings class="text-signal-blue" size={20} />
				Cluster / <span class="text-signal-blue">Registry</span>
			</h2>
			<p class="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Shared State Configuration & Security Policy Orchestrator</p>
		</div>
		
		<div class="flex bg-muted p-1 rounded-sm border border-border">
			<button 
				onclick={() => activeTab = 'policies'}
				class="px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-all {activeTab === 'policies' ? 'bg-signal-blue text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'}"
			>
				Policies
			</button>
			<button 
				onclick={() => activeTab = 'quarantine'}
				class="px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-all relative {activeTab === 'quarantine' ? 'bg-signal-blue text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'}"
			>
				Quarantine
				{#if data.quarantine.length > 0}
					<span class="absolute -top-1 -right-1 w-2 h-2 bg-signal-orange rounded-full animate-pulse"></span>
				{/if}
			</button>
			<button 
				onclick={() => activeTab = 'system'}
				class="px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-all {activeTab === 'system' ? 'bg-signal-blue text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'}"
			>
				System
			</button>
		</div>
	</div>

	<!-- Main Workspace -->
	<div class="flex-1 border border-border rounded-sm bg-muted/10 backdrop-blur-sm overflow-hidden flex flex-col">
		{#if activeTab === 'policies'}
			<div class="p-3 border-b border-border bg-muted/50 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<Shield size={14} class="text-signal-blue" />
					<span class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Classification Security Policies</span>
				</div>
				<span class="text-[9px] font-mono text-muted-foreground italic">Mandatory High-Water Mark Logic Active</span>
			</div>
			
			<div class="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
				<div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
					{#each data.policies.sort((a, b) => a.severityWeight - b.severityWeight) as policy}
						<form method="POST" action="?/updatePolicy" use:enhance class="p-4 bg-muted/30 border border-border rounded-sm space-y-4 group">
							<input type="hidden" name="id" value={policy.id} />
							
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									<div class="px-2 py-0.5 bg-signal-blue/10 border border-signal-blue/30 text-signal-blue text-[10px] font-mono font-bold">{policy.code}</div>
									<input 
										type="text" 
										name="displayName" 
										value={policy.displayName}
										class="bg-transparent border-none text-sm font-bold uppercase outline-none focus:text-signal-blue transition-colors"
									/>
								</div>
								<div class="flex items-center gap-2">
									<span class="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Weight</span>
									<input 
										type="number" 
										name="severityWeight" 
										value={policy.severityWeight}
										class="w-12 bg-neutral-950 border border-border rounded-sm p-1 text-[10px] font-mono text-center outline-none focus:border-signal-blue"
									/>
								</div>
							</div>

							<div class="grid grid-cols-2 gap-4">
								<div class="space-y-1">
									<label class="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Min Role Required</label>
									<select 
										name="minRoleRequired" 
										value={policy.minRoleRequired}
										class="w-full bg-neutral-950 border border-border rounded-sm p-2 text-[10px] font-mono outline-none focus:border-signal-blue"
									>
										<option value="VIEWER">VIEWER</option>
										<option value="EDITOR">EDITOR</option>
										<option value="MANAGER">MANAGER</option>
									</select>
								</div>
								<div class="space-y-1">
									<label class="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Audit Requirement</label>
									<div class="flex items-center h-9 px-2 gap-2 border border-border rounded-sm bg-neutral-950/50">
										<input type="checkbox" checked={policy.requiresAudit} class="accent-signal-blue" />
										<span class="text-[10px] font-mono uppercase text-muted-foreground">Log Access</span>
									</div>
								</div>
							</div>

							<div class="space-y-1">
								<label class="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Policy Description</label>
								<textarea 
									name="description" 
									value={policy.description}
									rows="2"
									class="w-full bg-neutral-950 border border-border rounded-sm p-2 text-[10px] font-mono outline-none focus:border-signal-blue resize-none"
								></textarea>
							</div>

							<button type="submit" class="w-full py-2 bg-muted border border-border text-[9px] font-bold uppercase tracking-widest hover:bg-signal-blue hover:text-white transition-all opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">
								Commit Policy Changes
							</button>
						</form>
					{/each}
				</div>
			</div>

		{:else if activeTab === 'quarantine'}
			<div class="p-3 border-b border-border bg-muted/50 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<AlertTriangle size={14} class="text-signal-orange" />
					<span class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Security Quarantine / Needs Review</span>
				</div>
				<span class="text-[9px] font-mono text-muted-foreground italic">{data.quarantine.length} ASSETS REQUIRE ATTENTION</span>
			</div>
			
			<div class="flex-1 overflow-y-auto custom-scrollbar">
				{#if data.quarantine.length === 0}
					<div class="h-full flex flex-col items-center justify-center text-center opacity-40">
						<CheckCircle2 size={32} class="mb-2 text-signal-green" />
						<p class="text-[10px] font-mono uppercase tracking-widest text-foreground">All Security Assessments Clear</p>
					</div>
				{:else}
					<table class="w-full text-left border-collapse">
						<thead>
							<tr class="bg-muted/20 text-[9px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border">
								<th class="p-3">Asset Identity</th>
								<th class="p-3">Conflict State</th>
								<th class="p-3">AI Assessment</th>
								<th class="p-3">Actions</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-border/50 font-mono">
							{#each data.quarantine as doc}
								<tr class="hover:bg-signal-orange/5 transition-colors">
									<td class="p-3">
										<div class="flex flex-col">
											<span class="text-xs font-bold text-foreground leading-none mb-1 uppercase tracking-tight">{doc.name}</span>
											<span class="text-[9px] text-muted-foreground uppercase">DOC_ID: {doc.id.slice(0, 8)}</span>
										</div>
									</td>
									<td class="p-3">
										<div class="flex items-center gap-2">
											<span class="text-[10px] text-muted-foreground">{doc.classification}</span>
											<ChevronRight size={10} class="text-muted-foreground" />
											<span class="text-[10px] text-signal-orange font-bold font-mono">{doc.aiClassification}</span>
										</div>
									</td>
									<td class="p-3">
										<div class="p-2 bg-signal-orange/10 border border-signal-orange/30 rounded-sm inline-flex items-center gap-2">
											<Zap size={10} class="text-signal-orange" />
											<span class="text-[9px] font-bold text-signal-orange uppercase">AI OVERRIDE ACTIVE</span>
										</div>
									</td>
									<td class="p-3">
										<form method="POST" action="?/resolveQuarantine" use:enhance class="flex gap-2">
											<input type="hidden" name="id" value={doc.id} />
											<input type="hidden" name="classification" value={doc.aiClassification} />
											<button name="status" value="APPROVED" class="px-3 py-1 bg-signal-green text-white text-[9px] font-bold uppercase rounded-sm hover:bg-green-600 transition-colors">Confirm AI</button>
											<button name="status" value="OVERRIDDEN" class="px-3 py-1 border border-border bg-muted text-muted-foreground text-[9px] font-bold uppercase rounded-sm hover:text-foreground transition-colors">Manual Reject</button>
										</form>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</div>

		{:else}
			<div class="p-3 border-b border-border bg-muted/50 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<Database size={14} class="text-signal-blue" />
					<span class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">System Setting Registry</span>
				</div>
				<span class="text-[9px] font-mono text-muted-foreground italic">Stateless Propagation (TTL: 5m)</span>
			</div>
			
			<div class="flex-1 overflow-y-auto p-4 custom-scrollbar">
				<div class="max-w-2xl space-y-6">
					<div class="p-4 bg-muted/30 border border-border rounded-sm">
						<div class="flex items-center gap-2 mb-4">
							<Info size={14} class="text-signal-blue" />
							<p class="text-[10px] font-mono text-muted-foreground uppercase">System-wide settings are shared across all compute nodes via the metadata database.</p>
						</div>

						<div class="space-y-4">
							<form method="POST" action="?/updateSetting" use:enhance class="grid grid-cols-12 gap-4 items-start pb-6 border-b border-border/50">
								<div class="col-span-12 lg:col-span-4">
									<label class="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">Setting Key</label>
									<div class="text-[11px] font-mono font-bold text-foreground">EMBEDDING_PROVIDER</div>
									<p class="text-[9px] text-muted-foreground mt-2 leading-relaxed italic">Defines the mathematical engine for text-to-vector transformation. Local WASM is the most secure; Cloud offers highest accuracy.</p>
									<input type="hidden" name="key" value="embeddings.provider" />
								</div>
								<div class="col-span-12 lg:col-span-6">
									<label class="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">Active Engine</label>
									<select 
										name="value" 
										value={data.settings['embeddings.provider'] || 'local'}
										class="w-full bg-neutral-950 border border-border rounded-sm p-3 text-[10px] font-mono outline-none focus:border-signal-blue"
									>
										<option value="local">LOCAL WASM (XENOVA/MINILM)</option>
										<option value="ollama">OLLAMA (ON-PREMISE GPU)</option>
										<option value="openai">OPENAI (THIRD-PARTY / EXTERNAL)</option>
										<option value="google">GOOGLE GENAI (THIRD-PARTY / EXTERNAL)</option>
									</select>
								</div>
								<div class="col-span-12 lg:col-span-2">
									<button class="w-full py-3 bg-muted border border-border text-[9px] font-bold uppercase hover:bg-signal-blue hover:text-white transition-all">Update</button>
								</div>
							</form>

							<form method="POST" action="?/updateSetting" use:enhance class="grid grid-cols-12 gap-4 items-start pb-6 border-b border-border/50">
								<div class="col-span-12 lg:col-span-4">
									<label class="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">Setting Key</label>
									<div class="text-[11px] font-mono font-bold text-foreground">INGEST_MAX_FILE_SIZE</div>
									<p class="text-[9px] text-muted-foreground mt-2 leading-relaxed italic">Defines the hard-cap for document uploads. Large files increase extraction latency and memory pressure on stateless nodes.</p>
									<input type="hidden" name="key" value="ingestion.max_file_size" />
								</div>
								<div class="col-span-12 lg:col-span-6">
									<label class="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">Value (MB)</label>
									<input 
										type="number" 
										name="value" 
										value={data.settings['ingestion.max_file_size'] || 50}
										class="w-full bg-neutral-950 border border-border rounded-sm p-3 text-xs font-mono outline-none focus:border-signal-blue transition-colors"
									/>
								</div>
								<div class="col-span-12 lg:col-span-2">
									<button class="w-full py-3 bg-muted border border-border text-[9px] font-bold uppercase hover:bg-signal-blue hover:text-white transition-all shadow-lg">Update</button>
								</div>
							</form>

							<!-- Vector Provider Configuration -->
							<div class="pb-6 border-b border-border/50 space-y-4">
								<form method="POST" action="?/updateSetting" use:enhance class="grid grid-cols-12 gap-4 items-start">
									<div class="col-span-12 lg:col-span-4">
										<label class="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">Setting Key</label>
										<div class="text-[11px] font-mono font-bold text-foreground">VECTOR_STORAGE_ENGINE</div>
										<p class="text-[9px] text-muted-foreground mt-2 leading-relaxed italic">Determines the primary storage for intelligence fragments. Note: Switching engines may require a full cluster re-index.</p>
										<input type="hidden" name="key" value="vectors.provider" />
									</div>
									<div class="col-span-12 lg:col-span-6">
										<label class="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">Active Provider</label>
										<select 
											name="value" 
											value={data.settings['vectors.provider'] || 'lancedb'}
											class="w-full bg-neutral-950 border border-border rounded-sm p-3 text-[10px] font-mono outline-none focus:border-signal-blue"
										>
											<option value="lancedb">LANCEDB (S3-NATIVE / PORTABLE)</option>
											<option value="qdrant">QDRANT (ENTERPRISE / CLUSTER)</option>
											<option value="pgvector">PGVECTOR (RELATIONAL / LEGACY)</option>
										</select>
									</div>
									<div class="col-span-12 lg:col-span-2">
										<button class="w-full py-3 bg-muted border border-border text-[9px] font-bold uppercase hover:bg-signal-blue hover:text-white transition-all">Switch</button>
									</div>
								</form>

								{#if data.settings['vectors.provider'] === 'qdrant'}
									<div class="ml-4 p-4 border-l-2 border-signal-blue bg-signal-blue/5 space-y-4" transition:slide>
										<h5 class="text-[9px] font-bold uppercase tracking-widest text-signal-blue">Qdrant Connection Protocol</h5>
										<div class="grid grid-cols-2 gap-4">
											<div class="space-y-1">
												<label class="text-[8px] font-bold text-muted-foreground uppercase">Endpoint URL</label>
												<input type="text" placeholder="http://qdrant:6333" class="w-full bg-neutral-950 border border-border p-2 text-[10px] font-mono outline-none" />
											</div>
											<div class="space-y-1">
												<label class="text-[8px] font-bold text-muted-foreground uppercase">API Key (Optional)</label>
												<input type="password" placeholder="••••••••" class="w-full bg-neutral-950 border border-border p-2 text-[10px] font-mono outline-none" />
											</div>
										</div>
									</div>
								{/if}
							</div>

							<!-- Intelligence Tiering (Classification) -->
							<div class="pb-6 border-b border-border/50 space-y-4">
								<form method="POST" action="?/updateSetting" use:enhance class="grid grid-cols-12 gap-4 items-start">
									<div class="col-span-12 lg:col-span-4">
										<label class="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">Setting Key</label>
										<div class="text-[11px] font-mono font-bold text-foreground">AUTO_CLASSIFICATION</div>
										<p class="text-[9px] text-muted-foreground mt-2 leading-relaxed italic">Enables the 'High-Water Mark' safety net. AI will independently audit document sensitivity during ingestion.</p>
										<input type="hidden" name="key" value="classification.auto_enabled" />
									</div>
									<div class="col-span-12 lg:col-span-6">
										<label class="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">Engine State</label>
										<select 
											name="value" 
											value={data.settings['classification.auto_enabled'] || 'true'}
											class="w-full bg-neutral-950 border border-border rounded-sm p-3 text-[10px] font-mono outline-none focus:border-signal-blue"
										>
											<option value="true">ENABLED (AI Sentry Active)</option>
											<option value="false">DISABLED (Manual Triage Only)</option>
										</select>
									</div>
									<div class="col-span-12 lg:col-span-2">
										<button class="w-full py-3 bg-muted border border-border text-[9px] font-bold uppercase hover:bg-signal-blue hover:text-white transition-all">Update</button>
									</div>
								</form>

								<div class="grid grid-cols-3 gap-4 ml-4">
									<form method="POST" action="?/updateSetting" use:enhance>
										<input type="hidden" name="key" value="classification.tier" />
										<input type="hidden" name="value" value="local" />
										<button class="w-full h-full p-3 border {data.settings['classification.tier'] === 'local' ? 'border-signal-green bg-signal-green/5' : 'border-border bg-muted/30'} rounded-sm text-left group transition-colors hover:border-signal-green/50">
											<div class="flex items-center justify-between mb-2">
												<span class="text-[10px] font-bold uppercase tracking-widest">Local WASM</span>
												{#if data.settings['classification.tier'] === 'local'}
													<div class="w-2 h-2 rounded-full bg-signal-green relative">
														<div class="absolute inset-0 bg-signal-green rounded-full animate-ping opacity-50"></div>
													</div>
												{:else}
													<div class="w-2 h-2 rounded-full border border-muted-foreground opacity-50"></div>
												{/if}
											</div>
											<p class="text-[8px] text-muted-foreground uppercase leading-tight">Private-by-default. Zero data leaves the cluster.</p>
										</button>
									</form>

									<form method="POST" action="?/updateSetting" use:enhance>
										<input type="hidden" name="key" value="classification.tier" />
										<input type="hidden" name="value" value="ollama" />
										<button class="w-full h-full p-3 border {data.settings['classification.tier'] === 'ollama' ? 'border-signal-blue bg-signal-blue/5' : 'border-border bg-muted/30'} rounded-sm text-left group transition-colors hover:border-signal-blue/50">
											<div class="flex items-center justify-between mb-2">
												<span class="text-[10px] font-bold uppercase tracking-widest">Ollama Sidecar</span>
												{#if data.settings['classification.tier'] === 'ollama'}
													<div class="w-2 h-2 rounded-full bg-signal-blue relative">
														<div class="absolute inset-0 bg-signal-blue rounded-full animate-ping opacity-50"></div>
													</div>
												{:else}
													<div class="w-2 h-2 rounded-full border border-muted-foreground opacity-50"></div>
												{/if}
											</div>
											<p class="text-[8px] text-muted-foreground uppercase leading-tight">On-premise GPU acceleration. High precision.</p>
										</button>
									</form>

									<form method="POST" action="?/updateSetting" use:enhance>
										<input type="hidden" name="key" value="classification.tier" />
										<input type="hidden" name="value" value="cloud" />
										<button class="w-full h-full p-3 border {data.settings['classification.tier'] === 'cloud' ? 'border-signal-red bg-signal-red/5' : 'border-border bg-muted/30'} rounded-sm text-left group transition-colors hover:border-signal-red/50">
											<div class="flex items-center justify-between mb-2">
												<span class="text-[10px] font-bold uppercase tracking-widest">Cloud AI</span>
												{#if data.settings['classification.tier'] === 'cloud'}
													<div class="w-2 h-2 rounded-full bg-signal-red relative">
														<div class="absolute inset-0 bg-signal-red rounded-full animate-ping opacity-50"></div>
													</div>
												{:else}
													<div class="w-2 h-2 rounded-full border border-muted-foreground opacity-50"></div>
												{/if}
											</div>
											<p class="text-[8px] text-signal-red font-bold uppercase leading-tight">External Data Transfer. Maximum intelligence.</p>
										</button>
									</form>
								</div>
							</div>
						</div>
					</div>

					<div class="p-4 border border-signal-blue/20 bg-signal-blue/5 rounded-sm flex items-start gap-4">
						<Lock size={20} class="text-signal-blue shrink-0 mt-1" />
						<div>
							<h4 class="text-[10px] font-bold text-foreground uppercase tracking-widest mb-1">Passphrase Integrity</h4>
							<p class="text-[10px] text-muted-foreground leading-relaxed">System-level secrets (JWT, S3 Keys) are locked via the Master Passphrase. These can only be changed by updating the environment variables and performing a cluster-wide reboot.</p>
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
