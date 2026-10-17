<script lang="ts">
	import { page } from '$app/state';
	import { INKS } from '#lib/ink.ts';
	import { setRoomInks } from '#lib/room-inks.ts';
	import { refreshOnChange } from '#lib/refresh-on-change.svelte.ts';
	import { home } from '#lib/remote/rooms.remote.ts';
	import { setView, VIEW_COOKIE, type View } from '#lib/view.ts';
	import * as Sidebar from '#lib/components/ui/sidebar/index.js';
	import AppSidebar from './AppSidebar.svelte';
	import NewRoomDialog from './NewRoomDialog.svelte';
	import { setNewRoom } from './new-room.ts';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();
	// Context must be set before the first `await`.
	let newRoomOpen = $state(false);
	setNewRoom({ open: () => (newRoomOpen = true) });
	setRoomInks({ of: (roomId) => inks.get(roomId) ?? INKS[0] });
	// Seeded from the cookie; toggling writes it back for the next server render.
	let view = $derived<View>(data.view);
	setView({
		get current() {
			return view;
		},
		set(next) {
			view = next;
			document.cookie = `${VIEW_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
		}
	});
	// Also keeps the home page's copy fresh: it's the same query.
	refreshOnChange(() => [home()]);

	const { rooms, invites } = $derived(await home());
	const inks = $derived(new Map(rooms.map((room) => [room.id, room.ink])));

	// The feeds open out: wide for a gallery's columns, a little wider than the reading
	// column for the list. Every other page keeps the reading column.
	const FEEDS = new Set(['/(app)', '/(app)/rooms/[roomId]']);
	const feed = $derived(FEEDS.has(page.route.id ?? ''));
	const width = $derived(!feed ? 'max-w-2xl' : view === 'gallery' ? 'max-w-6xl' : 'max-w-3xl');
</script>

<Sidebar.Provider>
	<AppSidebar {rooms} invites={invites.length} me={data.me} onNewRoom={() => (newRoomOpen = true)} />
	<Sidebar.Inset>
		<header class="flex h-14 items-center gap-1.5 border-b px-2 md:hidden">
			<Sidebar.Trigger class="size-11" />
			<a href="/" class="wordmark rounded-sm text-[1.625rem]">echochamber</a>
		</header>
		<div class={['mx-auto flex w-full flex-1 flex-col px-4 py-6', width]}>
			{@render children()}
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>

<NewRoomDialog bind:open={newRoomOpen} />
