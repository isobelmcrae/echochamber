<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import LinkViewer from '#lib/components/LinkViewer.svelte';
	import { room as liveRoom } from '#lib/remote/rooms.remote.ts';
	import { roomName } from '#lib/room-name.ts';
	import { Button } from '#lib/components/ui/button/index.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const room = $derived(await liveRoom(page.params.roomId!));
</script>

<div class="space-y-6">
	<Button variant="ghost" size="sm" class="-ml-2" href="/rooms/{room.id}">
		← {roomName(room, data.me.id)}
	</Button>

	<div class="overflow-hidden rounded-xl border">
		<LinkViewer
			roomId={room.id}
			linkId={page.params.linkId!}
			meId={data.me.id}
			role={room.role}
			onDeleted={() => goto(`/rooms/${room.id}`)}
		/>
	</div>
</div>
