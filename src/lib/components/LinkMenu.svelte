<script lang="ts">
	import { attempt } from '#lib/attempt.ts';
	import { deleteLink, type feed } from '#lib/remote/links.remote.ts';
	import type { Role } from '#lib/server/permissions.ts';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';

	type Link = Awaited<ReturnType<typeof feed>>['links'][number];

	let {
		link,
		meId,
		role,
		onEdit,
		onDeleted
	}: { link: Link; meId: string; role: Role; onEdit: () => void; onDeleted?: () => void } =
		$props();

	const isAuthor = $derived(link.author?.id === meId);
	const canDelete = $derived(isAuthor || role === 'admin');

	async function remove() {
		if (!confirm('Delete this link and its comments?')) return;
		if (await attempt(() => deleteLink(link.id))) onDeleted?.();
	}
</script>

{#if isAuthor || canDelete}
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Button {...props} variant="ghost" size="icon-sm" aria-label="Link actions">
					<EllipsisIcon />
				</Button>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end">
			{#if isAuthor}
				<DropdownMenu.Item onclick={onEdit}>Edit note</DropdownMenu.Item>
			{/if}
			{#if canDelete}
				<DropdownMenu.Item variant="destructive" onclick={remove}>Delete</DropdownMenu.Item>
			{/if}
		</DropdownMenu.Content>
	</DropdownMenu.Root>
{/if}
