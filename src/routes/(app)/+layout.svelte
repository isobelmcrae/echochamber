<script lang="ts">
	import { assignInks } from '#lib/ink.ts';
	import { setRoomInks } from '#lib/room-inks.ts';
	import { refreshOnChange } from '#lib/refresh-on-change.svelte.ts';
	import { home } from '#lib/remote/rooms.remote.ts';
	import * as Sidebar from '#lib/components/ui/sidebar/index.js';
	import AppSidebar from './AppSidebar.svelte';
	import NewRoomDialog from './NewRoomDialog.svelte';
	import { setNewRoom } from './new-room.ts';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();
	// Context must be set before the first `await`.
	let newRoomOpen = $state(false);
	setNewRoom({ open: () => (newRoomOpen = true) });
	setRoomInks({ of: (roomId) => inks.get(roomId) ?? 0 });
	// Also keeps the home page's copy fresh: it's the same query.
	refreshOnChange(() => [home()]);

	const { rooms, invites } = $derived(await home());
	const inks = $derived(assignInks(rooms));
</script>

<Sidebar.Provider>
	<AppSidebar {rooms} invites={invites.length} me={data.me} onNewRoom={() => (newRoomOpen = true)} />
	<Sidebar.Inset>
		<header class="flex h-14 items-center gap-1.5 border-b px-2 md:hidden">
			<Sidebar.Trigger class="size-11" />
			<a href="/" class="wordmark rounded-sm text-[1.625rem]">echochamber</a>
		</header>
		<div class="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6">
			{@render children()}
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>

<NewRoomDialog bind:open={newRoomOpen} />
