<script lang="ts">
	import { FolderTree, ChevronRight, ChevronDown, Shield, MoreVertical, Users, Plus } from 'lucide-svelte';

	let { 
		nodes, 
		level = 1,
		onSelect = (id: string) => {},
		onAdd = (parentId: string, level: number) => {},
		onDelete = (id: string) => {},
		onUpdate = (id: string, name: string) => {}
	}: { 
		nodes: any[], 
		level?: number,
		onSelect?: (id: string) => void,
		onAdd?: (parentId: string, level: number) => void,
		onDelete?: (id: string) => void,
		onUpdate?: (id: string, name: string) => void
	} = $props();

	// Local state for expanded/collapsed nodes (Industrial UI keeps tree state)
	let expanded = $state<Record<string, boolean>>({});
	let menuOpen = $state<string | null>(null);

	function toggle(id: string) {
		expanded[id] = !expanded[id];
	}

	function getLevelLabel(lvl: number) {
		switch(lvl) {
			case 1: return 'DIVISION';
			case 2: return 'DEPARTMENT';
			case 3: return 'TEAM';
			default: return 'NODE';
		}
	}

	function handleAdd(e: MouseEvent, parentId: string, currentLevel: number) {
		e.stopPropagation();
		onAdd(parentId, currentLevel + 1);
	}

	function toggleMenu(e: MouseEvent, id: string) {
		e.stopPropagation();
		menuOpen = menuOpen === id ? null : id;
	}
</script>

<div class="space-y-1">
	{#each nodes as node}
		<div class="relative">
			<!-- Guide Line for nesting -->
			{#if level > 1}
				<div class="absolute left-[-1.25rem] top-0 bottom-0 w-px bg-border"></div>
				<div class="absolute left-[-1.25rem] top-4 w-4 h-px bg-border"></div>
			{/if}

			<div 
				class="group flex items-center gap-2 p-2 rounded-sm border border-transparent hover:border-border hover:bg-muted/30 transition-all cursor-pointer"
				onclick={() => {
					onSelect(node.id);
					if (node.children?.length > 0) toggle(node.id);
				}}
			>
				{#if node.children?.length > 0}
					<button class="text-muted-foreground group-hover:text-signal-blue transition-colors">
						{#if expanded[node.id]}
							<ChevronDown size={14} />
						{:else}
							<ChevronRight size={14} />
						{/if}
					</button>
				{:else}
					<div class="w-3.5"></div>
				{/if}

				<div class="w-8 h-8 rounded-sm bg-muted flex items-center justify-center border border-border shrink-0">
					{#if level === 1}
						<Shield size={16} class="text-signal-blue" />
					{:else if level === 2}
						<FolderTree size={16} class="text-signal-green" />
					{:else}
						<Users size={16} class="text-muted-foreground" />
					{/if}
				</div>

				<div class="flex-1 min-w-0">
					<div class="flex items-center gap-2">
						<span class="text-sm font-bold tracking-tight uppercase truncate">{node.name}</span>
						<span class="text-[9px] font-mono font-bold bg-muted px-1.5 py-0.5 rounded-sm border border-border text-muted-foreground">
							{getLevelLabel(node.level)}
						</span>
					</div>
					<p class="text-[9px] font-mono text-muted-foreground truncate uppercase opacity-60">
						ID: {node.id.slice(0, 8)}...
					</p>
				</div>

				<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity relative">
					{#if level < 3}
						<button 
							class="p-1 text-muted-foreground hover:text-signal-blue rounded-sm hover:bg-muted" 
							title="NEW SUB-GROUP"
							onclick={(e) => handleAdd(e, node.id, level)}
						>
							<Plus size={14} />
						</button>
					{/if}
					<button 
						class="p-1 text-muted-foreground hover:text-foreground rounded-sm hover:bg-muted"
						onclick={(e) => toggleMenu(e, node.id)}
					>
						<MoreVertical size={14} />
					</button>

					{#if menuOpen === node.id}
						<div class="absolute right-0 top-8 w-32 bg-neutral-900 border border-border rounded-sm shadow-xl z-50 py-1">
							<button 
								class="w-full text-left px-3 py-1.5 text-[10px] font-bold uppercase hover:bg-muted hover:text-signal-blue transition-colors"
								onclick={(e) => {
									e.stopPropagation();
									const newName = prompt('Enter new name:', node.name);
									if (newName) onUpdate(node.id, newName);
									menuOpen = null;
								}}
							>
								Rename
							</button>
							<button 
								class="w-full text-left px-3 py-1.5 text-[10px] font-bold uppercase hover:bg-muted hover:text-signal-red transition-colors"
								onclick={(e) => {
									e.stopPropagation();
									if (confirm(`Delete group "${node.name}" and all descendants?`)) onDelete(node.id);
									menuOpen = null;
								}}
							>
								Delete
							</button>
						</div>
					{/if}
				</div>
			</div>

			<!-- Recursive Children -->
			{#if node.children?.length > 0 && expanded[node.id]}
				<div class="ml-9 mt-1">
					<svelte:self 
						nodes={node.children} 
						level={level + 1} 
						{onSelect} 
						{onAdd} 
						{onDelete} 
						{onUpdate} 
					/>
				</div>
			{/if}
		</div>
	{/each}
</div>
