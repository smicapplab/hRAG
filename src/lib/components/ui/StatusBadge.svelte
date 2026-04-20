<script lang="ts">
	let { status = 'ok', label = '' }: { status: 'ok' | 'warn' | 'error' | 'idle'; label: string } =
		$props();

	const colorMap = {
		ok: 'text-signal-green border-signal-green/30 bg-signal-green/10',
		warn: 'text-signal-orange border-signal-orange/30 bg-signal-orange/10',
		error: 'text-signal-red border-signal-red/30 bg-signal-red/10',
		idle: 'text-muted-foreground border-border bg-muted'
	};
</script>

<div
	class="inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 font-mono text-[10px] tracking-wider uppercase {colorMap[
		status
	]}"
>
	<span
		class="h-1.5 w-1.5 rounded-full {status === 'idle'
			? 'bg-muted-foreground'
			: `bg-current shadow-[0_0_8px_currentColor]`}"
	></span>
	{label}
</div>
