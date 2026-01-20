<template>
  <div class="carousel-container" @mouseover="stopAutoPlay" @mouseleave="startAutoPlay(3000)">
    <div class="carousel-dots" :style="{ '--num-images': images.length }">
      <div
        v-for="(image, index) in images"
        :key="index"
        class="dot"
        :class="{ active: currentIndex === index }"
        @click.stop="goToSlide(index)"
      ></div>
    </div>
    <div class="w-full mt-3 ml-3 absolute">Nydia Lin</div>
    <AdvancedImage :cldImg="myImg" />
    <div
      class="carousel-slide"
      @click="nextSlide"
      :style="{ transform: `translateX(-${currentIndex * 100}%)` }"
    >
      <div v-for="(image, index) in images" :key="index" class="carousel-item">
        <img :src="image" alt="Carousel Image" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const images = ref([
  'https://placehold.co/600x400/png',
  'https://placehold.co/500x200/png',
  'https://placehold.co/400x100/png',
  'https://placehold.co/300x400/png',
])

const currentIndex = ref(0)
let intervalId: any = null

const nextSlide = () => {
  currentIndex.value = (currentIndex.value + 1) % images.value.length
}

const goToSlide = (index: number) => {
  currentIndex.value = index
}

const startAutoPlay = (interval: number) => {
  intervalId = setInterval(nextSlide, interval)
}

const stopAutoPlay = () => {
  clearInterval(intervalId)
}

onMounted(() => {
  startAutoPlay(3000) // Change image every 3 seconds
})

onUnmounted(() => {
  stopAutoPlay()
})
</script>

<style scoped>
.carousel-container {
  width: 100%;
  max-width: 800px;
  margin: auto;
  overflow: hidden;
  position: relative;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
.carousel-container::before {
  content: '';
  display: block;
  background: url('../assets/image/memoryWallBg.jpg') no-repeat center top / auto 100%;
  height: 100%;
  width: 100%;
  opacity: 0.5;
  position: absolute;
  /* 偏移值皆設為 0，讓僞元素跟父元素一樣大小 */
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
}
.carousel-slide {
  display: flex;
  align-items: center;
  height: 100%;
  transition: transform 0.5s ease-in-out;
}

.carousel-item {
  min-width: 100%;
  box-sizing: border-box;
}

.carousel-item img {
  width: 100%;
  display: block;
  height: auto;
}

.carousel-dots {
  position: absolute;
  top: 0px; /* Changed from bottom */
  left: 0; /* Changed from 50% */
  transform: none; /* Changed from translateX(-50%) */
  display: flex;
  width: 100%; /* Added to span full width */
  justify-content: center; /* Changed from space-around to center */
  gap: 10px; /* Added gap for spacing between lines */
  padding: 5px 0; /* Add some padding */
  z-index: 10; /* Ensure dots are above the slide */
}

.dot {
  cursor: pointer;
  height: 4px; /* Changed from 12px for a thin line */
  width: calc(
    (100% / var(--num-images)) - 10px
  ); /* Dynamic width based on number of images, adjusted for gap */
  margin: 0; /* Changed from 0 5px */
  background-color: #d3d3d3; /* Light gray for inactive */
  border-radius: 0; /* Changed from 50% for rectangular shape */
  display: inline-block;
  transition: background-color 0.3s ease;
}

.dot.active {
  background-color: #333333; /* Dark gray for active */
}
</style>
