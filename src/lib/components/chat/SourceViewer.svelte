<script lang="ts">
    import { onMount } from 'svelte';
    import { FileText, Loader2, AlertCircle } from 'lucide-svelte';

    let { docId, snippet } = $props();
    let content = $state('');
    let loading = $state(true);
    let error = $state<string | null>(null);

    onMount(async () => {
        try {
            const res = await fetch(`/api/v1/documents/${docId}/fragments`);
            if (res.ok) {
                const data = await res.json();
                content = data.text;
            } else {
                error = 'Failed to load source text';
            }
        } catch (e) {
            error = 'Network error loading source';
        } finally {
            loading = false;
        }
    });

    function highlightSnippet(text: string, snippet: string) {
        if (!snippet || !text) return text;
        // Simple highlight logic
        const index = text.toLowerCase().indexOf(snippet.toLowerCase());
        if (index === -1) return text;

        return text.substring(0, index) + 
               '<mark class="bg-signal-blue/30 text-foreground border-b border-signal-blue">' + 
               text.substring(index, index + snippet.length) + 
               '</mark>' + 
               text.substring(index + snippet.length);
    }
</script>

<div class="h-full flex flex-col space-y-4">
    <div class="flex items-center gap-2 border-b border-border pb-4">
        <FileText size={18} class="text-signal-blue" />
        <h3 class="text-xs font-bold uppercase tracking-widest">Source Intelligence Analyzer</h3>
    </div>

    {#if loading}
        <div class="flex-1 flex flex-col items-center justify-center space-y-2 opacity-50">
            <Loader2 size={24} class="animate-spin text-signal-blue" />
            <span class="text-[10px] font-mono uppercase">Retrieving authorized fragments...</span>
        </div>
    {:else if error}
        <div class="flex-1 flex flex-col items-center justify-center space-y-2 text-safety-orange">
            <AlertCircle size={24} />
            <span class="text-[10px] font-mono uppercase">{error}</span>
        </div>
    {:else}
        <div class="flex-1 overflow-y-auto bg-muted/30 p-6 rounded-sm border border-border/50 shadow-inner">
            <pre class="whitespace-pre-wrap text-xs font-mono leading-relaxed text-foreground/80 selection:bg-signal-blue/30">
                {@html highlightSnippet(content, snippet)}
            </pre>
        </div>
        
        <div class="bg-muted/50 p-4 rounded-sm border border-border">
            <h4 class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Metadata Analysis</h4>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <span class="text-[9px] text-muted-foreground uppercase block">Document ID</span>
                    <span class="text-[10px] font-mono truncate block">{docId}</span>
                </div>
                <div>
                    <span class="text-[9px] text-muted-foreground uppercase block">Classification</span>
                    <span class="text-[10px] font-mono text-neon-green uppercase font-bold">Authorized</span>
                </div>
            </div>
        </div>
    {/if}
</div>
