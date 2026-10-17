<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { attempt } from '#lib/attempt.ts';
	import {
		deleteRoom,
		room as liveRoom,
		kickMember,
		leaveRoom,
		renameRoom,
		setRole
	} from '#lib/remote/rooms.remote.ts';
	import { roomName } from '#lib/room-name.ts';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import InviteCard from './InviteCard.svelte';
	import UserAvatar from '#lib/components/UserAvatar.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const room = $derived(await liveRoom(page.params.roomId!));
	const isAdmin = $derived(room.role === 'admin');

	async function leave() {
		if (!confirm('Leave this room?')) return;
		if (await attempt(() => leaveRoom(room.id))) await goto('/');
	}

	async function destroy() {
		if (!confirm('Delete this room and everything in it for everyone?')) return;
		if (await attempt(() => deleteRoom(room.id))) await goto('/');
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between gap-4">
		<h1 class="truncate text-2xl font-semibold">{roomName(room, data.me.id)}</h1>
		<Button variant="ghost" size="sm" href="/rooms/{room.id}">Back to room</Button>
	</div>

	{#if isAdmin}<InviteCard roomId={room.id} />{/if}

	{#if isAdmin}
		<Card.Root>
			<Card.Header><Card.Title>Room name</Card.Title></Card.Header>
			<Card.Content>
				<form
					{...renameRoom.enhance(async (form) => void (await form.submit().updates()))}
					class="flex gap-2"
				>
					<input {...renameRoom.fields.roomId.as('hidden', room.id)} />
					<Input
						{...renameRoom.fields.title.as('text', room.title ?? '')}
						placeholder="Untitled — shown as member names"
					/>
					<Button type="submit" variant="secondary">Save</Button>
				</form>
			</Card.Content>
		</Card.Root>
	{/if}

	<Card.Root>
		<Card.Header><Card.Title>Members</Card.Title></Card.Header>
		<Card.Content>
			<ul class="divide-y">
				{#each room.members as member (member.id)}
					<li class="flex items-center justify-between gap-3 py-2">
						<div class="flex min-w-0 items-center gap-3">
							<UserAvatar name={member.name} image={member.image} />
							<div class="min-w-0">
							<p class="truncate font-medium">
								{member.name}
								{#if member.id === data.me.id}<span class="text-muted-foreground">(you)</span>{/if}
							</p>
							<p class="text-muted-foreground truncate text-sm">@{member.username}</p>
							</div>
						</div>
						<div class="flex items-center gap-2">
							{#if member.role === 'admin'}<Badge variant="secondary">Admin</Badge>{/if}
							{#if isAdmin}
								<DropdownMenu.Root>
									<DropdownMenu.Trigger>
										{#snippet child({ props })}
											<Button {...props} variant="ghost" size="icon-sm" aria-label="Member actions">
												<EllipsisIcon />
											</Button>
										{/snippet}
									</DropdownMenu.Trigger>
									<DropdownMenu.Content align="end">
										{#if member.role === 'admin'}
											<DropdownMenu.Item
												onclick={() =>
													attempt(() =>
														setRole({ roomId: room.id, userId: member.id, role: 'member' })
													)}>Remove admin</DropdownMenu.Item
											>
										{:else}
											<DropdownMenu.Item
												onclick={() =>
													attempt(() => setRole({ roomId: room.id, userId: member.id, role: 'admin' }))}
												>Make admin</DropdownMenu.Item
											>
										{/if}
										{#if member.id !== data.me.id}
											<DropdownMenu.Item
												variant="destructive"
												onclick={() =>
													attempt(() => kickMember({ roomId: room.id, userId: member.id }))}
												>Remove from room</DropdownMenu.Item
											>
										{/if}
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		</Card.Content>
	</Card.Root>

	<div class="flex justify-end gap-2">
		<Button variant="outline" onclick={leave}>Leave room</Button>
		{#if isAdmin}<Button variant="destructive" onclick={destroy}>Delete room</Button>{/if}
	</div>
</div>
