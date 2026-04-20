<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  onMount(() => {
    // For now, redirect to chat. Later this will check auth status.
    goto('/chat');
  });
</script>

<div class="flex items-center justify-center h-full">
  <div class="flex flex-col items-center gap-4">
    <div class="w-8 h-8 border-2 border-signal-blue border-t-transparent rounded-full animate-spin"></div>
    <p class="text-[10px] text-muted-foreground uppercase tracking-widest animate-pulse">Initializing Control Room Intelligence...</p>
  </div>
</div>
