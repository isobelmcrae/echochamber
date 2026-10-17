<script lang="ts">
	import type { feed } from '#lib/remote/links.remote.ts';
	import type { Role } from '#lib/server/permissions.ts';
	import { timeAgo } from '#lib/time.ts';
	import { Button } from '#lib/components/ui/button/index.js';
	import LinkMenu from './LinkMenu.svelte';
	import UserAvatar from './UserAvatar.svelte';
	import MessageCircleIcon from '@lucide/svelte/icons/message-circle';

	type Link = Awaited<ReturnType<typeof feed>>['links'][number];

	let {
		link,
		meId,
		role,
		href,
		onopen,
		onEdit,
		onDeleted
	}: {
		link: Link;
		meId: string;
		role: Role;
		href: string;
		onopen: (e: MouseEvent) => void;
		onEdit: () => void;
		onDeleted?: () => void;
	} = $props();
</script>

<!-- Who shared a link and when, its comment count, and its menu. -->
<div class="text-muted-foreground flex items-center justify-between gap-2 text-[0.8125rem]">
	<div class="flex min-w-0 items-center gap-1.5">
		<UserAvatar size="sm" name={link.author?.name ?? '?'} image={link.author?.image} />
		<span class="truncate"
			><span class="text-foreground font-semibold">{link.author?.name ?? 'Deleted user'}</span>
			· {timeAgo(link.created_at)}{link.edited_at ? ' · edited' : ''}</span
		>
	</div>
	<div class="flex shrink-0 items-center gap-1">
		<Button
			variant="ghost"
			size="sm"
			{href}
			onclick={onopen}
			aria-label="{link.comment_count} {link.comment_count === 1 ? 'comment' : 'comments'}"
			class={(link.comment_count ?? 0) > 0 ? 'text-ink-text border-current' : ''}
		>
			<MessageCircleIcon />
			{link.comment_count}
		</Button>
		<LinkMenu {link} {meId} {role} {onEdit} {onDeleted} />
	</div>
</div>
