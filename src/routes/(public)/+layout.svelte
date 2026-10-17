<script lang="ts">
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<div class="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4">
	<header class="flex justify-center pt-10">
		<a href="/" class="wordmark rounded-sm text-[2.25rem]">echochamber</a>
	</header>
	{@render children()}
</div>
