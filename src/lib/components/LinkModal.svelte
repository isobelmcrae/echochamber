<script lang="ts">
	import { isHttpError } from '@sveltejs/kit';
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import LinkViewer from '#lib/components/LinkViewer.svelte';
	import { isTextEntry } from '#lib/text-entry.ts';
	import type { Role } from '#lib/server/permissions.ts';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import XIcon from '@lucide/svelte/icons/x';

	let {
		linkId,
		meId,
		role,
		onPrev,
		onNext,
		onClose,
		onDeleted
	}: {
		linkId: string;
		meId: string;
		role: Role;
		/** Absent at either end of the feed. */
		onPrev?: () => void;
		onNext?: () => void;
		onClose: () => void;
		onDeleted: () => void;
	} = $props();

	// Arrow keys flip through the feed, unless they're moving a caret.
	function onkeydown(e: KeyboardEvent) {
		if (isTextEntry(e.target)) return;
		if (e.key === 'ArrowLeft') onPrev?.();
		if (e.key === 'ArrowRight') onNext?.();
	}

	const arrow =
		'absolute top-[30vh] z-10 rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white md:top-1/2 md:-translate-y-1/2';
</script>

<svelte:window {onkeydown} />

<Dialog.Root open onOpenChange={(open) => !open && onClose()}>
	<Dialog.Portal>
		<Dialog.Overlay class="bg-black/80" />
		<DialogPrimitive.Content
			onOpenAutoFocus={(e) => e.preventDefault()}
			class="fixed inset-0 z-50 outline-none md:inset-x-20 md:inset-y-[5vh] md:mx-auto md:max-w-6xl"
		>
			<DialogPrimitive.Title class="sr-only">Shared link</DialogPrimitive.Title>
			<div class="bg-background size-full overflow-hidden md:rounded-xl">
				<svelte:boundary>
					<LinkViewer {linkId} {meId} {role} {onDeleted} />
					{#snippet pending()}
						<div class="flex size-full items-center justify-center">
							<LoaderCircleIcon class="text-muted-foreground size-6 animate-spin" />
						</div>
					{/snippet}
					{#snippet failed(error, reset)}
						<div class="flex size-full flex-col items-center justify-center gap-3 p-6 text-center">
							<p class="text-muted-foreground text-sm">
								{isHttpError(error, 404) ? 'This link was deleted.' : "Couldn't load this link."}
							</p>
							<Button variant="outline" size="sm" onclick={reset}>Try again</Button>
						</div>
					{/snippet}
				</svelte:boundary>
			</div>

			{#if onPrev}
				<Button variant="ghost" size="icon" class="{arrow} left-2 md:-left-14" onclick={onPrev} aria-label="Previous link">
					<ChevronLeftIcon />
				</Button>
			{/if}
			{#if onNext}
				<Button variant="ghost" size="icon" class="{arrow} right-2 md:-right-14" onclick={onNext} aria-label="Next link">
					<ChevronRightIcon />
				</Button>
			{/if}
			<DialogPrimitive.Close>
				{#snippet child({ props })}
					<Button
						{...props}
						variant="ghost"
						size="icon"
						class="absolute top-2 left-2 z-10 rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white md:top-0 md:-right-14 md:left-auto"
						aria-label="Close"
					>
						<XIcon />
					</Button>
				{/snippet}
			</DialogPrimitive.Close>
		</DialogPrimitive.Content>
	</Dialog.Portal>
</Dialog.Root>
