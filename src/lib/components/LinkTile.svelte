<script lang="ts">
	import type { feed } from '#lib/remote/links.remote.ts';
	import type { Role } from '#lib/server/permissions.ts';
	import LinkByline from './LinkByline.svelte';
	import LinkNote from './LinkNote.svelte';
	import RisoImage from './RisoImage.svelte';

	type Link = Awaited<ReturnType<typeof feed>>['links'][number];

	let {
		link,
		meId,
		role,
		room,
		unread,
		onOpen,
		onDeleted
	}: {
		link: Link;
		meId: string;
		role: Role;
		/** The room's name, printed as a tag where tiles from several rooms share one wall. */
		room?: string;
		/** Mark the link unseen (a solid spot) or seen (a ring); omit to show neither. */
		unread?: boolean;
		/** Show the link in place; without it, clicks go to the link's own page. */
		onOpen?: () => void;
		onDeleted?: () => void;
	} = $props();

	const href = $derived(`/rooms/${link.room_id}/links/${link.id}`);
	const host = $derived(new URL(link.url).hostname.replace(/^www\./, ''));
	const preview = $derived(link.preview?.status === 'ok' ? link.preview : null);

	// Preview images are hotlinked, and some CDNs expire them; print the site instead.
	let imageFailed = $state(false);
	let editing = $state(false);

	// Plain clicks open the viewer in place; modified clicks (new tab, etc.) follow the href.
	function open(e: MouseEvent) {
		if (!onOpen || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		e.preventDefault();
		onOpen();
	}
</script>

<!-- A gallery tile: the preview leads at full column width, the row's text set beneath it. -->
<article class="flex flex-col gap-2">
	<a {href} onclick={open} class="group/card flex flex-col gap-2.5 rounded-sm">
		{#if preview?.image_url && !imageFailed}
			<RisoImage
				src={preview.image_url}
				onerror={() => (imageFailed = true)}
				class="riso-natural w-full rounded-sm"
			/>
		{:else if link.preview?.status === 'pending'}
			<div
				class="bg-muted text-muted-foreground flex aspect-video items-end rounded-sm p-3.5 text-[0.8125rem]"
			>
				Fetching preview…
			</div>
		{:else}
			<!-- No picture to print: the site's name is set on a solid block of the light ink. -->
			<div class="riso-blank bg-ink-a text-ink flex aspect-[16/10] items-end rounded-sm p-3.5">
				<span class="line-clamp-3 text-xl leading-none font-extrabold tracking-tight break-all"
					>{preview?.site_name ?? host}</span
				>
			</div>
		{/if}

		<div class="min-w-0 space-y-1">
			<p class="flex min-w-0 items-center gap-2 text-[0.8125rem]">
				{#if room}
					<span class="room-tag">{room}</span>
				{/if}
				<span class="text-ink-text truncate font-semibold">{preview?.site_name ?? host}</span>
			</p>
			<p class="flex items-start gap-2 leading-tight font-extrabold break-words">
				{#if unread !== undefined}
					<span
						class="ink-spot mt-[0.3em]"
						data-seen={unread ? undefined : ''}
						role="img"
						aria-label={unread ? 'Unseen' : 'Seen'}
					></span>
				{/if}
				<span class="line-clamp-3 group-hover/card:underline">{preview?.title ?? link.url}</span>
			</p>
			{#if preview?.description}
				<p class="text-muted-foreground line-clamp-2 text-[0.8125rem]">{preview.description}</p>
			{/if}
		</div>
	</a>

	<LinkNote linkId={link.id} note={link.note} bind:editing />

	<LinkByline {link} {meId} {role} {href} onopen={open} onEdit={() => (editing = true)} {onDeleted} />
</article>
