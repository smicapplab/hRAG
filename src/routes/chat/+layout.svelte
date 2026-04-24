<script lang="ts">
  import { Plus, MessageSquare, PlusCircle, Trash2, Edit2, Check, X } from 'lucide-svelte';
  import { setContext } from 'svelte';
  import { page } from '$app/state';
  import { goto, invalidateAll } from '$app/navigation';
  
  let { data, children } = $props();

  let isHistoryOpen = $state(false);
  let editingSessionId = $state<string | null>(null);
  let editTitle = $state('');

  async function createNewChat() {
    const res = await fetch('/api/v1/chat/sessions', { method: 'POST' });
    if (res.ok) {
        const session = await res.json();
        await invalidateAll();
        goto(`/chat/${session.id}`);
        isHistoryOpen = false;
    }
  }

  async function deleteSession(id: string) {
    if (!confirm('Are you sure you want to delete this research session?')) return;
    
    const res = await fetch(`/api/v1/chat/sessions/${id}`, { method: 'DELETE' });
    if (res.ok) {
        if (page.params.id === id) {
            goto('/chat');
        }
        await invalidateAll();
    }
  }

  async function startEditing(id: string, currentTitle: string) {
    editingSessionId = id;
    editTitle = currentTitle;
  }

  async function saveTitle(id: string) {
    if (!editTitle.trim()) return;
    
    const res = await fetch(`/api/v1/chat/sessions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle })
    });

    if (res.ok) {
        editingSessionId = null;
        await invalidateAll();
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
        <div class="relative group">
          {#if editingSessionId === chat.id}
            <div class="flex items-center gap-1 p-1 bg-muted rounded-sm">
                <input 
                    bind:value={editTitle}
                    class="flex-1 bg-background border border-border rounded-sm px-2 py-1 text-[11px] outline-none focus:border-signal-blue"
                    onkeydown={(e) => { if (e.key === 'Enter') saveTitle(chat.id); if (e.key === 'Escape') editingSessionId = null; }}
                />
                <button onclick={() => saveTitle(chat.id)} class="p-1 text-neon-green hover:bg-muted-foreground/10 rounded"><Check size={12} /></button>
                <button onclick={() => editingSessionId = null} class="p-1 text-signal-red hover:bg-muted-foreground/10 rounded"><X size={12} /></button>
            </div>
          {:else}
            <button 
                onclick={() => { goto(`/chat/${chat.id}`); isHistoryOpen = false; }}
                class="w-full text-left p-2 rounded-sm text-[11px] transition-all pr-12
                {page.params.id === chat.id ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}"
            >
                <div class="flex items-center gap-2">
                    <MessageSquare size={12} class={page.params.id === chat.id ? 'text-signal-blue' : 'group-hover:text-signal-blue transition-colors'} />
                    <span class="truncate">{chat.title}</span>
                </div>
                <span class="text-[9px] text-muted-foreground/50 ml-5 block mt-0.5">{new Date(chat.updatedAt).toLocaleDateString()}</span>
            </button>

            <!-- Actions (Visible on hover) -->
            <div class="absolute right-1 top-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm rounded-sm border border-border/50 shadow-sm px-1">
                <button 
                    onclick={(e) => { e.stopPropagation(); startEditing(chat.id, chat.title); }}
                    class="p-1.5 text-muted-foreground hover:text-signal-blue transition-colors"
                    title="Rename"
                >
                    <Edit2 size={10} />
                </button>
                <button 
                    onclick={(e) => { e.stopPropagation(); deleteSession(chat.id); }}
                    class="p-1.5 text-muted-foreground hover:text-signal-red transition-colors"
                    title="Delete"
                >
                    <Trash2 size={10} />
                </button>
            </div>
          {/if}
        </div>
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
