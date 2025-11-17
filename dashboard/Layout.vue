<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';

// Props
const props = defineProps({
  isOpen: Boolean,
  pdfFile: File,
  signatureFile: File
});

// Emits
const emit = defineEmits(['close', 'saved']);

// Refs
const pdfCanvas = ref(null);
const signatureImg = ref(null);
const containerRef = ref(null);
const pdfData = ref(null);
const pdfPage = ref(null);
const signatureSrc = ref(null);

// Signature position and dragging
const signaturePos = ref({ x: 50, y: 50 });
const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });

// Load PDF when modal opens
watch(() => props.isOpen, async (newVal) => {
  if (newVal && props.pdfFile) {
    await loadPdf();
  }
});

// Load signature when provided
watch(() => props.signatureFile, (newFile) => {
  if (newFile) {
    signatureSrc.value = URL.createObjectURL(newFile);
  }
});

// Load PDF
const loadPdf = async () => {
  try {
    const pdfjsLib = window['pdfjs-dist/build/pdf'];
    const arrayBuffer = await props.pdfFile.arrayBuffer();
    pdfData.value = arrayBuffer;
    
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    const page = await pdf.getPage(1);
    pdfPage.value = page;
    
    const viewport = page.getViewport({ scale: 1.4 });
    const canvas = pdfCanvas.value;
    const ctx = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    await page.render({ canvasContext: ctx, viewport }).promise;
  } catch (error) {
    console.error('Error loading PDF:', error);
  }
};

// Drag handlers
const handleMouseDown = (e) => {
  isDragging.value = true;
  const rect = signatureImg.value.getBoundingClientRect();
  dragOffset.value = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
};

const handleMouseMove = (e) => {
  if (!isDragging.value) return;
  
  const container = containerRef.value.getBoundingClientRect();
  const newX = e.clientX - container.left - dragOffset.value.x;
  const newY = e.clientY - container.top - dragOffset.value.y;
  
  signaturePos.value = { x: newX, y: newY };
};

const handleMouseUp = () => {
  isDragging.value = false;
};

// Save PDF with signature
const savePdf = async () => {
  try {
    const { PDFDocument } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.load(pdfData.value);
    const page = pdfDoc.getPages()[0];
    
    const canvasRect = pdfCanvas.value.getBoundingClientRect();
    const sigRect = signatureImg.value.getBoundingClientRect();
    
    const x = sigRect.left - canvasRect.left;
    const y = canvasRect.height - (sigRect.top - canvasRect.top) - sigRect.height;
    
    // Embed signature image
    const pngBytes = await fetch(signatureSrc.value).then(r => r.arrayBuffer());
    const pngImage = await pdfDoc.embedPng(pngBytes);
    
    page.drawImage(pngImage, {
      x,
      y,
      width: sigRect.width,
      height: sigRect.height
    });
    
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'signed.pdf';
    link.click();
    
    emit('saved');
    emit('close');
  } catch (error) {
    console.error('Error saving PDF:', error);
  }
};

// Mount/unmount event listeners
onMounted(() => {
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
});

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
});
</script>

<template>
  <!-- Modal Overlay -->
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    @click.self="emit('close')"
  >
    <!-- Modal Content -->
    <div class="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-auto m-4">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
        <h2 class="text-xl font-semibold">Sign PDF Document</h2>
        <button
          @click="emit('close')"
          class="p-2 hover:bg-gray-100 rounded-full transition"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- PDF Container -->
      <div class="p-6">
        <div ref="containerRef" class="relative inline-block border-2 border-gray-300 rounded">
          <!-- PDF Canvas -->
          <canvas ref="pdfCanvas" class="block"></canvas>
          
          <!-- Signature Image (draggable) -->
          <img
            v-if="signatureSrc"
            ref="signatureImg"
            :src="signatureSrc"
            class="absolute cursor-move w-32 select-none"
            :style="{
              left: signaturePos.x + 'px',
              top: signaturePos.y + 'px',
              userSelect: 'none'
            }"
            @mousedown="handleMouseDown"
            draggable="false"
          />
        </div>

        <!-- Instructions -->
        <div class="mt-4 p-4 bg-blue-50 rounded-lg">
          <p class="text-sm text-blue-800">
            <strong>Instructions:</strong> Drag the signature to the desired position on the PDF, then click "Save Signed PDF" to download.
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
        <button
          @click="emit('close')"
          class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition"
        >
          Cancel
        </button>
        <button
          @click="savePdf"
          class="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          :disabled="!signatureSrc"
        >
          Save Signed PDF
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.select-none {
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}
</style>