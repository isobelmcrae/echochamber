<script lang="ts">
	import GithubIcon from '~icons/simple-icons/github';
	import GoogleIcon from '~icons/simple-icons/google';
	import { authClient } from '#lib/auth-client.ts';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Field from '#lib/components/ui/field/index.js';

	const PROVIDERS = {
		github: { label: 'GitHub', icon: GithubIcon },
		google: { label: 'Google', icon: GoogleIcon }
	};
	type OAuthProvider = keyof typeof PROVIDERS;

	let { providers, next }: { providers: OAuthProvider[]; next: string } = $props();

	let pending = $state<OAuthProvider | null>(null);

	async function signIn(provider: OAuthProvider) {
		pending = provider;
		// Redirects to the provider; we only come back here on an error.
		await authClient.signIn.social({
			provider,
			callbackURL: next,
			errorCallbackURL: `/login?next=${encodeURIComponent(next)}`
		});
		pending = null;
	}
</script>

{#if providers.length}
	{#each providers as provider (provider)}
		{@const { label, icon: Icon } = PROVIDERS[provider]}
		<Button variant="outline" type="button" disabled={!!pending} onclick={() => signIn(provider)}>
			<Icon />Continue with {label}
		</Button>
	{/each}
	<Field.Separator class="*:data-[slot=field-separator-content]:bg-card">or</Field.Separator>
{/if}
