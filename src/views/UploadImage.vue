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

onMounted(() => {
  console.log(localStorage.getItem('test'))
})
interface TextElement {
  id: number
  content: string
  color: string
  size: number
  x: number
  y: number
  maxWidth: number
}

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
const editObj = {
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
const currentEdit = ref<null | string>(editObj.rotate.key)

// isCropping is now a computed property derived from currentEdit.
const isCropping = computed(() => currentEdit.value === editObj.cut.key)

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
  const imgWidth = img.naturalWidth
  const imgHeight = img.naturalHeight

  let displayWidth = imgWidth
  let displayHeight = imgHeight

  // Calculate scale factor to fit within max dimensions
  if (imgWidth > MAX_DISPLAY_WIDTH || imgHeight > MAX_DISPLAY_HEIGHT) {
    const widthRatio = MAX_DISPLAY_WIDTH / imgWidth
    const heightRatio = MAX_DISPLAY_HEIGHT / imgHeight
    const scaleFactor = Math.min(widthRatio, heightRatio)

    displayWidth = imgWidth * scaleFactor
    displayHeight = imgHeight * scaleFactor
  }

  // 設定 canvas 尺寸為圖片的原始尺寸或縮放後的尺寸
  canvas.width = displayWidth
  canvas.height = displayHeight
  const ctx = canvas.getContext('2d')
  ctx!.clearRect(0, 0, canvas.width, canvas.height) // Clear before drawing
  ctx!.drawImage(img, 0, 0, displayWidth, displayHeight)

  ctxRef.value = ctx
  drawAllTextElements()
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
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
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
  // If pen tool is selected, immediately add a new text element in the center.
  if (edit === editObj.pen.key) {
    if (imgCanvasRef.value) {
      const canvas = imgCanvasRef.value
      addNewText(canvas.width / 2, canvas.height / 2)
    }
  }
}

function rotateImg() {
  const ctx = ctxRef.value
  const img = imgElement.value
  const canvas = imgCanvasRef.value
  if (!ctx || !img || !canvas) return

  const imgWidth = img.naturalWidth
  const imgHeight = img.naturalHeight
  const rotationAngleRad = (angle.value * Math.PI) / 180

  // Calculate new canvas dimensions to fit the rotated image's bounding box
  const rotatedBoundingBoxWidth =
    Math.abs(imgWidth * Math.cos(rotationAngleRad)) +
    Math.abs(imgHeight * Math.sin(rotationAngleRad))
  const rotatedBoundingBoxHeight =
    Math.abs(imgWidth * Math.sin(rotationAngleRad)) +
    Math.abs(imgHeight * Math.cos(rotationAngleRad))

  let displayWidth = rotatedBoundingBoxWidth
  let displayHeight = rotatedBoundingBoxHeight
  let scaleFactor = 1

  // Calculate scale factor to fit within max display dimensions
  if (
    rotatedBoundingBoxWidth > MAX_DISPLAY_WIDTH ||
    rotatedBoundingBoxHeight > MAX_DISPLAY_HEIGHT
  ) {
    const widthRatio = MAX_DISPLAY_WIDTH / rotatedBoundingBoxWidth
    const heightRatio = MAX_DISPLAY_HEIGHT / rotatedBoundingBoxHeight
    scaleFactor = Math.min(widthRatio, heightRatio)

    displayWidth = rotatedBoundingBoxWidth * scaleFactor
    displayHeight = rotatedBoundingBoxHeight * scaleFactor
  }

  // Update canvas dimensions
  canvas.width = displayWidth
  canvas.height = displayHeight

  // Save the current canvas state
  ctx.save()

  // Translate to the center of the new canvas
  ctx.translate(displayWidth / 2, displayHeight / 2)

  // Rotate the canvas
  ctx.rotate(rotationAngleRad)

  // Draw the image centered on the new canvas origin, scaled
  ctx.drawImage(
    img,
    (-imgWidth * scaleFactor) / 2,
    (-imgHeight * scaleFactor) / 2,
    imgWidth * scaleFactor,
    imgHeight * scaleFactor,
  )

  // Restore the canvas state
  ctx.restore()
  drawAllTextElements()
}
function downloadImage() {
  const canvas = imgCanvasRef.value
  if (canvas) {
    const link = document.createElement('a')
    link.download = 'edited-image.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
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
    ctx.textAlign = 'right'

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
  const newText: TextElement = {
    id: Date.now(),
    content: '',
    color: 'white',
    size: 20,
    x: x,
    y: y,
    maxWidth: x - 10, // 修正：文字向左長，最大寬度就是 x 到邊緣的距離（保留 10px 邊界）
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
  const clickX = event.clientX - rect.left
  const clickY = event.clientY - rect.top

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
    const totalHeight = lineCount * textEl.size * 1.2

    // Bounding box check (修正為右對齊的多行區域)
    const isXMatch = clickX >= textEl.x - maxWidthSeen && clickX <= textEl.x
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

function handleBlur(event: FocusEvent) {
  const relatedTarget = event.relatedTarget as HTMLElement | null

  if (relatedTarget && (relatedTarget.id === 'textColor' || relatedTarget.id === 'textSize')) {
    return
  }
  isEditingText.value = false
  activeTextElementId.value = null
  drawCanvas()
}

function updateTextContent(id: number, value: string) {
  const textEl = textElements.value.find((el) => el.id === id)
  if (textEl) {
    textEl.content = value
    drawCanvas() // 重繪以確保資料同步（雖然編輯時該元素被隱藏）
  }
}

function onTextInput(id: number, event: Event) {
  const target = event.target as HTMLTextAreaElement
  updateTextContent(id, target.value)
  adjustTextareaHeight(target)
}

function updateTextColor(id: number, event: Event) {
  const target = event.target as HTMLInputElement
  const textEl = textElements.value.find((el) => el.id === id)
  if (textEl) {
    textEl.color = target.value
  }
}

function updateTextSize(id: number, event: Event) {
  const target = event.target as HTMLInputElement
  const textEl = textElements.value.find((el) => el.id === id)
  if (textEl) {
    textEl.size = parseInt(target.value)
  }
}

function selectTextElement(id: number) {
  activeTextElementId.value = id
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
      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY
      dragOffsetX = clientX - rect.left - textEl.x
      dragOffsetY = clientY - rect.top - textEl.y
    }
    event.stopPropagation()
  }
}

function handleGlobalMove(event: MouseEvent | TouchEvent) {
  if (isDraggingText && activeTextElementId.value !== null && imgCanvasRef.value) {
    const canvas = imgCanvasRef.value
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY

    const mouseX = clientX - rect.left - dragOffsetX
    const mouseY = clientY - rect.top - dragOffsetY

    const activeText = textElements.value.find((el) => el.id === activeTextElementId.value)
    if (activeText) {
      activeText.x = mouseX
      activeText.y = mouseY
      activeText.maxWidth = mouseX - 10
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

async function uploadImage() {
  const canvas = imgCanvasRef.value
  if (!canvas) return
  const cloudName = 'dkpitcfi9'
  const uploadPreset = 'wedding_'
  uiStore.showLoader()
  try {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) {
      throw new Error('Failed to get blob from canvas')
    }
    const formData = new FormData()
    formData.append('file', blob, 'edited-image.png')
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
          <div class="relative">
            <canvas
              ref="imgCanvasRef"
              id="imageCanvas"
              v-show="imagePreview && !isCropping"
              @click="handleCanvasClick"
            />
            <!-- @mousedown="handleCanvasMouseDown"
            @mousemove="handleCanvasMouseMove"
            @mouseup="handleCanvasMouseUp" -->
            <Cropper
              ref="cropperRef"
              :src="imagePreview"
              v-if="isCropping"
              style="width: 330px; height: auto"
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
                  transform: 'translateX(-100%)',
                  touchAction: 'none',
                }"
              >
                <textarea
                  v-if="activeTextElementId === textEl.id"
                  :id="`text-input-${textEl.id}`"
                  :value="textEl.content"
                  :style="{
                    fontSize: `${textEl.size}px`,
                    lineHeight: 1.2,
                    color: textEl.color,
                    border: 'none',
                    padding: '0',
                    background: 'transparent',
                    outline: '0',
                    textAlign: 'right',
                    width: `${textEl.maxWidth}px`,
                    height: 'auto',
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
                  @blur="handleBlur($event)"
                ></textarea>
              </div>
            </template>
          </div>
        </div>
        <div class="absolute bottom-[5px] z-2 w-full flex justify-center">
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
            @click="downloadImage"
          >
            <i class="mdi mdi-download text-2xl"></i>
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
  background-color: rgb(246, 224, 227);
}
.image-edit-bg {
  opacity: 0.8;
  background: url('../assets/image/uploadBg.jpg') no-repeat center center / 120% auto;
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
