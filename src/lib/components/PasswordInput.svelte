<script lang="ts">
	import * as InputGroup from '#lib/components/ui/input-group/index.js';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';
	import type { HTMLInputAttributes } from 'svelte/elements';

	let {
		value = $bindable(''),
		...props
	}: Omit<HTMLInputAttributes, 'type' | 'files'> = $props();

	let shown = $state(false);
</script>

<InputGroup.Root>
	<InputGroup.Input type={shown ? 'text' : 'password'} bind:value {...props} />
	<InputGroup.Addon align="inline-end">
		<InputGroup.Button
			size="icon-xs"
			aria-label="Show password"
			title={shown ? 'Hide password' : 'Show password'}
			aria-pressed={shown}
			onclick={() => (shown = !shown)}
		>
			{#if shown}<EyeOffIcon />{:else}<EyeIcon />{/if}
		</InputGroup.Button>
	</InputGroup.Addon>
</InputGroup.Root>
