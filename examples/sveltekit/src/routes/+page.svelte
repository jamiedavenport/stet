<script lang="ts">
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
</script>

<main>
  <h1>{data.landing.fields.headline ?? data.landing.title}</h1>
  {#if data.landing.fields.pitch != null}
    <!-- Safe to inject: Stet returns sanitised HTML for rich text fields. -->
    <div>{@html data.landing.fields.pitch.html}</div>
  {/if}
  <p>
    <a href="/blog">Read the blog →</a>
  </p>
  <p class="muted">
    This page renders the “Landing” map; the blog renders the “Posts” collection. Both are typed
    from the model built in the Stet UI.
  </p>
</main>
