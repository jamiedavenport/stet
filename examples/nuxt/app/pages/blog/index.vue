<script setup lang="ts">
const { data: posts } = await useFetch('/api/posts');
</script>

<template>
  <main>
    <h1>Blog</h1>
    <p v-if="posts != null && posts.length === 0" class="muted">No posts yet. Write one in Stet.</p>
    <article v-for="post in posts" :key="post.id">
      <h2>
        <NuxtLink :to="`/blog/${post.slug}`">{{ post.title }}</NuxtLink>
      </h2>
      <p v-if="post.fields.summary != null">{{ post.fields.summary }}</p>
    </article>
  </main>
</template>
