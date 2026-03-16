<template>
  <div v-if="uiStore.snackbar.show" :class="[snackbarClasses, 'flex items-center gap-2']">
    <div><i :class="[`mdi text-2xl ${uiStore.snackbar.icon}`]" /></div>
    {{ uiStore.snackbar.text }}
  </div>
</template>

<script setup lang="ts">
import { useUiStore } from '@/stores/ui'
import { watch, computed } from 'vue'

const uiStore = useUiStore()

const snackbarClasses = computed(() => {
  return ['snackbar', uiStore.snackbar.type, uiStore.snackbar.position]
})

watch(
  () => uiStore.snackbar.show,
  (newValue) => {
    if (newValue) {
      setTimeout(() => {
        uiStore.hideSnackbar()
      }, uiStore.snackbar.timeout)
    }
  },
)
</script>

<style scoped>
.snackbar {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  padding: 6px 12px;
  border-radius: 8px;
  color: white;
  z-index: 10000;
}

.snackbar.success {
  background-color: #4caf50;
}

.snackbar.error {
  background-color: #f44336;
}

.snackbar.top {
  top: 20px;
}

.snackbar.center {
  top: 50%;
  transform: translate(-50%, -50%);
}

.snackbar.bottom {
  bottom: 20px;
}
</style>
