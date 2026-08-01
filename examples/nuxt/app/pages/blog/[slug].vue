<script setup lang="ts">
const route = useRoute();
const { data: post } = await useFetch(() => `/api/posts/${String(route.params.slug)}`);
</script>

<template>
  <main v-if="post != null">
    <p><NuxtLink to="/blog">← Blog</NuxtLink></p>
    <h1>{{ post.title }}</h1>
    <p class="muted">Updated {{ new Date(post.updatedAt).toLocaleDateString('en-GB') }}</p>
    <img v-if="post.fields.cover != null" :src="post.fields.cover.url" :alt="post.title" />
    <p v-if="post.fields.body == null" class="muted">This post has no body yet.</p>
    <div v-else v-html="post.fields.body.html" />
  </main>
</template>
