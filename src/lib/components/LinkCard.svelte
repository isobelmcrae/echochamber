<script lang="ts">
	import { attempt } from '#lib/attempt.ts';
	import { deleteLink, editLinkNote, type feed } from '#lib/remote/links.remote.ts';
	import type { Role } from '#lib/server/permissions.ts';
	import { timeAgo } from '#lib/time.ts';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import { Textarea } from '#lib/components/ui/textarea/index.js';
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import MessageCircleIcon from '@lucide/svelte/icons/message-circle';

	type Link = Awaited<ReturnType<typeof feed>>['links'][number];

	let {
		link,
		meId,
		role,
		onDeleted
	}: { link: Link; meId: string; role: Role; onDeleted?: () => void } = $props();

	const host = $derived(new URL(link.url).hostname.replace(/^www\./, ''));
	const preview = $derived(link.preview?.status === 'ok' ? link.preview : null);
	const isAuthor = $derived(link.author?.id === meId);
	const canDelete = $derived(isAuthor || role === 'admin');

	// Preview images are hotlinked, and some CDNs expire them; hide broken ones.
	let imageFailed = $state(false);
	let editing = $state(false);
	let draft = $state('');

	function startEditing() {
		draft = link.note ?? '';
		editing = true;
	}

	async function save() {
		if (await attempt(() => editLinkNote({ linkId: link.id, note: draft }))) editing = false;
	}

	async function remove() {
		if (!confirm('Delete this link and its comments?')) return;
		if (await attempt(() => deleteLink(link.id))) onDeleted?.();
	}
</script>

<Card.Root class="gap-3 overflow-hidden py-0">
	<a
		href={link.url}
		target="_blank"
		rel="noopener noreferrer"
		class="hover:bg-muted/50 flex gap-4 p-4 transition-colors"
	>
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
		{#if editing}
			<Textarea bind:value={draft} placeholder="Add a note" rows={2} />
			<div class="flex justify-end gap-2">
				<Button variant="ghost" size="sm" onclick={() => (editing = false)}>Cancel</Button>
				<Button size="sm" onclick={save}>Save</Button>
			</div>
		{:else if link.note}
			<p class="text-sm whitespace-pre-wrap">{link.note}</p>
		{/if}

		<div class="text-muted-foreground flex items-center justify-between gap-2 text-xs">
			<span class="truncate">
				{link.author?.name ?? 'Deleted user'} · {timeAgo(link.created_at)}{link.edited_at
					? ' · edited'
					: ''}
			</span>
			<div class="flex shrink-0 items-center gap-1">
				<Button variant="ghost" size="sm" href="/rooms/{link.room_id}/links/{link.id}">
					<MessageCircleIcon />
					{link.comment_count}
				</Button>
				{#if isAuthor || canDelete}
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							{#snippet child({ props })}
								<Button {...props} variant="ghost" size="icon-sm" aria-label="Link actions">
									<EllipsisIcon />
								</Button>
							{/snippet}
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end">
							{#if isAuthor}
								<DropdownMenu.Item onclick={startEditing}>Edit note</DropdownMenu.Item>
							{/if}
							{#if canDelete}
								<DropdownMenu.Item variant="destructive" onclick={remove}>Delete</DropdownMenu.Item>
							{/if}
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				{/if}
			</div>
		</div>
	</div>
</Card.Root>
