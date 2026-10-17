<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import LinkViewer from '#lib/components/LinkViewer.svelte';
	import { refreshOnChange } from '#lib/refresh-on-change.svelte.ts';
	import { room as getRoom } from '#lib/remote/rooms.remote.ts';
	import { roomName } from '#lib/room-name.ts';
	import { Button } from '#lib/components/ui/button/index.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	refreshOnChange(() => [getRoom(page.params.roomId!)]);
	const room = $derived(await getRoom(page.params.roomId!));
</script>

<div class="space-y-6">
	<Button variant="ghost" size="sm" class="-ml-2" href="/rooms/{room.id}">
		← {roomName(room, data.me.id)}
	</Button>

	<div class="overflow-hidden rounded-xl border">
		<LinkViewer
			linkId={page.params.linkId!}
			meId={data.me.id}
			role={room.role}
			onDeleted={() => goto(`/rooms/${room.id}`)}
		/>
	</div>
</div>
