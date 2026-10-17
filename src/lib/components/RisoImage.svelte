<script lang="ts">
	let {
		src,
		class: className,
		onerror
	}: { src: string; class?: string; onerror?: () => void } = $props();
</script>

<!--
	A hotlinked preview printed in the surrounding ink pair: the full-colour image underneath,
	the ink plates over it (same URL, so one fetch). It rests in full colour; hovering prints it in ink.
-->
<div class={['riso', className]} aria-hidden="true">
	<img {src} alt="" referrerpolicy="no-referrer" loading="lazy" {onerror} />
	<div class="riso-plate" data-plate="a">
		<img {src} alt="" referrerpolicy="no-referrer" loading="lazy" />
	</div>
	<div class="riso-plate" data-plate="b">
		<img {src} alt="" referrerpolicy="no-referrer" loading="lazy" />
	</div>
	<div class="riso-plate" data-plate="k">
		<img {src} alt="" referrerpolicy="no-referrer" loading="lazy" />
	</div>
</div>
