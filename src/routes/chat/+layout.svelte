<script lang="ts">
	import { Plus, MessageSquare } from 'lucide-svelte';
	import { setContext } from 'svelte';

	let { children } = $props();

	const mockHistory = [
		{ id: 1, title: 'Asian Revenue Trends', date: 'Today' },
		{ id: 2, title: 'SOC2 Audit Checklist', date: 'Yesterday' },
		{ id: 3, title: 'Personnel Field Logistics', date: '2 days ago' }
	];

	let isHistoryOpen = $state(false);

	// Provide state to children
	setContext('chatHistory', {
		isOpen: () => isHistoryOpen,
		toggle: () => (isHistoryOpen = !isHistoryOpen),
		close: () => (isHistoryOpen = false)
	});
</script>

<div class="flex h-full w-full overflow-hidden bg-background">
	<!-- Backdrop for mobile history -->
	{#if isHistoryOpen}
		<button
			onclick={() => (isHistoryOpen = false)}
			class="fixed inset-0 z-10 bg-background/40 backdrop-blur-sm lg:hidden"
			aria-label="Close history sidebar"
		></button>
	{/if}

	<!-- History Sidebar (Nested) -->
	<aside
		class="
    fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-border bg-background transition-transform duration-300 lg:relative
    lg:translate-x-0 lg:bg-muted/20
    {isHistoryOpen ? 'translate-x-0' : '-translate-x-full'}
  "
	>
		<div class="flex items-center justify-between border-b border-border bg-muted/40 p-4">
			<span class="text-[10px] font-bold tracking-widest text-muted-foreground uppercase"
				>Intelligence History</span
			>
			<button
				class="rounded-sm p-1 transition-colors hover:bg-muted lg:hidden"
				onclick={() => (isHistoryOpen = false)}><Plus size={14} class="rotate-45" /></button
			>
		</div>
		<div class="custom-scrollbar flex-1 space-y-1 overflow-y-auto p-2">
			{#each mockHistory as chat (chat.id)}
				<button
					class="group w-full rounded-sm p-2 text-left text-[11px] transition-all
          {chat.id === 1
						? 'bg-muted text-foreground'
						: 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}"
				>
					<div class="flex items-center gap-2">
						<MessageSquare
							size={12}
							class={chat.id === 1
								? 'text-signal-blue'
								: 'transition-colors group-hover:text-signal-blue'}
						/>
						<span class="truncate">{chat.title}</span>
					</div>
					<span class="mt-0.5 ml-5 block text-[9px] text-muted-foreground/50">{chat.date}</span>
				</button>
			{/each}
		</div>
	</aside>

	<!-- Main Chat Content -->
	<main class="relative flex flex-1 flex-col bg-background/50">
		{@render children()}
	</main>
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
