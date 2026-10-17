<script lang="ts">
	import { initials } from '#lib/initials.ts';
	import * as Avatar from '#lib/components/ui/avatar/index.js';

	let {
		name,
		image = null,
		size = 'default',
		class: className
	}: {
		name: string;
		image?: string | null;
		size?: 'default' | 'sm' | 'lg';
		class?: string;
	} = $props();
</script>

<!--
	Avatar shows the fallback until the image loads, and keeps it if the image fails.
	The fallback is printed in the surrounding room's dark ink, so a row carries one ink only.
-->
<Avatar.Root {size} class={className}>
	{#if image}<Avatar.Image src={image} alt="" referrerpolicy="no-referrer" />{/if}
	<Avatar.Fallback class="bg-ink-b font-bold text-white">{initials(name)}</Avatar.Fallback>
</Avatar.Root>
