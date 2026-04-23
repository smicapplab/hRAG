<script lang="ts">
	import { enhance } from '$app/forms';
	import { Save } from 'lucide-svelte';

	interface Option {
		value: string;
		label: string;
	}

	let { 
		key, 
		label, 
		description, 
		type = 'text', 
		value, 
		options = [],
		onFocus = () => {},
		onBlur = () => {}
	} = $props<{
		key: string;
		label: string;
		description: string;
		type?: 'text' | 'number' | 'select' | 'password';
		value: any;
		options?: Option[];
		onFocus?: (key: string) => void;
		onBlur?: () => void;
	}>();

	let isFocused = $state(false);

	function handleFocus() {
		isFocused = true;
		onFocus(key);
	}

	function handleBlur() {
		isFocused = false;
		onBlur();
	}
</script>

<form 
	method="POST" 
	action="?/updateSetting" 
	use:enhance 
	class="grid grid-cols-12 items-center gap-4 rounded-sm border border-transparent p-2 transition-all hover:bg-muted/10 {isFocused ? 'bg-muted/20 border-border/50' : ''}"
	onmouseenter={() => onFocus(key)}
	onmouseleave={() => onBlur()}
>
	<div class="col-span-12 lg:col-span-4 space-y-1">
		<div class="font-mono text-[10px] font-bold uppercase tracking-tight text-foreground">{label}</div>
		<p class="text-[8px] text-muted-foreground uppercase leading-tight">{description}</p>
		<input type="hidden" name="key" value={key} />
	</div>
	
	<div class="col-span-12 lg:col-span-6">
		<label class="block w-full">
			<span class="sr-only">{label}</span>
			{#if type === 'select'}
				<select 
					name="value" 
					{value} 
					onfocus={handleFocus}
					onblur={handleBlur}
					class="w-full rounded-sm border border-border bg-neutral-950 p-2 font-mono text-[10px] outline-none focus:border-signal-blue uppercase transition-colors"
				>
					{#each options as opt}
						<option value={opt.value}>{opt.label}</option>
					{/each}
				</select>
			{:else}
				<input 
					name="value" 
					{type}
					{value} 
					onfocus={handleFocus}
					onblur={handleBlur}
					class="w-full rounded-sm border border-border bg-neutral-950 p-2 font-mono text-[10px] outline-none focus:border-signal-blue transition-colors"
				/>
			{/if}
		</label>
	</div>

	<div class="col-span-12 lg:col-span-2">
		<button class="flex w-full items-center justify-center gap-2 border border-border bg-muted py-2 text-[9px] font-bold uppercase hover:bg-signal-blue hover:text-white transition-all">
			<Save size={12} />
			Update
		</button>
	</div>
</form>
