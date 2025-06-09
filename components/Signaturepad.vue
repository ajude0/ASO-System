<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
  >
    <div class="bg-white p-6 rounded-lg shadow-lg w-full max-w-screen-md space-y-4">
      <h2 class="text-lg font-bold">Draw Your Signature</h2>

      <canvas ref="canvasRef" class="w-full border rounded-sm bg-white"></canvas>

      <div class="flex justify-between mt-2">
        <button @click="clear" class="text-sm text-red-500 hover:underline">Clear</button>
        <div class="space-x-2">
          <button
            @click="emitClose"
            class="px-4 py-1 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            @click="save"
            class="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import SignaturePad from 'signature_pad'

const props = defineProps({
  modelValue: Boolean,
})
const emit = defineEmits(['update:modelValue', 'save'])

const canvasRef = ref(null)
let pad = null

const initPad = () => {
  const canvas = canvasRef.value
  if (!canvas) return

  const ratio = Math.max(window.devicePixelRatio || 1, 1)

  // Get the display size of the canvas in CSS pixels
  const width = canvas.offsetWidth
  const height = canvas.offsetHeight

  // Set the actual canvas size in device pixels
  canvas.width = width * ratio
  canvas.height = height * ratio

  // Make sure the canvas is styled correctly in CSS (optional but helpful)
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`

  // Scale the drawing context to match the new size
  const ctx = canvas.getContext('2d')
  ctx.setTransform(1, 0, 0, 1, 0, 0) // Reset any transforms
  ctx.scale(ratio, ratio)

  // Preserve old data if needed
  const data = pad?.toData()
  pad = new SignaturePad(canvas)
  if (data) pad.fromData(data)
}
const clear = () => {
  if (pad && canvasRef.value) {
    const canvas = canvasRef.value
    const ctx = canvas.getContext('2d')

    // Clear the entire canvas
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Clear the signature pad's internal state
    pad.clear()
  }
}
const save = () => {
  if (pad && !pad.isEmpty()) {
    emit('save', pad.toDataURL())
    emitClose()
  } else {
    alert('Please draw your signature.')
  }
}

const emitClose = () => emit('update:modelValue', false)

const onResize = () => {
  if (props.modelValue) initPad()
}

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      setTimeout(() => {
        initPad()
        window.addEventListener('resize', onResize)
      }, 100)
    } else {
      window.removeEventListener('resize', onResize)
    }
  }
)

onMounted(() => {
  if (props.modelValue) initPad()
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
})
</script>

<style scoped>
canvas {
  touch-action: none;
  width: 100%;
  height: 15rem;
}
</style>
