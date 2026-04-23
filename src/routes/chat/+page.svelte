<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { Loader2, PlusCircle } from 'lucide-svelte';

    let loading = $state(false);

    async function createNewChat() {
        loading = true;
        const res = await fetch('/api/v1/chat/sessions', { method: 'POST' });
        if (res.ok) {
            const session = await res.json();
            goto(`/chat/${session.id}`);
        }
        loading = false;
    }
</script>

<div class="flex-1 flex flex-col items-center justify-center p-8 space-y-6">
    <div class="w-16 h-16 rounded-sm bg-muted border border-border flex items-center justify-center">
        <PlusCircle size={32} class="text-signal-blue" />
    </div>
    
    <div class="text-center space-y-2">
        <h2 class="text-lg font-bold uppercase tracking-widest text-foreground">Intelligence Terminal</h2>
        <p class="text-xs text-muted-foreground font-mono uppercase">Select a research session from history or start a new inquiry.</p>
    </div>

    <button 
        onclick={createNewChat}
        disabled={loading}
        class="flex items-center gap-2 px-6 py-3 bg-signal-blue text-white rounded-sm text-xs font-bold uppercase tracking-widest hover:bg-blue-500 transition-colors shadow-xl shadow-blue-900/30 disabled:opacity-50"
    >
        {#if loading}
            <Loader2 size={16} class="animate-spin" />
            Initializing Core...
        {:else}
            <PlusCircle size={16} />
            Start New Research
        {/if}
    </button>
</div>
