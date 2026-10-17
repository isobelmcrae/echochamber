<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	const link = 'inline-flex items-center gap-1.5 font-medium underline-offset-4 hover:underline';
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-xs">
		<Dialog.Header>
			<!-- The title's own font-medium would override .wordmark's weight. -->
			<Dialog.Title class="wordmark w-fit text-[2rem] font-extrabold">echochamber</Dialog.Title>
			<Dialog.Description>Watch later, but for real.</Dialog.Description>
		</Dialog.Header>
		<ul class="space-y-2">
			<li>
				<a
					href="https://github.com/neelkarma/echochamber"
					target="_blank"
					rel="noopener noreferrer"
					class={link}
				>
					Source on GitHub
					<ExternalLinkIcon class="size-3.5 opacity-70" />
				</a>
			</li>
			<li>
				Made by
				<a href="https://www.iamkneel.dev" target="_blank" rel="noopener noreferrer" class={link}>
					Neel Sharma
					<ExternalLinkIcon class="size-3.5 opacity-70" />
				</a>
			</li>
		</ul>
	</Dialog.Content>
</Dialog.Root>
