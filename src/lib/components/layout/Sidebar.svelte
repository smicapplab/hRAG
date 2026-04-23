<script lang="ts">
  import { MessageSquare, Search, FileText, Users, Activity, Shield, Settings, Bot, LogOut, Tag } from 'lucide-svelte';
  import { page } from '$app/state';

  let { 
    nodeName = 'node-01', 
    isPrimary = true, 
    user = { name: 'Super User', email: 'admin@hrag.local', isAdmin: true, isCompliance: true },
    isOpen = true,
    onClose = () => {}
  }: {
    nodeName?: string;
    isPrimary?: boolean;
    user?: { name: string; email: string; isAdmin?: boolean; isCompliance?: boolean };
    isOpen?: boolean;
    onClose?: () => void;
  } = $props();

  const allNavItems: Array<{
    title: string;
    adminOnly?: boolean;
    items: Array<{ label: string; icon: any; href: string; compliance?: boolean }>;
  }> = [
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
      adminOnly: true,
      items: [
        { label: 'Users & Groups', icon: Users, href: '/admin/users' },
        { label: 'Taxonomy Registry', icon: Tag, href: '/admin/taxonomy' },
        { label: 'System Health', icon: Activity, href: '/admin/health' },
        { label: 'Audit Vault', icon: Shield, href: '/admin/audit', compliance: true },
        { label: 'Settings', icon: Settings, href: '/admin/settings' }
      ]
    }
  ];

  const navItems = $derived(
    allNavItems
      .filter(section => !section.adminOnly || user.isAdmin)
      .map(section => ({
        ...section,
        items: section.items.filter(item => !item.compliance || user.isCompliance || user.isAdmin)
      }))
  );

  function isActive(href: string) {
    return page.url.pathname.startsWith(href);
  }
</script>

<!-- Backdrop for mobile -->
{#if isOpen}
  <button 
    onclick={onClose}
    class="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
    aria-label="Close sidebar"
  ></button>
{/if}

<aside class="
  fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-background flex flex-col shrink-0 transition-transform duration-300
  lg:relative lg:translate-x-0
  {isOpen ? 'translate-x-0' : '-translate-x-full'}
">
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
                <item.icon size={16} class={isActive(item.href) ? 'text-signal-blue' : 'group-hover:text-signal-blue transition-colors'} />
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
      <div class="w-8 h-8 rounded-sm bg-muted flex items-center justify-center text-xs font-bold border border-border uppercase">
        {user.name.split(' ').map((n: string) => n[0]).join('')}
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-xs font-bold text-foreground truncate leading-none">{user.name}</p>
        <p class="text-[10px] text-muted-foreground truncate mt-1">{user.email}</p>
      </div>
      <form method="POST" action="/login?/logout">
        <button type="submit" class="p-1.5 text-muted-foreground hover:text-signal-red transition-colors rounded-sm hover:bg-muted group" title="Logout">
          <LogOut size={14} />
        </button>
      </form>
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
