<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { authClient } from '#lib/auth-client.ts';
	import { inkVars } from '#lib/ink.ts';
	import { getRoomInks } from '#lib/room-inks.ts';
	import type { home } from '#lib/remote/rooms.remote.ts';
	import { roomName, roomPerson } from '#lib/room-name.ts';
	import UserAvatar from '#lib/components/UserAvatar.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import * as Sidebar from '#lib/components/ui/sidebar/index.js';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import MailIcon from '@lucide/svelte/icons/mail';
	import PlusIcon from '@lucide/svelte/icons/plus';

	type Room = Awaited<ReturnType<typeof home>>['rooms'][number];

	let {
		rooms,
		invites,
		me,
		onNewRoom
	}: {
		rooms: Room[];
		invites: number;
		me: { id: string; name: string; username: string; image: string | null };
		onNewRoom: () => void;
	} = $props();

	const sidebar = Sidebar.useSidebar();
	const inks = getRoomInks();

	async function signOut() {
		await authClient.signOut();
		await invalidateAll();
		await goto('/login');
	}
</script>

<Sidebar.Root>
	<Sidebar.Header class="gap-3 p-4">
		<a href="/" class="wordmark w-fit rounded-sm text-[1.75rem]">echochamber</a>
		<Button onclick={onNewRoom}>
			<PlusIcon data-icon="inline-start" />
			New room
		</Button>
	</Sidebar.Header>

	<Sidebar.Content>
		{#if invites > 0}
			<Sidebar.Group>
				<Sidebar.Menu>
					<Sidebar.MenuItem>
						<Sidebar.MenuButton isActive={page.url.pathname === '/'}>
							{#snippet child({ props })}
								<a href="/" {...props} onclick={() => sidebar.setOpenMobile(false)}>
									<MailIcon />
									<span>Invites</span>
								</a>
							{/snippet}
						</Sidebar.MenuButton>
						<Sidebar.MenuBadge>{invites}</Sidebar.MenuBadge>
					</Sidebar.MenuItem>
				</Sidebar.Menu>
			</Sidebar.Group>
		{/if}

		<Sidebar.Group>
			<Sidebar.GroupLabel>Rooms</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					{#each rooms as room (room.id)}
						{@const name = roomName(room, me.id)}
						{@const person = roomPerson(room, me.id)}
						{@const active = page.params.roomId === room.id}
						<Sidebar.MenuItem {...inkVars(inks.of(room.id))}>
							<Sidebar.MenuButton
								size="lg"
								isActive={active}
								class="hover:bg-ink-a/25 active:bg-ink-a/40 data-active:bg-ink-a data-active:text-ink data-active:font-bold data-active:hover:bg-[color-mix(in_oklab,var(--ink-a)_88%,var(--ink))]"
							>
								{#snippet child({ props })}
									<a
										href="/rooms/{room.id}"
										{...props}
										onclick={() => sidebar.setOpenMobile(false)}
									>
										<UserAvatar {name} image={person?.image} />
										<span class="flex-1 truncate">{name}</span>
										{#if !active && room.unread > 0}
											<span
												class="bg-ink-a text-ink rounded-sm px-1.5 py-0.5 text-xs font-bold tabular-nums"
												aria-label="{room.unread} unread"
											>
												{room.unread > 9 ? '9+' : room.unread}
											</span>
										{/if}
									</a>
								{/snippet}
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					{:else}
						<p class="px-2 text-sm opacity-70">No rooms yet.</p>
					{/each}
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>

	<Sidebar.Footer>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Sidebar.MenuButton size="lg" {...props}>
								<UserAvatar name={me.name} image={me.image} />
								<div class="grid flex-1 text-left leading-tight">
									<span class="truncate font-medium">{me.name}</span>
									<span class="truncate text-xs opacity-70">@{me.username}</span>
								</div>
								<ChevronsUpDownIcon class="ml-auto" />
							</Sidebar.MenuButton>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content side="top" align="start" class="w-(--bits-dropdown-menu-anchor-width)">
						<DropdownMenu.Group>
							<DropdownMenu.Item onclick={signOut}>
								<LogOutIcon />
								Sign out
							</DropdownMenu.Item>
						</DropdownMenu.Group>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Footer>
</Sidebar.Root>
