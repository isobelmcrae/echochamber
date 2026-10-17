<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import { attempt } from '#lib/attempt.ts';
	import LinkCard from '#lib/components/LinkCard.svelte';
	import { feed, olderLinks, postLink } from '#lib/remote/links.remote.ts';
	import { room as liveRoom, markRead } from '#lib/remote/rooms.remote.ts';
	import { roomName } from '#lib/room-name.ts';
	import { isTextEntry } from '#lib/text-entry.ts';
	import { normalizeUrl } from '#lib/url.ts';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Empty from '#lib/components/ui/empty/index.js';
	import * as Field from '#lib/components/ui/field/index.js';
	import * as InputGroup from '#lib/components/ui/input-group/index.js';
	import LinkIcon from '@lucide/svelte/icons/link';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import LinkModal from './LinkModal.svelte';
	import type { PageProps } from './$types';

	type Link = Awaited<ReturnType<typeof feed>>['links'][number];

	let { data }: PageProps = $props();
	const roomId = $derived(page.params.roomId!);
	const room = $derived(await liveRoom(roomId));
	const latest = $derived(await feed(roomId));

	// Opening the room, and each new link while it's open, clears its unread badge.
	const newest = $derived(latest.links[0]?.id);
	$effect(() => {
		void newest;
		const id = roomId;
		// Untracked: the command reads state that markRead's own update changes, which would loop.
		untrack(() => markRead(id).catch(() => {}));
	});

	// Older pages are fetched on demand and appended below the live first page.
	let older = $state<Link[]>([]);
	let olderCursor = $state<string | null | undefined>(undefined);
	const cursor = $derived(olderCursor === undefined ? latest.nextCursor : olderCursor);
	const links = $derived([
		...latest.links,
		...older.filter((l) => !latest.links.some((n) => n.id === l.id))
	]);

	// The note field opens up once there's a link to annotate.
	const drafting = $derived(!!postLink.fields.url.value());

	// A link pasted outside a text field (and the viewer) lands in the share bar.
	let urlInput = $state<HTMLInputElement | null>(null);
	function pasteLink(e: ClipboardEvent) {
		if (openId || isTextEntry(e.target)) return;
		const text = e.clipboardData?.getData('text/plain').trim();
		if (!text || !normalizeUrl(text)) return;
		e.preventDefault();
		postLink.fields.url.set(text);
		urlInput?.focus();
	}

	async function loadOlder() {
		if (!cursor) return;
		await attempt(async () => {
			const next = await olderLinks({ roomId, cursor });
			older = [...older, ...next.links];
			olderCursor = next.nextCursor;
		});
	}

	// The viewer opens over the feed with shallow routing: the URL is the link's own page, so
	// reloading or sharing it lands there, and Back closes the viewer.
	const openId = $derived(page.state.linkId);
	const openIndex = $derived(links.findIndex((l) => l.id === openId));
	const linkUrl = (id: string) => `/rooms/${roomId}/links/${id}`;

	function openLink(id: string) {
		void goto(linkUrl(id), { state: { linkId: id }, shallow: true });
	}

	// Flipping through replaces the entry, so Back still returns straight to the feed.
	function showLink(id: string | undefined) {
		if (id) void goto(linkUrl(id), { state: { linkId: id }, shallow: true, replace: true });
	}

	async function showNext() {
		if (openIndex === links.length - 1) await loadOlder();
		showLink(links[openIndex + 1]?.id);
	}

	function removeLink(id: string) {
		older = older.filter((l) => l.id !== id);
	}
</script>

<svelte:document onpaste={pasteLink} />

{#if openId}
	<LinkModal
		{roomId}
		linkId={openId}
		meId={data.me.id}
		role={room.role}
		onPrev={openIndex > 0 ? () => showLink(links[openIndex - 1]?.id) : undefined}
		onNext={openIndex !== -1 && (openIndex < links.length - 1 || cursor) ? showNext : undefined}
		onClose={() => history.back()}
		onDeleted={() => {
			removeLink(openId);
			history.back();
		}}
	/>
{/if}

<div class="flex flex-1 flex-col gap-6">
	<div class="flex items-center justify-between gap-4">
		<h1 class="truncate text-2xl font-semibold">{roomName(room, data.me.id)}</h1>
		<Button variant="ghost" size="sm" href="/rooms/{room.id}/settings">
			<SettingsIcon data-icon="inline-start" />
			{room.role === 'admin' ? 'Manage' : 'Members'}
		</Button>
	</div>

	{#if links.length === 0}
		<Empty.Root class="flex-1">
			<Empty.Header>
				<Empty.Media variant="icon">
					<LinkIcon />
				</Empty.Media>
				<Empty.Title>Nothing shared yet</Empty.Title>
				<Empty.Description>Paste the first link below.</Empty.Description>
			</Empty.Header>
		</Empty.Root>
	{:else}
		<ul class="flex flex-col gap-4">
			{#each links as link (link.id)}
				<li>
					<LinkCard
						{link}
						meId={data.me.id}
						role={room.role}
						onOpen={() => openLink(link.id)}
						onDeleted={() => removeLink(link.id)}
					/>
				</li>
			{/each}
		</ul>
		{#if cursor}
			<div class="flex justify-center">
				<Button variant="outline" onclick={loadOlder}>Load older links</Button>
			</div>
		{/if}
	{/if}

	<form
		{...postLink.enhance(async (form) => {
			if (await form.submit().updates()) form.element.reset();
		})}
		class="sticky bottom-4 mt-auto flex flex-col gap-1"
	>
		<input {...postLink.fields.roomId.as('hidden', roomId)} />
		<div class="bg-background rounded-md shadow-lg">
			<InputGroup.Root>
				{#if !drafting}
					<InputGroup.Addon>
						<LinkIcon />
					</InputGroup.Addon>
				{/if}
				<InputGroup.Input
					bind:ref={urlInput}
					{...postLink.fields.url.as('text')}
					placeholder="Paste something…"
					autocomplete="off"
					inputmode="url"
					aria-label="Link"
				/>
				{#if drafting}
					<InputGroup.Textarea
						{...postLink.fields.note.as('text')}
						placeholder="Add a note (optional)"
						rows={2}
						aria-label="Note"
					/>
					<InputGroup.Addon align="block-end" class="border-t">
						<InputGroup.Text>Press Enter to share</InputGroup.Text>
						<InputGroup.Button
							type="submit"
							variant="default"
							size="sm"
							class="ml-auto"
							disabled={!!postLink.pending}>Share</InputGroup.Button
						>
					</InputGroup.Addon>
				{/if}
			</InputGroup.Root>
		</div>
		{#each postLink.fields.url.issues() ?? [] as issue (issue.message)}
			<Field.Error>{issue.message}</Field.Error>
		{/each}
	</form>
</div>
