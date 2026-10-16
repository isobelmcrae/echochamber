<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { attempt } from '#lib/attempt.ts';
	import { invitePreview, joinWithLink } from '#lib/remote/invites.remote.ts';
	import { roomName } from '#lib/room-name.ts';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';

	const token = $derived(page.params.token!);
	const signedIn = $derived(!!page.data.user);
	const here = $derived(encodeURIComponent(page.url.pathname));

	async function join() {
		let roomId = '';
		if (await attempt(async () => (roomId = await joinWithLink(token)))) {
			await goto(`/rooms/${roomId}`);
		}
	}
</script>

<svelte:boundary>
	{@const room = await invitePreview(token)}
	<Card.Root class="mx-auto mt-16 w-full max-w-sm text-center">
		<Card.Header>
			<Card.Description>You're invited to join</Card.Description>
			<Card.Title class="text-xl">{roomName(room, '')}</Card.Title>
			<Card.Description>
				{room.members.length}
				{room.members.length === 1 ? 'member' : 'members'} on Echo Chamber
			</Card.Description>
		</Card.Header>
		<Card.Footer class="flex-col gap-2">
			{#if signedIn}
				<Button class="w-full" onclick={join}>Join room</Button>
			{:else}
				<Button class="w-full" href="/signup?next={here}">Create an account to join</Button>
				<Button class="w-full" variant="ghost" href="/login?next={here}">I have an account</Button>
			{/if}
		</Card.Footer>
	</Card.Root>

	{#snippet failed(error)}
		<Card.Root class="mx-auto mt-16 w-full max-w-sm text-center">
			<Card.Header>
				<Card.Title>Invite unavailable</Card.Title>
				<Card.Description>
					{(error as { message?: string }).message ?? 'This invite link no longer works.'}
					Ask for a new one.
				</Card.Description>
			</Card.Header>
		</Card.Root>
	{/snippet}
</svelte:boundary>
