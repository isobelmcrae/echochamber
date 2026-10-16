<script lang="ts">
	import { page } from '$app/state';
	import { attempt } from '#lib/attempt.ts';
	import LinkCard from '#lib/components/LinkCard.svelte';
	import { feed, olderLinks, postLink } from '#lib/remote/links.remote.ts';
	import { room as liveRoom } from '#lib/remote/rooms.remote.ts';
	import { roomName } from '#lib/room-name.ts';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import * as Field from '#lib/components/ui/field/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Textarea } from '#lib/components/ui/textarea/index.js';
	import type { PageProps } from './$types';

	type Link = Awaited<ReturnType<typeof feed>>['links'][number];

	let { data }: PageProps = $props();
	const roomId = $derived(page.params.roomId!);
	const room = $derived(await liveRoom(roomId));
	const latest = $derived(await feed(roomId));

	// Older pages are fetched on demand and appended below the live first page.
	let older = $state<Link[]>([]);
	let olderCursor = $state<string | null | undefined>(undefined);
	const cursor = $derived(olderCursor === undefined ? latest.nextCursor : olderCursor);
	const links = $derived([
		...latest.links,
		...older.filter((l) => !latest.links.some((n) => n.id === l.id))
	]);

	async function loadOlder() {
		if (!cursor) return;
		await attempt(async () => {
			const next = await olderLinks({ roomId, cursor });
			older = [...older, ...next.links];
			olderCursor = next.nextCursor;
		});
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between gap-4">
		<h1 class="truncate text-2xl font-semibold">{roomName(room, data.me.id)}</h1>
		<Button variant="outline" size="sm" href="/rooms/{room.id}/settings">
			{room.role === 'admin' ? 'Manage' : 'Members'}
		</Button>
	</div>

	<Card.Root>
		<Card.Content>
			<form
				{...postLink.enhance(async (form) => {
					if (await form.submit().updates()) form.element.reset();
				})}
				class="space-y-3"
			>
				<input {...postLink.fields.roomId.as('hidden', roomId)} />
				<Field.Field>
					<Input
						{...postLink.fields.url.as('text')}
						placeholder="Paste a link…"
						autocomplete="off"
						inputmode="url"
					/>
					{#each postLink.fields.url.issues() ?? [] as issue (issue.message)}
						<Field.Error>{issue.message}</Field.Error>
					{/each}
				</Field.Field>
				<Textarea {...postLink.fields.note.as('text')} placeholder="Add a note (optional)" rows={2} />
				<div class="flex justify-end">
					<Button type="submit" disabled={!!postLink.pending}>Share</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>

	{#if links.length === 0}
		<p class="text-muted-foreground py-8 text-center">Nothing shared yet. Paste the first link.</p>
	{:else}
		<ul class="space-y-4">
			{#each links as link (link.id)}
				<li>
					<LinkCard
						{link}
						meId={data.me.id}
						role={room.role}
						onDeleted={() => (older = older.filter((l) => l.id !== link.id))}
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
</div>
