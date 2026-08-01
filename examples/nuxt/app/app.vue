<script setup lang="ts">
useHead({
  htmlAttrs: { lang: 'en' },
  title: 'Stet example',
});
</script>

<template>
  <div>
    <nav>
      <NuxtLink to="/">Home</NuxtLink>
      <NuxtLink to="/blog">Blog</NuxtLink>
    </nav>
    <NuxtPage />
  </div>
</template>
