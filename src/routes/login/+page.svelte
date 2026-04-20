<script lang="ts">
  import { Eye, EyeOff, Bot } from 'lucide-svelte';

  let email = $state('');
  let password = $state('');
  let showPassword = $state(false);

  function togglePassword() {
    showPassword = !showPassword;
  }
</script>

<div class="w-full max-w-sm space-y-8">
  <div class="text-center">
    <div class="mx-auto w-12 h-12 bg-signal-blue rounded-sm mb-4 flex items-center justify-center">
      <Bot size={28} class="text-white" />
    </div>
    <h1 class="text-2xl font-bold tracking-tight text-neutral-100 uppercase">Secure Entry</h1>
    <p class="text-[11px] text-neutral-500 uppercase tracking-widest mt-1">hRAG Control Authorization Protocol</p>
  </div>

  <form class="space-y-4" method="POST" action="?/login">
    <div class="space-y-1">
      <label for="email" class="text-[10px] font-bold text-neutral-500 uppercase tracking-wider px-1">Identity</label>
      <input 
        id="email"
        name="email"
        type="email" 
        bind:value={email}
        placeholder="email@organization.com" 
        class="w-full bg-neutral-900 border border-neutral-800 rounded-sm p-3 text-sm text-neutral-100 outline-none focus:border-signal-blue transition-colors font-mono"
        required
      >
    </div>
    
    <div class="space-y-1 relative">
      <label for="password" class="text-[10px] font-bold text-neutral-500 uppercase tracking-wider px-1">Access Secret</label>
      <div class="relative">
        <input 
          id="password"
          name="password"
          type={showPassword ? "text" : "password"} 
          bind:value={password}
          placeholder="••••••••" 
          class="w-full bg-neutral-900 border border-neutral-800 rounded-sm p-3 text-sm text-neutral-100 outline-none focus:border-signal-blue transition-colors font-mono"
          required
        >
        <button 
          type="button" 
          onclick={togglePassword}
          class="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-400"
        >
          {#if showPassword}
            <EyeOff size={16} />
          {:else}
            <Eye size={16} />
          {/if}
        </button>
      </div>
    </div>

    <button type="submit" class="w-full bg-signal-blue hover:bg-blue-500 text-white font-bold py-3 rounded-sm text-xs transition-colors uppercase tracking-widest shadow-lg shadow-blue-900/20">
      Authorize Access
    </button>
  </form>

  <div class="relative py-4">
    <div class="absolute inset-0 flex items-center"><span class="w-full border-t border-neutral-800"></span></div>
    <div class="relative flex justify-center text-[10px] uppercase tracking-widest"><span class="bg-neutral-950 px-2 text-neutral-600 font-bold">Standard Connectors</span></div>
  </div>

  <div class="grid grid-cols-2 gap-4">
    <button class="flex items-center justify-center gap-2 border border-neutral-800 p-2 rounded-sm hover:bg-neutral-900 transition-colors group">
      <div class="w-4 h-4 bg-neutral-700 rounded-sm group-hover:bg-signal-blue transition-colors"></div>
      <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Microsoft</span>
    </button>
    <button class="flex items-center justify-center gap-2 border border-neutral-800 p-2 rounded-sm hover:bg-neutral-900 transition-colors group">
      <div class="w-4 h-4 bg-neutral-700 rounded-sm group-hover:bg-signal-blue transition-colors"></div>
      <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Google</span>
    </button>
  </div>
</div>
