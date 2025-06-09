<template>
  <div v-if="modelValue" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white p-6 rounded-lg shadow-lg w-full max-w-md space-y-4">
      <h2 class="text-lg font-bold">Draw Your Signature</h2>

      <canvas ref="canvasRef" class="w-full h-32 border rounded-sm bg-white"></canvas>

      <div class="flex justify-between mt-2">
        <button @click="clear" class="text-sm text-red-500 hover:underline">Clear</button>
        <div class="space-x-2">
          <button @click="emitClose" class="px-4 py-1 bg-gray-300 text-gray-800 rounded hover:bg-gray-400">Cancel</button>
          <button @click="save" class="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import SignaturePad from 'signature_pad'

const props = defineProps({
  modelValue: Boolean, // controls open/close
})
const emit = defineEmits(['update:modelValue', 'save'])

const canvasRef = ref(null)
let pad = null

const initPad = () => {
  if (canvasRef.value) {
    pad = new SignaturePad(canvasRef.value)
  }
}

const clear = () => pad && pad.clear()
const save = () => {
  if (pad && !pad.isEmpty()) {
    emit('save', pad.toDataURL())
    emitClose()
  } else {
    alert('Please draw your signature.')
  }
}
const emitClose = () => emit('update:modelValue', false)

watch(() => props.modelValue, (val) => {
  if (val) {
    setTimeout(() => initPad(), 100)
  }
})

onMounted(() => {
  initPad()
})
</script>

<style scoped>
canvas {
  touch-action: none;
}
</style>
