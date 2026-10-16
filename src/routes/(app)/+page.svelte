<script lang="ts">
	import { createRoom, home } from '#lib/remote/rooms.remote.ts';
	import { roomName } from '#lib/room-name.ts';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import * as Field from '#lib/components/ui/field/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import PendingInvites from './PendingInvites.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const { rooms, invites } = $derived(await home());
</script>

<section class="space-y-6">
	<PendingInvites {invites} meId={data.me.id} />

	<Card.Root>
		<Card.Header>
			<Card.Title>Start a room</Card.Title>
			<Card.Description>
				Add a friend's @username to start a 1:1 with them (they join as an admin), or name a group
				and invite people from its settings.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<form {...createRoom} class="space-y-2">
				<div class="flex flex-col gap-2 sm:flex-row">
					<Input {...createRoom.fields.with.as('text')} placeholder="@username (optional)" />
					<Input {...createRoom.fields.title.as('text')} placeholder="Room name (optional)" />
					<Button type="submit" disabled={!!createRoom.pending}>Create</Button>
				</div>
				{#each createRoom.fields.with.issues() ?? [] as issue (issue.message)}
					<Field.Error>{issue.message}</Field.Error>
				{/each}
			</form>
		</Card.Content>
	</Card.Root>

	{#if rooms.length === 0}
		<p class="text-muted-foreground py-8 text-center">
			No rooms yet. Create one and invite a friend.
		</p>
	{:else}
		<ul class="space-y-2">
			{#each rooms as room (room.id)}
				<li>
					<a href="/rooms/{room.id}">
						<Card.Root class="hover:bg-muted/50 transition-colors">
							<Card.Header>
								<Card.Title>{roomName(room, data.me.id)}</Card.Title>
								<Card.Description>
									{room.members.length}
									{room.members.length === 1 ? 'member' : 'members'}
								</Card.Description>
							</Card.Header>
						</Card.Root>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</section>
