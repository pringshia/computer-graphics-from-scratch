<script>
	import { page } from '$app/stores';
</script>

<svelte:head>
	<title>{$page.data.title}</title>
</svelte:head>
<a href="/">&larr; Contents</a>
<h1>{$page.data.title}</h1>
<slot />
