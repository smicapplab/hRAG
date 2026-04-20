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

<div
	class="flex h-screen w-full overflow-hidden bg-background selection:bg-signal-blue/30 selection:text-signal-blue"
>
	<!-- Scanline industrial overlay -->
	<div class="scanline pointer-events-none fixed inset-0 z-50 opacity-20"></div>

	{#if !isLoginPage}
		<Sidebar
			user={data.user}
			isOpen={isMobileSidebarOpen}
			onClose={() => (isMobileSidebarOpen = false)}
		/>
	{/if}

	<main class="control-room-grid relative flex min-w-0 flex-1 flex-col overflow-hidden">
		{#if !isLoginPage}
			<!-- Mobile Header -->
			<header
				class="z-30 flex items-center justify-between border-b border-border bg-background/80 p-4 backdrop-blur-md lg:hidden"
			>
				<div class="flex items-center gap-2">
					<div class="flex h-6 w-6 items-center justify-center rounded-sm bg-signal-blue">
						<span class="text-[10px] font-bold text-white uppercase">C</span>
					</div>
					<span class="text-xs font-bold tracking-tight text-foreground uppercase"
						>hRAG <span class="text-signal-blue">Control</span></span
					>
				</div>
				<button
					onclick={toggleSidebar}
					class="p-2 text-muted-foreground transition-colors hover:text-foreground"
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
