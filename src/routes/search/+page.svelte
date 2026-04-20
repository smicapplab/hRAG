<script lang="ts">
  import { Download, Search, Filter, Database } from 'lucide-svelte';

  const mockResults = [
    {
      name: 'field_ops_logistics.md',
      uploader: 's.torrefranca',
      classification: 'CONFIDENTIAL',
      score: '0.984',
      updated: '2026-04-20',
      match: 'quarterly revenue trends in Asia-Pacific region...'
    },
    {
      name: 'security_audit_hq.txt',
      uploader: 'auditor.hq',
      classification: 'INTERNAL',
      score: '0.912',
      updated: '2026-03-15',
      match: 'physical security perimeter of HQ is intact...'
    },
    {
      name: 'rag_survey.pdf',
      uploader: 'intel.analyst',
      classification: 'PUBLIC',
      score: '0.845',
      updated: '2026-01-10',
      match: 'large language models for document retrieval...'
    }
  ];

  function getClassificationClass(cls: string) {
    switch (cls) {
      case 'CONFIDENTIAL': return 'bg-signal-orange/10 text-signal-orange border-signal-orange/20';
      case 'INTERNAL': return 'bg-signal-blue/10 text-signal-blue border-signal-blue/20';
      default: return 'bg-signal-green/10 text-signal-green border-signal-green/20';
    }
  }
</script>

<div class="space-y-6 h-full flex flex-col overflow-hidden">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-xl font-bold text-foreground">Search <span class="text-signal-blue uppercase">Terminal</span></h2>
      <p class="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Direct Vector & Relational Query Engine</p>
    </div>
    <div class="flex gap-2">
      <button class="flex items-center gap-2 px-3 py-1.5 bg-muted border border-border rounded-sm text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest">
        <Filter size={12} />
        Advanced Filters
      </button>
      <button class="flex items-center gap-2 px-3 py-1.5 bg-signal-blue/10 border border-signal-blue/20 rounded-sm text-[10px] font-bold text-signal-blue hover:bg-signal-blue hover:text-white transition-colors uppercase tracking-widest">
        <Database size={12} />
        Export Audit Trail
      </button>
    </div>
  </div>

  <!-- Search Bar -->
  <div class="relative">
    <Search class="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
    <input 
      type="text" 
      placeholder="QUERY THE INTELLIGENCE VAULT..." 
      class="w-full bg-muted/30 border border-border rounded-sm p-4 pl-12 text-sm text-foreground outline-none focus:border-signal-blue transition-colors font-mono uppercase tracking-wider"
    >
  </div>

  <!-- Results Grid -->
  <div class="flex-1 border border-border rounded-sm overflow-hidden flex flex-col bg-muted/10 backdrop-blur-sm">
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-muted/50 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border">
            <th class="p-4">Resource / Identity</th>
            <th class="p-4">Uploader</th>
            <th class="p-4">Classification</th>
            <th class="p-4">Relevance</th>
            <th class="p-4">Timestamp</th>
            <th class="p-4 text-right">Operations</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border font-mono">
          {#each mockResults as result}
            <tr class="hover:bg-signal-blue/5 transition-colors group">
              <td class="p-4 max-w-md">
                <div class="flex flex-col">
                  <span class="text-xs font-bold text-foreground leading-none mb-2">{result.name}</span>
                  <span class="text-[10px] text-muted-foreground italic truncate">
                    MATCH: "{result.match}"
                  </span>
                </div>
              </td>
              <td class="p-4 text-[11px] text-muted-foreground uppercase tracking-tighter">
                {result.uploader}
              </td>
              <td class="p-4">
                <span class="px-2 py-0.5 rounded-sm text-[9px] font-bold border {getClassificationClass(result.classification)}">
                  {result.classification}
                </span>
              </td>
              <td class="p-4 text-[11px] text-signal-blue font-bold">
                {result.score}
              </td>
              <td class="p-4 text-[11px] text-muted-foreground">
                {result.updated}
              </td>
              <td class="p-4 text-right">
                <button class="text-muted-foreground hover:text-signal-blue transition-colors">
                  <Download size={16} />
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Empty State / Footer -->
    <div class="mt-auto p-4 border-t border-border bg-muted/30 flex items-center justify-between">
      <p class="text-[10px] text-muted-foreground uppercase tracking-widest">
        Showing <span class="text-foreground">3</span> matching resources in cluster
      </p>
      <div class="flex gap-1">
        <button class="px-2 py-1 bg-muted border border-border rounded-sm text-[10px] text-muted-foreground opacity-50 cursor-not-allowed">PREV</button>
        <button class="px-2 py-1 bg-muted border border-border rounded-sm text-[10px] text-muted-foreground">NEXT</button>
      </div>
    </div>
  </div>
</div>
