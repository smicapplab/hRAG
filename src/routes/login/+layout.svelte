<script lang="ts">
  let { children } = $props();
</script>

<div class="min-h-screen w-full bg-neutral-950 flex flex-col items-center justify-center p-6 relative">
  <!-- Scanline industrial overlay -->
  <div class="fixed inset-0 pointer-events-none scanline opacity-20 z-50"></div>
  
  <div class="relative z-10 w-full flex flex-col items-center">
    {@render children()}
  </div>
</div>
