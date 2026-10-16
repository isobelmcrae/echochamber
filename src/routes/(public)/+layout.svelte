<script lang="ts">
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<div class="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4">
	{@render children()}
</div>
