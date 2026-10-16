<script lang="ts">
	import { home } from '#lib/remote/rooms.remote.ts';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Empty from '#lib/components/ui/empty/index.js';
	import MessagesSquareIcon from '@lucide/svelte/icons/messages-square';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { getNewRoom } from './new-room.ts';
	import PendingInvites from './PendingInvites.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const newRoom = getNewRoom();
	const { rooms, invites } = $derived(await home());
</script>

<div class="flex flex-1 flex-col gap-6">
	<PendingInvites {invites} meId={data.me.id} />

	<Empty.Root class="flex-1">
		<Empty.Header>
			<Empty.Media variant="icon">
				<MessagesSquareIcon />
			</Empty.Media>
			<Empty.Title>{rooms.length === 0 ? 'No rooms yet' : 'Pick a room'}</Empty.Title>
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
</div>
