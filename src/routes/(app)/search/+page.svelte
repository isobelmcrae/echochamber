<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import LinkCard from '#lib/components/LinkCard.svelte';
	import { inkVars } from '#lib/ink.ts';
	import { getRoomInks } from '#lib/room-inks.ts';
	import { refreshOnChange } from '#lib/refresh-on-change.svelte.ts';
	import { search } from '#lib/remote/links.remote.ts';
	import { home } from '#lib/remote/rooms.remote.ts';
	import { roomName } from '#lib/room-name.ts';
	import * as Empty from '#lib/components/ui/empty/index.js';
	import * as InputGroup from '#lib/components/ui/input-group/index.js';
	import SearchIcon from '@lucide/svelte/icons/search';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const inks = getRoomInks();
	const q = $derived(page.url.searchParams.get('q') ?? '');
	refreshOnChange(() => [search(q)]);
	const [{ rooms }, results] = $derived(await Promise.all([home(), search(q)]));
	const roomNames = $derived(new Map(rooms.map((r) => [r.id, roomName(r, data.me.id)])));

	// The query lives in the URL, so results survive reloads and Back.
	let timer: ReturnType<typeof setTimeout> | undefined;
	function onInput(e: Event & { currentTarget: HTMLInputElement }) {
		const value = e.currentTarget.value;
		clearTimeout(timer);
		timer = setTimeout(() => {
			const url = value.trim() ? `?q=${encodeURIComponent(value)}` : '?';
			void goto(url, { replace: true });
		}, 200);
	}

	/** Split a snippet marked with \u0002…\u0003 into plain and matched runs. */
	function runs(snippet: string) {
		return snippet.split('\u0002').flatMap((chunk, i) => {
			if (i === 0) return [{ text: chunk, hit: false }];
			const [hit = '', rest = ''] = chunk.split('\u0003');
			return [
				{ text: hit, hit: true },
				{ text: rest, hit: false }
			];
		});
	}
</script>

<svelte:head>
	<title>{q ? `${q} · ` : ''}Search · echochamber</title>
</svelte:head>

<div class="flex flex-1 flex-col gap-6">
	<InputGroup.Root class="h-12">
		<InputGroup.Addon>
			<SearchIcon />
		</InputGroup.Addon>
		<!-- svelte-ignore a11y_autofocus -->
		<InputGroup.Input
			type="search"
			value={q}
			oninput={onInput}
			placeholder="Search links, notes, comments, people…"
			aria-label="Search"
			autocomplete="off"
			autofocus
			class="text-base md:text-base"
		/>
	</InputGroup.Root>

	{#if results.length > 0}
		<ul class="flex flex-col">
			{#each results as link (link.id)}
				<li class="border-b last:border-b-0" {...inkVars(inks.of(link.room_id))}>
					<p class="text-ink-text pt-4 text-xs font-bold tracking-wide uppercase">
						{roomNames.get(link.room_id) ?? 'Room'}
					</p>
					<LinkCard {link} meId={data.me.id} role={link.role} />
					{#if link.comment_match}
						<p class="text-muted-foreground -mt-2 pb-4 text-[0.8125rem]">
							In the comments: “{#each runs(link.comment_match) as run, i (i)}{#if run.hit}<mark
										class="bg-ink-a/40 text-foreground rounded-xs">{run.text}</mark
									>{:else}{run.text}{/if}{/each}”
						</p>
					{/if}
				</li>
			{/each}
		</ul>
	{:else}
		<Empty.Root class="flex-1">
			<Empty.Header>
				<Empty.Media variant="icon">
					<SearchIcon />
				</Empty.Media>
				<Empty.Title>{q.trim() ? 'No matches' : 'Search your rooms'}</Empty.Title>
				<Empty.Description>
					{q.trim()
						? 'Try other words. Words under 3 letters are skipped.'
						: 'Find links by their title, note, URL, comments, or who shared them.'}
				</Empty.Description>
			</Empty.Header>
		</Empty.Root>
	{/if}
</div>
