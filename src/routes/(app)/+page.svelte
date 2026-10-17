<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import LinkCard from '#lib/components/LinkCard.svelte';
	import LinkModal from '#lib/components/LinkModal.svelte';
	import LinkTile from '#lib/components/LinkTile.svelte';
	import ViewToggle from '#lib/components/ViewToggle.svelte';
	import { masonry } from '#lib/masonry.ts';
	import { getView } from '#lib/view.ts';
	import { inkVars } from '#lib/ink.ts';
	import { getRoomInks } from '#lib/room-inks.ts';
	import { printIn } from '#lib/print-in.ts';
	import { refreshOnChange } from '#lib/refresh-on-change.svelte.ts';
	import { queue as getQueue } from '#lib/remote/links.remote.ts';
	import { home } from '#lib/remote/rooms.remote.ts';
	import { roomName } from '#lib/room-name.ts';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Empty from '#lib/components/ui/empty/index.js';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import MessagesSquareIcon from '@lucide/svelte/icons/messages-square';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { getNewRoom } from './new-room.ts';
	import PendingInvites from './PendingInvites.svelte';
	import type { PageProps } from './$types';

	type Group = Awaited<ReturnType<typeof getQueue>>[number];
	type Item = { link: Group['links'][number]; room: Group['room'] };

	let { data }: PageProps = $props();
	const newRoom = getNewRoom();
	const inks = getRoomInks();
	const view = getView();
	refreshOnChange(() => [getQueue()]);
	const { rooms, invites } = $derived(await home());
	const queue = $derived(await getQueue());

	// The queue, one room after another, so the viewer flips straight across rooms.
	const live = $derived(queue.flatMap(({ room, links }) => links.map((link) => ({ link, room }))));

	// Viewing a link marks it seen, which drops it from the live queue. While the viewer is
	// open, hold the queue it opened on (plus anything new, at the end) so the carousel stays put.
	let held = $state<Item[] | null>(null);
	const items = $derived(
		held ? [...held, ...live.filter((i) => !held!.some((h) => h.link.id === i.link.id))] : live
	);
	const groups = $derived(
		items.reduce<{ room: Item['room']; items: Item[] }[]>((groups, item) => {
			const last = groups.at(-1);
			if (last?.room.id === item.room.id) last.items.push(item);
			else groups.push({ room: item.room, items: [item] });
			return groups;
		}, [])
	);

	const openId = $derived(page.state.linkId);
	const openIndex = $derived(items.findIndex((i) => i.link.id === openId));
	const open = $derived(items[openIndex]);
	$effect(() => {
		if (!openId) held = null;
	});

	const linkUrl = (item: Item) => `/rooms/${item.room.id}/links/${item.link.id}`;

	function openLink(item: Item) {
		held = items;
		void goto(linkUrl(item), { state: { linkId: item.link.id }, shallow: true });
	}

	// Flipping through replaces the entry, so Back still returns straight to the queue.
	function showLink(item: Item | undefined) {
		if (item) {
			void goto(linkUrl(item), { state: { linkId: item.link.id }, shallow: true, replace: true });
		}
	}

	function removeLink(id: string) {
		held = held?.filter((i) => i.link.id !== id) ?? null;
	}
</script>

{#if openId}
	<LinkModal
		linkId={openId}
		meId={data.me.id}
		role={open?.room.role ?? 'member'}
		onPrev={openIndex > 0 ? () => showLink(items[openIndex - 1]) : undefined}
		onNext={openIndex !== -1 && openIndex < items.length - 1
			? () => showLink(items[openIndex + 1])
			: undefined}
		onClose={() => history.back()}
		onDeleted={() => {
			removeLink(openId);
			history.back();
		}}
	/>
{/if}

<div class="flex flex-1 flex-col gap-8">
	<PendingInvites {invites} meId={data.me.id} />

	{#if items.length > 0}
		<div class="-mb-4 flex items-center justify-between gap-3">
			<p class="text-muted-foreground text-[0.8125rem]">
				<span class="text-foreground font-semibold tabular-nums">{live.length}</span> unseen
			</p>
			<ViewToggle />
		</div>
	{/if}

	{#if items.length > 0 && view.current === 'gallery'}
		<!-- One wall in queue order, each tile printed in its own room's pair and tagged with its name. -->
		<ul class="masonry" {@attach masonry}>
			{#each items as item (item.link.id)}
				<li in:printIn {...inkVars(inks.of(item.room.id))}>
					<LinkTile
						link={item.link}
						meId={data.me.id}
						role={item.room.role}
						room={roomName(item.room, data.me.id)}
						unread={live.some((i) => i.link.id === item.link.id)}
						onOpen={() => openLink(item)}
						onDeleted={() => removeLink(item.link.id)}
					/>
				</li>
			{/each}
		</ul>
	{:else if groups.length > 0}
		{#each groups as group, i (`${group.room.id}:${i}`)}
			<section class="flex flex-col" {...inkVars(inks.of(group.room.id))}>
				<h2 class="flex items-center gap-2.5 text-[1.625rem]">
					<a href="/rooms/{group.room.id}" class="room-band group/room min-w-0">
						<span class="truncate">{roomName(group.room, data.me.id)}</span>
						<ArrowRightIcon
							class="size-[0.55em] shrink-0 stroke-3 transition-transform group-hover/room:translate-x-0.5"
						/>
					</a>
					<span class="room-rule" aria-hidden="true"></span>
				</h2>
				<ul class="flex flex-col">
					{#each group.items as item (item.link.id)}
						<li in:printIn class="border-b last:border-b-0">
							<LinkCard
								link={item.link}
								meId={data.me.id}
								role={item.room.role}
								unread={live.some((i) => i.link.id === item.link.id)}
								onOpen={() => openLink(item)}
								onDeleted={() => removeLink(item.link.id)}
							/>
						</li>
					{/each}
				</ul>
			</section>
		{/each}
	{:else}
		<Empty.Root class="flex-1">
			<Empty.Header>
				<Empty.Media variant="icon">
					<MessagesSquareIcon />
				</Empty.Media>
				<Empty.Title>{rooms.length === 0 ? 'No rooms yet' : "You're all caught up"}</Empty.Title>
				<Empty.Description>
					{rooms.length === 0
						? 'Create a room and invite a friend to start sharing links.'
						: 'Choose a room from the sidebar, or start a new one.'}
				</Empty.Description>
			</Empty.Header>
			<Empty.Content>
				<Button onclick={newRoom.open}>
					<PlusIcon data-icon="inline-start" />
					New room
				</Button>
			</Empty.Content>
		</Empty.Root>
	{/if}
</div>
