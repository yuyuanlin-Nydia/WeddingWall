<script lang="ts" setup>
import { computed } from 'vue'

const props = defineProps({
  color: {
    type: String,
    default: 'blue', // 預設使用 blue
    validator: (value) => ['blue', 'green', 'red', 'purple'].includes(value),
  },
  className: {
    type: String,
    required: false,
  },
})

const colorMap = {
  blue: 'border-blue-600 text-blue-600 hover:bg-blue-600 active:bg-blue-700',
  green: 'border-green-600 text-green-600 hover:bg-green-600 active:bg-green-700',
  red: 'border-red-600 text-red-600 hover:bg-red-600 active:bg-red-700',
  purple: 'border-purple-600 text-purple-600 hover:bg-purple-600 active:bg-purple-700',
}

const colorClasses = computed(() => {
  return colorMap[props.color] || colorMap.blue
})
defineEmits(['click'])
</script>

<template>
  <button
    :class="[
      'border rounded px-2 py-1 hover:border-transparent hover:text-white cursor-pointer',
      className,
      colorClasses, // 動態顏色樣式
    ]"
    @click="$emit('click')"
  >
    <slot></slot>
  </button>
</template>
