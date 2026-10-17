<script lang="ts">
	import { attempt } from '#lib/attempt.ts';
	import type { CommentNode } from '#lib/comment-tree.ts';
	import { addComment, deleteComment, editComment, type thread } from '#lib/remote/links.remote.ts';
	import type { Role } from '#lib/server/permissions.ts';
	import { timeAgo } from '#lib/time.ts';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Textarea } from '#lib/components/ui/textarea/index.js';
	import UserAvatar from './UserAvatar.svelte';
	import Comment from './Comment.svelte';

	type Flat = Awaited<ReturnType<typeof thread>>['comments'][number];

	let {
		node,
		linkId,
		meId,
		role,
		depth = 0
	}: { node: CommentNode<Flat>; linkId: string; meId: string; role: Role; depth?: number } =
		$props();

	const isAuthor = $derived(node.author?.id === meId);
	const replyForm = $derived(addComment.for(node.id));

	let replying = $state(false);
	let editing = $state(false);
	let draft = $state('');

	async function save() {
		if (await attempt(() => editComment({ commentId: node.id, body: draft }))) editing = false;
	}

	async function remove() {
		if (confirm('Delete this comment?')) await attempt(() => deleteComment(node.id));
	}
</script>

<div class="space-y-2">
	<div class="space-y-1">
		{#if node.deleted}
			<p class="text-muted-foreground text-sm italic">[deleted]</p>
		{:else}
			<div class="text-muted-foreground flex items-center gap-1.5 text-xs">
				<UserAvatar size="sm" name={node.author?.name ?? '?'} image={node.author?.image} />
				<span class="text-foreground font-medium">{node.author?.name ?? 'Deleted user'}</span>
				· {timeAgo(node.created_at)}{node.edited_at ? ' · edited' : ''}
			</div>
			{#if editing}
				<Textarea bind:value={draft} rows={2} />
				<div class="flex justify-end gap-2">
					<Button variant="ghost" size="sm" onclick={() => (editing = false)}>Cancel</Button>
					<Button size="sm" onclick={save}>Save</Button>
				</div>
			{:else}
				<p class="text-sm whitespace-pre-wrap">{node.body}</p>
				<div class="-ml-2 flex gap-1">
					<Button variant="ghost" size="xs" onclick={() => (replying = !replying)}>Reply</Button>
					{#if isAuthor}
						<Button
							variant="ghost"
							size="xs"
							onclick={() => {
								draft = node.body;
								editing = true;
							}}>Edit</Button
						>
					{/if}
					{#if isAuthor || role === 'admin'}
						<Button variant="ghost" size="xs" onclick={remove}>Delete</Button>
					{/if}
				</div>
			{/if}
		{/if}
	</div>

	{#if replying}
		<form
			{...replyForm.enhance(async (form) => {
				if (await form.submit().updates()) replying = false;
			})}
			class="space-y-2"
		>
			<input {...replyForm.fields.linkId.as('hidden', linkId)} />
			<input {...replyForm.fields.parentId.as('hidden', node.id)} />
			<Textarea {...replyForm.fields.body.as('text')} rows={2} placeholder="Write a reply" />
			<div class="flex justify-end gap-2">
				<Button variant="ghost" size="sm" onclick={() => (replying = false)}>Cancel</Button>
				<Button type="submit" size="sm" disabled={!!replyForm.pending}>Reply</Button>
			</div>
		</form>
	{/if}

	{#if node.replies.length > 0}
		<!-- Indent up to four levels; deeper replies line up with their parent. -->
		<div class={depth < 4 ? 'border-border ml-1 space-y-4 border-l pl-4' : 'space-y-4'}>
			{#each node.replies as reply (reply.id)}
				<Comment node={reply} {linkId} {meId} {role} depth={depth + 1} />
			{/each}
		</div>
	{/if}
</div>
