<script lang="ts">
	import { Eye, EyeOff, Bot } from 'lucide-svelte';

	let email = $state('');
	let password = $state('');
	let showPassword = $state(false);

	function togglePassword() {
		showPassword = !showPassword;
	}
</script>

<div class="w-full max-w-sm space-y-8">
	<div class="text-center">
		<div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-sm bg-signal-blue">
			<Bot size={28} class="text-white" />
		</div>
		<h1 class="text-2xl font-bold tracking-tight text-neutral-100 uppercase">Secure Entry</h1>
		<p class="mt-1 text-[11px] tracking-widest text-neutral-500 uppercase">
			hRAG Control Authorization Protocol
		</p>
	</div>

	<form class="space-y-4" method="POST" action="?/login">
		<div class="space-y-1">
			<label
				for="email"
				class="px-1 text-[10px] font-bold tracking-wider text-neutral-500 uppercase">Identity</label
			>
			<input
				id="email"
				name="email"
				type="email"
				bind:value={email}
				placeholder="email@organization.com"
				class="w-full rounded-sm border border-neutral-800 bg-neutral-900 p-3 font-mono text-sm text-neutral-100 transition-colors outline-none focus:border-signal-blue"
				required
			/>
		</div>

		<div class="relative space-y-1">
			<label
				for="password"
				class="px-1 text-[10px] font-bold tracking-wider text-neutral-500 uppercase"
				>Access Secret</label
			>
			<div class="relative">
				<input
					id="password"
					name="password"
					type={showPassword ? 'text' : 'password'}
					bind:value={password}
					placeholder="••••••••"
					class="w-full rounded-sm border border-neutral-800 bg-neutral-900 p-3 font-mono text-sm text-neutral-100 transition-colors outline-none focus:border-signal-blue"
					required
				/>
				<button
					type="button"
					onclick={togglePassword}
					class="absolute top-1/2 right-3 -translate-y-1/2 text-neutral-600 hover:text-neutral-400"
				>
					{#if showPassword}
						<EyeOff size={16} />
					{:else}
						<Eye size={16} />
					{/if}
				</button>
			</div>
		</div>

		<button
			type="submit"
			class="w-full rounded-sm bg-signal-blue py-3 text-xs font-bold tracking-widest text-white uppercase shadow-lg shadow-blue-900/20 transition-colors hover:bg-blue-500"
		>
			Authorize Access
		</button>
	</form>

	<div class="relative py-4">
		<div class="absolute inset-0 flex items-center">
			<span class="w-full border-t border-neutral-800"></span>
		</div>
		<div class="relative flex justify-center text-[10px] tracking-widest uppercase">
			<span class="bg-neutral-950 px-2 font-bold text-neutral-600">Standard Connectors</span>
		</div>
	</div>

	<div class="grid grid-cols-2 gap-4">
		<button
			class="group flex items-center justify-center gap-2 rounded-sm border border-neutral-800 p-2 transition-colors hover:bg-neutral-900"
		>
			<div
				class="h-4 w-4 rounded-sm bg-neutral-700 transition-colors group-hover:bg-signal-blue"
			></div>
			<span class="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">Microsoft</span>
		</button>
		<button
			class="group flex items-center justify-center gap-2 rounded-sm border border-neutral-800 p-2 transition-colors hover:bg-neutral-900"
		>
			<div
				class="h-4 w-4 rounded-sm bg-neutral-700 transition-colors group-hover:bg-signal-blue"
			></div>
			<span class="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">Google</span>
		</button>
	</div>
</div>
