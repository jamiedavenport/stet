<script lang="ts">
  import '$lib/styles.css';

  let { children } = $props();
</script>

<nav>
  <a href="/">Home</a>
  <a href="/blog">Blog</a>
</nav>
{@render children()}
