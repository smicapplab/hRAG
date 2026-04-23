<script lang="ts">
  import { Plus, MessageSquare, PlusCircle } from 'lucide-svelte';
  import { setContext } from 'svelte';
  import { page } from '$app/state';
  import { goto, invalidateAll } from '$app/navigation';
  
  let { data, children } = $props();

  let isHistoryOpen = $state(false);

  async function createNewChat() {
    const res = await fetch('/api/v1/chat/sessions', { method: 'POST' });
    if (res.ok) {
        const session = await res.json();
        await invalidateAll();
        goto(`/chat/${session.id}`);
        isHistoryOpen = false;
    }
  }

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
      aria-label="Close history sidebar"
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

    <!-- New Research Button -->
    <div class="p-4 border-b border-border bg-muted/20">
      <button 
        onclick={createNewChat}
        class="w-full flex items-center justify-center gap-2 p-2 bg-signal-blue text-white rounded-sm text-[11px] font-bold uppercase tracking-wider hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20"
      >
        <PlusCircle size={14} /> New Research
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
      {#each data.sessions as chat}
        <button 
          onclick={() => { goto(`/chat/${chat.id}`); isHistoryOpen = false; }}
          class="w-full text-left p-2 rounded-sm text-[11px] group transition-all
          {page.params.id === chat.id ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}"
        >
          <div class="flex items-center gap-2">
            <MessageSquare size={12} class={page.params.id === chat.id ? 'text-signal-blue' : 'group-hover:text-signal-blue transition-colors'} />
            <span class="truncate">{chat.title}</span>
          </div>
          <span class="text-[9px] text-muted-foreground/50 ml-5 block mt-0.5">{new Date(chat.updatedAt).toLocaleDateString()}</span>
        </button>
      {:else}
        <div class="p-4 text-center">
            <p class="text-[10px] text-muted-foreground italic">No research history found.</p>
        </div>
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
