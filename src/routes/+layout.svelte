<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import { Toaster } from '#lib/components/ui/sonner/index.js';
	import { ModeWatcher } from 'mode-watcher';
	import { onMount } from 'svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// Lets browser tests wait until the page is interactive (live queries keep the
	// network busy, so "network idle" never arrives).
	onMount(() => (document.documentElement.dataset.hydrated = ''));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>echochamber</title>
</svelte:head>

<ModeWatcher />
<Toaster />

{@render children()}
