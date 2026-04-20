<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	onMount(() => {
		// For now, redirect to chat. Later this will check auth status.
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(resolve('/chat'));
	});
</script>

<div class="flex h-full items-center justify-center">
	<div class="flex flex-col items-center gap-4">
		<div
			class="h-8 w-8 animate-spin rounded-full border-2 border-signal-blue border-t-transparent"
		></div>
		<p class="animate-pulse text-[10px] tracking-widest text-muted-foreground uppercase">
			Initializing Control Room Intelligence...
		</p>
	</div>
</div>
