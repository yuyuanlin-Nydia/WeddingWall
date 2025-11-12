<script setup lang="ts">
import { ref, watch } from 'vue'
import { Cropper } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'

const imagePreview = ref<string | undefined>(undefined)
const imgElement = ref<null | HTMLImageElement>(null)
const imgCanvasRef = ref<null | HTMLCanvasElement>(null)
const ctxRef = ref<null | CanvasRenderingContext2D>(null)
const cropperRef = ref<any>(null)
const isCropping = ref<boolean>(false)
const angle = ref<number>(0)
const MAX_DISPLAY_WIDTH = window.innerWidth // Define your max width
const MAX_DISPLAY_HEIGHT = window.innerHeight // Define your max height
const editObj = {
  rotate: {
    key: 'rotate',
    name: '旋轉',
    icon: 'mdi-rotate-orbit',
  },
  pen: {
    key: 'pen',
    name: '畫筆',
    icon: 'mdi-format-text',
  },
  cut: {
    key: 'cut',
    name: '裁切',
    icon: 'mdi-crop',
  },
}
const currentEdit = ref<null | string>(editObj.rotate.key)

watch(angle, () => {
  rotateImg()
})

watch(currentEdit, (newValue) => {
  if (newValue !== editObj.cut.key) {
    isCropping.value = false
  }
})

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
  if (edit === editObj.cut.key) {
    isCropping.value = true
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

  // Clear the canvas

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
    console.log(canvas)
    if (canvas) {
      imagePreview.value = canvas.toDataURL()
      const img = new Image()
      img.src = imagePreview.value
      img.onload = () => {
        isCropping.value = false
        imgElement.value = img
        drawCanvas()
        currentEdit.value = null
      }
    }
  }
}
</script>

<template>
  <div class="image-edit-page flex justify-end items-center flex-col grow">
    <div class="function-bar self-end">
      <div
        class="cursor-pointer hover:rounded-full hover:bg-gray-300 w-10 h-10 flex justify-center items-center"
        @click="downloadImage"
        v-if="imagePreview"
      >
        <i class="mdi mdi-download text-2xl"></i>
      </div>
    </div>
    <template v-if="imagePreview">
      <div class="flex justify-center items-center flex-wrap grow">
        <canvas ref="imgCanvasRef" id="imageCanvas" v-show="imagePreview && !isCropping" />
        <Cropper
          ref="cropperRef"
          :src="imagePreview"
          v-if="isCropping"
          style="width: 100%; height: 100%"
        />
      </div>
      <div class="sticky bottom-15">
        <div v-if="currentEdit === editObj.rotate.key">
          <div>
            <input
              type="range"
              id="volume"
              name="volume"
              min="-270"
              max="270"
              v-model="angle"
              class="mr-1 py-1"
              @input="rotateImg"
            />
            <br />
            <div class="flex justify-center gap-4 items-center">
              <i
                class="mdi mdi-rotate-right-variant text-2xl text-white"
                @click="rotateAngle(90, 'cw')"
              ></i>
              <div
                class="bg-gray-300 text-center rounded-full flex flex-col justify-center"
                style="min-width: 58px; min-height: 58px"
              >
                <span>{{ angle }}</span>
              </div>
              <i
                class="mdi mdi-rotate-left-variant text-2xl text-white"
                @click="rotateAngle(90, 'ccw')"
              ></i>
            </div>
          </div>
        </div>
        <div v-if="currentEdit === editObj.cut.key && isCropping">
          <button
            @click="((isCropping = false), (currentEdit = null))"
            class="text-gray-700 bg-gray-300 px-2 py-1 rounded mr-2"
          >
            取消
          </button>
          <button @click="crop" class="text-gray-700 bg-amber-300 px-2 py-1 rounded">完成</button>
        </div>
        <div v-if="currentEdit === editObj.pen.key">畫筆</div>
      </div>
      <div class="flex justify-center gap-4 w-full sticky bottom-0 text-white p-3">
        <button
          :class="[
            'cursor-pointer px-2 py-1 rounded transition-colors flex flex-col',
            editItem.key === currentEdit
              ? 'bg-gray-200 text-gray-500 active:bg-gray-200 shadow-2xl'
              : 'bg-gray-500 text-white hover:bg-gray-200 hover:text-gray-500',
          ]"
          @click="setCurrentEdit(editItem.key)"
          v-for="editItem in Object.values(editObj)"
          :key="editItem.key"
        >
          <i :class="`mdi text-md ${editItem.icon}`"></i>
          <span class="text-xs">{{ editItem.name }}</span>
        </button>
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
</template>

<style scoped>
.function-bar {
  display: flex;
  justify-content: flex-end;
}
.image-edit-page {
  padding: 15px;
  background: url('../assets/image/uploadBg.jpg') no-repeat center center / 300%;
}
</style>
