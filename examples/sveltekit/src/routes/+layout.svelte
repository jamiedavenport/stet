<script lang="ts">
  import { afterNavigate } from '$app/navigation';
  import { analytics } from '$lib/analytics';
  import '../styles.css';

  let { children } = $props();

  // In the root layout, so every page is counted rather than only the routes
  // that happen to import the analytics client themselves. afterNavigate runs
  // once on mount and again after every client-side navigation.
  afterNavigate((navigation) => {
    analytics.pageview(navigation.to?.url.href);
  });
</script>

<nav>
  <a href="/">Home</a>
  <a href="/blog">Blog</a>
</nav>
{@render children()}
