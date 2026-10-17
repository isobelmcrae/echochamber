<script lang="ts">
	import { buildCommentTree } from '#lib/comment-tree.ts';
	import { embedFor } from '#lib/embed.ts';
	import { refreshOnChange } from '#lib/refresh-on-change.svelte.ts';
	import { addComment, thread } from '#lib/remote/links.remote.ts';
	import type { Role } from '#lib/server/permissions.ts';
	import { timeAgo } from '#lib/time.ts';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Textarea } from '#lib/components/ui/textarea/index.js';
	import * as Tooltip from '#lib/components/ui/tooltip/index.js';
	import Comment from './Comment.svelte';
	import LinkEmbed from './LinkEmbed.svelte';
	import LinkMenu from './LinkMenu.svelte';
	import LinkNote from './LinkNote.svelte';
	import UserAvatar from './UserAvatar.svelte';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';

	let {
		linkId,
		meId,
		role,
		onDeleted
	}: { linkId: string; meId: string; role: Role; onDeleted?: () => void } =
		$props();

	refreshOnChange(() => [thread(linkId)]);
	const current = $derived(await thread(linkId));
	const link = $derived(current.link);
	const tree = $derived(buildCommentTree(current.comments));
	const embed = $derived(embedFor(link.url, { frameable: link.preview?.frameable !== 0 }));
	const preview = $derived(link.preview?.status === 'ok' ? link.preview : null);
	const host = $derived(new URL(link.url).hostname.replace(/^www\./, ''));
	const title = $derived(preview?.title ?? link.url);
	const newComment = addComment.for('root');

	let editing = $state(false);
</script>

<!-- Side by side when there's room (the modal), stacked otherwise (narrow screens, the link's page). -->
<div class="@container size-full">
	<div class="flex h-full flex-col overflow-y-auto @3xl:flex-row @3xl:overflow-hidden">
		<div
			class="flex h-[60vh] shrink-0 items-center justify-center bg-black @3xl:h-auto @3xl:min-w-0 @3xl:flex-1"
		>
			<LinkEmbed {embed} url={link.url} {title} image={preview?.image_url ?? null} />
		</div>

		<aside class="bg-background flex flex-col @3xl:min-h-0 @3xl:w-88 @3xl:shrink-0 @3xl:border-l">
			<header class="flex items-center gap-2 border-b p-3">
				<UserAvatar name={link.author?.name ?? '?'} image={link.author?.image} />
				<div class="min-w-0 flex-1 text-xs">
					<p class="truncate font-medium">{link.author?.name ?? 'Deleted user'}</p>
					<p class="text-muted-foreground truncate">
						{timeAgo(link.created_at)}{link.edited_at ? ' · edited' : ''}
					</p>
				</div>
				<Tooltip.Root>
					<Tooltip.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								variant="ghost"
								size="icon-sm"
								href={link.url}
								target="_blank"
								rel="noopener noreferrer"
								aria-label="Open in new tab"
							>
								<ExternalLinkIcon />
							</Button>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content>Open in new tab</Tooltip.Content>
				</Tooltip.Root>
				<LinkMenu {link} {meId} {role} onEdit={() => (editing = true)} {onDeleted} />
			</header>

			<div class="space-y-6 p-4 @3xl:flex-1 @3xl:overflow-y-auto">
				<div class="space-y-2">
					<div class="space-y-0.5">
						<p class="text-muted-foreground truncate text-xs">{preview?.site_name ?? host}</p>
						<p class="font-medium break-words">{title}</p>
					</div>
					<LinkNote linkId={link.id} note={link.note} bind:editing />
				</div>

				{#if tree.length === 0}
					<p class="text-muted-foreground py-4 text-center text-sm">No comments yet.</p>
				{:else}
					<div class="space-y-6">
						{#each tree as node (node.id)}
							<Comment {node} linkId={link.id} {meId} {role} />
						{/each}
					</div>
				{/if}
			</div>

			<form
				{...newComment.enhance(async (form) => {
					if (await form.submit().updates()) form.element.reset();
				})}
				class="space-y-2 border-t p-3"
			>
				<input {...newComment.fields.linkId.as('hidden', link.id)} />
				<Textarea {...newComment.fields.body.as('text')} rows={2} placeholder="Add a comment" />
				<div class="flex justify-end">
					<Button type="submit" size="sm" disabled={!!newComment.pending}>Comment</Button>
				</div>
			</form>
		</aside>
	</div>
</div>
