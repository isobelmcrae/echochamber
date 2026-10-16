<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { authClient } from '#lib/auth-client.ts';
	import { Button } from '#lib/components/ui/button/index.js';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();

	async function signOut() {
		await authClient.signOut();
		await invalidateAll();
		await goto('/login');
	}
</script>

<header class="flex items-center justify-between py-4">
	<a href="/" class="text-lg font-semibold tracking-tight">Echo Chamber</a>
	<div class="flex items-center gap-3 text-sm">
		<span class="text-muted-foreground">@{data.me.username}</span>
		<Button variant="ghost" size="sm" onclick={signOut}>Sign out</Button>
	</div>
</header>
<main class="flex-1 pb-12">
	{@render children()}
</main>
