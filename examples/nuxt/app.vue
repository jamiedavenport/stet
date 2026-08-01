<script setup>
const { data } = await useAsyncData('content', () => generateContent())
</script>
<template>
  <main>
    <h1>{{ data.title }}</h1>
    <div v-html="data.html" />
  </main>
</template>
