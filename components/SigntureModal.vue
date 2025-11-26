<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick, reactive } from 'vue';

// Props
const props = defineProps({
  isOpen: Boolean,
  pdfFile: File,
  signatureFile: File,
  currentUserName: String,
  currentEmplId: String,
  prePlacedSignatures: {
    type: Array,
    default: () => []
  }
});

// Emits
const emit = defineEmits(['close', 'apply-signature', 'save-all-signatures']);

// Refs
const containerRef = ref(null);
const pdfDocument = ref(null);
const userSignatureSrc = ref(null);
const canvasRefs = ref([]);
const totalPages = ref(0);
const prePlacedSigRefs = ref([]);
const prePlacedDateRefs = ref([]);
const currentViewPage = ref(1);
const currentDate = ref(new Date().toLocaleDateString());
const goToPageNumber = ref(1);
const SMALL_SIG_WIDTH = 140;
const SMALL_SIG_HEIGHT = 75;

const isSmallSignatureBox = (sig) => {
  return sig.width <= SMALL_SIG_WIDTH || sig.height <= SMALL_SIG_HEIGHT;
};

// Editing state for placed signatures
const editingSignatureIndex = ref(null);
const isDraggingSignature = ref(false);
const isResizingSignature = ref(false);
const isDraggingDate = ref(false);
const currentDraggingDateIndex = ref(null);
const dragOffsetSig = ref({ x: 0, y: 0 });
const dragOffsetDate = ref({ x: 0, y: 0 });
const resizeStartSig = ref({ x: 0, y: 0, width: 0, height: 0 });

// Create a reactive copy of the prePlacedSignatures (local working copy)
const localSignatures = reactive([]);

// Initialize local signatures when modal opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    // Create a fresh deep copy when modal opens
    localSignatures.length = 0;
    props.prePlacedSignatures.forEach(sig => {
      localSignatures.push({
        ...sig,
        datePosition: sig.datePosition ? { ...sig.datePosition } : null
      });
    });
  }
}, { immediate: true });

// Load PDF when modal opens (separate watch)
watch(() => [props.isOpen, props.pdfFile], async ([isOpen, pdfFile]) => {
  if (isOpen && pdfFile) {
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

// Update pre-placed signatures positions
const updatePrePlacedPositions = () => {
  if (!containerRef.value || canvasRefs.value.length === 0) return;

  localSignatures.forEach((sig, index) => {
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

  localSignatures.forEach((sig, sigIndex) => {
    if (!sig.datePosition) return;

    const pageIndex = sig.page - 1;
    const canvas = canvasRefs.value[pageIndex];

    const dateIndex = localSignatures
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

// Check if current user can sign this box
const canUserSign = (sig) => {
  return sig.isEmpty && sig.assignedEmplId === props.currentEmplId;
};

// Check if user can edit this signature
const canUserEdit = (sig) => {
  return !sig.isEmpty && sig.assignedEmplId === props.currentEmplId;
};

// Track if user actually dragged (to distinguish from click)
const draggedDistance = ref(0);
const dragStartPos = ref({ x: 0, y: 0 });

// Handle clicking on signature boxes
const handlePrePlacedClick = (sig, index) => {
  // If user dragged, don't treat as click
  if (draggedDistance.value > 5) {
    return;
  }

  // If already signed by current user, allow editing
  if (canUserEdit(sig)) {
    editingSignatureIndex.value = index;
    return;
  }

  // If empty and assigned to user, sign it
  if (!canUserSign(sig)) {
    if (!sig.isEmpty) {
      return; // Already signed by someone else
    }
    if (sig.assignedEmplId !== props.currentEmplId) {
      alert(`This signature box is assigned to "${sig.assignedTo}". You cannot sign here.`);
      return;
    }
  }

  if (!userSignatureSrc.value) {
    alert('Please upload your signature first!');
    return;
  }

  // Apply signature locally (no emit yet)
  localSignatures[index] = {
    ...sig,
    imageSrc: userSignatureSrc.value,
    isEmpty: false,
    signedBy: props.currentUserName,
    signedDate: currentDate.value,
    datePosition: sig.datePosition ? {
      ...sig.datePosition,
      dateText: currentDate.value
    } : null
  };
};

// Start dragging signature
const startDraggingSignature = (e, index) => {
  const sig = localSignatures[index];
  if (!canUserEdit(sig)) return;

  e.stopPropagation();
  e.preventDefault();
  isDraggingSignature.value = true;
  editingSignatureIndex.value = index;
  draggedDistance.value = 0;

  const canvas = canvasRefs.value[sig.page - 1];
  const canvasRect = canvas.getBoundingClientRect();

  dragStartPos.value = {
    x: e.clientX,
    y: e.clientY
  };

  dragOffsetSig.value = {
    x: e.clientX - canvasRect.left - sig.x,
    y: e.clientY - canvasRect.top - sig.y
  };
};

// Start dragging date
const startDraggingDate = (e, sigIndex) => {
  const sig = localSignatures[sigIndex];
  if (!canUserEdit(sig) || !sig.datePosition) return;

  e.stopPropagation();
  e.preventDefault();
  isDraggingDate.value = true;
  currentDraggingDateIndex.value = sigIndex;
  draggedDistance.value = 0;

  const canvas = canvasRefs.value[sig.page - 1];
  const canvasRect = canvas.getBoundingClientRect();

  dragStartPos.value = {
    x: e.clientX,
    y: e.clientY
  };

  dragOffsetDate.value = {
    x: e.clientX - canvasRect.left - sig.datePosition.x,
    y: e.clientY - canvasRect.top - sig.datePosition.y
  };
};

// Drag signature
const dragSignature = (e) => {
  if (!isDraggingSignature.value || editingSignatureIndex.value === null) return;

  const dx = e.clientX - dragStartPos.value.x;
  const dy = e.clientY - dragStartPos.value.y;
  draggedDistance.value = Math.sqrt(dx * dx + dy * dy);

  const sig = localSignatures[editingSignatureIndex.value];
  const canvas = canvasRefs.value[sig.page - 1];
  const canvasRect = canvas.getBoundingClientRect();

  const oldX = sig.x;
  const oldY = sig.y;

  const newX = e.clientX - canvasRect.left - dragOffsetSig.value.x;
  const newY = e.clientY - canvasRect.top - dragOffsetSig.value.y;

  sig.x = Math.max(0, Math.min(newX, canvas.width - sig.width));
  sig.y = Math.max(0, Math.min(newY, canvas.height - sig.height));

  // Move the date along with the signature
  if (sig.datePosition) {
    const deltaX = sig.x - oldX;
    const deltaY = sig.y - oldY;

    sig.datePosition.x += deltaX;
    sig.datePosition.y += deltaY;

    // Keep date within canvas bounds
    sig.datePosition.x = Math.max(0, Math.min(sig.datePosition.x, canvas.width - 100));
    sig.datePosition.y = Math.max(0, Math.min(sig.datePosition.y, canvas.height - 30));
  }

  // Update visual position
  nextTick(() => updatePrePlacedPositions());
};

// Drag date
const dragDate = (e) => {
  if (!isDraggingDate.value || currentDraggingDateIndex.value === null) return;

  const dx = e.clientX - dragStartPos.value.x;
  const dy = e.clientY - dragStartPos.value.y;
  draggedDistance.value = Math.sqrt(dx * dx + dy * dy);

  const sig = localSignatures[currentDraggingDateIndex.value];
  if (!sig.datePosition) return;

  const canvas = canvasRefs.value[sig.page - 1];
  const canvasRect = canvas.getBoundingClientRect();

  const newX = e.clientX - canvasRect.left - dragOffsetDate.value.x;
  const newY = e.clientY - canvasRect.top - dragOffsetDate.value.y;

  sig.datePosition.x = Math.max(0, Math.min(newX, canvas.width - 100));
  sig.datePosition.y = Math.max(0, Math.min(newY, canvas.height - 30));

  // Update visual position
  nextTick(() => updatePrePlacedPositions());
};

// Start resizing signature
const startResizingSignature = (e, index) => {
  const sig = localSignatures[index];
  if (!canUserEdit(sig)) return;

  e.stopPropagation();
  isResizingSignature.value = true;
  editingSignatureIndex.value = index;

  const canvas = canvasRefs.value[sig.page - 1];
  const canvasRect = canvas.getBoundingClientRect();

  resizeStartSig.value = {
    x: e.clientX - canvasRect.left,
    y: e.clientY - canvasRect.top,
    width: sig.width,
    height: sig.height
  };
};

// Resize signature
const resizeSignature = (e) => {
  if (!isResizingSignature.value || editingSignatureIndex.value === null) return;

  const sig = localSignatures[editingSignatureIndex.value];
  const canvas = canvasRefs.value[sig.page - 1];
  const canvasRect = canvas.getBoundingClientRect();

  const currentX = e.clientX - canvasRect.left;
  const currentY = e.clientY - canvasRect.top;
  const dx = currentX - resizeStartSig.value.x;
  const dy = currentY - resizeStartSig.value.y;

  const newWidth = Math.max(50, resizeStartSig.value.width + dx);
  const newHeight = Math.max(30, resizeStartSig.value.height + dy);

  sig.width = newWidth;
  sig.height = newHeight;

  // Update visual position
  nextTick(() => updatePrePlacedPositions());
};

// Handle mouse move
const handleMouseMove = (e) => {
  if (isDraggingSignature.value) {
    dragSignature(e);
  } else if (isDraggingDate.value) {
    dragDate(e);
  } else if (isResizingSignature.value) {
    resizeSignature(e);
  }
};

// Handle mouse up
const handleMouseUp = () => {
  isDraggingSignature.value = false;
  isDraggingDate.value = false;
  isResizingSignature.value = false;
  currentDraggingDateIndex.value = null;

  // Reset drag distance after a short delay to allow click handler to check it
  setTimeout(() => {
    draggedDistance.value = 0;
  }, 100);
};

// Count signatures for current user
const getMyPendingSignatures = () => {
  return localSignatures.filter(s => s.isEmpty && s.assignedEmplId === props.currentEmplId).length;
};

const getMyCompletedSignatures = () => {
  return localSignatures.filter(s => !s.isEmpty && s.signedBy === props.currentUserName).length;
};

// Page navigation
const goToNextPage = () => {
  if (currentViewPage.value < totalPages.value) {
    currentViewPage.value++;
    nextTick(() => {
      updatePrePlacedPositions();
    });
  }
};

const goToPrevPage = () => {
  if (currentViewPage.value > 1) {
    currentViewPage.value--;
    nextTick(() => {
      updatePrePlacedPositions();
    });
  }
};

const scrollToPage = (pageNum) => {
  if (pageNum >= 1 && pageNum <= totalPages.value) {
    currentViewPage.value = pageNum;
    nextTick(() => {
      updatePrePlacedPositions();
    });
  }
};

// Save all changes when clicking Done
const handleDone = () => {
  // Emit all signature changes
  emit('save-all-signatures', [...localSignatures]);
  emit('close');
};

// Mount/unmount event listeners
onMounted(() => {
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  window.addEventListener('resize', updatePrePlacedPositions);
});

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
  window.removeEventListener('resize', updatePrePlacedPositions);
});
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center w-full z-50"
    @click.self="emit('close')">
    <div class="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col m-4">

      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b">
        <div>
          <h2 class="text-xl font-semibold">Sign PDF Document</h2>
          <p class="text-sm text-gray-600 mt-1">Signing as: <span class="font-semibold text-blue-600">{{ currentUserName
          }}</span></p>
          <div class="flex gap-4 mt-2 text-xs">
            <p class="text-green-600">
              ✓ Completed: {{ getMyCompletedSignatures() }}
            </p>
            <p class="text-orange-600">
              ⏳ Pending: {{ getMyPendingSignatures() }}
            </p>
          </div>
        </div>
        <button @click="emit('close')" class="p-2 hover:bg-gray-100 rounded-full transition">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Page Navigation -->
      <div class="mt-4 flex items-center justify-center gap-4 flex-wrap">
        <button @click="goToPrevPage" :disabled="currentViewPage === 1"
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Previous
        </button>

        <div class="text-sm font-semibold text-gray-700">
          Page {{ currentViewPage }} of {{ totalPages }}
        </div>

        <button @click="goToNextPage" :disabled="currentViewPage === totalPages"
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2">
          Next
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <div class="flex items-center gap-2">
          <input type="number" min="1" :max="totalPages" v-model.number="goToPageNumber"
            @keydown.enter="scrollToPage(goToPageNumber)" class="border rounded px-2 py-1 w-16 text-sm"
            placeholder="Page #" />
          <button @click="scrollToPage(goToPageNumber)" class="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm">
            Go
          </button>
        </div>
      </div>

      <!-- PDF Container -->
      <div class="flex-1 overflow-auto p-6">
        <div ref="containerRef" class="relative inline-block">
          <div class="relative border-2 border-gray-300 rounded shadow-sm">
            <div
              class="absolute -top-3 left-4 bg-white px-2 py-1 text-xs font-semibold text-gray-600 border rounded z-10">
              Page {{ currentViewPage }}
            </div>

            <canvas v-for="i in totalPages" :key="i" v-show="i === currentViewPage"
              :ref="el => { if (el) canvasRefs[i - 1] = el }" class="block"></canvas>
          </div>

          <!-- Pre-placed Signature Boxes -->
          <div v-for="(sig, index) in localSignatures" :key="'preplaced-' + index"
            :ref="el => { if (el) prePlacedSigRefs[index] = el }" v-show="sig.page === currentViewPage"
            class="absolute rounded transition-all group" :class="{
              'border-2 border-dashed border-green-500 bg-green-50 cursor-pointer hover:bg-green-100 hover:border-green-600': canUserSign(sig),
              'border-2 border-dashed border-gray-300 bg-gray-50 cursor-not-allowed': sig.isEmpty && sig.assignedEmplId !== currentEmplId,
              'border-2 border-blue-500 bg-blue-50': canUserEdit(sig) && editingSignatureIndex === index,
              'border-2 border-blue-400 bg-blue-50 hover:border-blue-600': canUserEdit(sig) && editingSignatureIndex !== index,
              'border-2 border-gray-400 bg-gray-100': !sig.isEmpty && sig.signedBy !== currentUserName,
              'cursor-move': canUserEdit(sig)
            }" :style="{ width: sig.width + 'px', height: sig.height + 'px', left: sig.x + 'px', top: sig.y + 'px' }"
            @mouseup="handlePrePlacedClick(sig, index)"
            @mousedown="canUserEdit(sig) ? startDraggingSignature($event, index) : null"
            :title="sig.isEmpty ? `Assigned to: ${sig.assignedTo}` : `Signed by: ${sig.signedBy}`">
            <!-- Empty signature box (for current user) -->
            <div v-if="canUserSign(sig)"
              class="flex flex-col items-center justify-center h-full p-2 pointer-events-none relative">
              <!-- Text above box when too small -->
              <div v-if="isSmallSignatureBox(sig)"
                class="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded whitespace-nowrap z-10 border border-green-300 shadow-md">
                <span class="flex items-center">
                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Click to sign
                </span>
                <div
                  class="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-green-100">
                </div>
              </div>

              <!-- Text inside box when large enough -->
              <div v-else class="flex flex-col items-center justify-center h-full">
                <svg class="w-8 h-8 text-green-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <p class="text-xs text-green-700 font-semibold text-center">Click to sign</p>
                <p class="text-xs text-green-600 mt-1 text-center">{{ sig.assignedTo }}</p>
              </div>
            </div>

            <!-- Empty signature box (for other users) -->
            <div v-else-if="sig.isEmpty"
              class="flex flex-col items-center justify-center h-full p-2 pointer-events-none">
              <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <p class="text-xs text-gray-500 mt-1 text-center font-semibold">{{ sig.assignedTo }}</p>
              <p class="text-xs text-gray-400 text-center">(Pending)</p>
            </div>

            <!-- Filled signature -->
            <div v-else class="relative w-full h-full">
              <img :src="sig.imageSrc" class="w-full h-full object-contain select-none pointer-events-none" />

              <!-- Signed by text above box when too small -->
              <div v-if="isSmallSignatureBox(sig)"
                class="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded whitespace-nowrap z-10 border border-blue-300 shadow-md">
                {{ sig.signedBy }}
                <div
                  class="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-blue-100">
                </div>
              </div>

              <!-- Signed by text inside box when large enough -->
              <div v-else
                class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs px-2 py-1 text-center pointer-events-none">
                {{ sig.signedBy }}
              </div>
              <!-- Edit hint for user's own signature -->
              <div v-if="canUserEdit(sig)"
                class="absolute top-0 left-0 right-0 bg-blue-500 text-white text-xs px-2 py-1 text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Click to edit • Drag to move
              </div>

              <!-- Resize handle for user's own signature -->
              <div v-if="canUserEdit(sig)"
                class="absolute w-4 h-4 bg-blue-500 rounded-full -bottom-1 -right-1 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity z-10"
                @mousedown.stop="startResizingSignature($event, index)"></div>
            </div>
          </div>

          <!-- Dates for signed signatures - NOW DRAGGABLE -->
          <div v-for="(sig, index) in localSignatures.filter(s => s.datePosition)" :key="'date-' + index"
            :ref="el => { if (el) prePlacedDateRefs[index] = el }" v-show="sig.page === currentViewPage"
            class="absolute select-none text-sm font-semibold text-gray-700 rounded px-2 py-1 border border-gray-300 bg-gray-50 transition-all"
            :class="{
              'cursor-move hover:bg-gray-200 hover:border-gray-500': canUserEdit(sig),
              'cursor-default': !canUserEdit(sig)
            }" :style="{ left: sig.datePosition.x + 'px', top: sig.datePosition.y + 'px' }"
            @mousedown="canUserEdit(sig) ? startDraggingDate($event, index) : null"
            :title="canUserEdit(sig) ? 'Drag to move date' : ''">
            {{ sig.datePosition.dateText }}
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between p-4 border-t bg-gray-50">
        <div class="text-sm text-gray-600">
          <p class="font-semibold">💡 Tips:</p>
          <p>• Click green boxes to sign</p>
          <p>• Click your signatures to edit, drag to move, resize from corner</p>
          <p>• Drag date fields independently to reposition them</p>
          <p class="text-orange-600 mt-2">⚠️ Changes will only be saved when you click "Done"</p>
        </div>
        <button @click="handleDone" class="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
          Done
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.select-none {
  user-select: none;
}

.pointer-events-none {
  pointer-events: none;
}
</style>