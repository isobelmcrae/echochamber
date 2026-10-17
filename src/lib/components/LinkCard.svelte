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
		unread,
		onOpen,
		onDeleted
	}: {
		link: Link;
		meId: string;
		role: Role;
		/** Mark the link unseen (a solid spot) or seen (a ring); omit to show neither. */
		unread?: boolean;
		/** Show the link in place; without it, clicks go to the link's own page. */
		onOpen?: () => void;
		onDeleted?: () => void;
	} = $props();

	const href = $derived(`/rooms/${link.room_id}/links/${link.id}`);
	const host = $derived(new URL(link.url).hostname.replace(/^www\./, ''));
	const preview = $derived(link.preview?.status === 'ok' ? link.preview : null);

	// Preview images are hotlinked, and some CDNs expire them; hide broken ones.
	let imageFailed = $state(false);
	let editing = $state(false);

	// Plain clicks open the viewer in place; modified clicks (new tab, etc.) follow the href.
	function open(e: MouseEvent) {
		if (!onOpen || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		e.preventDefault();
		onOpen();
	}
</script>

<article class="py-4">
	<a {href} onclick={open} class="group/card flex gap-3.5 rounded-sm">
		{#if preview?.image_url && !imageFailed}
			<RisoImage
				src={preview.image_url}
				onerror={() => (imageFailed = true)}
				class="size-24 shrink-0 rounded-sm"
			/>
		{/if}
		<div class="min-w-0 flex-1 space-y-1">
			<p class="text-ink-text truncate text-[0.8125rem] font-semibold">{preview?.site_name ?? host}</p>
			<p class="flex items-start gap-2 leading-tight font-extrabold break-words">
				{#if unread !== undefined}
					<span
						class="ink-spot mt-[0.3em]"
						data-seen={unread ? undefined : ''}
						role="img"
						aria-label={unread ? 'Unseen' : 'Seen'}
					></span>
				{/if}
				<span class="line-clamp-2 group-hover/card:underline">{preview?.title ?? link.url}</span>
			</p>
			{#if preview?.description}
				<p class="text-muted-foreground line-clamp-2 text-[0.8125rem]">{preview.description}</p>
			{:else if link.preview?.status === 'pending'}
				<p class="text-muted-foreground text-[0.8125rem]">Fetching preview…</p>
			{/if}
		</div>
	</a>

	<div class="mt-2 space-y-2">
		<LinkNote linkId={link.id} note={link.note} bind:editing />

		<LinkByline {link} {meId} {role} {href} onopen={open} onEdit={() => (editing = true)} {onDeleted} />
	</div>
</article>
