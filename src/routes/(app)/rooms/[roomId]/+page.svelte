<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import { attempt } from '#lib/attempt.ts';
	import { inkVars } from '#lib/ink.ts';
	import { getRoomInks } from '#lib/room-inks.ts';
	import { printIn } from '#lib/print-in.ts';
	import LinkCard from '#lib/components/LinkCard.svelte';
	import { feed, olderLinks, postLink } from '#lib/remote/links.remote.ts';
	import { refreshOnChange } from '#lib/refresh-on-change.svelte.ts';
	import { room as getRoom, markRead } from '#lib/remote/rooms.remote.ts';
	import { roomName } from '#lib/room-name.ts';
	import { isTextEntry } from '#lib/text-entry.ts';
	import { normalizeUrl } from '#lib/url.ts';
	import { resetWhenEmptied } from '#lib/reset-when-emptied.ts';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Empty from '#lib/components/ui/empty/index.js';
	import * as Field from '#lib/components/ui/field/index.js';
	import * as InputGroup from '#lib/components/ui/input-group/index.js';
	import LinkIcon from '@lucide/svelte/icons/link';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import LinkModal from '#lib/components/LinkModal.svelte';
	import type { PageProps } from './$types';

	type Link = Awaited<ReturnType<typeof feed>>['links'][number];

	let { data }: PageProps = $props();
	const inks = getRoomInks();
	const roomId = $derived(page.params.roomId!);
	refreshOnChange(() => [getRoom(roomId), feed(roomId)]);
	const room = $derived(await getRoom(roomId));
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

<div class="flex flex-1 flex-col gap-6" {...inkVars(inks.of(roomId))}>
	<div class="flex items-center gap-3">
		<h1 class="flex min-w-0 flex-1 items-center gap-2.5 text-[2rem]">
			<span class="room-band min-w-0"><span class="truncate">{roomName(room, data.me.id)}</span></span>
			<span class="room-rule" aria-hidden="true"></span>
		</h1>
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
		<ul class="flex flex-col">
			{#each links as link (link.id)}
				<li in:printIn class="border-b last:border-b-0">
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
		<div class="bg-background rounded-md shadow-[0_8px_24px_-6px_rgb(0_0_0/0.18)]">
			<!-- A slip printed in the room's ink: present at the foot of the feed, never louder than it. -->
			<InputGroup.Root
				class="border-ink-text dark:border-ink-a/60 has-[[data-slot=input-group-control]:focus-visible]:border-ink-text has-[[data-slot=input-group-control]:focus-visible]:ring-ink-a/60 h-12 border-2 bg-background shadow-none dark:bg-background"
			>
				{#if !drafting}
					<InputGroup.Addon class="pl-1.5">
						<span class="bg-ink-a text-ink grid size-8 place-items-center rounded-sm">
							<LinkIcon class="size-4" />
						</span>
					</InputGroup.Addon>
				{/if}
				<InputGroup.Input
					bind:ref={urlInput}
					{...postLink.fields.url.as('text')}
					placeholder="Paste something…"
					autocomplete="off"
					inputmode="url"
					aria-label="Link"
					{@attach resetWhenEmptied}
					class="text-base font-medium md:text-base"
				/>
				{#if !drafting}
					<InputGroup.Addon align="inline-end" class="hidden md:flex">
						<InputGroup.Text class="text-muted-foreground text-xs">or paste anywhere</InputGroup.Text>
					</InputGroup.Addon>
				{/if}
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
