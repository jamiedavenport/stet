<script lang="ts">
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
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
