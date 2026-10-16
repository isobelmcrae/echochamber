<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { createRoom } from '#lib/remote/rooms.remote.ts';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import * as Field from '#lib/components/ui/field/index.js';
	import { Input } from '#lib/components/ui/input/index.js';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	// Creating a room redirects to it; close once we've arrived.
	afterNavigate(() => (open = false));
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<form {...createRoom} class="flex flex-col gap-6">
			<Dialog.Header>
				<Dialog.Title>New room</Dialog.Title>
				<Dialog.Description>
					Add a friend's @username to start a 1:1 with them (they join as an admin), or name a
					group and invite people from its settings.
				</Dialog.Description>
			</Dialog.Header>
			<Field.Group>
				<Field.Field data-invalid={createRoom.fields.with.issues() ? true : undefined}>
					<Field.Label for="new-room-with">With</Field.Label>
					<Input
						id="new-room-with"
						{...createRoom.fields.with.as('text')}
						placeholder="@username (optional)"
						autocomplete="off"
					/>
					{#each createRoom.fields.with.issues() ?? [] as issue (issue.message)}
						<Field.Error>{issue.message}</Field.Error>
					{/each}
				</Field.Field>
				<Field.Field>
					<Field.Label for="new-room-title">Name</Field.Label>
					<Input
						id="new-room-title"
						{...createRoom.fields.title.as('text')}
						placeholder="Room name (optional)"
					/>
				</Field.Field>
			</Field.Group>
			<Dialog.Footer>
				<Button type="submit" disabled={!!createRoom.pending}>Create</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
