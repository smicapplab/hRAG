<script lang="ts">
	import {
		MessageSquare,
		Search,
		FileText,
		Users,
		Activity,
		Shield,
		Settings,
		Bot,
		LogOut
	} from 'lucide-svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	let {
		nodeName = 'node-01',
		isPrimary = true,
		user = { name: 'Super User', email: 'admin@hrag.local' },
		isOpen = true,
		onClose = () => {}
	}: {
		nodeName?: string;
		isPrimary?: boolean;
		user?: { name: string; email: string };
		isOpen?: boolean;
		onClose?: () => void;
	} = $props();

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
			items: [{ label: 'Documents', icon: FileText, href: '/documents' }]
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
	] as const;

	function isActive(href: string) {
		return page.url.pathname.startsWith(href);
	}
</script>

<!-- Backdrop for mobile -->
{#if isOpen}
	<button
		onclick={onClose}
		class="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
		aria-label="Close sidebar"
	></button>
{/if}

<aside
	class="
  fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-border bg-background transition-transform duration-300
  lg:relative lg:translate-x-0
  {isOpen ? 'translate-x-0' : '-translate-x-full'}
"
>
	<!-- Brand -->
	<div class="flex items-center gap-2 border-b border-border p-4">
		<div class="flex h-6 w-6 items-center justify-center rounded-sm bg-signal-blue">
			<Bot size={14} class="text-white" />
		</div>
		<span class="text-sm font-bold tracking-tight text-foreground uppercase"
			>hRAG <span class="text-signal-blue">Control</span></span
		>
	</div>

	<nav class="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-4">
		{#each navItems as section (section.title)}
			<div>
				<h3 class="mb-3 px-2 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
					{section.title}
				</h3>
				<ul class="space-y-1">
					{#each section.items as item (item.label)}
						<li>
							<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
							<a
								href={resolve(item.href)}
								class="group flex items-center gap-3 rounded-sm p-2 text-sm transition-all
                {isActive(item.href)
									? 'bg-muted text-foreground'
									: 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}"
							>
								<item.icon
									size={16}
									class={isActive(item.href)
										? 'text-signal-blue'
										: 'transition-colors group-hover:text-signal-blue'}
								/>
								<span>{item.label}</span>
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	</nav>

	<!-- Node Info -->
	<div class="border-t border-border bg-muted/30 px-4 py-2">
		<div class="flex items-center justify-between font-mono text-[10px]">
			<span class="text-muted-foreground uppercase">Node</span>
			<span class="text-foreground">{nodeName}</span>
		</div>
		<div class="flex items-center justify-between font-mono text-[10px]">
			<span class="text-muted-foreground uppercase">Role</span>
			<span class={isPrimary ? 'text-signal-blue' : 'text-foreground'}>
				{isPrimary ? 'PRIMARY' : 'SECONDARY'}
			</span>
		</div>
	</div>

	<!-- User Profile -->
	<div class="border-t border-border bg-muted/50 p-4">
		<div class="flex items-center gap-3">
			<div
				class="flex h-8 w-8 items-center justify-center rounded-sm border border-border bg-muted text-xs font-bold uppercase"
			>
				{user.name
					.split(' ')
					.map((n) => n[0])
					.join('')}
			</div>
			<div class="min-w-0 flex-1">
				<p class="truncate text-xs leading-none font-bold text-foreground">{user.name}</p>
				<p class="mt-1 truncate text-[10px] text-muted-foreground">{user.email}</p>
			</div>
			<form method="POST" action="/login?/logout">
				<button
					type="submit"
					class="group rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-signal-red"
					title="Logout"
				>
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
