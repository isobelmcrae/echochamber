<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { authClient } from '#lib/auth-client.ts';
	import { safeNext } from '#lib/safe-next.ts';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import * as Field from '#lib/components/ui/field/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import PasswordInput from '#lib/components/PasswordInput.svelte';
	import OAuthButtons from '../OAuthButtons.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const next = $derived(safeNext(page.url.searchParams.get('next')));
	let login = $state('');
	let password = $state('');
	// Better Auth sends failed OAuth sign-ins back here with ?error=<code>.
	const OAUTH_ERRORS: Record<string, string> = {
		account_not_linked: 'That email already has an account. Sign in with your password instead.'
	};
	const oauthError = page.url.searchParams.get('error');
	let error = $state<string | null>(
		oauthError && (OAUTH_ERRORS[oauthError] ?? 'Could not sign you in with that account')
	);
	let pending = $state(false);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		pending = true;
		const result = login.includes('@')
			? await authClient.signIn.email({ email: login, password })
			: await authClient.signIn.username({ username: login, password });
		pending = false;
		if (result.error) {
			error = result.error.message ?? 'Could not sign in';
			return;
		}
		await invalidateAll();
		await goto(next);
	}
</script>

<Card.Root class="mx-auto mt-8 w-full max-w-sm">
	<Card.Header>
		<Card.Title class="room-band w-fit text-2xl">Sign in</Card.Title>
		<Card.Description>Welcome back to your rooms.</Card.Description>
	</Card.Header>
	<Card.Content>
		<form onsubmit={submit}>
			<Field.Group>
				<OAuthButtons providers={data.oauthProviders} {next} />
				<Field.Field>
					<Field.Label for="login">Username or email</Field.Label>
					<Input id="login" bind:value={login} autocomplete="username" required />
				</Field.Field>
				<Field.Field>
					<Field.Label for="password">Password</Field.Label>
					<PasswordInput
						id="password"
						bind:value={password}
						autocomplete="current-password"
						required
					/>
				</Field.Field>
				{#if error}<Field.Error>{error}</Field.Error>{/if}
				<Button type="submit" disabled={pending}>Sign in</Button>
				<Field.Description class="text-center">
					New here? <a href="/signup?next={encodeURIComponent(next)}">Create an account</a>
				</Field.Description>
			</Field.Group>
		</form>
	</Card.Content>
</Card.Root>
