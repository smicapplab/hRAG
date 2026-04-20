<script lang="ts">
  import './layout.css';
  import Sidebar from '$lib/components/layout/Sidebar.svelte';
  import favicon from '$lib/assets/favicon.svg';

  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <title>hRAG | Hybrid RAG Control Room</title>
</svelte:head>

<div class="flex h-screen w-full bg-background overflow-hidden selection:bg-signal-blue/30 selection:text-signal-blue">
  <!-- Scanline industrial overlay -->
  <div class="fixed inset-0 pointer-events-none scanline opacity-20 z-50"></div>
  
  <Sidebar />

  <main class="flex-1 flex flex-col min-w-0 relative overflow-hidden control-room-grid">
    <div class="flex-1 overflow-y-auto p-8 relative z-10">
      {@render children()}
    </div>
  </main>
</div>
