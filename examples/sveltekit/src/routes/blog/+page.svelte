<script lang="ts">
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
</script>

<main>
  <h1>Blog</h1>
  {#if data.posts.length === 0}
    <p class="muted">No posts yet. Write one in Stet.</p>
  {/if}
  {#each data.posts as post (post.id)}
    <article>
      <h2>
        <a href="/blog/{post.slug}">{post.title}</a>
      </h2>
      {#if post.fields.summary != null}
        <p>{post.fields.summary}</p>
      {/if}
    </article>
  {/each}
</main>
