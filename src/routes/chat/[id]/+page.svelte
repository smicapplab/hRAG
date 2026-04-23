<script lang="ts">
  import { Send, Bot, FileText, ChevronRight, Loader2, X } from 'lucide-svelte';
  import { getContext, tick } from 'svelte';
  import { page } from '$app/state';
  import SourceViewer from '$lib/components/chat/SourceViewer.svelte';

  interface ChatMessage {
    id?: string;
    sessionId?: string;
    role: 'user' | 'assistant';
    content: string;
    evidence?: any[];
    createdAt: Date;
  }

  let { data }: { data: { session: any, messages: ChatMessage[] } } = $props();
  let query = $state('');
  let messages = $state<ChatMessage[]>(data.messages);
  let isSending = $state(false);
  let activeSource = $state<any>(null);
  let chatHistory = getContext<any>('chatHistory');

  let scrollContainer: HTMLDivElement;

  async function scrollToBottom() {
    await tick();
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }

  $effect(() => {
    messages = data.messages;
    scrollToBottom();
  });

  async function handleSubmit() {
    if (!query.trim() || isSending) return;

    const currentQuery = query;
    query = '';
    isSending = true;

    // Optimistic UI
    const userMsg: ChatMessage = { 
        role: 'user', 
        content: currentQuery, 
        createdAt: new Date(),
        sessionId: page.params.id 
    };
    messages = [...messages, userMsg];
    await scrollToBottom();

    try {
      const res = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: currentQuery, sessionId: page.params.id })
      });

      if (res.ok) {
        const result = await res.json();
        const assistantMsg: ChatMessage = { 
          role: 'assistant', 
          content: result.content, 
          evidence: result.evidence,
          createdAt: new Date(),
          sessionId: page.params.id
        };
        messages = [...messages, assistantMsg];
      } else {
        const errorMsg: ChatMessage = { 
          role: 'assistant', 
          content: 'Error: Intelligence gateway timeout or access denied.', 
          createdAt: new Date(),
          sessionId: page.params.id
        };
        messages = [...messages, errorMsg];
      }
    } catch (e) {
      const networkErrorMsg: ChatMessage = { 
        role: 'assistant', 
        content: 'Network error. Check connection to Core.', 
        createdAt: new Date(),
        sessionId: page.params.id
      };
      messages = [...messages, networkErrorMsg];
    } finally {
      isSending = false;
      await scrollToBottom();
    }
  }
</script>

<div class="flex h-full w-full overflow-hidden">
  <!-- Chat Panel -->
  <div class="flex-1 flex flex-col h-full overflow-hidden border-r border-border min-w-0">
    <!-- Mobile History Toggle -->
    {#if !chatHistory.isOpen()}
      <div class="lg:hidden px-8 pt-4">
        <button 
          class="text-[10px] font-bold text-signal-blue uppercase tracking-widest flex items-center gap-2"
          onclick={() => chatHistory.toggle()}
        >
          <ChevronRight size={14} class="rotate-180" />
          View History
        </button>
      </div>
    {/if}

    <!-- Messages Area -->
    <div 
        bind:this={scrollContainer}
        class="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar"
    >
      {#each messages as msg}
        <div class="flex gap-6 max-w-4xl mx-auto {msg.role === 'user' ? 'opacity-90' : ''}">
          <div class="w-10 h-10 rounded-sm shrink-0 flex items-center justify-center border
            {msg.role === 'user' ? 'bg-muted border-border' : 'bg-signal-blue border-signal-blue/20'}"
          >
            {#if msg.role === 'user'}
              <span class="text-[10px] font-bold text-muted-foreground uppercase">ID</span>
            {:else}
              <Bot size={20} class="text-white" />
            {/if}
          </div>
          
          <div class="space-y-6 flex-1 pt-2">
            <div class="text-sm text-foreground leading-relaxed selection:bg-signal-blue/30 whitespace-pre-wrap">
              {msg.content}
            </div>

            {#if msg.evidence && msg.evidence.length > 0}
              <div class="space-y-3">
                <h4 class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <ChevronRight size={10} />
                  Supporting Intelligence
                </h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {#each msg.evidence as doc}
                    <button 
                        onclick={() => activeSource = doc}
                        class="text-left p-3 border border-border rounded-sm bg-muted/30 hover:border-signal-blue hover:bg-muted/50 transition-all group {activeSource?.docId === doc.docId ? 'border-signal-blue bg-muted/50' : ''}"
                    >
                      <div class="flex items-center gap-2 mb-2">
                        <FileText size={14} class="text-muted-foreground group-hover:text-signal-blue" />
                        <span class="text-[10px] text-foreground font-mono font-bold truncate">{doc.name}</span>
                      </div>
                      <p class="text-[10px] text-muted-foreground italic line-clamp-2 leading-tight">
                        "...{doc.snippet}"
                      </p>
                    </button>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        </div>
      {/each}

      {#if isSending}
        <div class="flex gap-6 max-w-4xl mx-auto opacity-50">
            <div class="w-10 h-10 rounded-sm shrink-0 flex items-center justify-center border bg-signal-blue border-signal-blue/20">
                <Loader2 size={20} class="text-white animate-spin" />
            </div>
            <div class="pt-2">
                <span class="text-[10px] font-mono uppercase animate-pulse">Processing authorized query...</span>
            </div>
        </div>
      {/if}
    </div>

    <!-- Input Area -->
    <div class="p-8 border-t border-border bg-background/80 backdrop-blur-md">
      <form 
        onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}
        class="max-w-4xl mx-auto relative group"
      >
        <textarea 
          bind:value={query}
          onkeydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
          rows="1" 
          placeholder="Query the Intelligence Vault..." 
          class="w-full bg-muted/40 border border-border rounded-sm p-4 pr-14 text-sm text-foreground outline-none focus:border-signal-blue focus:bg-muted/60 transition-all font-mono uppercase tracking-wider resize-none"
        ></textarea>
        <button 
          type="submit"
          class="absolute right-3 bottom-3 p-2 bg-signal-blue text-white rounded-sm hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!query.trim() || isSending}
        >
          <Send size={18} />
        </button>
      </form>
      <div class="mt-2 text-center">
        <p class="text-[9px] text-muted-foreground uppercase tracking-[0.2em]">hRAG Core: Intelligence Layer Active</p>
      </div>
    </div>
  </div>

  <!-- Source Analyzer Panel (Control Room Split) -->
  {#if activeSource}
    <div class="w-1/3 min-w-[350px] bg-muted/20 flex flex-col border-l border-border relative">
        <button 
            onclick={() => activeSource = null}
            class="absolute top-4 right-4 p-2 hover:bg-muted rounded-full transition-colors z-10"
        >
            <X size={16} />
        </button>
        <div class="flex-1 overflow-hidden p-8">
            <SourceViewer docId={activeSource.docId} snippet={activeSource.snippet} />
        </div>
    </div>
  {/if}
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
