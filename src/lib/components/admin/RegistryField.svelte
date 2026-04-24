<script lang="ts">
	import { enhance } from '$app/forms';
	import { Save, RefreshCw } from 'lucide-svelte';

	interface Option {
		value: string;
		label: string;
	}

	let { 
		key, 
		label, 
		description, 
		type = 'text', 
		value: initialValue, 
		options = [],
		syncAction = null,
		onFocus = () => {},
		onBlur = () => {},
		onChange = () => {},
		onSave = () => {}
	} = $props<{
		key: string;
		label: string;
		description: string;
		type?: 'text' | 'number' | 'select' | 'password';
		value: any;
		options?: Option[];
		syncAction?: string | null;
		onFocus?: (key: string) => void;
		onBlur?: () => void;
		onChange?: (key: string, value: any) => void;
		onSave?: (key: string) => void;
	}>();

	let isFocused = $state(false);
	let isSyncing = $state(false);
	let isSaving = $state(false);
	let localValue = $state(initialValue);

	// Unique ID for datalist if needed
	const datalistId = `list-${key.replace(/\./g, '-')}`;

	// Sync local value when prop changes from outside (e.g. after save)
	$effect(() => {
		if (!isFocused && !isSaving) {
			localValue = initialValue;
		}
	});

	function handleFocus() {
		isFocused = true;
		onFocus(key);
	}

	function handleBlur() {
		isFocused = false;
		onBlur();
	}

	function handleValueChange(e: Event) {
		const target = e.target as HTMLInputElement | HTMLSelectElement;
		localValue = target.value;
		onChange(key, localValue);
	}
</script>

<div 
	role="group"
	aria-label="Registry setting field"
	class="grid grid-cols-12 items-center gap-4 rounded-sm border border-transparent p-2 transition-all hover:bg-muted/10 {isFocused ? 'bg-muted/20 border-border/50' : ''}"
	onmouseenter={() => onFocus(key)}
	onmouseleave={() => onBlur()}
>
	<div class="col-span-12 lg:col-span-4 space-y-1">
		<div class="font-mono text-[10px] font-bold uppercase tracking-tight text-foreground">{label}</div>
		<p class="text-[8px] text-muted-foreground uppercase leading-tight">{description}</p>
	</div>
	
	<div class="col-span-12 lg:col-span-6 flex gap-2">
		<form 
			method="POST" 
			action="?/updateSetting" 
			use:enhance={() => {
				isSaving = true;
				return async ({ result, update }) => {
					await update();
					if (result.type === 'success') {
						onSave(key);
					}
					isSaving = false;
				};
			}} 
			class="flex-1 flex gap-2"
		>
			<input type="hidden" name="key" value={key} />
			<label class="block flex-1">
				<span class="sr-only">{label}</span>
				{#if type === 'select'}
					<select 
						name="value" 
						value={localValue}
						onchange={handleValueChange}
						onfocus={handleFocus}
						onblur={handleBlur}
						class="w-full rounded-sm border border-border bg-neutral-950 p-2 font-mono text-[10px] outline-none focus:border-signal-blue uppercase transition-colors"
					>
						{#each options as opt}
							<option value={opt.value} selected={opt.value === localValue}>{opt.label}</option>
						{/each}
					</select>
				{:else}
					<input 
						name="value" 
						{type}
						value={localValue}
						list={options.length > 0 ? datalistId : undefined}
						oninput={handleValueChange}
						onfocus={handleFocus}
						onblur={handleBlur}
						class="w-full rounded-sm border border-border bg-neutral-950 p-2 font-mono text-[10px] outline-none focus:border-signal-blue transition-colors"
					/>
					{#if options.length > 0}
						<datalist id={datalistId}>
							{#each options as opt}
								<option value={opt.value}>{opt.label}</option>
							{/each}
						</datalist>
					{/if}
				{/if}
			</label>
			<button 
				class="shrink-0 flex items-center justify-center border border-border bg-muted px-3 py-2 text-[9px] font-bold uppercase hover:bg-signal-blue hover:text-white transition-all disabled:opacity-50" 
				title="Save Setting"
				disabled={isSaving}
			>
				{#if isSaving}
					<RefreshCw size={12} class="animate-spin" />
				{:else}
					<Save size={12} />
				{/if}
			</button>
		</form>

		{#if syncAction}
			<form 
				method="POST" 
				action="?/{syncAction}" 
				use:enhance={() => {
					isSyncing = true;
					return async ({ update }) => {
						await update();
						isSyncing = false;
					};
				}}
			>
				<input type="hidden" name="provider" value={localValue?.split(':')[0] || localValue} />
				<button 
					class="shrink-0 flex items-center justify-center border border-border bg-muted px-3 py-2 text-[9px] font-bold uppercase hover:bg-signal-orange hover:text-white transition-all disabled:opacity-50" 
					title="Discovery Sync"
					disabled={isSyncing}
				>
					<RefreshCw size={12} class={isSyncing ? 'animate-spin' : ''} />
				</button>
			</form>
		{/if}
	</div>

	<div class="hidden lg:block lg:col-span-2">
		<!-- Reserved for future use or status indicator -->
	</div>
</div>
