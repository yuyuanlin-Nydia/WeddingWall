<script setup lang="ts">
import { ref, watch, nextTick, computed, onMounted, onUnmounted } from 'vue'
import { Cropper } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'
import { useUiStore } from '@/stores/ui'
import { useRouter } from 'vue-router'
import NameDialog from '@/components/NameDialog.vue'

const uiStore = useUiStore()
const isNameDialogOpen = ref(false)
const uploaderName = ref('')

interface TextElement {
  id: number
  content: string
  color: string
  size: number
  x: number
  y: number
  maxWidth: number
}

interface ImageBackground {
  type: 'image'
  value: string
  label: string
}

interface GradientBackground {
  type: 'gradient'
  value: { start: string; mid: string; end: string }
  angle: number
  label: string
  css: string
}

type BackgroundOption = ImageBackground | GradientBackground

const imagePreview = ref<string | undefined>(undefined)
const imgElement = ref<null | HTMLImageElement>(null)
const imgCanvasRef = ref<null | HTMLCanvasElement>(null)
const ctxRef = ref<null | CanvasRenderingContext2D>(null)
const cropperRef = ref<any>(null)
const angle = ref<number>(0)
const textElements = ref<TextElement[]>([])
const activeTextElementId = ref<number | null>(null)
const isEditingText = ref<boolean>(false)
const MAX_DISPLAY_WIDTH = document.getElementById('app')?.getBoundingClientRect().width ?? 375
const MAX_DISPLAY_HEIGHT = window.innerHeight - 140
const DISPLAY_SCALE = 1.0
const editObj = {
  bg: {
    key: 'bg',
    name: '背景',
    icon: 'mdi-image-filter-hdr',
  },
  rotate: {
    key: 'rotate',
    name: '旋轉',
    icon: 'mdi-rotate-orbit',
  },
  pen: {
    key: 'pen',
    name: '文字',
    icon: 'mdi-format-text',
  },
  cut: {
    key: 'cut',
    name: '裁切',
    icon: 'mdi-crop',
  },
}
const currentEdit = ref<null | string>(editObj.bg.key)

// isCropping is now a computed property derived from currentEdit.
const isCropping = computed(() => currentEdit.value === editObj.cut.key)
const backgroundOptions: BackgroundOption[] = [
  {
    type: 'image',
    value: new URL('@/assets/image/uploadBg.jpg', import.meta.url).href,
    label: '中式桌球',
  },
  {
    type: 'gradient',
    value: { start: '#f6e0e3', mid: '#f4c0af', end: '#f6e0e3' },
    angle: 180,
    label: '粉色',
    css: 'linear-gradient(180deg, #f6e0e3 0%, #f4c0af 50%, #f6e0e3 100%)',
  },
  {
    type: 'image',
    value: new URL('@/assets/image/memoryWallBg.jpg', import.meta.url).href,
    label: '粉色晚禮服',
  },
  {
    type: 'gradient',
    value: { start: '#bf953f', mid: '#fcf6ba', end: '#b38728' },
    angle: 90,
    label: '金色',
    css: 'linear-gradient(90deg, #bf953f 0%, #fcf6ba 50%, #b38728 100%)',
  },
  {
    type: 'gradient',
    value: { start: '#fa8080', mid: '#d32f2f', end: '#b71c1c' },
    angle: 180,
    label: '紅色',
    css: 'linear-gradient(180deg, #fa8080 0%, #d32f2f 50%, #b71c1c 100%)',
  },
  {
    type: 'image',
    value: new URL('@/assets/image/indexBg.jpg', import.meta.url).href,
    label: '白色魚尾',
  },
]
const selectedBg = ref<BackgroundOption>(backgroundOptions[0])

const imgScale = ref(1)
const imgTranslateX = ref(0)
const imgTranslateY = ref(0)

const router = useRouter()

// The watcher is now simplified to only handle side-effects when leaving a mode.
watch(currentEdit, (newValue) => {
  if (newValue !== editObj.pen.key) {
    activeTextElementId.value = null
    isEditingText.value = false
  }
})

watch(angle, () => {
  rotateImg()
})

async function handleImageChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return
  const fileList = target.files
  imagePreview.value = await previewImage(fileList[0])

  const img = new Image()
  if (imagePreview.value) {
    img.src = imagePreview.value

    img.onload = () => {
      imgElement.value = img
      drawCanvas()
    }
  }
}
async function previewImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string)
      } else {
        reject(new Error('讀取失敗'))
      }
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function drawCanvas() {
  const canvas = imgCanvasRef.value
  const img = imgElement.value

  if (!canvas || !img) return

  // 固定為整個工作區尺寸 (100% 邏輯解析度)
  const workspaceWidth = MAX_DISPLAY_WIDTH
  const workspaceHeight = MAX_DISPLAY_HEIGHT

  // 處理高解析度螢幕
  const dpr = window.devicePixelRatio || 1
  canvas.width = workspaceWidth * dpr
  canvas.height = workspaceHeight * dpr
  canvas.style.width = `${workspaceWidth}px`
  canvas.style.height = `${workspaceHeight}px`

  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctxRef.value = ctx
    ctx.scale(dpr, dpr)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.clearRect(0, 0, workspaceWidth, workspaceHeight)

    // --- 繪製圖片 ---
    ctx.save()
    // 將座標原點移至畫布中心並加上位移
    ctx.translate(
      workspaceWidth / 2 + imgTranslateX.value,
      workspaceHeight / 2 + imgTranslateY.value,
    )
    // 旋轉
    ctx.rotate((angle.value * Math.PI) / 180)
    // 縮放
    ctx.scale(imgScale.value, imgScale.value)

    // 將圖片初始比例設為 0.7
    const fitScale =
      Math.min(workspaceWidth / img.naturalWidth, workspaceHeight / img.naturalHeight) * 0.7
    const drawW = img.naturalWidth * fitScale
    const drawH = img.naturalHeight * fitScale

    // 繪製圖片（置中於目前的 translate 位置）
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH)
    ctx.restore()

    drawAllTextElements()
  }
}

// 優化：使用 computed 處理當前選中的文字元素，避免在模板中使用 .find()
const activeTextElement = computed({
  get: () => textElements.value.find((el) => el.id === activeTextElementId.value),
  set: (val) => {
    const index = textElements.value.findIndex((el) => el.id === activeTextElementId.value)
    if (index !== -1 && val) {
      textElements.value[index] = val
    }
  },
})

function adjustTextareaHeight(el: HTMLTextAreaElement) {
  el.style.height = '0px'
  el.style.height = el.scrollHeight + 'px'
  el.scrollTop = 0 // 確保不產生內部捲動
}

watch(
  () => activeTextElement.value?.size,
  () => {
    nextTick(() => {
      if (activeTextElementId.value) {
        const input = document.getElementById(
          `text-input-${activeTextElementId.value}`,
        ) as HTMLTextAreaElement
        if (input) {
          adjustTextareaHeight(input)
        }
      }
    })
  },
)

function setCurrentEdit(edit: string) {
  currentEdit.value = edit
  // 修正：只有在原本完全沒文字時，才自動新增第一個文字框
  if (edit === editObj.pen.key && textElements.value.length === 0) {
    addNewText(MAX_DISPLAY_WIDTH / 2, MAX_DISPLAY_HEIGHT / 2)
  }
}

function rotateImg() {
  drawCanvas()
}
let isDraggingImage = false
let lastMousePos = { x: 0, y: 0 }
let initialPinchDist = 0
let initialPinchScale = 1
const activePointers = new Map<number, { x: number; y: number }>()

function handleImagePointerDown(event: PointerEvent) {
  // Only block movement in cropping mode or when explicitly editing a text element's content
  if (isCropping.value || isEditingText.value) return

  const target = event.currentTarget as HTMLElement
  if (target && 'setPointerCapture' in target) {
    target.setPointerCapture(event.pointerId)
  }

  activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  isDraggingImage = true

  if (activePointers.size === 1) {
    lastMousePos = { x: event.clientX, y: event.clientY }
  }
}

function handleImagePointerMove(event: PointerEvent) {
  if (!isDraggingImage) return
  activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

  if (activePointers.size === 1) {
    // Single finger/mouse: Pan
    // 除以 DISPLAY_SCALE 以補償視覺縮放帶來的位移差
    const dx = (event.clientX - lastMousePos.x) / DISPLAY_SCALE
    const dy = (event.clientY - lastMousePos.y) / DISPLAY_SCALE
    imgTranslateX.value += dx
    imgTranslateY.value += dy
    lastMousePos = { x: event.clientX, y: event.clientY }
    drawCanvas() // 即時更新位置
  } else if (activePointers.size === 2) {
    // Two fingers: Pinch zoom
    const points = Array.from(activePointers.values())
    const dist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)

    if (initialPinchDist === 0) {
      initialPinchDist = dist
      initialPinchScale = imgScale.value
    } else {
      const scale = initialPinchScale * (dist / initialPinchDist)
      imgScale.value = Math.max(0.1, Math.min(10, scale))
      drawCanvas() // 即時更新縮放
    }
  }
}

function handleImagePointerUp(event: PointerEvent) {
  activePointers.delete(event.pointerId)
  if (activePointers.size === 0) {
    isDraggingImage = false
    initialPinchDist = 0
  } else if (activePointers.size === 1) {
    initialPinchDist = 0
    // Reset lastMousePos to the remaining pointer's position to prevent jumping
    const remaining = activePointers.values().next().value
    if (remaining) {
      lastMousePos = { x: remaining.x, y: remaining.y }
    }
  }
}

function handleImageWheel(event: WheelEvent) {
  if (isCropping.value) return
  event.preventDefault()
  const zoomSpeed = 0.001 / DISPLAY_SCALE
  const delta = -event.deltaY
  const newScale = imgScale.value + delta * zoomSpeed
  imgScale.value = Math.max(0.1, Math.min(10, newScale))
  drawCanvas() // 即時更新滾輪縮放
}

async function generateFinalBlob(): Promise<Blob | null> {
  const canvas = imgCanvasRef.value
  if (!canvas) return null

  // 提高輸出解析度倍率 (例如 3 倍，讓 375px 寬變成 1125px)
  const OUTPUT_SCALE = 3

  // Save current state to restore later
  const previousActiveId = activeTextElementId.value
  const previousIsEditing = isEditingText.value

  // Ensure all text elements are drawn to the canvas before capturing
  activeTextElementId.value = null
  isEditingText.value = false
  drawCanvas()

  try {
    const editorPage = document.querySelector('.image-edit-page')
    if (!editorPage) throw new Error('Editor page not found')

    const rect = editorPage.getBoundingClientRect()
    const finalCanvas = document.createElement('canvas')

    // 使用倍率後的尺寸
    finalCanvas.width = rect.width * OUTPUT_SCALE
    finalCanvas.height = rect.height * OUTPUT_SCALE

    const finalCtx = finalCanvas.getContext('2d')
    if (!finalCtx) throw new Error('Failed to create final canvas context')

    // 設定高品質縮放
    finalCtx.imageSmoothingEnabled = true
    finalCtx.imageSmoothingQuality = 'high'

    // 整體縮放以適應高解析度
    finalCtx.scale(OUTPUT_SCALE, OUTPUT_SCALE)

    // 1. Draw background (gradient or image)
    const bg = selectedBg.value
    if (bg.type === 'gradient') {
      finalCtx.globalAlpha = 1.0
      const { x0, y0, x1, y1 } = getGradientCoords(bg.angle || 180, rect.width, rect.height)
      const gradient = finalCtx.createLinearGradient(x0, y0, x1, y1)
      gradient.addColorStop(0, bg.value.start)
      gradient.addColorStop(0.5, bg.value.mid)
      gradient.addColorStop(1, bg.value.end)
      finalCtx.fillStyle = gradient
      finalCtx.fillRect(0, 0, rect.width, rect.height)
    } else {
      finalCtx.globalAlpha = 0.4
      const bgImg = new Image()
      bgImg.src = bg.value
      await new Promise((resolve, reject) => {
        bgImg.onload = resolve
        bgImg.onerror = reject
      })

      const tileSize = 100
      const tileCanvas = document.createElement('canvas')
      tileCanvas.width = tileSize * OUTPUT_SCALE
      tileCanvas.height = tileSize * OUTPUT_SCALE
      const tileCtx = tileCanvas.getContext('2d')
      if (tileCtx) {
        tileCtx.scale(OUTPUT_SCALE, OUTPUT_SCALE)
        const imgRatio = bgImg.width / bgImg.height
        let drawWidth, drawHeight, offsetX, offsetY
        if (imgRatio > 1) {
          drawHeight = tileSize
          drawWidth = drawHeight * imgRatio
          offsetX = (tileSize - drawWidth) / 2
          offsetY = 0
        } else {
          drawWidth = tileSize
          drawHeight = drawWidth / imgRatio
          offsetX = 0
          offsetY = (tileSize - drawHeight) / 2
        }
        tileCtx.drawImage(bgImg, offsetX, offsetY, drawWidth, drawHeight)

        const pattern = finalCtx.createPattern(tileCanvas, 'repeat')
        if (pattern) {
          // 修正 Pattern 縮放
          pattern.setTransform(new DOMMatrix().scale(1 / OUTPUT_SCALE, 1 / OUTPUT_SCALE))
          finalCtx.fillStyle = pattern
          finalCtx.fillRect(0, 0, rect.width, rect.height)
        }
      }
    }
    finalCtx.globalAlpha = 1.0

    // 2. Draw the image canvas at its correct position
    const canvasRect = canvas.getBoundingClientRect()
    const offsetX = (canvasRect.left - rect.left) / DISPLAY_SCALE
    const offsetY = (canvasRect.top - rect.top) / DISPLAY_SCALE

    finalCtx.drawImage(
      canvas,
      offsetX,
      offsetY,
      canvasRect.width / DISPLAY_SCALE,
      canvasRect.height / DISPLAY_SCALE,
    )

    return new Promise<Blob | null>((resolve) => finalCanvas.toBlob(resolve, 'image/png'))
  } finally {
    // Restore state
    activeTextElementId.value = previousActiveId
    isEditingText.value = previousIsEditing
    drawCanvas()
  }
}

async function shareImage() {
  try {
    const blob = await generateFinalBlob()
    if (!blob) return

    // 優先嘗試使用 Web Share API (手機端體驗最好)
    if (navigator.share && navigator.canShare) {
      const file = new File([blob], 'custom-image.png', { type: 'image/png' })
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: '儲存圖片',
            text: '這是您編輯後的圖片',
          })
          uiStore.showSnackbar({
            text: '分享成功',
            type: 'success',
            icon: 'mdi-check',
          })
          return // 分享成功（使用者可在此選擇「儲存影像」）
        } catch (shareError) {
          // 如果使用者取消分享或發生錯誤，則降級使用一般下載
          console.log('Share failed or cancelled', shareError)
        }
      }
    }

    // 後備方案：傳統下載連結
    // const url = URL.createObjectURL(blob)
    // const link = document.createElement('a')
    // link.download = 'custom-image.png'
    // link.href = url
    // link.click()
    // URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Share failed:', error)
  }
}

function rotateAngle(step = 90, direction = 'cw') {
  let newAngle = direction === 'cw' ? angle.value + step : angle.value - step

  // 若角度超出範圍，重設為 0
  if (newAngle >= 360 || newAngle <= -360) {
    newAngle = 0
  }

  angle.value = newAngle
}

function crop() {
  if (cropperRef.value) {
    const { canvas } = cropperRef.value.getResult()
    if (canvas) {
      const dataUrl = canvas.toDataURL()
      imagePreview.value = dataUrl
      const img = new Image()
      img.src = dataUrl
      img.onload = () => {
        // No longer need to set isCropping to false manually
        imgElement.value = img
        drawCanvas()
        currentEdit.value = null
      }
    }
  }
}

function drawAllTextElements() {
  const ctx = ctxRef.value
  if (!ctx) return

  textElements.value.forEach((textEl) => {
    if (isEditingText.value && textEl.id === activeTextElementId.value) {
      return
    }
    ctx.font = `${textEl.size}px Arial`
    ctx.fillStyle = textEl.color
    ctx.textAlign = 'center'

    const words = textEl.content.split('')
    let line = ''
    let testY = textEl.y
    const lineHeight = textEl.size * 1.2

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n]
      const metrics = ctx.measureText(testLine)
      const testWidth = metrics.width

      if (testWidth > textEl.maxWidth && n > 0) {
        ctx.fillText(line, textEl.x, testY)
        line = words[n]
        testY += lineHeight
      } else {
        line = testLine
      }
    }
    ctx.fillText(line, textEl.x, testY)
  })
}

function addNewText(x: number, y: number) {
  // 置中對齊時，最大寬度受限於距離邊界最近的那一側，乘以二
  const distToEdge = Math.min(x, MAX_DISPLAY_WIDTH - x)
  const newText: TextElement = {
    id: Date.now(),
    content: '',
    color: 'white',
    size: 20,
    x: x,
    y: y,
    maxWidth: Math.max(100, distToEdge * 2 - 20),
  }
  textElements.value.push(newText)
  activeTextElementId.value = newText.id
  isEditingText.value = true

  nextTick(() => {
    const input = document.getElementById(`text-input-${newText.id}`) as HTMLTextAreaElement
    if (input) {
      input.focus()
      adjustTextareaHeight(input)
    }
  })
}

// Now only handles clicking on existing text.
function handleCanvasClick(event: MouseEvent) {
  if (currentEdit.value !== editObj.pen.key || !imgCanvasRef.value) return

  const canvas = imgCanvasRef.value
  const ctx = ctxRef.value
  if (!ctx) return

  const rect = canvas.getBoundingClientRect()
  // 座標轉換：Canvas 是 1:1 顯示的
  const clickX = (event.clientX - rect.left) / DISPLAY_SCALE
  const clickY = (event.clientY - rect.top) / DISPLAY_SCALE

  // Iterate backwards to check topmost text first
  for (let i = textElements.value.length - 1; i >= 0; i--) {
    const textEl = textElements.value[i]

    ctx.font = `${textEl.size}px Arial`
    const words = textEl.content.split('')
    let line = ''
    let lineCount = 1
    let maxWidthSeen = 0

    // 模擬換行邏輯以計算總高度與最大寬度
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n]
      const metrics = ctx.measureText(testLine)
      if (metrics.width > textEl.maxWidth && n > 0) {
        maxWidthSeen = Math.max(maxWidthSeen, ctx.measureText(line).width)
        line = words[n]
        lineCount++
      } else {
        line = testLine
      }
    }
    maxWidthSeen = Math.max(maxWidthSeen, ctx.measureText(line).width)

    // Bounding box check (修正為置中對齊的區域)
    const isXMatch = clickX >= textEl.x - maxWidthSeen / 2 && clickX <= textEl.x + maxWidthSeen / 2
    const isYMatch =
      clickY >= textEl.y - textEl.size && clickY <= textEl.y + (lineCount - 1) * textEl.size * 1.2

    if (isXMatch && isYMatch) {
      // Clicked on existing text
      activeTextElementId.value = textEl.id
      isEditingText.value = true
      drawCanvas() // Redraw to hide the canvas text

      nextTick(() => {
        const input = document.getElementById(`text-input-${textEl.id}`) as HTMLTextAreaElement
        if (input) {
          input.focus()
          adjustTextareaHeight(input)
        }
      })
      break // Stop after finding the first match
    }
  }
}

function onTextInput(id: number, event: Event) {
  const target = event.target as HTMLTextAreaElement
  adjustTextareaHeight(target)
}

function selectTextElement(id: number) {
  activeTextElementId.value = id
  isEditingText.value = true
  nextTick(() => {
    const input = document.getElementById(`text-input-${id}`) as HTMLTextAreaElement
    if (input) {
      input.focus()
      adjustTextareaHeight(input)
    }
  })
}

let isDraggingText = false
let dragOffsetX = 0
let dragOffsetY = 0

function handleTextMouseDown(event: MouseEvent | TouchEvent, textEl: TextElement) {
  if (currentEdit.value === editObj.pen.key) {
    isDraggingText = true
    activeTextElementId.value = textEl.id
    const canvas = imgCanvasRef.value
    if (canvas) {
      const rect = canvas.getBoundingClientRect()
      const clientX = 'touches' in event ? event.touches[0].clientX : (event as MouseEvent).clientX
      const clientY = 'touches' in event ? event.touches[0].clientY : (event as MouseEvent).clientY

      // 調整座標映射，考慮 DISPLAY_SCALE
      dragOffsetX = (clientX - rect.left) / DISPLAY_SCALE - textEl.x
      dragOffsetY = (clientY - rect.top) / DISPLAY_SCALE - textEl.y
    }
    event.stopPropagation()
  }
}

function handleGlobalMove(event: MouseEvent | TouchEvent) {
  if (isDraggingText && activeTextElementId.value !== null && imgCanvasRef.value) {
    if (event.cancelable) event.preventDefault()
    const canvas = imgCanvasRef.value
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in event ? event.touches[0].clientX : (event as MouseEvent).clientX
    const clientY = 'touches' in event ? event.touches[0].clientY : (event as MouseEvent).clientY

    // 調整移動量，考慮 DISPLAY_SCALE (此時為 1.0)
    const mouseX = (clientX - rect.left) / DISPLAY_SCALE - dragOffsetX
    const mouseY = (clientY - rect.top) / DISPLAY_SCALE - dragOffsetY

    const activeText = textElements.value.find((el) => el.id === activeTextElementId.value)
    if (activeText) {
      activeText.x = mouseX
      activeText.y = mouseY
      const distToEdge = Math.min(mouseX, MAX_DISPLAY_WIDTH - mouseX)
      activeText.maxWidth = Math.max(100, distToEdge * 2 - 20)
    }
  }
}

function handleGlobalUp() {
  isDraggingText = false
}

onMounted(() => {
  window.addEventListener('mousemove', handleGlobalMove)
  window.addEventListener('mouseup', handleGlobalUp)
  window.addEventListener('touchmove', handleGlobalMove, { passive: false })
  window.addEventListener('touchend', handleGlobalUp)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', handleGlobalMove)
  window.removeEventListener('mouseup', handleGlobalUp)
  window.removeEventListener('touchmove', handleGlobalMove)
  window.removeEventListener('touchend', handleGlobalUp)
})

function finishTextEdit() {
  isEditingText.value = false
  activeTextElementId.value = null
  drawCanvas()
  currentEdit.value = null
}
function reset() {
  imagePreview.value = undefined
  angle.value = 0
  textElements.value = []
}
function openNameDialog() {
  isNameDialogOpen.value = true
}

async function handleNameConfirm(name: string) {
  uploaderName.value = name
  await uploadImage()
}

function getGradientCoords(angle: number, width: number, height: number) {
  const angleRad = (angle * Math.PI) / 180
  const x0 = width / 2 - (Math.sin(angleRad) * width) / 2
  const y0 = height / 2 + (Math.cos(angleRad) * height) / 2
  const x1 = width / 2 + (Math.sin(angleRad) * width) / 2
  const y1 = height / 2 - (Math.cos(angleRad) * height) / 2
  return { x0, y0, x1, y1 }
}

async function uploadImage() {
  const cloudName = 'dkpitcfi9'
  const uploadPreset = 'wedding_'
  uiStore.showLoader()
  try {
    const blob = await generateFinalBlob()
    if (!blob) return

    const formData = new FormData()
    formData.append('file', blob, `engagement_${Date.now()}.png`)
    formData.append('upload_preset', uploadPreset)
    formData.append('tags', 'engagement')

    // 將名字作為 metadata 或 context 上傳
    if (uploaderName.value) {
      formData.append('context', `uploader_name=${uploaderName.value}`)
    }

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload`, {
      method: 'POST',
      body: formData,
    })
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    await response.json()
    uiStore.showSnackbar({
      text: '上傳成功',
      type: 'success',
      icon: 'mdi-check',
    })
    router.push({ name: 'memoryWall' })
  } catch (error: any) {
    console.error('Upload failed:', error)
    uiStore.showSnackbar({
      text: `上傳失敗: ${error.message || '未知錯誤'}`,
      type: 'error',
      icon: 'mdi-alert-circle-outline',
    })
  } finally {
    uiStore.hideLoader()
  }
}
</script>

<template>
  <div class="image-edit-page relative">
    <!-- Dynamic Background Layer (Tiled & Faded) -->
    <div
      v-if="imagePreview"
      class="absolute inset-0 z-0 pointer-events-none"
      :style="
        selectedBg.type === 'gradient'
          ? { background: selectedBg.css }
          : {
              backgroundImage: `url(${selectedBg.value})`,
              backgroundRepeat: 'repeat',
              backgroundPosition: 'top left',
              backgroundSize: '100px',
              opacity: 0.4,
            }
      "
    />
    <div class="flex justify-between absolute top-1 left-0 z-2 gap-2 ml-2" v-if="imagePreview">
      <button
        class="bg-gray-100 text-gray-500 rounded-full w-8 h-8 flex items-center justify-center cursor-pointer left-2"
        @click="reset"
      >
        <i class="mdi text-lg mdi-close" />
      </button>
    </div>
    <div
      :class="[
        'flex justify-end flex-col grow relative',
        {
          'image-edit-bg': !imagePreview,
        },
      ]"
    >
      <template v-if="imagePreview">
        <div class="absolute z-3 top-3 w-[calc(100%-30px)]"></div>
        <div class="flex justify-center items-center flex-wrap grow relative">
          <div class="slider-container" v-if="currentEdit === editObj.pen.key && activeTextElement">
            <input
              class="slider w-full"
              type="range"
              v-model="activeTextElement.size"
              id="textSize"
              min="10"
              max="100"
            />
          </div>
          <div
            class="relative overflow-visible"
            :style="{
              cursor: currentEdit === editObj.pen.key || isCropping ? 'default' : 'move',
              touchAction: 'none',
              width: `${MAX_DISPLAY_WIDTH}px`,
              height: `${MAX_DISPLAY_HEIGHT}px`,
            }"
            @pointerdown="handleImagePointerDown"
            @pointermove="handleImagePointerMove"
            @pointerup="handleImagePointerUp"
            @pointercancel="handleImagePointerUp"
            @wheel="handleImageWheel"
          >
            <canvas
              ref="imgCanvasRef"
              id="imageCanvas"
              v-show="imagePreview && !isCropping"
              @click="handleCanvasClick"
              style="position: absolute; top: 0; left: 0"
            />
            <Cropper
              ref="cropperRef"
              :src="imagePreview"
              v-if="isCropping"
              :style="{ width: `${MAX_DISPLAY_WIDTH}px`, height: 'auto' }"
            />

            <template v-if="currentEdit === editObj.pen.key">
              <div
                v-for="textEl in textElements"
                :key="textEl.id"
                @mousedown="handleTextMouseDown($event, textEl)"
                @touchstart.passive="handleTextMouseDown($event, textEl)"
                @click.stop="selectTextElement(textEl.id)"
                :style="{
                  position: 'absolute',
                  left: `${textEl.x}px`,
                  top: `${textEl.y - textEl.size}px`,
                  transform: 'translateX(-50%)',
                  touchAction: 'none',
                  minWidth: '50px',
                  minHeight: '20px',
                  cursor: 'move',
                  zIndex: activeTextElementId === textEl.id ? 10 : 5,
                }"
              >
                <!-- Invisible hit area when not editing to allow re-selection/dragging -->
                <div
                  v-if="activeTextElementId !== textEl.id"
                  :style="{
                    width: `${textEl.maxWidth}px`,
                    height: `${textEl.size * 1.2}px`,
                    background: 'transparent',
                  }"
                ></div>
                <textarea
                  v-if="activeTextElementId === textEl.id"
                  :id="`text-input-${textEl.id}`"
                  v-model="textEl.content"
                  :style="{
                    fontSize: `${textEl.size}px`,
                    lineHeight: 1.2,
                    color: textEl.color,
                    border: 'none',
                    padding: '0',
                    background: 'transparent',
                    outline: '0',
                    textAlign: 'center',
                    width: `${textEl.maxWidth}px`,
                    overflow: 'hidden',
                    resize: 'none',
                    display: 'block',
                    wordBreak: 'break-all',
                    wordWrap: 'break-word',
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'Arial',
                  }"
                  rows="1"
                  @input="onTextInput(textEl.id, $event)"
                  @focus="((isEditingText = true), drawCanvas())"
                ></textarea>
              </div>
            </template>
          </div>
        </div>
        <div class="absolute bottom-[5px] z-2 w-full flex justify-center">
          <!-- Background Selector -->
          <div v-if="currentEdit === editObj.bg.key" class="flex gap-2 p-2 bg-black/30 rounded-lg">
            <button
              v-for="bg in backgroundOptions"
              :key="bg.label"
              class="w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center overflow-hidden"
              :style="
                bg.type === 'gradient'
                  ? { background: bg.css }
                  : { backgroundImage: `url(${bg.value})`, backgroundSize: 'cover' }
              "
              :class="selectedBg.label === bg.label ? 'border-amber-400 scale-110' : 'border-white'"
              @click="selectedBg = bg"
            >
              <span v-if="bg.type === 'gradient'" class="text-[8px] text-gray-100 font-bold">{{
                bg.label
              }}</span>
            </button>
          </div>
          <div v-if="currentEdit === editObj.rotate.key">
            <div>
              <input
                type="range"
                id="volume"
                name="volume"
                min="-270"
                max="270"
                v-model="angle"
                @input="rotateImg"
              />
              <br />
              <div class="flex justify-center gap-4 items-center">
                <i
                  class="mdi mdi-rotate-right-variant text-2xl text-white cursor-pointer"
                  @click="rotateAngle(90, 'cw')"
                ></i>
                <div
                  class="bg-gray-300 text-center rounded-full flex flex-col justify-center"
                  style="min-width: 35px; min-height: 35px"
                >
                  <span>{{ angle }}</span>
                </div>
                <i
                  class="mdi mdi-rotate-left-variant text-2xl text-white cursor-pointer"
                  @click="rotateAngle(90, 'ccw')"
                ></i>
              </div>
            </div>
          </div>
          <div v-if="currentEdit === editObj.cut.key && isCropping">
            <button
              @click="((isCropping = false), (currentEdit = null))"
              class="text-gray-700 bg-white px-2 py-1 rounded mr-2 cursor-pointer"
            >
              取消
            </button>
            <button
              @click="crop"
              class="text-gray-700 bg-amber-200 px-2 py-1 rounded cursor-pointer"
            >
              完成
            </button>
          </div>
          <div v-if="currentEdit === editObj.pen.key && activeTextElement">
            <div class="flex flex-col gap-2 mt-2">
              <div class="flex items-center gap-2">
                <input type="color" v-model="activeTextElement.color" id="textColor" />
                <button
                  @click="finishTextEdit"
                  id="finishTextEdit"
                  class="text-gray-700 bg-amber-300 px-2 py-1 rounded ml-auto cursor-pointer"
                >
                  完成
                </button>
              </div>
            </div>
          </div>
        </div>
        <div
          class="flex flex-col justify-center items-center gap-4 absolute top-0 right-2 text-white"
        >
          <button
            :class="[
              'cursor-pointer px-2 py-1 rounded-full transition-colors flex flex-col items-center w-[45px] h-[45px]',
              editItem.key === currentEdit
                ? 'bg-gray-200 text-gray-500 active:bg-gray-200 shadow-2xl'
                : 'bg-gray-500 text-white hover:bg-gray-200 hover:text-gray-500',
            ]"
            @click="setCurrentEdit(editItem.key)"
            v-for="editItem in Object.values(editObj)"
            :key="editItem.key"
          >
            <i :class="`mdi text-md size-5 ${editItem.icon}`"></i>
            <span class="text-xs">{{ editItem.name }}</span>
          </button>
          <div
            class="bg-blue-100 text-gray-500 size-10 rounded-full cursor-pointer hover:rounded-full hover:bg-gray-300 flex justify-center items-center right-5"
            @click="openNameDialog"
          >
            <i class="mdi mdi-upload text-2xl"></i>
          </div>
          <div
            class="bg-amber-100 text-gray-500 size-8 rounded-full cursor-pointer hover:rounded-full hover:bg-gray-300 flex justify-center items-center right-5"
            @click="shareImage"
          >
            <i class="mdi mdi-share text-2xl"></i>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="flex justify-center items-center flex-wrap grow">
          <label class="cursor-pointer">
            <input
              id="upload_img"
              style="display: none"
              type="file"
              accept="image/*"
              @change="handleImageChange"
            />
            <p class="rounded-xl p-6 text-gray-600 bg-white/60 flex flex-col items-center">
              <i class="mdi mdi-camera text-4xl"></i>
              請上傳你和新郎/新娘的專屬回憶和祝福
            </p>
          </label>
        </div></template
      >
    </div>
    <NameDialog
      v-model="isNameDialogOpen"
      title="請輸入您的名字"
      placeholder="輸入名字以標記您的上傳"
      @confirm="handleNameConfirm"
    />
  </div>
</template>

<style scoped>
.image-edit-page {
  padding: 0px;
}
.image-edit-bg {
  opacity: 0.8;
  background: url('../assets/image/uploadBg.jpg') no-repeat center center / 135% auto;
}
.slider-container {
  display: flex;
  align-items: center;
  position: absolute;
  left: 10px;
  top: 50%;
  z-index: 2;
  transform: translateY(-50%);
}

.slider {
  -webkit-appearance: slider-vertical;
  appearance: slider-vertical;
  width: 20px;
  height: 100%;
}
</style>
