<script lang="ts">
  import './layout.css';
  import Sidebar from '$lib/components/layout/Sidebar.svelte';
  import favicon from '$lib/assets/favicon.svg';
  import { page } from '$app/state';
  import { Menu } from 'lucide-svelte';

  let { data, children } = $props();

  // Hide sidebar on login page
  const isLoginPage = $derived(page.url.pathname === '/login');

  // Mobile sidebar state
  let isMobileSidebarOpen = $state(false);

  function toggleSidebar() {
    isMobileSidebarOpen = !isMobileSidebarOpen;
  }
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <title>hRAG | Hybrid RAG Control Room</title>
</svelte:head>

<div class="flex h-screen w-full bg-background overflow-hidden selection:bg-signal-blue/30 selection:text-signal-blue">
  <!-- Scanline industrial overlay -->
  <div class="fixed inset-0 pointer-events-none scanline opacity-20 z-50"></div>
  
  {#if !isLoginPage}
    <Sidebar user={data.user} isOpen={isMobileSidebarOpen} onClose={() => isMobileSidebarOpen = false} />
  {/if}

  <main class="flex-1 flex flex-col min-w-0 relative overflow-hidden control-room-grid">
    {#if !isLoginPage}
      <!-- Mobile Header -->
      <header class="lg:hidden p-4 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between z-30">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 bg-signal-blue rounded-sm flex items-center justify-center">
            <span class="text-[10px] font-bold text-white uppercase">C</span>
          </div>
          <span class="font-bold tracking-tight text-foreground uppercase text-xs">hRAG <span class="text-signal-blue">Control</span></span>
        </div>
        <button 
          onclick={toggleSidebar}
          class="p-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Menu size={20} />
        </button>
      </header>
    {/if}

    <div class="{isLoginPage ? '' : 'flex-1'} relative z-10 overflow-hidden">
      {@render children()}
    </div>
  </main>
</div>
