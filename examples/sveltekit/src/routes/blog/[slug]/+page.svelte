<script lang="ts">
  import { analytics } from '$lib/analytics';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  // The pageview is automatic; this is the custom event on top of it. `slug`
  // is checked against the plan, so renaming the prop fails the build here
  // rather than quietly producing a column of nulls in the dashboard.
  $effect(() => {
    analytics.track('post.read', { slug: data.post.slug });
  });
</script>

<main>
  <p>
    <a href="/blog">← Blog</a>
  </p>
  <h1>{data.post.title}</h1>
  <!-- A fixed time zone, so the server and the browser render the same
       calendar day and hydration has nothing to disagree about. -->
  <p class="muted">
    Updated {new Date(data.post.updatedAt).toLocaleDateString('en-GB', { timeZone: 'UTC' })}
  </p>
  {#if data.post.fields.cover != null}
    <img src={data.post.fields.cover.url} alt="" />
  {/if}
  {#if data.post.fields.body == null}
    <p class="muted">This post has no body yet.</p>
  {:else}
    <!-- Safe to inject: Stet returns sanitised HTML for rich text fields. -->
    <div>{@html data.post.fields.body.html}</div>
  {/if}
</main>
