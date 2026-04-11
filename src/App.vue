<script setup lang="ts">
import LoadingOverlay from '@/components/LoadingOverlay.vue'
import Snackbar from '@/components/SnackBar.vue'
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
const route = useRoute()
onMounted(() => {
  window.addEventListener('resize', setVH)
  setVH()
})

function setVH() {
  document.documentElement.style.setProperty('--innerHeight', `${window.innerHeight}px`)
}
</script>

<template>
  <nav id="nav" v-if="route.name !== 'memoryWall'">
    <RouterLink to="/">首頁</RouterLink>
    <RouterLink to="/uploadImage">回憶上傳</RouterLink>
    <RouterLink to="/memoryWall">回憶留言版</RouterLink>
  </nav>
  <RouterView class="grow flex flex-col" />
  <LoadingOverlay />
  <Snackbar />
</template>

<style scoped>
.logo {
  display: inline;
  margin: 0 auto 2rem;
}

nav {
  background-color: #f4c0af;
  width: 100%;
  font-size: 12px;
  text-align: center;
}

nav a.router-link-exact-active {
  color: var(--color-white);
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
}

nav a {
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid var(--color-border);
}

nav a:first-of-type {
  border: 0;
}

.logo {
  margin: 0 2rem 0 0;
}

/* header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  } */

nav {
  text-align: left;
  font-size: 1rem;
  padding: 1rem 0;
}
</style>
