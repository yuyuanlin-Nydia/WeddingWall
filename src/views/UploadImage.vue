<script setup lang="ts">
import { ref } from 'vue'
import BaseButton from '../components/BaseButton.vue'

const imagePreview = ref<string | undefined>(undefined)
const imgElement = ref<null | HTMLImageElement>(null)
const imgCanvasRef = ref<null | HTMLCanvasElement>(null)
const ctxRef = ref<null | CanvasRenderingContext2D>(null)
const currentEdit = ref<null | string>(null)
const angle = ref<number>(0)
const MAX_DISPLAY_WIDTH = 500 // Define your max width
const MAX_DISPLAY_HEIGHT = 500 // Define your max height
const editObj = {
  rotate: {
    key: 'rotate',
    name: '旋轉',
  },
  pen: {
    key: 'pen',
    name: '畫筆',
  },
cut: {
    key: 'cut',
    name: '裁切',
  },
}

async function handleImageChange(event) {
  const fileList = event.target.files
  imagePreview.value = await previewImage(fileList[0])

  const img = new Image()
  img.src = imagePreview.value

  img.onload = () => {
    imgElement.value = img
    drawCanvas()
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
}

function setCurrentEdit(edit: string) {
  currentEdit.value = edit
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

  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)

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
</script>

<template>
  <div class="image-edit-page flex justify-end items-center flex-col grow">
    <div class="function-bar self-end">
      <BaseButton color="purple" className="mr-2 !p-0">
        <label class="cursor-pointer px-2 py-1">
          <input
            id="upload_img"
            style="display: none"
            type="file"
            accept="image/*"
            @change="handleImageChange"
          />
          <i class="fa fa-photo"></i> 上傳圖片
        </label>
      </BaseButton>

      <BaseButton class="ml-2" @click="downloadImage">下載圖片</BaseButton>
    </div>
    <template v-if="imagePreview">
      <div class="flex justify-center items-center flex-wrap grow">
        <canvas ref="imgCanvasRef" id="imageCanvas" v-if="imagePreview" />
      </div>
      <div class="sticky bottom-15">
        <div v-if="currentEdit === editObj.rotate.key">
          <div>
            <label for="volume" class="align-top mr-1">角度</label>
            <input
              type="range"
              id="volume"
              name="volume"
              min="-360"
              max="360"
              v-model="angle"
              class="py-1"
              @input="rotateImg"
            />
            <div
              class="inline-block px-3 mx-2 border-1 border-b-black align-top text-center"
              style="min-width: 58px"
            >
              <span>{{ angle }}</span>
            </div>
          </div>
        </div>
        <div v-if="currentEdit === editObj.cut.key">裁切</div>
        <div v-if="currentEdit === editObj.pen.key">畫筆</div>
      </div>
      <div class="flex justify-center gap-10 w-full sticky bottom-0 text-white p-3 bg-gray-600">
        <button
          :class="[
            'cursor-pointer px-3 py-1 rounded transition-colors',
            editItem.key === currentEdit
              ? 'bg-gray-200 text-gray-500 active:bg-gray-200 shadow-2xl'
              : 'bg-gray-500 text-white hover:bg-gray-200 hover:text-gray-500',
          ]"
          @click="setCurrentEdit(editItem.key)"
          v-for="editItem in Object.values(editObj)"
          :key="editItem.key"
        >
          {{ editItem.name }}
        </button>
      </div>
    </template>
    <template v-else>
      <div class="flex justify-center items-center flex-wrap grow">
        <p class="rounded-xl p-14 text-gray-600 bg-white/60">請上傳你和新郎/新娘的專屬回憶和祝福</p>
      </div></template
    >
  </div>
</template>

<style scoped>
.function-bar {
  display: flex;
  justify-content: flex-end;
}
.image-edit-page {
  padding: 20px;
  background: url('../assets/image/uploadBg.jpg') no-repeat center 100% / 100%;
}
</style>
