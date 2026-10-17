<script lang="ts">
	import { getView, type View } from '#lib/view.ts';
	import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard';
	import Rows3Icon from '@lucide/svelte/icons/rows-3';

	const view = getView();
	const options: { value: View; label: string; Icon: typeof Rows3Icon }[] = [
		{ value: 'list', label: 'List view', Icon: Rows3Icon },
		{ value: 'gallery', label: 'Gallery view', Icon: LayoutDashboardIcon }
	];
</script>

<div role="group" aria-label="Layout" class="flex shrink-0 gap-0.5 rounded-md border p-0.5">
	{#each options as { value, label, Icon } (value)}
		<button
			type="button"
			aria-label={label}
			title={label}
			aria-pressed={view.current === value}
			onclick={() => view.set(value)}
			class="text-muted-foreground hover:bg-muted hover:text-foreground aria-pressed:bg-ink-a aria-pressed:text-ink focus-visible:ring-ring/50 grid size-9 place-items-center md:size-6.5 rounded-sm transition-colors outline-none focus-visible:ring-3"
		>
			<Icon class="size-4" />
		</button>
	{/each}
</div>
