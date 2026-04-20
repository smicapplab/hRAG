<script lang="ts">
  import { MessageSquare, Search, FileText, Users, Activity, Shield, Settings, Bot } from 'lucide-svelte';
  import { page } from '$app/state';

  let { nodeName = 'node-01', isPrimary = true } = $props();

  const navItems = [
    {
      title: 'Intelligence',
      items: [
        { label: 'Chat', icon: MessageSquare, href: '/chat' },
        { label: 'Search Terminal', icon: Search, href: '/search' }
      ]
    },
    {
      title: 'Operations',
      items: [
        { label: 'Documents', icon: FileText, href: '/documents' }
      ]
    },
    {
      title: 'Administration',
      items: [
        { label: 'Users & Groups', icon: Users, href: '/admin/users' },
        { label: 'System Health', icon: Activity, href: '/admin/health' },
        { label: 'Audit Vault', icon: Shield, href: '/admin/audit' },
        { label: 'Settings', icon: Settings, href: '/admin/settings' }
      ]
    }
  ];

  function isActive(href: string) {
    return page.url.pathname.startsWith(href);
  }
</script>

<aside class="w-64 h-full border-r border-border bg-background flex flex-col shrink-0">
  <!-- Brand -->
  <div class="p-4 border-b border-border flex items-center gap-2">
    <div class="w-6 h-6 bg-signal-blue rounded-sm flex items-center justify-center">
      <Bot size={14} class="text-white" />
    </div>
    <span class="font-bold tracking-tight text-foreground uppercase text-sm">hRAG <span class="text-signal-blue">Control</span></span>
  </div>
  
  <nav class="flex-1 p-4 space-y-6 overflow-y-auto custom-scrollbar">
    {#each navItems as section}
      <div>
        <h3 class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 px-2">{section.title}</h3>
        <ul class="space-y-1">
          {#each section.items as item}
            <li>
              <a 
                href={item.href} 
                class="flex items-center gap-3 p-2 rounded-sm text-sm transition-all group
                {isActive(item.href) ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}"
              >
                <item.icon size={16} class="{isActive(item.href) ? 'text-signal-blue' : 'group-hover:text-signal-blue transition-colors'}" />
                <span>{item.label}</span>
              </a>
            </li>
          {/each}
        </ul>
      </div>
    {/each}
  </nav>

  <!-- Node Info -->
  <div class="px-4 py-2 bg-muted/30 border-t border-border">
    <div class="flex items-center justify-between text-[10px] font-mono">
      <span class="text-muted-foreground uppercase">Node</span>
      <span class="text-foreground">{nodeName}</span>
    </div>
    <div class="flex items-center justify-between text-[10px] font-mono">
      <span class="text-muted-foreground uppercase">Role</span>
      <span class={isPrimary ? 'text-signal-blue' : 'text-foreground'}>
        {isPrimary ? 'PRIMARY' : 'SECONDARY'}
      </span>
    </div>
  </div>

  <!-- User Profile -->
  <div class="p-4 border-t border-border bg-muted/50">
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-sm bg-muted flex items-center justify-center text-xs font-bold border border-border">
        SU
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-xs font-bold text-foreground truncate leading-none">Super User</p>
        <p class="text-[10px] text-muted-foreground truncate mt-1">admin@hrag.local</p>
      </div>
    </div>
  </div>
</aside>

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
