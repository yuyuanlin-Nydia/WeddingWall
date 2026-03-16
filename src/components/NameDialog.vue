<script setup lang="ts">
import { ref, watch } from 'vue'
import BaseButton from './BaseButton.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: '請輸入名稱',
  },
  placeholder: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

const inputValue = ref('')

// 當彈窗開啟時，重置輸入框
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      inputValue.value = ''
    }
  },
)

const handleCancel = () => {
  emit('update:modelValue', false)
  emit('cancel')
}

const handleConfirm = () => {
  if (!inputValue.value.trim()) return
  emit('confirm', inputValue.value)
  emit('update:modelValue', false)
}
</script>

<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    @click.self="handleCancel"
  >
    <div class="bg-white rounded-2xl p-6 w-[90%] max-w-md shadow-xl transform transition-all">
      <h3 class="text-xl font-bold mb-4 text-gray-800">{{ title }}</h3>

      <div class="mb-6">
        <input
          v-model="inputValue"
          type="text"
          :placeholder="placeholder"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:gray-100 transition-all"
          @keyup.enter="handleConfirm"
          autofocus
        />
      </div>

      <div class="flex justify-end gap-3">
        <BaseButton
          class="border-gray-400 text-gray-400 hover:bg-gray-500 active:bg-gray-500"
          @click="handleCancel"
        >
          取消
        </BaseButton>
        <BaseButton
          class="border-blue-100 text-blue-100 hover:bg-blue-300 active:bg-blue-300"
          @click="handleConfirm"
        >
          確認
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 可以根據需要添加額外動畫 */
</style>
