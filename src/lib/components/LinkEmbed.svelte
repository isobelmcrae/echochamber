<script lang="ts">
	import type { Embed } from '#lib/embed.ts';
	import { Button } from '#lib/components/ui/button/index.js';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';

	let {
		embed,
		url,
		title,
		image
	}: { embed: Embed; url: string; title: string; image: string | null } = $props();

	// Third-party pages get scripts and popups, but can't navigate or reach into the app.
	const SANDBOX =
		'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation';
	const ALLOW = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
</script>

<!-- Keyed so each link gets a fresh frame: changing an iframe's src would add a history entry. -->
{#key url}
	{#if embed.kind === 'frame' && embed.shape === 'page'}
		<iframe
			src={embed.src}
			{title}
			sandbox={SANDBOX}
			allow={ALLOW}
			referrerpolicy="strict-origin-when-cross-origin"
			class="size-full bg-white"
		></iframe>
	{:else if embed.kind === 'frame'}
		<iframe
			src={embed.src}
			{title}
			allow={ALLOW}
			referrerpolicy="strict-origin-when-cross-origin"
			class={{
				'aspect-video max-h-full w-full': embed.shape === 'video',
				'aspect-[9/16] h-full max-w-full bg-white': embed.shape === 'vertical',
				'h-[352px] w-full max-w-xl': embed.shape === 'audio'
			}}
		></iframe>
	{:else if embed.kind === 'image'}
		<img src={embed.src} alt={title} referrerpolicy="no-referrer" class="max-h-full max-w-full object-contain" />
	{:else if embed.kind === 'video'}
		<!-- svelte-ignore a11y_media_has_caption -- shared clips come without captions -->
		<video src={embed.src} controls class="max-h-full max-w-full"></video>
	{:else}
		<div class="flex max-w-sm flex-col items-center gap-4 p-6 text-center text-white">
			{#if image}
				<img src={image} alt="" referrerpolicy="no-referrer" class="max-h-60 rounded-md object-contain" />
			{/if}
			<p class="font-medium break-words">{title}</p>
			<p class="text-sm text-white/70">
				{embed.kind === 'broken'
					? "This link didn't load when we checked it. It may have moved or been taken down."
					: "This page can't be shown here."}
			</p>
			<Button variant="secondary" href={url} target="_blank" rel="noopener noreferrer">
				<ExternalLinkIcon data-icon="inline-start" />
				Open in new tab
			</Button>
		</div>
	{/if}
{/key}
