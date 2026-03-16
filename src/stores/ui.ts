import { ref } from 'vue'
import { defineStore } from 'pinia'

type SnackbarPosition = 'top' | 'center' | 'bottom'
type SnackbarType = 'success' | 'error' | 'warning' | 'info'

export const useUiStore = defineStore('ui', () => {
  const isLoading = ref(false)
  const snackbar = ref({
    show: false,
    text: '',
    type: '',
    position: 'center' as SnackbarPosition,
    timeout: 3000,
    icon: '',
  })

  function showLoader() {
    isLoading.value = true
  }

  function hideLoader() {
    isLoading.value = false
  }

  function showSnackbar({
    text,
    type = 'success',
    position = 'center',
    timeout = 3000,
    icon = '',
  }: {
    text: string
    type?: SnackbarType
    position?: SnackbarPosition
    timeout?: number
    icon?: string
  }) {
    snackbar.value = {
      show: true,
      text,
      type,
      position,
      timeout,
      icon,
    }
  }

  function hideSnackbar() {
    snackbar.value.show = false
  }

  return {
    isLoading,
    snackbar,
    showLoader,
    hideLoader,
    showSnackbar,
    hideSnackbar,
  }
})
