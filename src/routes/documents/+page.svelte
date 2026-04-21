<script lang="ts">
  import { FileText, Upload, Plus, Trash2, Search, Filter } from 'lucide-svelte';
  
  // These will normally come from a +page.server.ts load function
  let documents = $state([
    { id: '1', name: 'field_ops_logistics.md', classification: 'CONFIDENTIAL', createdAt: new Date() },
    { id: '2', name: 'security_audit_hq.txt', classification: 'INTERNAL', createdAt: new Date(Date.now() - 86400000) },
    { id: '3', name: 'rag_survey.pdf', classification: 'PUBLIC', createdAt: new Date(Date.now() - 172800000) }
  ]);
  
  let isUploading = $state(false);
  let fileInput: HTMLInputElement;

  async function handleFileUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    isUploading = true;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('classification', 'INTERNAL'); // Defaulting for simple UI

    try {
      const response = await fetch('/api/v1/documents', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Optimistically add to UI list
          documents = [result.document, ...documents];
        }
      } else {
        alert('Upload failed.');
      }
    } catch (err) {
      console.error(err);
      alert('Upload failed.');
    } finally {
      isUploading = false;
      if (fileInput) fileInput.value = '';
    }
  }
</script>

<div class="h-full flex flex-col pt-8 lg:p-8">
  <!-- Header Control Region -->
  <div class="flex flex-col md:flex-row md:items-center justify-between px-8 lg:px-0 mb-8 gap-4">
    <div>
      <h1 class="text-xl font-bold uppercase tracking-tight text-foreground flex items-center gap-2">
        <FileText class="text-signal-blue" size={20} />
        Intel / Documents
      </h1>
      <p class="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Manage global knowledge fragments</p>
    </div>

    <div class="flex items-center gap-3">
      <div class="relative group hidden sm:block">
        <Search size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input 
          type="text" 
          placeholder="FILTER FRAGMENTS..." 
          class="bg-muted border border-border rounded-sm h-9 pl-9 pr-4 text-xs font-mono w-64 outline-none focus:border-signal-blue transition-colors group-hover:bg-muted/80 uppercase"
        />
      </div>

      <button
        onclick={() => fileInput?.click()}
        class="h-9 px-4 bg-signal-blue text-white rounded-sm text-xs font-bold uppercase tracking-widest hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-50"
        disabled={isUploading}
      >
        {#if isUploading}
          <div class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          UPLOADING...
        {:else}
          <Upload size={14} />
          UPLOAD
        {/if}
      </button>
      <input type="file" bind:this={fileInput} class="hidden" onchange={handleFileUpload} />
    </div>
  </div>

  <!-- Document Grid / Table (Industrial Density) -->
  <div class="flex-1 border-t border-border overflow-hidden flex flex-col -mx-8 lg:mx-0 lg:border">
    <!-- Table Header -->
    <div class="hidden sm:grid grid-cols-12 gap-4 items-center bg-muted/50 p-4 border-b border-border text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
      <div class="col-span-5 md:col-span-6">Identifier</div>
      <div class="col-span-3 lg:col-span-2">Classification</div>
      <div class="col-span-3 lg:col-span-3">Timestamp Added</div>
      <div class="col-span-1 text-right">Actions</div>
    </div>

    <!-- Table Body -->
    <div class="flex-1 overflow-y-auto custom-scrollbar bg-background">
      {#each documents as doc}
        <div class="grid sm:grid-cols-12 gap-4 items-center p-4 border-b border-border/50 hover:bg-muted/20 transition-colors group">
          
          <div class="col-span-12 sm:col-span-5 md:col-span-6 flex items-center gap-3">
            <FileText size={16} class="text-signal-blue shrink-0" />
            <div>
              <p class="text-sm font-mono text-foreground tracking-tight group-hover:text-signal-blue transition-colors cursor-pointer truncate">
                {doc.name}
              </p>
              <p class="text-[9px] text-muted-foreground uppercase sm:hidden mt-1">{new Date(doc.createdAt).toISOString()}</p>
            </div>
          </div>

          <div class="col-span-4 sm:col-span-3 lg:col-span-2 flex items-center">
            <!-- Classification Badge -->
            <span class="px-2 py-0.5 rounded-sm border text-[9px] font-bold uppercase tracking-widest whitespace-nowrap
              {doc.classification === 'CONFIDENTIAL' ? 'bg-signal-orange/10 border-signal-orange/20 text-signal-orange' : 
               doc.classification === 'PUBLIC' ? 'bg-signal-green/10 border-signal-green/20 text-signal-green' : 
               'bg-muted border-border text-muted-foreground'}"
            >
              {doc.classification}
            </span>
          </div>

          <div class="hidden sm:block col-span-3 lg:col-span-3">
            <p class="text-[10px] font-mono text-muted-foreground">{new Date(doc.createdAt).toISOString()}</p>
          </div>

          <div class="absolute sm:relative right-4 sm:right-auto sm:col-span-1 flex justify-end">
            <button class="p-2 text-muted-foreground hover:text-signal-red hover:bg-signal-red/10 rounded-sm transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-0">
              <Trash2 size={14} />
            </button>
          </div>

        </div>
      {:else}
        <div class="p-8 text-center border-b border-border/50">
          <p class="text-xs text-muted-foreground font-mono uppercase tracking-widest">No intelligence documents stored.</p>
        </div>
      {/each}
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
