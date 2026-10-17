<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { authClient } from '#lib/auth-client.ts';
	import { safeNext } from '#lib/safe-next.ts';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import * as Field from '#lib/components/ui/field/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import OAuthButtons from '../OAuthButtons.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const next = $derived(safeNext(page.url.searchParams.get('next')));
	let name = $state('');
	let username = $state('');
	let email = $state('');
	let password = $state('');
	let error = $state<string | null>(null);
	let pending = $state(false);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		pending = true;
		const result = await authClient.signUp.email({
			name,
			username,
			displayUsername: username,
			email,
			password
		});
		pending = false;
		if (result.error) {
			error = result.error.message ?? 'Could not create your account';
			return;
		}
		await invalidateAll();
		await goto(next);
	}
</script>

<Card.Root class="mx-auto mt-8 w-full max-w-sm">
	<Card.Header>
		<Card.Title class="room-band w-fit text-2xl">Create an account</Card.Title>
		<Card.Description>Friends find and invite you by your username.</Card.Description>
	</Card.Header>
	<Card.Content>
		<form onsubmit={submit}>
			<Field.Group>
				<OAuthButtons providers={data.oauthProviders} {next} />
				<Field.Field>
					<Field.Label for="name">Name</Field.Label>
					<Input id="name" bind:value={name} autocomplete="name" required />
				</Field.Field>
				<Field.Field>
					<Field.Label for="username">Username</Field.Label>
					<Input
						id="username"
						bind:value={username}
						autocomplete="username"
						pattern="[A-Za-z0-9_.]{'{'}3,30{'}'}"
						required
					/>
					<Field.Description>3–30 letters, numbers, underscores or dots.</Field.Description>
				</Field.Field>
				<Field.Field>
					<Field.Label for="email">Email</Field.Label>
					<Input id="email" type="email" bind:value={email} autocomplete="email" required />
				</Field.Field>
				<Field.Field>
					<Field.Label for="password">Password</Field.Label>
					<Input
						id="password"
						type="password"
						bind:value={password}
						autocomplete="new-password"
						minlength={8}
						required
					/>
				</Field.Field>
				{#if error}<Field.Error>{error}</Field.Error>{/if}
				<Button type="submit" disabled={pending}>Create account</Button>
				<Field.Description class="text-center">
					Already have an account? <a href="/login?next={encodeURIComponent(next)}">Sign in</a>
				</Field.Description>
			</Field.Group>
		</form>
	</Card.Content>
</Card.Root>
