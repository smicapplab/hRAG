<script lang="ts">
	import type { PageData } from './$types';
	import HierarchyTree from '$lib/components/admin/HierarchyTree.svelte';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import { Users, Shield, UserPlus, Filter, Database, ShieldAlert, Cpu, Plus } from 'lucide-svelte';
	import { enhance } from '$app/forms';

	let { data }: { data: PageData } = $props();

	let selectedGroupId = $state<string | null>(null);
	let selectedUser = $state<any | null>(null);

	// Group Creation State
	let showCreateModal = $state(false);
	let newGroupParentId = $state<string | null>(null);
	let newGroupLevel = $state(1);
	let newGroupName = $state('');

	// Filter users based on selected group (recursive)
	let filteredUsers = $derived(
		selectedGroupId 
			? data.users.filter(u => u.groups.some(g => g.id === selectedGroupId))
			: data.users
	);

	function selectGroup(id: string) {
		selectedGroupId = id;
		selectedUser = null;
	}

	function selectUser(user: any) {
		selectedUser = user;
	}

	function initiateCreateGroup(parentId: string | null = null, level: number = 1) {
		newGroupParentId = parentId;
		newGroupLevel = level;
		newGroupName = '';
		showCreateModal = true;
	}

	// Reference to hidden forms for programmatic submission
	let deleteGroupForm: HTMLFormElement;
	let updateGroupForm: HTMLFormElement;
	let updateRoleForm: HTMLFormElement;
</script>

<!-- Hidden Forms for Actions -->
<form method="POST" action="?/deleteGroup" bind:this={deleteGroupForm} use:enhance>
	<input type="hidden" name="id" />
</form>

<form method="POST" action="?/updateGroup" bind:this={updateGroupForm} use:enhance>
	<input type="hidden" name="id" />
	<input type="hidden" name="name" />
</form>

<div class="h-full flex flex-col space-y-6 p-4 lg:p-8 overflow-hidden relative">
	<!-- Create Group Modal (Industrial Overlay) -->
	{#if showCreateModal}
		<div class="absolute inset-0 z-[100] bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
			<div class="w-full max-w-md bg-neutral-900 border border-border rounded-sm shadow-2xl">
				<div class="p-4 border-b border-border bg-muted/50 flex items-center justify-between">
					<h3 class="text-xs font-bold uppercase tracking-widest">
						New {newGroupLevel === 1 ? 'Root Division' : newGroupLevel === 2 ? 'Department' : 'Team'}
					</h3>
					<button onclick={() => showCreateModal = false} class="text-muted-foreground hover:text-foreground">
						<Plus size={16} class="rotate-45" />
					</button>
				</div>
				<form 
					method="POST" 
					action="?/createGroup" 
					class="p-6 space-y-6"
					use:enhance={() => {
						return async ({ result }) => {
							if (result.type === 'success') showCreateModal = false;
						};
					}}
				>
					<input type="hidden" name="parentId" value={newGroupParentId} />
					<input type="hidden" name="level" value={newGroupLevel} />
					<div class="space-y-2">
						<label for="groupName" class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Group Name</label>
						<input 
							id="groupName"
							type="text" 
							name="name" 
							bind:value={newGroupName}
							placeholder="e.g., QUANTUM SYSTEMS"
							class="w-full bg-neutral-950 border border-border rounded-sm p-3 text-sm font-mono outline-none focus:border-signal-blue transition-colors"
							required
							autofocus
						/>
					</div>

					<div class="flex gap-3 pt-2">
						<button 
							type="button" 
							onclick={() => showCreateModal = false}
							class="flex-1 py-2 bg-muted border border-border text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors"
						>
							Abort
						</button>
						<button 
							type="submit"
							class="flex-1 py-2 bg-signal-blue text-white text-[10px] font-bold uppercase tracking-widest hover:bg-signal-blue/80 transition-colors"
						>
							Initialize
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- Header Control Region -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
		<div>
			<h2 class="text-xl font-bold text-foreground flex items-center gap-2 uppercase">
				<Cpu class="text-signal-blue" size={20} />
				Network / <span class="text-signal-blue">Command</span>
			</h2>
			<p class="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Identity & Access Topology Controller</p>
		</div>
		<div class="flex gap-2">
			<button class="flex items-center gap-2 px-3 py-1.5 bg-muted border border-border rounded-sm text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest">
				<UserPlus size={12} />
				PROVISION OPERATOR
			</button>
			<button class="flex items-center gap-2 px-3 py-1.5 bg-signal-blue/10 border border-signal-blue/20 rounded-sm text-[10px] font-bold text-signal-blue hover:bg-signal-blue hover:text-white transition-colors uppercase tracking-widest">
				<Database size={12} />
				RECALCULATE HIERARCHY
			</button>
		</div>
	</div>

	<!-- Main Workspace: 3-Column Topology -->
	<div class="flex-1 grid grid-cols-12 gap-6 overflow-hidden">
		
		<!-- Col 1: Group Hierarchy Explorer -->
		<div class="col-span-12 lg:col-span-3 flex flex-col border border-border rounded-sm bg-muted/10 backdrop-blur-sm overflow-hidden">
			<div class="p-3 border-b border-border bg-muted/50 flex items-center justify-between">
				<span class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Group Hierarchy</span>
				<button 
					class="p-1 hover:text-signal-blue transition-colors" 
					title="NEW ROOT DIVISION"
					onclick={() => initiateCreateGroup(null, 1)}
				>
					<Plus size={14} />
				</button>
			</div>
			<div class="flex-1 overflow-y-auto p-3 custom-scrollbar">
				<button 
					class="w-full text-left p-2 mb-2 rounded-sm text-xs font-bold border transition-colors
					{selectedGroupId === null ? 'bg-signal-blue/10 border-signal-blue/30 text-signal-blue' : 'bg-transparent border-transparent text-muted-foreground hover:bg-muted/30'}"
					onclick={() => selectedGroupId = null}
				>
					GLOBAL NETWORK
				</button>
				<HierarchyTree 
					nodes={data.hierarchy} 
					onSelect={selectGroup} 
					onAdd={initiateCreateGroup}
					onDelete={(id) => {
						const idInput = deleteGroupForm.elements.namedItem('id') as HTMLInputElement;
						if (idInput) idInput.value = id;
						deleteGroupForm.requestSubmit();
					}}
					onUpdate={(id, name) => {
						const idInput = updateGroupForm.elements.namedItem('id') as HTMLInputElement;
						const nameInput = updateGroupForm.elements.namedItem('name') as HTMLInputElement;
						if (idInput) idInput.value = id;
						if (nameInput) nameInput.value = name;
						updateGroupForm.requestSubmit();
					}}
				/>
			</div>
		</div>

		<!-- Col 2: Operator Registry (Grid) -->
		<div class="col-span-12 lg:col-span-6 flex flex-col border border-border rounded-sm bg-muted/10 backdrop-blur-sm overflow-hidden">
			<div class="p-3 border-b border-border bg-muted/50 flex items-center justify-between">
				<span class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Operator Registry</span>
				<span class="text-[10px] font-mono text-muted-foreground">{filteredUsers.length} ACTIVE FRAGMENTS</span>
			</div>
			<div class="flex-1 overflow-x-auto custom-scrollbar">
				<table class="w-full text-left border-collapse">
					<thead>
						<tr class="bg-muted/20 text-[9px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border">
							<th class="p-3">Operator / ID</th>
							<th class="p-3">Rank</th>
							<th class="p-3">Network Group</th>
							<th class="p-3">Status</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border/50 font-mono">
						{#each filteredUsers as user}
							<tr 
								class="hover:bg-signal-blue/5 transition-colors cursor-pointer group {selectedUser?.id === user.id ? 'bg-signal-blue/10' : ''}"
								onclick={() => selectUser(user)}
							>
								<td class="p-3">
									<div class="flex flex-col">
										<span class="text-xs font-bold text-foreground leading-none mb-1">{user.name}</span>
										<span class="text-[9px] text-muted-foreground uppercase">ID: {user.id.slice(0, 8)}</span>
									</div>
								</td>
								<td class="p-3">
									{#if user.isAdmin}
										<span class="px-1.5 py-0.5 rounded-sm bg-signal-red/10 border border-signal-red/30 text-signal-red text-[9px] font-bold uppercase">OVERSEER</span>
									{:else if user.isCompliance}
										<span class="px-1.5 py-0.5 rounded-sm bg-signal-orange/10 border border-signal-orange/30 text-signal-orange text-[9px] font-bold uppercase">AUDITOR</span>
									{:else}
										<span class="px-1.5 py-0.5 rounded-sm bg-muted border border-border text-muted-foreground text-[9px] font-bold uppercase">OPERATOR</span>
									{/if}
								</td>
								<td class="p-3">
									<span class="text-[10px] text-foreground uppercase truncate block max-w-[120px]">
										{user.groups[0]?.name || 'UNAFFILIATED'}
									</span>
								</td>
								<td class="p-3">
									<StatusBadge status="ok" label="active" />
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<!-- Col 3: Terminal Details -->
		<div class="col-span-12 lg:col-span-3 flex flex-col border border-border rounded-sm bg-muted/10 backdrop-blur-sm overflow-hidden">
			<div class="p-3 border-b border-border bg-muted/50 flex items-center justify-between">
				<span class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Detail Terminal</span>
				<ShieldAlert size={12} class="text-signal-orange" />
			</div>
			
			<div class="flex-1 p-4 overflow-y-auto custom-scrollbar">
				{#if selectedUser}
					<div class="space-y-6">
						<div class="flex items-center gap-4">
							<div class="w-12 h-12 rounded-sm bg-muted flex items-center justify-center border border-border text-lg font-bold text-signal-blue uppercase">
								{selectedUser.name.split(' ').map((n: string) => n[0]).join('')}
							</div>
							<div>
								<h3 class="text-sm font-bold uppercase tracking-tight">{selectedUser.name}</h3>
								<p class="text-[10px] font-mono text-muted-foreground">{selectedUser.email}</p>
							</div>
						</div>

						<div class="space-y-4">
							<div>
								<h4 class="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Effective Clearance</h4>
								<div class="p-2 bg-muted/30 border border-border rounded-sm flex items-center justify-between">
									<span class="text-[10px] font-mono">TOKEN_VERSION</span>
									<span class="text-[10px] font-mono font-bold text-signal-blue">{selectedUser.tokenVersion}</span>
								</div>
							</div>

							<div>
								<h4 class="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Network Memberships</h4>
								<div class="space-y-1">
									{#each selectedUser.groups as group}
										<div class="p-2 bg-muted/30 border border-border rounded-sm flex items-center justify-between group/role">
											<form 
												method="POST" 
												action="?/updateRole" 
												use:enhance
												class="flex flex-1 items-center justify-between"
											>
												<input type="hidden" name="userId" value={selectedUser.id} />
												<input type="hidden" name="groupId" value={group.id} />
												
												<div class="flex flex-col">
													<span class="text-[10px] font-bold uppercase">{group.name}</span>
													<span class="text-[8px] font-mono text-muted-foreground uppercase">Explicit Grant</span>
												</div>
												
												<select 
													name="role" 
													value={group.role}
													onchange={(e) => e.currentTarget.form?.requestSubmit()}
													class="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-muted border border-border rounded-sm text-signal-green outline-none hover:border-signal-green transition-colors"
												>
													<option value="VIEWER">VIEWER</option>
													<option value="EDITOR">EDITOR</option>
													<option value="MANAGER">MANAGER</option>
												</select>
											</form>
										</div>
									{/each}
								</div>
							</div>

							<div>
								<h4 class="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Security Actions</h4>
								<div class="grid grid-cols-2 gap-2">
									<button class="p-2 bg-muted border border-border hover:border-signal-orange/50 text-[9px] font-bold uppercase tracking-widest transition-all rounded-sm">Force Refresh</button>
									<button class="p-2 bg-muted border border-border hover:border-signal-red/50 text-[9px] font-bold uppercase tracking-widest transition-all rounded-sm">Lock Account</button>
								</div>
							</div>
						</div>
					</div>
				{:else if selectedGroupId}
					{@const groupNodes = data.hierarchy.flat()} 
					<!-- Flat hierarchy search for simplicity in detail view, though we could recursive search -->
					<div class="space-y-6">
						<div>
							<h3 class="text-sm font-bold uppercase tracking-tight">Active Node Selected</h3>
							<p class="text-[10px] font-mono text-muted-foreground uppercase italic">IDENTIFIER: {selectedGroupId}</p>
						</div>
						
						<div class="p-4 bg-muted/30 border border-dashed border-border rounded-sm text-center">
							<Shield size={24} class="mx-auto text-muted-foreground mb-2 opacity-40" />
							<p class="text-[10px] font-mono text-muted-foreground uppercase">Select an operator from the registry to modify permissions for this group.</p>
						</div>

						<div class="space-y-2">
							<h4 class="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Node Operations</h4>
							<button 
								class="w-full p-2 bg-muted border border-border hover:border-signal-blue text-[10px] font-bold uppercase text-left flex items-center justify-between"
								onclick={() => initiateCreateGroup(selectedGroupId, 2)}
							>
								Add Sub-Node
								<Plus size={12} />
							</button>
						</div>
					</div>
				{:else}
					<div class="h-full flex flex-col items-center justify-center text-center opacity-40">
						<Users size={32} class="mb-2" />
						<p class="text-[10px] font-mono uppercase tracking-widest">Select Node or Operator<br/>to begin Command Session</p>
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
