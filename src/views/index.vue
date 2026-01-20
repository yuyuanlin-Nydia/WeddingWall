<script setup lang="ts"></script>

<template>
  <main class="index text-center flex justify-center">
    <p>— Terry and Nydia —</p>
    <br />
    <div class="text-5xl">
      信宏<br /><br />
      &<br /><br />
      郁媛
    </div>
    <br />
    <p class="text-sm">我們訂婚了</p>
    <br />
    <p class="font-extrabold">26th APRIL, 2026</p>
  </main>
</template>

<style scoped>
.index {
  position: relative;
}
.index::before {
  content: '';
  display: block;
  background: url('../assets/image/indexBg.jpg') no-repeat 20% center / auto 100%;
  height: 100%;
  width: 100%;
  opacity: 0.3;
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
}
</style>
