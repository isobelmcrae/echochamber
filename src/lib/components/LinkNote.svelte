<script lang="ts">
	import { untrack } from 'svelte';
	import { attempt } from '#lib/attempt.ts';
	import { editLinkNote } from '#lib/remote/links.remote.ts';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Textarea } from '#lib/components/ui/textarea/index.js';

	let {
		linkId,
		note,
		editing = $bindable(false)
	}: { linkId: string; note: string | null; editing?: boolean } = $props();

	// Start each edit from the saved note; later live updates don't clobber the draft.
	let draft = $state('');
	$effect.pre(() => {
		if (editing) draft = untrack(() => note) ?? '';
	});

	async function save() {
		if (await attempt(() => editLinkNote({ linkId, note: draft }))) editing = false;
	}
</script>

{#if editing}
	<Textarea bind:value={draft} placeholder="Add a note" rows={2} />
	<div class="flex justify-end gap-2">
		<Button variant="ghost" size="sm" onclick={() => (editing = false)}>Cancel</Button>
		<Button size="sm" onclick={save}>Save</Button>
	</div>
{:else if note}
	<p
		class="border-l-2 border-(--ink-a) pl-3 text-[0.8125rem] leading-relaxed font-medium whitespace-pre-wrap"
	>{note}</p>
{/if}
