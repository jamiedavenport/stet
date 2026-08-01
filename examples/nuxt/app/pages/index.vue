<script setup lang="ts">
const { data: landing } = await useFetch('/api/landing');
</script>

<template>
  <main v-if="landing != null">
    <h1>{{ landing.fields.headline ?? landing.title }}</h1>
    <div v-if="landing.fields.pitch != null" v-html="landing.fields.pitch.html" />
    <p><NuxtLink to="/blog">Read the blog →</NuxtLink></p>
    <p class="muted">
      This page renders the “Landing” map; the blog renders the “Posts” collection. Both are typed
      from the model built in the Stet UI.
    </p>
  </main>
</template>
