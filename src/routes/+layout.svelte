<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import { Toaster } from '#lib/components/ui/sonner/index.js';
	import { onMount } from 'svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// Lets browser tests wait until the page is interactive (live queries keep the
	// network busy, so "network idle" never arrives).
	onMount(() => (document.documentElement.dataset.hydrated = ''));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Echo Chamber</title>
</svelte:head>

<Toaster />

<div class="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4">
	{@render children()}
</div>
