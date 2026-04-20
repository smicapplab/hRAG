<script lang="ts">
  import { Send, Bot, FileText, ChevronRight } from 'lucide-svelte';

  let query = $state('');

  const messages = [
    {
      role: 'user',
      content: 'How did our Asian revenue grow in Q4?'
    },
    {
      role: 'assistant',
      content: 'Asian revenue grew by 14% in Q4, primarily driven by enterprise software licensing in Singapore and Vietnam. Key growth factors included new government contracts and infrastructure logistics optimization.',
      evidence: [
        { name: 'field_ops_logistics.md', page: 'Page 12', snippet: 'Singapore revenue increased from $4.2M to $5.1M in Q4 period...' },
        { name: 'rag_survey.pdf', page: 'Page 4', snippet: 'Optimization of logistics using vector search reduced overhead by 8%...' }
      ]
    }
  ];
</script>

<div class="flex-1 flex flex-col h-full overflow-hidden">
  <!-- Messages Area -->
  <div class="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
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
          <div class="text-sm text-foreground leading-relaxed selection:bg-signal-blue/30">
            {msg.content}
          </div>

          {#if msg.evidence}
            <div class="space-y-3">
              <h4 class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <ChevronRight size={10} />
                Supporting Intelligence
              </h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                {#each msg.evidence as doc}
                  <button class="text-left p-3 border border-border rounded-sm bg-muted/30 hover:border-signal-blue hover:bg-muted/50 transition-all group">
                    <div class="flex items-center gap-2 mb-2">
                      <FileText size={14} class="text-muted-foreground group-hover:text-signal-blue" />
                      <span class="text-[10px] text-foreground font-mono font-bold truncate">{doc.name} ({doc.page})</span>
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
  </div>

  <!-- Input Area -->
  <div class="p-8 border-t border-border bg-background/80 backdrop-blur-md">
    <div class="max-w-4xl mx-auto relative group">
      <textarea 
        bind:value={query}
        rows="1" 
        placeholder="Query the Intelligence Vault..." 
        class="w-full bg-muted/40 border border-border rounded-sm p-4 pr-14 text-sm text-foreground outline-none focus:border-signal-blue focus:bg-muted/60 transition-all font-mono uppercase tracking-wider resize-none"
      ></textarea>
      <button 
        class="absolute right-3 bottom-3 p-2 bg-signal-blue text-white rounded-sm hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20"
        disabled={!query.trim()}
      >
        <Send size={18} />
      </button>
    </div>
    <div class="mt-2 text-center">
      <p class="text-[9px] text-muted-foreground uppercase tracking-[0.2em]">hRAG Core: Intelligence Layer Active</p>
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
