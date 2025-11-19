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
    // Format: [{ documentId, page, x, y, width, height, imageSrc, datePosition }]
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
const prePlacedDateRefs = ref([]);
const dateDisplayRef = ref(null);

// User's draggable signature position
const userSignaturePos = ref({ x: 50, y: 50 });
const userSignatureSize = ref({ width: 128, height: 64 }); // Persistent size
const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });
const userSignaturePageIndex = ref(0);
const currentViewPage = ref(1);

// Date properties
const dateDisplayPos = ref({ x: 100, y: 100 });
const isDraggingDate = ref(false);
const dragOffsetDate = ref({ x: 0, y: 0 });
const currentDate = ref(new Date().toLocaleDateString());

// Resizing
const isResizing = ref(false);
const resizeStart = ref({ x: 0, y: 0, width: 0, height: 0 });

// Go to Page input
const goToPageNumber = ref(1);

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

    canvasRefs.value = [];
    prePlacedSigRefs.value = [];
    prePlacedDateRefs.value = [];

    await nextTick();

    for (let i = 1; i <= pdf.numPages; i++) {
      await renderPage(i);
    }

    await nextTick();
    updatePrePlacedPositions();
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

    await nextTick();
    updatePrePlacedPositions();
  } catch (error) {
    console.error('Error rendering page:', error);
  }
};

// Update pre-placed signatures and dates
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

  props.prePlacedSignatures.forEach((sig, sigIndex) => {
    if (!sig.datePosition) return;

    const pageIndex = sig.page - 1;
    const canvas = canvasRefs.value[pageIndex];

    const dateIndex = props.prePlacedSignatures
      .slice(0, sigIndex)
      .filter(s => s.datePosition).length;

    const dateElement = prePlacedDateRefs.value[dateIndex];
    if (!canvas || !dateElement) return;

    const canvasRect = canvas.getBoundingClientRect();
    const containerRect = containerRef.value.getBoundingClientRect();

    const dateLeft = canvasRect.left - containerRect.left + sig.datePosition.x;
    const dateTop = canvasRect.top - containerRect.top + sig.datePosition.y;

    dateElement.style.left = dateLeft + 'px';
    dateElement.style.top = dateTop + 'px';
  });
};

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
  // Drag signature
  if (isDragging.value) {
    const container = containerRef.value.getBoundingClientRect();
    const newX = e.clientX - container.left - dragOffset.value.x;
    const newY = e.clientY - container.top - dragOffset.value.y;
    userSignaturePos.value = { x: newX, y: newY };
    updateUserSignaturePage();
  }

  // Drag date
  if (isDraggingDate.value) {
    const container = containerRef.value.getBoundingClientRect();
    const newX = e.clientX - container.left - dragOffsetDate.value.x;
    const newY = e.clientY - container.top - dragOffsetDate.value.y;
    dateDisplayPos.value = { x: newX, y: newY };
  }

  // Resize
  if (isResizing.value) {
    const dx = e.clientX - resizeStart.value.x;
    const dy = e.clientY - resizeStart.value.y;
    userSignatureSize.value.width = Math.max(20, resizeStart.value.width + dx);
    userSignatureSize.value.height = Math.max(10, resizeStart.value.height + dy);
  }
};

const handleMouseUp = () => {
  isDragging.value = false;
  isDraggingDate.value = false;
  isResizing.value = false;
  updateUserSignaturePage();
};

// Resizing
const handleResizeMouseDown = (e) => {
  e.stopPropagation();
  isResizing.value = true;
  resizeStart.value = {
    x: e.clientX,
    y: e.clientY,
    width: userSignatureSize.value.width,
    height: userSignatureSize.value.height
  };
};

// Date drag handlers
const handleDateMouseDown = (e) => {
  isDraggingDate.value = true;
  const rect = dateDisplayRef.value.getBoundingClientRect();
  dragOffsetDate.value = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
};

// Calculate which page user's signature is on
const updateUserSignaturePage = () => {
  if (!userSignatureImg.value || canvasRefs.value.length === 0) return;
  const canvas = canvasRefs.value[currentViewPage.value - 1];
  if (!canvas) return;
  const sigRect = userSignatureImg.value.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  const sigCenterY = sigRect.top + sigRect.height / 2;
  if (sigCenterY >= canvasRect.top && sigCenterY <= canvasRect.bottom) {
    userSignaturePageIndex.value = currentViewPage.value - 1;
  }
};

// Save user's signature position
const saveUserSignaturePosition = () => {
  if (!userSignatureImg.value || canvasRefs.value.length === 0) return;
  const canvas = canvasRefs.value[userSignaturePageIndex.value];
  const canvasRect = canvas.getBoundingClientRect();
  const sigRect = userSignatureImg.value.getBoundingClientRect();

  const sigX = sigRect.left - canvasRect.left;
  const sigY = sigRect.top - canvasRect.top;

  const positionData = {
    page: userSignaturePageIndex.value + 1,
    x: Math.round(sigX),
    y: Math.round(sigY),
    width: Math.round(userSignatureSize.value.width),
    height: Math.round(userSignatureSize.value.height),
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    pdfLibY: Math.round(canvas.height - sigY - userSignatureSize.value.height),
    imageSrc: userSignatureSrc.value
  };

  if (dateDisplayRef.value) {
    const dateRect = dateDisplayRef.value.getBoundingClientRect();
    const dateX = dateRect.left - canvasRect.left;
    const dateY = dateRect.top - canvasRect.top;
    positionData.datePosition = {
      x: Math.round(dateX),
      y: Math.round(dateY),
      width: Math.round(dateRect.width),
      height: Math.round(dateRect.height),
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      dateText: currentDate.value
    };
  }

  emit('save-position', positionData);
  emit('close');
};

// Page navigation
const goToNextPage = () => {
  if (currentViewPage.value < totalPages.value) {
    currentViewPage.value++;
    nextTick(() => {
      updateUserSignaturePage();
      updatePrePlacedPositions();
    });
  }
};

const goToPrevPage = () => {
  if (currentViewPage.value > 1) {
    currentViewPage.value--;
    nextTick(() => {
      updateUserSignaturePage();
      updatePrePlacedPositions();
    });
  }
};

const scrollToPage = (pageNum) => {
  if (pageNum >= 1 && pageNum <= totalPages.value) {
    currentViewPage.value = pageNum;
    nextTick(() => {
      updateUserSignaturePage();
      updatePrePlacedPositions();
    });
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
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center w-full z-50"
    @click.self="emit('close')"
  >
    <div class="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col m-4">

      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b">
        <div>
          <h2 class="text-xl font-semibold">Sign PDF Document</h2>
          <p v-if="prePlacedSignatures.length > 0" class="text-xs text-gray-500 mt-1">
            {{ prePlacedSignatures.length }} pre-placed signature(s) already on document
          </p>
        </div>
        <button @click="emit('close')" class="p-2 hover:bg-gray-100 rounded-full transition">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Page Navigation + Go To Page -->
      <div class="mt-4 flex items-center justify-center gap-4 flex-wrap">
        <button
          @click="goToPrevPage"
          :disabled="currentViewPage === 1"
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Previous
        </button>

        <div class="text-sm font-semibold text-gray-700">
          Page {{ currentViewPage }} of {{ totalPages }}
        </div>

        <button
          @click="goToNextPage"
          :disabled="currentViewPage === totalPages"
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
        >
          Next
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <div class="flex items-center gap-2">
          <input
            type="number"
            min="1"
            :max="totalPages"
            v-model.number="goToPageNumber"
            @keydown.enter="scrollToPage(goToPageNumber)"
            class="border rounded px-2 py-1 w-16 text-sm"
            placeholder="Page #"
          />
          <button
            @click="scrollToPage(goToPageNumber)"
            class="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
          >
            Go
          </button>
        </div>
      </div>

      <!-- PDF Container -->
      <div class="flex-1 overflow-auto p-6">
        <div ref="containerRef" class="relative inline-block">
          <div class="relative border-2 border-gray-300 rounded shadow-sm">
            <div class="absolute -top-3 left-4 bg-white px-2 py-1 text-xs font-semibold text-gray-600 border rounded z-10">
              Page {{ currentViewPage }}
            </div>

            <canvas
              v-for="i in totalPages"
              :key="i"
              v-show="i === currentViewPage"
              :ref="el => { if (el) canvasRefs[i - 1] = el }"
              class="block"
            ></canvas>
          </div>

          <!-- Pre-placed Signatures -->
          <img
            v-for="(sig, index) in prePlacedSignatures"
            :key="'preplaced-' + index"
            :ref="el => { if (el) prePlacedSigRefs[index] = el }"
            v-show="sig.page === currentViewPage"
            :src="sig.imageSrc"
            class="absolute select-none pointer-events-none border-2 border-gray-400 rounded"
            :style="{ width: sig.width + 'px', height: sig.height + 'px' }"
          />

          <!-- Pre-placed Dates -->
          <div
            v-for="(sig, index) in prePlacedSignatures.filter(s => s.datePosition)"
            :key="'date-' + index"
            :ref="el => { if (el) prePlacedDateRefs[index] = el }"
            v-show="sig.page === currentViewPage"
            class="absolute select-none pointer-events-none text-md font-semibold text-gray-600 rounded px-2 py-1"
          >
            {{ sig.datePosition.dateText }}
          </div>

          <!-- User Signature -->
          <img
            v-if="userSignatureSrc"
            ref="userSignatureImg"
            :src="userSignatureSrc"
            class="absolute cursor-move select-none shadow-lg border-2 border-blue-500 rounded"
            :style="{ 
              left: userSignaturePos.x + 'px',
              top: userSignaturePos.y + 'px',
              width: userSignatureSize.width + 'px',
              height: userSignatureSize.height + 'px',
              zIndex: 100
            }"
            @mousedown="handleMouseDown"
            draggable="false"
            title="Drag to position your signature"
          />

          <!-- Resize Handle -->
          <div
            v-if="userSignatureSrc"
            class="absolute w-4 h-4 bg-blue-500 bottom-0 right-0 cursor-se-resize z-50"
            :style="{ 
              left: userSignaturePos.x + userSignatureSize.width - 8 + 'px',
              top: userSignaturePos.y + userSignatureSize.height - 8 + 'px'
            }"
            @mousedown="handleResizeMouseDown"
          ></div>

          <!-- Draggable Date -->
          <div
            ref="dateDisplayRef"
            class="absolute cursor-move select-none shadow-lg border-2 border-green-500 rounded px-3 py-1 bg-white z-50"
            :style="{ left: dateDisplayPos.x + 'px', top: dateDisplayPos.y + 'px', userSelect: 'none', fontSize: '14px', fontWeight: 'bold' }"
            @mousedown="handleDateMouseDown"
            draggable="false"
          >
            {{ currentDate }}
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
.select-none { user-select: none; }
.pointer-events-none { pointer-events: none; }
.space-y-4 > * + * { margin-top: 1rem; }
</style>
