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
    toggle: () => isHistoryOpen = !isHistoryOpen,
    close: () => isHistoryOpen = false
  });
</script>

<div class="flex h-full w-full overflow-hidden bg-background"> 
  <!-- Backdrop for mobile history -->
  {#if isHistoryOpen}
    <button 
      onclick={() => isHistoryOpen = false}
      class="fixed inset-0 bg-background/40 backdrop-blur-sm z-10 lg:hidden"
    ></button>
  {/if}

  <!-- History Sidebar (Nested) -->
  <aside class="
    fixed inset-y-0 left-0 z-20 w-64 border-r border-border flex flex-col bg-background lg:bg-muted/20 transition-transform duration-300
    lg:relative lg:translate-x-0
    {isHistoryOpen ? 'translate-x-0' : '-translate-x-full'}
  ">
    <div class="p-4 border-b border-border flex justify-between items-center bg-muted/40">
      <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Intelligence History</span>
      <button class="p-1 hover:bg-muted rounded-sm transition-colors lg:hidden" onclick={() => isHistoryOpen = false}><Plus size={14} class="rotate-45" /></button>
    </div>
    <div class="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
      {#each mockHistory as chat}
        <button class="w-full text-left p-2 rounded-sm text-[11px] group transition-all
          {chat.id === 1 ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}"
        >
          <div class="flex items-center gap-2">
            <MessageSquare size={12} class={chat.id === 1 ? 'text-signal-blue' : 'group-hover:text-signal-blue transition-colors'} />
            <span class="truncate">{chat.title}</span>
          </div>
          <span class="text-[9px] text-muted-foreground/50 ml-5 block mt-0.5">{chat.date}</span>
        </button>
      {/each}
    </div>
  </aside>

  <!-- Main Chat Content -->
  <main class="flex-1 flex flex-col relative bg-background/50">
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
