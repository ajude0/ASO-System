<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick, reactive, computed, watchEffect } from 'vue';

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

watchEffect(() => {
  console.log('signatureFile in modal:', props.signatureFile)
})

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

// Check if sequential order is enforced
const isSequentialOrderEnforced = computed(() => {
  return localSignatures.some(sig => sig.enforceSequentialOrder === true);
});

// Get the current approval order that should be signing
const getCurrentRequiredOrder = computed(() => {
  if (!isSequentialOrderEnforced.value) return null;

  // Find the lowest order number that is still empty
  const emptyOrders = localSignatures
    .filter(sig => sig.isEmpty)
    .map(sig => sig.approvalOrder || 1);

  return emptyOrders.length > 0 ? Math.min(...emptyOrders) : null;
});

// Check if user is waiting (sequential order is on and it's not their turn)
const isUserWaiting = (sig) => {
  if (!isSequentialOrderEnforced.value) return false;
  if (!sig.isEmpty) return false;
  if (sig.assignedEmplId !== props.currentEmplId) return false;

  const currentOrder = getCurrentRequiredOrder.value;
  const sigOrder = sig.approvalOrder || 1;

  return sigOrder > currentOrder;
};

// Get who needs to sign next
const getNextSignerInfo = computed(() => {
  if (!isSequentialOrderEnforced.value) return null;

  const nextOrder = getCurrentRequiredOrder.value;
  if (!nextOrder) return null;

  const nextSig = localSignatures.find(sig =>
    sig.isEmpty && sig.approvalOrder === nextOrder
  );

  return nextSig ? {
    name: nextSig.assignedTo,
    order: nextSig.approvalOrder
  } : null;
});

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

// Load user's signature when provided - FIXED: Added immediate: true
watch(() => props.signatureFile, (newFile) => {
  if (newFile) {
    // Clean up old URL if exists
    if (userSignatureSrc.value) {
      URL.revokeObjectURL(userSignatureSrc.value);
    }
    userSignatureSrc.value = URL.createObjectURL(newFile);
    console.log('Signature loaded:', userSignatureSrc.value);
  }
}, { immediate: true }); // CRITICAL FIX: This ensures signature is loaded when modal opens

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
  // Can't sign if already signed
  if (!sig.isEmpty) return false;

  // Can't sign if not assigned to user
  if (sig.assignedEmplId !== props.currentEmplId) return false;

  // Can't sign if waiting for sequential order
  if (isUserWaiting(sig)) return false;

  return true;
};

const currentUser = (sig) => {
  return sig.assignedEmplId === props.currentEmplId;
};

// Check if user can edit this signature
const canUserEdit = (sig) => {
  return !sig.isEmpty && sig.assignedEmplId === props.currentEmplId;
};

// Check if signature is locked
const isSignatureLocked = (sig) => {
  return sig.signatureLock === true;
};

// Check if date is locked
const isDateLocked = (sig) => {
  return sig.dateLock === true;
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

  // Check if user is waiting due to sequential order
  if (isUserWaiting(sig)) {
    const nextSigner = getNextSignerInfo.value;
    alert(`Sequential approval is enabled. Waiting for "${nextSigner?.name}" (Signer Number ${nextSigner?.order}) to sign first.`);
    return;
  }

  // If not assigned to user
  if (sig.assignedEmplId !== props.currentEmplId) {
    if (!sig.isEmpty) {
      return; // Already signed by someone else
    }
    alert(`This signature box is assigned to "${sig.assignedTo}". You cannot sign here.`);
    return;
  }

  // If empty and assigned to user, sign it
  if (!canUserSign(sig)) {
    return;
  }

  // FIXED: Better error message with debugging info
  if (!userSignatureSrc.value) {
    console.error('Signature check failed:', {
      signatureFile: props.signatureFile,
      userSignatureSrc: userSignatureSrc.value
    });
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

// Start dragging signature - CHECK LOCK
const startDraggingSignature = (e, index) => {
  const sig = localSignatures[index];
  if (!canUserEdit(sig) || isSignatureLocked(sig)) return;

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

// Start dragging date - CHECK LOCK
const startDraggingDate = (e, sigIndex) => {
  const sig = localSignatures[sigIndex];
  if (!canUserEdit(sig) || !sig.datePosition || isDateLocked(sig)) return;

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

  const sig = localSignatures[editingSignatureIndex.value];
  if (isSignatureLocked(sig)) return;

  const dx = e.clientX - dragStartPos.value.x;
  const dy = e.clientY - dragStartPos.value.y;
  draggedDistance.value = Math.sqrt(dx * dx + dy * dy);

  const canvas = canvasRefs.value[sig.page - 1];
  const canvasRect = canvas.getBoundingClientRect();

  const oldX = sig.x;
  const oldY = sig.y;

  const newX = e.clientX - canvasRect.left - dragOffsetSig.value.x;
  const newY = e.clientY - canvasRect.top - dragOffsetSig.value.y;

  sig.x = Math.max(0, Math.min(newX, canvas.width - sig.width));
  sig.y = Math.max(0, Math.min(newY, canvas.height - sig.height));

  // Move the date along with the signature (if date is not locked)
  if (sig.datePosition && !isDateLocked(sig)) {
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

  const sig = localSignatures[currentDraggingDateIndex.value];
  if (isDateLocked(sig)) return;

  const dx = e.clientX - dragStartPos.value.x;
  const dy = e.clientY - dragStartPos.value.y;
  draggedDistance.value = Math.sqrt(dx * dx + dy * dy);

  const canvas = canvasRefs.value[sig.page - 1];
  const canvasRect = canvas.getBoundingClientRect();

  const newX = e.clientX - canvasRect.left - dragOffsetDate.value.x;
  const newY = e.clientY - canvasRect.top - dragOffsetDate.value.y;

  sig.datePosition.x = Math.max(0, Math.min(newX, canvas.width - 100));
  sig.datePosition.y = Math.max(0, Math.min(newY, canvas.height - 30));

  // Update visual position
  nextTick(() => updatePrePlacedPositions());
};

// Start resizing signature - CHECK LOCK
const startResizingSignature = (e, index) => {
  const sig = localSignatures[index];
  if (!canUserEdit(sig) || isSignatureLocked(sig)) return;

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
  if (isSignatureLocked(sig)) return;

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

const getMyWaitingSignatures = () => {
  return localSignatures.filter(s => isUserWaiting(s)).length;
};

// Get all user's signatures organized by status
const mySignatures = computed(() => {
  const ready = [];
  const waiting = [];
  const completed = [];

  localSignatures.forEach((sig, index) => {
    if (sig.assignedEmplId !== props.currentEmplId) return;

    if (!sig.isEmpty) {
      completed.push({ ...sig, index });
    } else if (isUserWaiting(sig)) {
      waiting.push({ ...sig, index });
    } else {
      ready.push({ ...sig, index });
    }
  });

  return { ready, waiting, completed };
});

// Navigate to specific signature
const highlightedSignatureIndex = ref(null);
const goToSignature = (sig) => {
  currentViewPage.value = sig.page;
  highlightedSignatureIndex.value = sig.index;

  nextTick(() => {
    updatePrePlacedPositions();
    
    // Scroll the signature into view
    const sigElement = prePlacedSigRefs.value[sig.index];
    if (sigElement && containerRef.value?.parentElement) {
      sigElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Clear highlight after 3 seconds
    setTimeout(() => {
      highlightedSignatureIndex.value = null;
    }, 3000);
  });
};

// Cycle through user's signable boxes
const currentSignatureNavigationIndex = ref(0);
const findNextSignature = () => {
  const signableBoxes = mySignatures.value.ready;
  
  if (signableBoxes.length === 0) {
    alert('No signatures available to sign!');
    return;
  }

  const nextSig = signableBoxes[currentSignatureNavigationIndex.value];
  goToSignature(nextSig);

  currentSignatureNavigationIndex.value = (currentSignatureNavigationIndex.value + 1) % signableBoxes.length;
};

// Show/hide sidebar
const showSidebar = ref(true);

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

// Cleanup on unmount
onUnmounted(() => {
  if (userSignatureSrc.value) {
    URL.revokeObjectURL(userSignatureSrc.value);
  }
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
  window.removeEventListener('resize', updatePrePlacedPositions);
});

// Mount event listeners
onMounted(() => {
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  window.addEventListener('resize', updatePrePlacedPositions);
});
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center w-full z-50"
    @click.self="emit('close')">
    <div class="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] flex flex-col m-4">

      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b">
        <div class="flex-1">
          <h2 class="text-xl font-semibold">Sign PDF Document</h2>
          <p class="text-sm text-gray-600 mt-1">Signing as: <span class="font-semibold text-blue-600">{{ currentUserName
          }}</span></p>

          <div v-if="isSequentialOrderEnforced && getNextSignerInfo"
            class="mt-2 text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded border border-blue-200">
            🔄 Sequential Order: Waiting for <strong>{{ getNextSignerInfo.name }}</strong> (Signer Number {{
              getNextSignerInfo.order }})
          </div>
        </div>
        
        <!-- Find My Signatures Button -->
        <button 
          v-if="mySignatures.ready.length > 0"
          @click="findNextSignature"
          class="mr-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 font-semibold shadow-md"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Find My Signatures ({{ mySignatures.ready.length }})
        </button>
        
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

      <div class="flex flex-1 overflow-hidden relative">
        <!-- Sidebar -->
        <div v-if="showSidebar" class="w-72 border-r bg-gray-50 p-4 overflow-y-auto flex-shrink-0">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold text-lg">My Signatures</h3>
            <button @click="showSidebar = false" class="p-1 hover:bg-gray-200 rounded transition">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>

          <!-- Ready to Sign -->
          <div v-if="mySignatures.ready.length > 0" class="mb-4">
            <h4 class="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Ready to Sign ({{ mySignatures.ready.length }})
            </h4>
            <div class="space-y-2">
              <div 
                v-for="sig in mySignatures.ready" 
                :key="sig.index"
                @click="goToSignature(sig)"
                class="p-3 bg-white rounded-lg border-2 border-green-300 hover:border-green-500 hover:bg-green-50 cursor-pointer transition-all hover:shadow-md active:scale-95"
              >
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <p class="text-sm font-semibold text-gray-800 flex items-center gap-1">
                      <svg class="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                      </svg>
                      {{ sig.assignedTo }}
                    </p>
                    <div class="flex items-center gap-2 mt-1">
                      <span class="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">Page {{ sig.page }}</span>
                      <span v-if="isSequentialOrderEnforced" class="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded font-semibold">#{{ sig.approvalOrder }}</span>
                    </div>
                  </div>
                  <svg class="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <!-- Waiting -->
          <div v-if="mySignatures.waiting.length > 0" class="mb-4">
            <h4 class="text-sm font-semibold text-purple-700 mb-2 flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Waiting ({{ mySignatures.waiting.length }})
            </h4>
            <div class="space-y-2">
              <div 
                v-for="sig in mySignatures.waiting" 
                :key="sig.index"
                @click="goToSignature(sig)"
                class="p-3 bg-white rounded-lg border-2 border-purple-300 hover:border-purple-500 hover:bg-purple-50 cursor-pointer transition-all hover:shadow-md active:scale-95"
              >
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <p class="text-sm font-semibold text-gray-800 flex items-center gap-1">
                      <svg class="w-3 h-3 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
                      </svg>
                      {{ sig.assignedTo }}
                    </p>
                    <div class="flex items-center gap-2 mt-1">
                      <span class="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">Page {{ sig.page }}</span>
                      <span class="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded font-semibold">#{{ sig.approvalOrder }}</span>
                    </div>
                  </div>
                  <svg class="w-5 h-5 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <!-- Completed -->
          <div v-if="mySignatures.completed.length > 0" class="mb-4">
            <h4 class="text-sm font-semibold text-blue-700 mb-2 flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              Completed ({{ mySignatures.completed.length }})
            </h4>
            <div class="space-y-2">
              <div 
                v-for="sig in mySignatures.completed" 
                :key="sig.index"
                @click="goToSignature(sig)"
                class="p-3 bg-white rounded-lg border-2 border-blue-300 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all hover:shadow-md active:scale-95"
              >
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <p class="text-sm font-semibold text-gray-800 flex items-center gap-1">
                      <svg class="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                      </svg>
                      {{ sig.assignedTo }}
                    </p>
                    <div class="flex items-center gap-2 mt-1">
                      <span class="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">Page {{ sig.page }}</span>
                      <span v-if="isSequentialOrderEnforced" class="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded font-semibold">#{{ sig.approvalOrder }}</span>
                    </div>
                  </div>
                  <svg class="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <!-- No signatures for user -->
          <div v-if="mySignatures.ready.length === 0 && mySignatures.waiting.length === 0 && mySignatures.completed.length === 0" 
            class="text-center py-12 px-4">
            <div class="bg-white rounded-lg p-6 border-2 border-dashed border-gray-300">
              <svg class="w-16 h-16 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p class="text-sm font-semibold text-gray-700 mb-1">No Signatures Assigned</p>
              <p class="text-xs text-gray-500">You don't have any signature boxes in this document</p>
            </div>
          </div>
        </div>

        <!-- Show sidebar button when hidden -->
        <button 
          v-if="!showSidebar"
          @click="showSidebar = true"
          class="fixed left-4 top-1/2 -translate-y-1/2 bg-blue-600 text-white p-3 rounded-lg shadow-xl hover:bg-blue-700 transition-all z-50 flex flex-col items-center gap-2 group"
          title="Show My Signatures"
        >
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
            <span class="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap text-sm font-semibold">
              My Signatures
            </span>
          </div>
          
          <!-- Badge showing counts -->
          <div class="flex gap-1 text-xs">
            <span v-if="mySignatures.ready.length > 0" class="bg-green-500 px-2 py-0.5 rounded font-bold">
              {{ mySignatures.ready.length }}
            </span>
            <span v-if="mySignatures.waiting.length > 0" class="bg-purple-500 px-2 py-0.5 rounded font-bold">
              {{ mySignatures.waiting.length }}
            </span>
            <span v-if="mySignatures.completed.length > 0" class="bg-white text-blue-600 px-2 py-0.5 rounded font-bold">
              {{ mySignatures.completed.length }}
            </span>
          </div>
        </button>

        <!-- PDF Container -->
        <div class="flex-1 overflow-auto p-6 relative" :class="{ 'ml-0': !showSidebar }">
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
              class="absolute rounded signature-box group" :class="{
                'border-2 border-dashed border-green-500 bg-green-50 cursor-pointer hover:bg-green-100 hover:border-green-600': canUserSign(sig),
                'border-2 border-dashed border-purple-400 bg-purple-50 cursor-not-allowed': isUserWaiting(sig),
                'border-2 border-dashed border-gray-300 bg-gray-50 cursor-not-allowed': sig.isEmpty && sig.assignedEmplId !== currentEmplId && !isUserWaiting(sig),
                'border-2 border-blue-500': canUserEdit(sig) && editingSignatureIndex === index && !sig.imageSrc,
                'bg-blue-50': canUserEdit(sig) && editingSignatureIndex === index && !sig.imageSrc,
                'border-2 border-blue-500': canUserEdit(sig) && editingSignatureIndex === index && sig.imageSrc,
                'border-2 border-blue-400 bg-blue-50 hover:border-blue-600': canUserEdit(sig) && editingSignatureIndex !== index && !sig.imageSrc,
                'border-2 border-blue-400 hover:border-blue-600': canUserEdit(sig) && editingSignatureIndex !== index && sig.imageSrc,
                'border-2 border-gray-400 bg-gray-100': !sig.isEmpty && sig.signedBy !== currentUserName && !sig.imageSrc,
                'border-2 border-gray-400': !sig.isEmpty && sig.signedBy !== currentUserName && sig.imageSrc,
                'cursor-move': canUserEdit(sig),
                'ring-4 ring-yellow-400 ring-offset-2 animate-pulse': highlightedSignatureIndex === index,
                'z-50': editingSignatureIndex === index && (isDraggingSignature || isResizingSignature),
                'z-10': editingSignatureIndex !== index || (!isDraggingSignature && !isResizingSignature),
                'active-drag': editingSignatureIndex === index && isDraggingSignature,
                'active-resize': editingSignatureIndex === index && isResizingSignature
              }" :style="{ width: sig.width + 'px', height: sig.height + 'px', left: sig.x + 'px', top: sig.y + 'px' }"
              @mouseup="handlePrePlacedClick(sig, index)"
              @mousedown="(!isSignatureLocked(sig) && canUserEdit(sig)) ? startDraggingSignature($event, index) : null"
              :title="sig.isEmpty ? `Assigned to: ${sig.assignedTo}` : `Signed by: ${sig.signedBy}`">

              <!-- Waiting state (user's box but not their turn) -->
              <div v-if="isUserWaiting(sig)"
                class="flex flex-col items-center justify-center h-full p-2 pointer-events-none relative">
                <!-- Text above box when too small -->
                <div v-if="isSmallSignatureBox(sig)"
                  class="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-1 rounded whitespace-nowrap z-10 border border-purple-300 shadow-md">
                  <span class="flex items-center">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Waiting
                  </span>
                  <div
                    class="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-purple-100">
                  </div>
                </div>

                <!-- Text inside box when large enough -->
                <div v-else class="flex flex-col items-center justify-center h-full">
                  <svg class="w-8 h-8 text-purple-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p class="text-xs text-purple-700 font-semibold text-center">Waiting</p>
                  <p class="text-xs text-purple-600 mt-1 text-center">Signer Number {{ sig.approvalOrder }}</p>
                  <p class="text-xs text-purple-600 text-center">{{ sig.assignedTo }}</p>
                </div>
              </div>

              <!-- Empty signature box (for current user - ready to sign) -->
              <div v-else-if="canUserSign(sig)"
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
                    <span v-if="isSequentialOrderEnforced" class="ml-1">(#{{ sig.approvalOrder }})</span>
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
                  <p v-if="isSequentialOrderEnforced" class="text-xs text-green-600 mt-1 text-center">Signer Number {{
                    sig.approvalOrder }}</p>
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
                <p v-if="isSequentialOrderEnforced" class="text-xs text-gray-400 text-center">Signer Number{{
                  sig.approvalOrder }}</p>
                <p class="text-xs text-gray-400 text-center">{{ isSequentialOrderEnforced ? "(Waiting)" : "(Pending)" }}</p>
              </div>

              <!-- Filled signature -->
              <div v-else class="relative w-full h-full flex flex-col">
                <!-- Signature over printed name layout when showName is true -->
                <template v-if="sig.showName">
                  <!-- Container for signature and name with tight spacing -->
                  <div class="flex flex-col items-center justify-end pb-2 px-2" style="margin-top: auto;">
                    <!-- Signature image positioned just above the name -->
                    <div class="flex items-end justify-center" style="margin-bottom: -10px;">
                      <img :src="sig.imageSrc" class="select-none pointer-events-none object-contain" :style="{
                        maxWidth: Math.max(sig.width - 16, sig.signedBy.length * 8) + 'px',
                        maxHeight: (sig.height - 30) + 'px'
                      }" />
                    </div>

                    <!-- Printed name with underline (like signature line on paper) -->
                    <div class="text-center pointer-events-none pt-0.5"
                      :class="isSmallSignatureBox(sig) ? 'text-xs' : 'text-sm'"
                      :style="{ minWidth: Math.max(100, sig.signedBy.length * 8) + 'px' }">
                      <div class="font-medium text-gray-800">
                        {{ sig.signedBy }}
                        <span v-if="isSequentialOrderEnforced" class="text-gray-500 text-xs">(#{{ sig.approvalOrder
                          }})</span>
                      </div>
                    </div>
                  </div>
                </template>

                <!-- Original layout when showName is false -->
                <template v-else>
                  <img :src="sig.imageSrc" class="w-full h-full object-contain select-none pointer-events-none" />

                  <!-- Signed by text above box when too small -->
                  <div v-if="isSmallSignatureBox(sig)"
                    class="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-semibold px-2 py-1 rounded whitespace-nowrap z-10 border shadow-md"
                    :class="{
                      'text-blue-800 hover:border-blue-500 bg-blue-100 border-blue-300': currentUser(sig),
                      'text-gray-800 hover:border-gray-500 bg-gray-100 border-gray-300': !currentUser(sig),

                    }">
                    {{ sig.signedBy }}
                    <span v-if="isSequentialOrderEnforced" class="ml-1">(#{{ sig.approvalOrder }})</span>
                    <div
                      class="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-blue-100">
                    </div>
                  </div>

                  <!-- Signed by text inside box when large enough -->
                  <div v-else
                    class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs px-2 py-1 text-center pointer-events-none">
                    {{ sig.signedBy }}
                    <span v-if="isSequentialOrderEnforced" class="ml-1">(Signer Number {{ sig.approvalOrder }})</span>
                  </div>
                </template>

                <!-- Edit hint for user's own signature -->
                <div v-if="canUserEdit(sig)"
                  class="absolute top-0 left-0 right-0 text-white text-xs px-2 py-1 text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  :class="sig.signatureLock ? 'bg-red-500' : 'bg-blue-500'">
                  <span v-if="sig.signatureLock == false"> Drag to move</span>
                  <span v-else> Locked</span>
                </div>

                <!-- Resize handle for user's own signature -->
                <div v-if="canUserEdit(sig) && !isSignatureLocked(sig)"
                  class="absolute w-4 h-4 bg-blue-500 rounded-full -bottom-1 -right-1 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  @mousedown.stop="startResizingSignature($event, index)"></div>
              </div>
            </div>

            <!-- Dates for signed signatures - NOW DRAGGABLE -->
            <div v-for="(sig, index) in localSignatures.filter(s => s.datePosition)" :key="'date-' + index"
              :ref="el => { if (el) prePlacedDateRefs[index] = el }" v-show="sig.page === currentViewPage"
              class="absolute select-none text-sm font-semibold text-gray-700 rounded px-2 py-1 border border-gray-300 date-box"
              :class="{
                'cursor-move hover:bg-blue-400 hover:border-blue-500 bg-blue-200': currentUser(sig) && !sig.isEmpty,
                'cursor-move hover:bg-green-400 hover:border-green-500 bg-green-200': currentUser(sig) && sig.isEmpty && !isUserWaiting(sig),
                'cursor-default hover:bg-purple-300 hover:border-purple-400 bg-purple-100': isUserWaiting(sig),
                'cursor-default hover:bg-gray-200 hover:border-gray-500 bg-gray-50': !currentUser(sig),
                'z-50': currentDraggingDateIndex === index && isDraggingDate,
                'z-10': currentDraggingDateIndex !== index || !isDraggingDate,
                'active-drag-date': currentDraggingDateIndex === index && isDraggingDate
              }" :style="{ left: sig.datePosition.x + 'px', top: sig.datePosition.y + 'px' }"
              @mousedown="(!isDateLocked(sig) && canUserEdit(sig)) ? startDraggingDate($event, index) : null"
              :title="canUserEdit(sig) && sig.dateLock == false ? 'Drag to move date' : 'Locked'">
              {{ sig.datePosition.dateText ? sig.datePosition.dateText : "MM/DD/YYYY" }}
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between p-4 border-t bg-gray-50">
        <div class="text-sm text-gray-600">
          <p class="font-semibold">💡 Tips:</p>
          <p>• Click green boxes to sign</p>
          <p v-if="isSequentialOrderEnforced" class="text-purple-600">• Purple boxes are waiting for previous signers
          </p>
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

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* ENHANCED: Smooth transitions for signature boxes */
.signature-box {
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}

/* ENHANCED: Active dragging state for signature boxes */
.signature-box.active-drag {
  transform: scale(1.03);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2), 0 12px 24px rgba(0, 0, 0, 0.15);
  z-index: 100 !important;
}

/* ENHANCED: Active resizing state for signature boxes */
.signature-box.active-resize {
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1);
  z-index: 100 !important;
}

/* ENHANCED: Smooth transitions for date boxes */
.date-box {
  transition: transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
}

/* ENHANCED: Active dragging state for date boxes */
.date-box.active-drag-date {
  transform: scale(1.05);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2), 0 8px 16px rgba(0, 0, 0, 0.12);
  z-index: 100 !important;
}

/* Disable transitions while actively dragging */
.signature-box:active,
.date-box:active {
  transition: none;
}
</style>