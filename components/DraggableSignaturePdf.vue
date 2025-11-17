<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';

// Props
const props = defineProps({
  isOpen: Boolean,
  pdfFile: File,
  signatureFile: File,
  prePlacedSignatures: {
    type: Array,
    default: () => []
    // Format: [{ documentId, page, x, y, width, height, imageSrc }]
  }
});

// Emits
const emit = defineEmits(['close', 'save-position']);

// Refs
const containerRef = ref(null);
const userSignatureImg = ref(null);
const pdfData = ref(null);
const pdfDocument = ref(null);
const userSignatureSrc = ref(null);
const canvasRefs = ref([]);
const totalPages = ref(0);
const prePlacedSigRefs = ref([]);

// User's draggable signature position
const userSignaturePos = ref({ x: 50, y: 50 });
const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });
const userSignaturePageIndex = ref(0);

// Load PDF when modal opens
watch(() => props.isOpen, async (newVal) => {
  if (newVal && props.pdfFile) {
    await loadPdf();
  }
});

// Load user's signature when provided
watch(() => props.signatureFile, (newFile) => {
  if (newFile) {
    userSignatureSrc.value = URL.createObjectURL(newFile);
  }
});

// Load and render all PDF pages
const loadPdf = async () => {
  try {
    const pdfjsLib = window['pdfjs-dist/build/pdf'];
    const arrayBuffer = await props.pdfFile.arrayBuffer();
    pdfData.value = arrayBuffer;
    
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    pdfDocument.value = pdf;
    totalPages.value = pdf.numPages;
    
    // Clear previous canvases
    canvasRefs.value = [];
    
    // Wait for DOM update
    await nextTick();
    
    // Render all pages
    for (let i = 1; i <= pdf.numPages; i++) {
      await renderPage(i);
    }
    
    // Force update pre-placed signatures positions after rendering
    await nextTick();
    // Trigger a re-render by updating a reactive property
    if (containerRef.value) {
      containerRef.value.style.visibility = 'visible';
    }
  } catch (error) {
    console.error('Error loading PDF:', error);
  }
};

// Render specific page
const renderPage = async (pageNum) => {
  try {
    const page = await pdfDocument.value.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.4 });
    
    const canvas = canvasRefs.value[pageNum - 1];
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    await page.render({ canvasContext: ctx, viewport }).promise;
    
    // Update pre-placed signature positions after each page renders
    await nextTick();
    updatePrePlacedPositions();
  } catch (error) {
    console.error('Error rendering page:', error);
  }
};

// Calculate position for pre-placed signatures
const updatePrePlacedPositions = () => {
  if (!containerRef.value || canvasRefs.value.length === 0) return;
  
  props.prePlacedSignatures.forEach((sig, index) => {
    const pageIndex = sig.page - 1;
    const canvas = canvasRefs.value[pageIndex];
    const sigElement = prePlacedSigRefs.value[index];
    
    if (!canvas || !sigElement) return;
    
    const canvasRect = canvas.getBoundingClientRect();
    const containerRect = containerRef.value.getBoundingClientRect();
    
    const left = canvasRect.left - containerRect.left + sig.x;
    const top = canvasRect.top - containerRect.top + sig.y;
    
    sigElement.style.left = left + 'px';
    sigElement.style.top = top + 'px';
  });
};

// Watch for prop changes and update positions
watch(() => props.prePlacedSignatures, () => {
  nextTick(() => {
    updatePrePlacedPositions();
  });
}, { deep: true, immediate: true });

// Update positions when canvases are rendered
watch(canvasRefs, () => {
  if (canvasRefs.value.length > 0) {
    nextTick(() => {
      updatePrePlacedPositions();
    });
  }
}, { deep: true });

// Drag handlers for user's signature
const handleMouseDown = (e) => {
  isDragging.value = true;
  const rect = userSignatureImg.value.getBoundingClientRect();
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
  
  userSignaturePos.value = { x: newX, y: newY };
  updateUserSignaturePage();
};

const handleMouseUp = () => {
  isDragging.value = false;
  updateUserSignaturePage();
};

// Calculate which page user's signature is on
const updateUserSignaturePage = () => {
  if (!userSignatureImg.value || canvasRefs.value.length === 0) return;
  
  const sigRect = userSignatureImg.value.getBoundingClientRect();
  const sigCenterY = sigRect.top + sigRect.height / 2;
  
  for (let i = 0; i < canvasRefs.value.length; i++) {
    const canvas = canvasRefs.value[i];
    if (!canvas) continue;
    
    const canvasRect = canvas.getBoundingClientRect();
    if (sigCenterY >= canvasRect.top && sigCenterY <= canvasRect.bottom) {
      userSignaturePageIndex.value = i;
      return;
    }
  }
};

// Save user's signature position
const saveUserSignaturePosition = () => {
  if (!userSignatureImg.value || canvasRefs.value.length === 0) {
    console.error('Signature or canvas not found');
    return;
  }

  const canvas = canvasRefs.value[userSignaturePageIndex.value];
  const canvasRect = canvas.getBoundingClientRect();
  const sigRect = userSignatureImg.value.getBoundingClientRect();
  
  // Calculate relative position to the specific page
  const x = sigRect.left - canvasRect.left;
  const y = sigRect.top - canvasRect.top;
  
  const positionData = {
    page: userSignaturePageIndex.value + 1,
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(sigRect.width),
    height: Math.round(sigRect.height),
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    pdfLibY: Math.round(canvas.height - y - sigRect.height),
    imageSrc: userSignatureSrc.value
  };
  
  emit('save-position', positionData);
  emit('close');
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
    <div class="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col m-4">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b">
        <div>
          <h2 class="text-xl font-semibold">Sign PDF Document</h2>
          <p v-if="prePlacedSignatures.length > 0" class="text-xs text-gray-500 mt-1">
            {{ prePlacedSignatures.length }} pre-placed signature(s) already on document
          </p>
        </div>
        <button
          @click="emit('close')"
          class="p-2 hover:bg-gray-100 rounded-full transition"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- PDF Container (Scrollable) -->
      <div class="flex-1 overflow-auto p-6">
        <div ref="containerRef" class="relative inline-block">
          <!-- All PDF Pages -->
          <div class="space-y-4">
            <div
              v-for="i in totalPages"
              :key="i"
              class="relative border-2 border-gray-300 rounded shadow-sm"
            >
              <!-- Page Number Label -->
              <div class="absolute -top-3 left-4 bg-white px-2 py-1 text-xs font-semibold text-gray-600 border rounded z-10">
                Page {{ i }}
              </div>
              <canvas
                :ref="el => { if (el) canvasRefs[i - 1] = el }"
                class="block"
              ></canvas>
            </div>
          </div>
          
          <!-- Pre-placed Signatures (Read-only, non-draggable) -->
          <div
            v-for="(sig, index) in prePlacedSignatures"
            :key="'preplaced-' + index"
            :ref="el => { if (el) prePlacedSigRefs[index] = el }"
            class="absolute select-none pointer-events-none"
          >
            <img
              :src="sig.imageSrc"
              class="border-2 border-gray-400 rounded"
              :style="{
                width: sig.width + 'px',
                height: sig.height + 'px'
              }"
              :title="'Pre-placed signature on page ' + sig.page"
              draggable="false"
            />
          </div>
          
          <!-- User's Draggable Signature (Blue border) -->
          <img
            v-if="userSignatureSrc"
            ref="userSignatureImg"
            :src="userSignatureSrc"
            class="absolute cursor-move w-32 select-none shadow-lg border-2 border-blue-500 rounded"
            :style="{
              left: userSignaturePos.x + 'px',
              top: userSignaturePos.y + 'px',
              userSelect: 'none',
              zIndex: 100
            }"
            @mousedown="handleMouseDown"
            draggable="false"
            title="Drag to position your signature"
          />
        </div>

        <!-- Instructions -->
        <div class="mt-6 p-4 bg-blue-50 rounded-lg">
          <div class="text-sm text-blue-800">
            <p class="font-semibold mb-2">Instructions:</p>
            <ul class="list-disc list-inside space-y-1">
              <li v-if="prePlacedSignatures.length > 0">
                <span class="text-gray-600 font-semibold">Gray bordered signatures</span> are pre-placed and cannot be moved.
              </li>
              <li>
                <span class="text-blue-600 font-semibold">Your signature (blue border)</span> can be dragged to any position.
              </li>
              <li>Click "Save Position" when you're done positioning your signature.</li>
            </ul>
            <p v-if="userSignaturePageIndex !== null" class="mt-3 font-semibold">
              Your signature will be placed on: Page {{ userSignaturePageIndex + 1 }}
            </p>
          </div>
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
          @click="saveUserSignaturePosition"
          class="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          :disabled="!userSignatureSrc"
        >
          Save Position
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

.pointer-events-none {
  pointer-events: none;
}

.space-y-4 > * + * {
  margin-top: 1rem;
}
</style>