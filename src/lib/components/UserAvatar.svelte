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

<!-- Avatar shows the fallback until the image loads, and keeps it if the image fails. -->
<Avatar.Root {size} class={className}>
	{#if image}<Avatar.Image src={image} alt="" referrerpolicy="no-referrer" />{/if}
	<Avatar.Fallback>{initials(name)}</Avatar.Fallback>
</Avatar.Root>
