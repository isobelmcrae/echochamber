<script lang="ts">
	import './layout.css';
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
	<link rel="icon" href="/favicon.ico" sizes="48x48" />
	<link rel="icon" href="/favicon.png" type="image/png" sizes="32x32" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<title>echochamber</title>
</svelte:head>

<ModeWatcher />
<Toaster />

{@render children()}
