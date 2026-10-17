<script lang="ts">
	import type { feed } from '#lib/remote/links.remote.ts';
	import type { Role } from '#lib/server/permissions.ts';
	import { timeAgo } from '#lib/time.ts';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import LinkMenu from './LinkMenu.svelte';
	import LinkNote from './LinkNote.svelte';
	import UserAvatar from './UserAvatar.svelte';
	import MessageCircleIcon from '@lucide/svelte/icons/message-circle';

	type Link = Awaited<ReturnType<typeof feed>>['links'][number];

	let {
		link,
		meId,
		role,
		onOpen,
		onDeleted
	}: {
		link: Link;
		meId: string;
		role: Role;
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

<Card.Root class="gap-3 overflow-hidden py-0">
	<a {href} onclick={open} class="hover:bg-muted/50 flex gap-4 p-4 transition-colors">
		{#if preview?.image_url && !imageFailed}
			<img
				src={preview.image_url}
				alt=""
				referrerpolicy="no-referrer"
				loading="lazy"
				onerror={() => (imageFailed = true)}
				class="bg-muted size-20 shrink-0 rounded-md object-cover sm:size-24"
			/>
		{/if}
		<div class="min-w-0 flex-1 space-y-1">
			<p class="text-muted-foreground truncate text-xs">{preview?.site_name ?? host}</p>
			<p class="line-clamp-2 font-medium break-words">{preview?.title ?? link.url}</p>
			{#if preview?.description}
				<p class="text-muted-foreground line-clamp-2 text-sm">{preview.description}</p>
			{:else if link.preview?.status === 'pending'}
				<p class="text-muted-foreground text-sm">Fetching preview…</p>
			{/if}
		</div>
	</a>

	<div class="space-y-2 px-4 pb-3">
		<LinkNote linkId={link.id} note={link.note} bind:editing />

		<div class="text-muted-foreground flex items-center justify-between gap-2 text-xs">
			<div class="flex min-w-0 items-center gap-1.5">
				<UserAvatar size="sm" name={link.author?.name ?? '?'} image={link.author?.image} />
				<span class="truncate">{link.author?.name ?? 'Deleted user'} · {timeAgo(link.created_at)}{link.edited_at
					? ' · edited'
					: ''}</span
				>
			</div>
			<div class="flex shrink-0 items-center gap-1">
				<Button variant="ghost" size="sm" {href} onclick={open}>
					<MessageCircleIcon />
					{link.comment_count}
				</Button>
				<LinkMenu {link} {meId} {role} onEdit={() => (editing = true)} {onDeleted} />
			</div>
		</div>
	</div>
</Card.Root>
