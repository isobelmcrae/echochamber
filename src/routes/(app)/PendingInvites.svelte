<script lang="ts">
	import { attempt } from '#lib/attempt.ts';
	import { acceptInvite, declineInvite } from '#lib/remote/invites.remote.ts';
	import type { home } from '#lib/remote/rooms.remote.ts';
	import { roomName } from '#lib/room-name.ts';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';

	let { invites, meId }: { invites: Awaited<ReturnType<typeof home>>['invites']; meId: string } =
		$props();
</script>

{#if invites.length > 0}
	<Card.Root>
		<Card.Header>
			<Card.Title>Invites</Card.Title>
		</Card.Header>
		<Card.Content>
			<ul class="divide-y">
				{#each invites as invite (invite.room_id)}
					<li class="flex items-center justify-between gap-3 py-2">
						<div class="min-w-0">
							<p class="truncate font-medium">{roomName(invite, meId)}</p>
							<p class="text-muted-foreground text-sm">
								{invite.inviter_name ?? 'Someone'} invited you
							</p>
						</div>
						<div class="flex shrink-0 gap-2">
							<Button size="sm" onclick={() => attempt(() => acceptInvite(invite.room_id))}
								>Join</Button
							>
							<Button
								size="sm"
								variant="ghost"
								onclick={() => attempt(() => declineInvite(invite.room_id))}>Decline</Button
							>
						</div>
					</li>
				{/each}
			</ul>
		</Card.Content>
	</Card.Root>
{/if}
