<script lang="ts">
	let { children } = $props();
</script>

<div
	class="relative flex min-h-screen w-full flex-col items-center justify-center bg-neutral-950 p-6"
>
	<!-- Scanline industrial overlay -->
	<div class="scanline pointer-events-none fixed inset-0 z-50 opacity-20"></div>

	<div class="relative z-10 flex w-full flex-col items-center">
		{@render children()}
	</div>
</div>
