<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { buildCommentTree } from '#lib/comment-tree.ts';
	import Comment from '#lib/components/Comment.svelte';
	import LinkCard from '#lib/components/LinkCard.svelte';
	import { addComment, thread } from '#lib/remote/links.remote.ts';
	import { room as liveRoom } from '#lib/remote/rooms.remote.ts';
	import { roomName } from '#lib/room-name.ts';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Textarea } from '#lib/components/ui/textarea/index.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const room = $derived(await liveRoom(page.params.roomId!));
	const current = $derived(await thread(page.params.linkId!));
	const tree = $derived(buildCommentTree(current.comments));
	const newComment = addComment.for('root');
</script>

<div class="space-y-6">
	<Button variant="ghost" size="sm" class="-ml-2" href="/rooms/{room.id}">
		← {roomName(room, data.me.id)}
	</Button>

	<LinkCard
		link={current.link}
		meId={data.me.id}
		role={room.role}
		onDeleted={() => goto(`/rooms/${room.id}`)}
	/>

	<form
		{...newComment.enhance(async (form) => {
			if (await form.submit().updates()) form.element.reset();
		})}
		class="space-y-2"
	>
		<input {...newComment.fields.linkId.as('hidden', current.link.id)} />
		<Textarea {...newComment.fields.body.as('text')} rows={2} placeholder="Add a comment" />
		<div class="flex justify-end">
			<Button type="submit" size="sm" disabled={!!newComment.pending}>Comment</Button>
		</div>
	</form>

	{#if tree.length === 0}
		<p class="text-muted-foreground py-4 text-center text-sm">No comments yet.</p>
	{:else}
		<div class="space-y-6">
			{#each tree as node (node.id)}
				<Comment {node} linkId={current.link.id} meId={data.me.id} role={room.role} />
			{/each}
		</div>
	{/if}
</div>
