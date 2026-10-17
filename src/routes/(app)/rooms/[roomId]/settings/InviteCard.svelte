<script lang="ts">
	import { page } from '$app/state';
	import { attempt } from '#lib/attempt.ts';
	import { refreshOnChange } from '#lib/refresh-on-change.svelte.ts';
	import {
		cancelInvite,
		createInviteLink,
		inviteUser,
		revokeInviteLink,
		roomInvites
	} from '#lib/remote/invites.remote.ts';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import * as Field from '#lib/components/ui/field/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { toast } from 'svelte-sonner';

	let { roomId }: { roomId: string } = $props();
	refreshOnChange(() => [roomInvites(roomId)]);
	const invites = $derived(await roomInvites(roomId));

	const selectClass =
		'border-input dark:bg-input/30 h-9 rounded-md border bg-transparent px-2.5 text-sm shadow-xs';

	function linkUrl(token: string) {
		return new URL(`/join/${token}`, page.url.origin).href;
	}

	async function copy(token: string) {
		await navigator.clipboard.writeText(linkUrl(token));
		toast.success('Invite link copied');
	}

	function describe(link: (typeof invites.links)[number]) {
		const parts = [];
		if (link.max_uses) parts.push(`${link.use_count}/${link.max_uses} uses`);
		else parts.push(`${link.use_count} ${link.use_count === 1 ? 'use' : 'uses'}`);
		parts.push(
			link.expires_at ? `expires ${new Date(link.expires_at).toLocaleString()}` : 'never expires'
		);
		return parts.join(' · ');
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Invite people</Card.Title>
		<Card.Description>Invite someone by username, or share a link.</Card.Description>
	</Card.Header>
	<Card.Content class="space-y-6">
		<form
			{...inviteUser.enhance(async (form) => {
				if (await form.submit().updates()) form.element.reset();
			})}
		>
			<input {...inviteUser.fields.roomId.as('hidden', roomId)} />
			<Field.Field>
				<div class="flex gap-2">
					<Input {...inviteUser.fields.username.as('text')} placeholder="@username" />
					<Button type="submit" variant="secondary" disabled={!!inviteUser.pending}>Invite</Button>
				</div>
				{#each inviteUser.fields.username.issues() ?? [] as issue (issue.message)}
					<Field.Error>{issue.message}</Field.Error>
				{/each}
			</Field.Field>
		</form>

		{#if invites.pending.length > 0}
			<div class="space-y-2">
				<h3 class="text-sm font-medium">Waiting to accept</h3>
				<ul class="divide-y">
					{#each invites.pending as invitee (invitee.id)}
						<li class="flex items-center justify-between py-2 text-sm">
							<span>{invitee.name} <span class="text-muted-foreground">@{invitee.username}</span></span>
							<Button
								variant="ghost"
								size="sm"
								onclick={() => attempt(() => cancelInvite({ roomId, userId: invitee.id }))}
								>Cancel</Button
							>
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		<div class="space-y-2">
			<h3 class="text-sm font-medium">Invite links</h3>
			<form
				{...createInviteLink.enhance(async (form) => void (await form.submit().updates()))}
				class="flex flex-wrap gap-2"
			>
				<input {...createInviteLink.fields.roomId.as('hidden', roomId)} />
				<select name={createInviteLink.fields.expiresInHours.as('text').name} class={selectClass}>
					<option value="">Never expires</option>
					<option value="24">Expires in 1 day</option>
					<option value="168">Expires in 7 days</option>
				</select>
				<select name={createInviteLink.fields.maxUses.as('text').name} class={selectClass}>
					<option value="">Unlimited uses</option>
					<option value="1">1 use</option>
					<option value="5">5 uses</option>
					<option value="25">25 uses</option>
				</select>
				<Button type="submit" variant="secondary">Create link</Button>
			</form>
			<ul class="divide-y">
				{#each invites.links as link (link.id)}
					<li class="flex items-center justify-between gap-2 py-2 text-sm">
						<div class="min-w-0">
							<p class="truncate font-mono text-xs">{linkUrl(link.token)}</p>
							<p class="text-muted-foreground text-xs">{describe(link)}</p>
						</div>
						<div class="flex shrink-0 gap-1">
							<Button variant="outline" size="sm" onclick={() => copy(link.token)}>Copy</Button>
							<Button
								variant="ghost"
								size="sm"
								onclick={() => attempt(() => revokeInviteLink({ roomId, linkId: link.id }))}
								>Revoke</Button
							>
						</div>
					</li>
				{/each}
			</ul>
		</div>
	</Card.Content>
</Card.Root>
