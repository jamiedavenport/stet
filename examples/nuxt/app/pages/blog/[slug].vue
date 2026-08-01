<script setup lang="ts">
import { analytics } from '../../analytics';

const route = useRoute();
const { data: post } = await useFetch(() => `/api/posts/${String(route.params.slug)}`);

// The pageview is automatic; this is the custom event on top of it. `slug`
// is checked against the plan, so renaming the prop fails the build here
// rather than quietly producing a column of nulls in the dashboard.
// Watching the loaded post rather than using onMounted, so navigating from
// one post to another (which reuses this component) is counted too.
watch(
  () => post.value?.slug,
  (slug) => {
    if (import.meta.client && slug !== undefined) {
      analytics.track('post.read', { slug });
    }
  },
  { immediate: true },
);
</script>

<template>
  <main v-if="post != null">
    <p><NuxtLink to="/blog">← Blog</NuxtLink></p>
    <h1>{{ post.title }}</h1>
    <p class="muted">Updated {{ new Date(post.updatedAt).toLocaleDateString('en-GB') }}</p>
    <img v-if="post.fields.cover != null" :src="post.fields.cover.url" />
    <p v-if="post.fields.body == null" class="muted">This post has no body yet.</p>
    <div v-else v-html="post.fields.body.html" />
  </main>
</template>
