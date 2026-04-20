<script lang="ts">
  import { FileUp, Search, CheckCircle2, AlertCircle, Clock, Trash2 } from 'lucide-svelte';

  const mockDocs = [
    {
      name: 'internal_infra_roadmap.md',
      status: 'indexing',
      tags: ['ROADMAP', 'INFRASTRUCTURE ?'],
      owner: 'Auto-assigned',
      date: '2026-04-20'
    },
    {
      name: 'failed_boiler_tube.pdf',
      status: 'complete',
      tags: ['INDUSTRIAL', 'FAILURE_ANALYSIS'],
      owner: 's.torrefranca',
      date: '2026-04-19'
    },
    {
      name: 'rag_survey.pdf',
      status: 'complete',
      tags: ['RESEARCH', 'AI'],
      owner: 'intel.analyst',
      date: '2026-04-18'
    }
  ];

  function getStatusIcon(status: string) {
    switch (status) {
      case 'complete': return { icon: CheckCircle2, class: 'text-signal-green' };
      case 'error': return { icon: AlertCircle, class: 'text-signal-red' };
      default: return { icon: Clock, class: 'text-signal-orange' };
    }
  }
</script>

<div class="space-y-6 h-full flex flex-col overflow-hidden">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-xl font-bold text-foreground">Document <span class="text-signal-blue uppercase">Operations</span></h2>
      <p class="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Ingestion Queue & AI Classification Lab</p>
    </div>
    <button class="flex items-center gap-2 px-4 py-2 bg-signal-blue text-white rounded-sm text-xs font-bold hover:bg-blue-500 transition-colors uppercase tracking-widest shadow-lg shadow-blue-900/20">
      <FileUp size={16} />
      Upload Intelligence
    </button>
  </div>

  <!-- Stats Grid -->
  <div class="grid grid-cols-3 gap-4">
    <div class="p-4 border border-border bg-muted/20 rounded-sm">
      <p class="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-bold">Total Vaulted</p>
      <p class="text-2xl font-bold text-foreground font-mono">142</p>
    </div>
    <div class="p-4 border border-border bg-muted/20 rounded-sm">
      <p class="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-bold">Active Ingestion</p>
      <div class="flex items-center gap-2">
        <p class="text-2xl font-bold text-signal-orange font-mono">3</p>
        <span class="w-2 h-2 rounded-full bg-signal-orange animate-pulse"></span>
      </div>
    </div>
    <div class="p-4 border border-border bg-muted/20 rounded-sm">
      <p class="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-bold">Storage Delta</p>
      <p class="text-2xl font-bold text-signal-blue font-mono">+1.2 GB</p>
    </div>
  </div>

  <!-- Ingestion Table -->
  <div class="flex-1 border border-border rounded-sm overflow-hidden flex flex-col bg-muted/10 backdrop-blur-sm">
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-muted/50 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border">
            <th class="p-4">Resource Identifier</th>
            <th class="p-4">Process Status</th>
            <th class="p-4">Intelligence Tags (AI Suggested)</th>
            <th class="p-4 text-right">Operations</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border font-mono">
          {#each mockDocs as doc}
            {@const status = getStatusIcon(doc.status)}
            <tr class="hover:bg-muted/30 transition-colors group">
              <td class="p-4">
                <div class="flex flex-col">
                  <span class="text-xs font-bold text-foreground mb-1">{doc.name}</span>
                  <span class="text-[9px] text-muted-foreground uppercase">{doc.owner} | {doc.date}</span>
                </div>
              </td>
              <td class="p-4">
                <div class="flex items-center gap-2 text-[10px] font-bold uppercase {status.class}">
                  <status.icon size={12} class={doc.status === 'indexing' ? 'animate-spin' : ''} />
                  {doc.status}
                </div>
              </td>
              <td class="p-4">
                <div class="flex flex-wrap gap-2">
                  {#each doc.tags as tag}
                    <span class="px-2 py-0.5 rounded-sm text-[9px] font-bold border 
                      {tag.includes('?') ? 'bg-signal-blue/5 text-signal-blue border-signal-blue/20 italic cursor-help' : 'bg-muted border-border text-muted-foreground'}"
                    >
                      {tag}
                    </span>
                  {/each}
                </div>
              </td>
              <td class="p-4 text-right">
                <div class="flex justify-end gap-2">
                  <button class="p-1.5 text-muted-foreground hover:text-signal-blue transition-colors rounded-sm hover:bg-muted">
                    <CheckCircle2 size={16} />
                  </button>
                  <button class="p-1.5 text-muted-foreground hover:text-signal-red transition-colors rounded-sm hover:bg-muted">
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>
