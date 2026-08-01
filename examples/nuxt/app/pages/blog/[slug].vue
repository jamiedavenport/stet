<script setup lang="ts">
const route = useRoute();
const { data: post, error } = await useFetch(() => `/api/posts/${String(route.params.slug)}`);

if (error.value != null) {
  throw createError({ statusCode: 404, statusMessage: 'Post not found', fatal: true });
}
</script>

<template>
  <main v-if="post != null">
    <p><NuxtLink to="/blog">← Blog</NuxtLink></p>
    <h1>{{ post.title }}</h1>
    <!-- A fixed time zone, so the server and the hydrating browser render the
         same date either side of midnight. -->
    <p class="muted">
      Updated {{ new Date(post.updatedAt).toLocaleDateString('en-GB', { timeZone: 'UTC' }) }}
    </p>
    <img v-if="post.fields.cover != null" :src="post.fields.cover.url" :alt="post.title" />
    <p v-if="post.fields.body == null" class="muted">This post has no body yet.</p>
    <div v-else v-html="post.fields.body.html" />
  </main>
</template>
