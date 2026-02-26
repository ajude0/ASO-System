<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick, reactive, computed, watchEffect } from 'vue';
import { usePdfSigningHub } from '~/js/usePdfSigningHub';

// Props
const props = defineProps({
  isOpen: Boolean,
  pdfFile: File,
  signatureFile: File,
  currentUserName: String,
  currentEmplId: String,
  documentId: {
    type: String,
    required: true
  },
  prePlacedSignatures: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['close', 'apply-signature', 'save-all-signatures']);

// ─────────────────────────────────────────────────────────────────────────────
// SignalR hub
// ─────────────────────────────────────────────────────────────────────────────
const hub = usePdfSigningHub(
  computed(() => props.documentId),
  computed(() => props.currentEmplId),
  computed(() => props.currentUserName)
);

// Toast notification queue
const toasts = ref([]);
function addToast(message, type = 'info', duration = 3500) {
  const id = Date.now();
  toasts.value.push({ id, message, type });
  setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id); }, duration);
}

// ─────────────────────────────────────────────────────────────────────────────
// Core refs
// ─────────────────────────────────────────────────────────────────────────────
const containerRef = ref(null);
const pdfDocument = ref(null);
const userSignatureSrc = ref(null);
const userSignatureBase64 = ref(null);
const canvasRefs = ref([]);
const totalPages = ref(0);
const prePlacedSigRefs = ref([]);
const prePlacedDateRefs = ref([]);
const currentViewPage = ref(1);
const currentDate = ref(new Date().toLocaleDateString());
const goToPageNumber = ref(1);
const SMALL_SIG_WIDTH = 120;
const SMALL_SIG_HEIGHT = 75;
const MIN_SIG_WIDTH  = 50;
const MIN_SIG_HEIGHT = 30;
const MAX_SIG_WIDTH  = 250;
const MAX_SIG_HEIGHT = 100;

const isSmallSignatureBox = (sig) => sig.width <= SMALL_SIG_WIDTH;

watchEffect(() => { console.log('signatureFile in modal:', props.signatureFile) });

const editingSignatureIndex = ref(null);
const isDraggingSignature = ref(false);
const isResizingSignature = ref(false);
const isDraggingDate = ref(false);
const currentDraggingDateIndex = ref(null);
const dragOffsetSig = ref({ x: 0, y: 0 });
const dragOffsetDate = ref({ x: 0, y: 0 });
const resizeStartSig = ref({ x: 0, y: 0, width: 0, height: 0 });

// ─────────────────────────────────────────────────────────────────────────────
// Local signatures (reactive working copy)
// ─────────────────────────────────────────────────────────────────────────────
const localSignatures = reactive([]);

// Removed: remoteDragPositions and remoteDatePositions - no longer tracking remote movements for UI

// ─────────────────────────────────────────────────────────────────────────────
// Sequential order helpers
// ─────────────────────────────────────────────────────────────────────────────
const isSequentialOrderEnforced = computed(() =>
  localSignatures.some(sig => sig.enforceSequentialOrder === true)
);

const getCurrentRequiredOrder = computed(() => {
  if (!isSequentialOrderEnforced.value) return null;
  const emptyOrders = localSignatures.filter(s => s.isEmpty).map(s => s.approvalOrder || 1);
  return emptyOrders.length > 0 ? Math.min(...emptyOrders) : null;
});

const isUserWaiting = (sig) => {
  if (!isSequentialOrderEnforced.value) return false;
  if (!sig.isEmpty) return false;
  if (sig.assignedEmplId !== props.currentEmplId) return false;
  return (sig.approvalOrder || 1) > getCurrentRequiredOrder.value;
};

const getNextSignerInfo = computed(() => {
  if (!isSequentialOrderEnforced.value) return null;
  const nextOrder = getCurrentRequiredOrder.value;
  if (!nextOrder) return null;
  const nextSig = localSignatures.find(s => s.isEmpty && s.approvalOrder === nextOrder);
  return nextSig ? { name: nextSig.assignedTo, order: nextSig.approvalOrder } : null;
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper — convert a blob URL to a base64 data URL
// ─────────────────────────────────────────────────────────────────────────────
const blobUrlToBase64 = (blobUrl) => {
  return new Promise((resolve, reject) => {
    fetch(blobUrl)
      .then(r => r.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      })
      .catch(reject);
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Watchers — init local data + connect/disconnect hub
// ─────────────────────────────────────────────────────────────────────────────
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    localSignatures.length = 0;
    props.prePlacedSignatures.forEach(sig => {
      localSignatures.push({
        ...sig,
        datePosition: sig.datePosition ? { ...sig.datePosition } : null
      });
    });

    try {
      await hub.connect();
      registerHubListeners();
    } catch (err) {
      console.error('SignalR connect failed:', err);
      addToast('Real-time sync unavailable (offline mode)', 'warning');
    }
  } else {
    await hub.disconnect();
  }
}, { immediate: true });

watch(() => [props.isOpen, props.pdfFile], async ([isOpen, pdfFile]) => {
  if (isOpen && pdfFile) await loadPdf();
});

watch(() => props.signatureFile, async (newFile) => {
  if (newFile) {
    if (userSignatureSrc.value) URL.revokeObjectURL(userSignatureSrc.value);
    userSignatureSrc.value = URL.createObjectURL(newFile);
    userSignatureBase64.value = null;
    try {
      userSignatureBase64.value = await blobUrlToBase64(userSignatureSrc.value);
    } catch (err) {
      console.error('Failed to pre-cache signature as base64:', err);
    }
  }
}, { immediate: true });

// ─────────────────────────────────────────────────────────────────────────────
// Register SignalR inbound listeners
// Still receive remote updates to keep data in sync, but no UI notifications
// ─────────────────────────────────────────────────────────────────────────────
function registerHubListeners() {
  // REMOVED: hub.onUserJoined - no longer showing join notifications

  // REMOVED: hub.onUserLeft - no longer showing leave notifications

  // hub.onSignaturePlaced(({ sigIndex, sigData, placedBy }) => {
  //   if (sigIndex < 0 || sigIndex >= localSignatures.length) {
  //     console.warn(
  //       `[SignalR] onSignaturePlaced — received sigIndex ${sigIndex} but ` +
  //       `localSignatures only has ${localSignatures.length} item(s). ` +
  //       `Ensure all users load the same prePlacedSignatures before opening the modal.`,
  //       sigData
  //     );
  //     return;
  //   }
  //   // Only update data silently, no toast notification
  //   Object.assign(localSignatures[sigIndex], sigData);
  //   nextTick(() => updatePrePlacedPositions());
  //   // REMOVED: addToast notification
  // });

  // REMOVED: hub.onSignatureMoved - no longer showing remote drag movements in UI

  // REMOVED: hub.onSignatureResized - no longer showing remote resize movements in UI

  // REMOVED: hub.onDateMoved - no longer showing remote date movements in UI

  // hub.onSignaturesSaved(({ signatures, savedBy }) => {
  //   localSignatures.length = 0;
  //   signatures.forEach(sig => {
  //     localSignatures.push({
  //       ...sig,
  //       datePosition: sig.datePosition ? { ...sig.datePosition } : null
  //     });
  //   });
  //   nextTick(() => updatePrePlacedPositions());
  //   // REMOVED: addToast notification
  // });

  hub.onReconnecting(() => addToast('Reconnecting to real-time sync…', 'warning'));
  hub.onReconnected(() => addToast('Real-time sync restored ✓', 'success'));
}

// REMOVED: remoteOverlayStyles computed - no longer needed

// ─────────────────────────────────────────────────────────────────────────────
// PDF loading / rendering
// ─────────────────────────────────────────────────────────────────────────────
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
    for (let i = 1; i <= pdf.numPages; i++) await renderPage(i);
    await nextTick();
    updatePrePlacedPositions();
  } catch (error) {
    console.error('Error loading PDF:', error);
  }
};

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

const updatePrePlacedPositions = () => {
  if (!containerRef.value || canvasRefs.value.length === 0) return;
  const containerRect = containerRef.value.getBoundingClientRect();

  localSignatures.forEach((sig, index) => {
    const canvas = canvasRefs.value[sig.page - 1];
    const sigElement = prePlacedSigRefs.value[index];
    if (!canvas || !sigElement) return;
    const canvasRect = canvas.getBoundingClientRect();
    sigElement.style.left = (canvasRect.left - containerRect.left + sig.x) + 'px';
    sigElement.style.top  = (canvasRect.top  - containerRect.top  + sig.y) + 'px';
  });

  localSignatures.forEach((sig, sigIndex) => {
    if (!sig.datePosition) return;
    const canvas = canvasRefs.value[sig.page - 1];
    const dateIndex = localSignatures.slice(0, sigIndex).filter(s => s.datePosition).length;
    const dateElement = prePlacedDateRefs.value[dateIndex];
    if (!canvas || !dateElement) return;
    const canvasRect = canvas.getBoundingClientRect();
    dateElement.style.left = (canvasRect.left - containerRect.left + sig.datePosition.x) + 'px';
    dateElement.style.top  = (canvasRect.top  - containerRect.top  + sig.datePosition.y) + 'px';
  });
};

const updateSingleSigPosition = (index) => {
  if (!containerRef.value || canvasRefs.value.length === 0) return;
  const sig = localSignatures[index];
  if (!sig) return;
  const containerRect = containerRef.value.getBoundingClientRect();
  const canvas = canvasRefs.value[sig.page - 1];
  const sigElement = prePlacedSigRefs.value[index];
  if (canvas && sigElement) {
    const canvasRect = canvas.getBoundingClientRect();
    sigElement.style.left = (canvasRect.left - containerRect.left + sig.x) + 'px';
    sigElement.style.top  = (canvasRect.top  - containerRect.top  + sig.y) + 'px';
  }
  if (sig.datePosition) {
    const dateIndex = localSignatures.slice(0, index).filter(s => s.datePosition).length;
    const dateElement = prePlacedDateRefs.value[dateIndex];
    if (canvas && dateElement) {
      const canvasRect = canvas.getBoundingClientRect();
      dateElement.style.left = (canvasRect.left - containerRect.left + sig.datePosition.x) + 'px';
      dateElement.style.top  = (canvasRect.top  - containerRect.top  + sig.datePosition.y) + 'px';
    }
  }
};

const updateSingleDatePosition = (sigIndex) => {
  if (!containerRef.value || canvasRefs.value.length === 0) return;
  const sig = localSignatures[sigIndex];
  if (!sig?.datePosition) return;
  const containerRect = containerRef.value.getBoundingClientRect();
  const canvas = canvasRefs.value[sig.page - 1];
  const dateIndex = localSignatures.slice(0, sigIndex).filter(s => s.datePosition).length;
  const dateElement = prePlacedDateRefs.value[dateIndex];
  if (canvas && dateElement) {
    const canvasRect = canvas.getBoundingClientRect();
    dateElement.style.left = (canvasRect.left - containerRect.left + sig.datePosition.x) + 'px';
    dateElement.style.top  = (canvasRect.top  - containerRect.top  + sig.datePosition.y) + 'px';
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Permission helpers
// ─────────────────────────────────────────────────────────────────────────────
const canUserSign   = (sig) => sig.isEmpty && sig.assignedEmplId === props.currentEmplId && !isUserWaiting(sig);
const currentUser   = (sig) => sig.assignedEmplId === props.currentEmplId;
const canUserEdit   = (sig) => !sig.isEmpty && sig.assignedEmplId === props.currentEmplId;
const isSignatureLocked = (sig) => sig.signatureLock === true;
const isDateLocked      = (sig) => sig.dateLock === true;

// ─────────────────────────────────────────────────────────────────────────────
// Click to sign
// ─────────────────────────────────────────────────────────────────────────────
const draggedDistance = ref(0);
const dragStartPos = ref({ x: 0, y: 0 });

const handlePrePlacedClick = async (sig, index) => {
  if (draggedDistance.value > 5) return;

  if (canUserEdit(sig)) { editingSignatureIndex.value = index; return; }

  if (isUserWaiting(sig)) {
    const nextSigner = getNextSignerInfo.value;
    alert(`Sequential approval is enabled. Waiting for "${nextSigner?.name}" (Signer Number ${nextSigner?.order}) to sign first.`);
    return;
  }
  if (sig.assignedEmplId !== props.currentEmplId) {
    if (!sig.isEmpty) return;
    alert(`This signature box is assigned to "${sig.assignedTo}". You cannot sign here.`);
    return;
  }
  if (!canUserSign(sig)) return;
  if (!userSignatureSrc.value) { alert('Please upload your signature first!'); return; }

  let transferableImageSrc = userSignatureBase64.value;
  if (!transferableImageSrc) {
    try {
      transferableImageSrc = await blobUrlToBase64(userSignatureSrc.value);
      userSignatureBase64.value = transferableImageSrc;
    } catch (err) {
      console.error('Failed to convert signature to base64:', err);
      addToast('Failed to prepare signature image for sync', 'error');
      return;
    }
  }

  const updated = {
    ...sig,
    imageSrc: transferableImageSrc,
    isEmpty: false,
    signedBy: props.currentUserName,
    signedDate: currentDate.value,
    datePosition: sig.datePosition ? { ...sig.datePosition, dateText: currentDate.value } : null
  };

  localSignatures[index] = {
    ...updated,
    imageSrc: userSignatureSrc.value
  };

  hub.sendSignaturePlaced(index, updated);
};

// ─────────────────────────────────────────────────────────────────────────────
// Drag / resize handlers - ONLY your own movements, no remote UI feedback
// ─────────────────────────────────────────────────────────────────────────────
const startDraggingSignature = (e, index) => {
  const sig = localSignatures[index];
  if (!canUserEdit(sig) || isSignatureLocked(sig)) return;
  e.stopPropagation(); e.preventDefault();
  isDraggingSignature.value = true;
  editingSignatureIndex.value = index;
  draggedDistance.value = 0;
  const canvasRect = canvasRefs.value[sig.page - 1].getBoundingClientRect();
  dragStartPos.value = { x: e.clientX, y: e.clientY };
  dragOffsetSig.value = { x: e.clientX - canvasRect.left - sig.x, y: e.clientY - canvasRect.top - sig.y };
};

const startDraggingDate = (e, sigIndex) => {
  const sig = localSignatures[sigIndex];
  if (!canUserEdit(sig) || !sig.datePosition || isDateLocked(sig)) return;
  e.stopPropagation(); e.preventDefault();
  isDraggingDate.value = true;
  currentDraggingDateIndex.value = sigIndex;
  draggedDistance.value = 0;
  const canvasRect = canvasRefs.value[sig.page - 1].getBoundingClientRect();
  dragStartPos.value = { x: e.clientX, y: e.clientY };
  dragOffsetDate.value = { x: e.clientX - canvasRect.left - sig.datePosition.x, y: e.clientY - canvasRect.top - sig.datePosition.y };
};

const dragSignature = (e) => {
  if (!isDraggingSignature.value || editingSignatureIndex.value === null) return;
  const idx = editingSignatureIndex.value;
  const sig = localSignatures[idx];
  if (isSignatureLocked(sig)) return;
  const canvas = canvasRefs.value[sig.page - 1];
  const canvasRect = canvas.getBoundingClientRect();
  const dx = e.clientX - dragStartPos.value.x;
  const dy = e.clientY - dragStartPos.value.y;
  draggedDistance.value = Math.sqrt(dx * dx + dy * dy);
  const oldX = sig.x, oldY = sig.y;
  sig.x = Math.max(0, Math.min(e.clientX - canvasRect.left - dragOffsetSig.value.x, canvas.width  - sig.width));
  sig.y = Math.max(0, Math.min(e.clientY - canvasRect.top  - dragOffsetSig.value.y, canvas.height - sig.height));
  if (sig.datePosition && !isDateLocked(sig)) {
    sig.datePosition.x = Math.max(0, Math.min(sig.datePosition.x + (sig.x - oldX), canvas.width  - 100));
    sig.datePosition.y = Math.max(0, Math.min(sig.datePosition.y + (sig.y - oldY), canvas.height - 30));
  }
  updateSingleSigPosition(idx);
  // Still send to server for data sync, but no local UI tracking of remote movements
  const sigToSend = { ...sig, datePosition: sig.datePosition ? { ...sig.datePosition } : null };
  if (sigToSend.imageSrc?.startsWith('blob:') && userSignatureBase64.value) {
    sigToSend.imageSrc = userSignatureBase64.value;
  }
  hub.sendSignatureMoved(idx, sigToSend);
};

const dragDate = (e) => {
  if (!isDraggingDate.value || currentDraggingDateIndex.value === null) return;
  const idx = currentDraggingDateIndex.value;
  const sig = localSignatures[idx];
  if (isDateLocked(sig)) return;
  const canvas = canvasRefs.value[sig.page - 1];
  const canvasRect = canvas.getBoundingClientRect();
  const dx = e.clientX - dragStartPos.value.x;
  const dy = e.clientY - dragStartPos.value.y;
  draggedDistance.value = Math.sqrt(dx * dx + dy * dy);
  sig.datePosition.x = Math.max(0, Math.min(e.clientX - canvasRect.left - dragOffsetDate.value.x, canvas.width  - 100));
  sig.datePosition.y = Math.max(0, Math.min(e.clientY - canvasRect.top  - dragOffsetDate.value.y, canvas.height - 30));
  updateSingleDatePosition(idx);
  hub.sendDateMoved(idx, { ...sig.datePosition });
};

const startResizingSignature = (e, index) => {
  const sig = localSignatures[index];
  if (!canUserEdit(sig) || isSignatureLocked(sig)) return;
  e.stopPropagation();
  isResizingSignature.value = true;
  editingSignatureIndex.value = index;
  const canvasRect = canvasRefs.value[sig.page - 1].getBoundingClientRect();
  resizeStartSig.value = { x: e.clientX - canvasRect.left, y: e.clientY - canvasRect.top, width: sig.width, height: sig.height };
};

const resizeSignature = (e) => {
  if (!isResizingSignature.value || editingSignatureIndex.value === null) return;
  const idx = editingSignatureIndex.value;
  const sig = localSignatures[idx];
  if (isSignatureLocked(sig)) return;
  const canvasRect = canvasRefs.value[sig.page - 1].getBoundingClientRect();
  const dx = (e.clientX - canvasRect.left) - resizeStartSig.value.x;
  const dy = (e.clientY - canvasRect.top)  - resizeStartSig.value.y;
  sig.width  = Math.min(MAX_SIG_WIDTH,  Math.max(MIN_SIG_WIDTH,  resizeStartSig.value.width  + dx));
  sig.height = Math.min(MAX_SIG_HEIGHT, Math.max(MIN_SIG_HEIGHT, resizeStartSig.value.height + dy));
  updateSingleSigPosition(idx);
  hub.sendSignatureResized(idx, sig.width, sig.height);
};

const handleMouseMove = (e) => {
  if (isDraggingSignature.value) dragSignature(e);
  else if (isDraggingDate.value) dragDate(e);
  else if (isResizingSignature.value) resizeSignature(e);
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect();
    hub.sendCursorMoved(e.clientX - rect.left, e.clientY - rect.top, currentViewPage.value, localSignatures.find(s => s.assignedEmplId === props.currentEmplId)?.color || '#6366f1');
  }
};

const handleMouseUp = () => {
  isDraggingSignature.value = false;
  isDraggingDate.value = false;
  isResizingSignature.value = false;
  currentDraggingDateIndex.value = null;
  updatePrePlacedPositions();
  setTimeout(() => { draggedDistance.value = 0; }, 100);
};

const isActiveDrag    = (index) => isDraggingSignature.value && editingSignatureIndex.value === index;
const isOtherDragging = (index) => isDraggingSignature.value && editingSignatureIndex.value !== index;

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar computed
// ─────────────────────────────────────────────────────────────────────────────
const mySignatures = computed(() => {
  const ready = [], waiting = [], completed = [];
  localSignatures.forEach((sig, index) => {
    if (sig.assignedEmplId !== props.currentEmplId) return;
    if (!sig.isEmpty) completed.push({ ...sig, index });
    else if (isUserWaiting(sig)) waiting.push({ ...sig, index });
    else ready.push({ ...sig, index });
  });
  return { ready, waiting, completed };
});

const highlightedSignatureIndex = ref(null);
const goToSignature = (sig) => {
  currentViewPage.value = sig.page;
  highlightedSignatureIndex.value = sig.index;
  nextTick(() => {
    updatePrePlacedPositions();
    prePlacedSigRefs.value[sig.index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => { highlightedSignatureIndex.value = null; }, 3000);
  });
};

const currentSignatureNavigationIndex = ref(0);
const findNextSignature = () => {
  const signableBoxes = mySignatures.value.ready;
  if (signableBoxes.length === 0) { alert('No signatures available to sign!'); return; }
  goToSignature(signableBoxes[currentSignatureNavigationIndex.value]);
  currentSignatureNavigationIndex.value = (currentSignatureNavigationIndex.value + 1) % signableBoxes.length;
};

const showSidebar = ref(true);

const goToNextPage = () => { if (currentViewPage.value < totalPages.value) { currentViewPage.value++; nextTick(() => updatePrePlacedPositions()); } };
const goToPrevPage = () => { if (currentViewPage.value > 1) { currentViewPage.value--; nextTick(() => updatePrePlacedPositions()); } };
const scrollToPage = (pageNum) => { if (pageNum >= 1 && pageNum <= totalPages.value) { currentViewPage.value = pageNum; nextTick(() => updatePrePlacedPositions()); } };

// ─────────────────────────────────────────────────────────────────────────────
// Done / Save
// ─────────────────────────────────────────────────────────────────────────────
const handleDone = () => {
  const mySignaturesCopy = localSignatures
    .filter(sig => sig.assignedEmplId === props.currentEmplId)
    .map(sig => ({
      ...sig,
      imageSrc: (sig.imageSrc?.startsWith('blob:') && userSignatureBase64.value)
        ? userSignatureBase64.value
        : sig.imageSrc,
      datePosition: sig.datePosition ? { ...sig.datePosition } : null,
      hasSigned: sig.imageSrc ? true : false,
    }));

    hub.sendSignaturesSaved(mySignaturesCopy)

  emit('save-all-signatures', mySignaturesCopy);
  emit('close');
};

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────────────────
onMounted(() => {
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  window.addEventListener('resize', updatePrePlacedPositions);
});

onUnmounted(async () => {
  if (userSignatureSrc.value) URL.revokeObjectURL(userSignatureSrc.value);
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
  window.removeEventListener('resize', updatePrePlacedPositions);
  await hub.disconnect();
});
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center w-full z-50"
    @click.self="emit('close')">
    <div class="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] flex flex-col m-4">

      <!-- ════════════════════ TOAST NOTIFICATIONS ═════════════════════ -->
      <div class="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        <transition-group name="toast" tag="div" class="flex flex-col gap-2">
          <div v-for="toast in toasts" :key="toast.id"
            class="px-4 py-3 rounded-lg shadow-lg text-sm font-semibold flex items-center gap-2 pointer-events-auto max-w-xs"
            :class="{
              'bg-blue-600 text-white': toast.type === 'info',
              'bg-green-600 text-white': toast.type === 'success',
              'bg-yellow-500 text-white': toast.type === 'warning',
              'bg-red-600 text-white': toast.type === 'error',
            }">
            <span v-if="toast.type === 'info'">ℹ️</span>
            <span v-else-if="toast.type === 'success'">✅</span>
            <span v-else-if="toast.type === 'warning'">⚠️</span>
            <span v-else>❌</span>
            {{ toast.message }}
          </div>
        </transition-group>
      </div>

      <!-- ════════════════════════ HEADER ══════════════════════════════ -->
      <div class="flex items-center justify-between p-4 border-b">
        <div class="flex-1">
          <h2 class="text-xl font-semibold">Sign PDF Document</h2>
          <p class="text-sm text-gray-600 mt-1">
            Signing as: <span class="font-semibold text-blue-600">{{ currentUserName }}</span>
          </p>

          <!-- REMOVED: Active users presence bar -->

          <!-- Connection status indicator -->
          <div class="mt-1 flex items-center gap-1">
            <span v-if="hub.isConnected.value" class="w-2 h-2 bg-green-500 rounded-full inline-block"></span>
            <span v-else class="w-2 h-2 bg-yellow-400 rounded-full inline-block animate-pulse"></span>
            <span class="text-xs text-gray-400">
              {{ hub.isConnected.value ? 'Live sync active' : 'Connecting…' }}
            </span>
          </div>

          <div v-if="isSequentialOrderEnforced && getNextSignerInfo"
            class="mt-2 text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded border border-blue-200">
            🔄 Sequential Order: Waiting for <strong>{{ getNextSignerInfo.name }}</strong> (Signer Number {{
              getNextSignerInfo.order }})
          </div>
        </div>

        <button v-if="mySignatures.ready.length > 0" @click="findNextSignature"
          class="mr-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 font-semibold shadow-md">
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

      <!-- ══════════════════ PAGE NAVIGATION ═══════════════════════════ -->
      <div class="mt-4 flex items-center justify-center gap-4 flex-wrap">
        <button @click="goToPrevPage" :disabled="currentViewPage === 1"
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Previous
        </button>
        <div class="text-sm font-semibold text-gray-700">Page {{ currentViewPage }} of {{ totalPages }}</div>
        <button @click="goToNextPage" :disabled="currentViewPage === totalPages"
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2">
          Next
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <div class="flex items-center gap-2">
          <input type="number" min="1" :max="totalPages" v-model.number="goToPageNumber"
            @keydown.enter="scrollToPage(goToPageNumber)" class="border rounded px-2 py-1 w-16 text-sm" />
          <button @click="scrollToPage(goToPageNumber)" class="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm">Go</button>
        </div>
      </div>

      <div class="flex flex-1 overflow-hidden relative">

        <!-- ═══════════════════════ SIDEBAR ══════════════════════════════ -->
        <div v-if="showSidebar" class="w-72 border-r bg-gray-50 p-4 overflow-y-auto flex-shrink-0">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold text-lg">My Signatures</h3>
            <button @click="showSidebar = false" class="p-1 hover:bg-gray-200 rounded transition">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>

          <!-- REMOVED: Active Users in Sidebar -->

          <!-- Ready to Sign -->
          <div v-if="mySignatures.ready.length > 0" class="mb-4">
            <h4 class="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Ready to Sign ({{ mySignatures.ready.length }})
            </h4>
            <div class="space-y-2">
              <div v-for="sig in mySignatures.ready" :key="sig.index" @click="goToSignature(sig)"
                class="p-3 bg-white rounded-lg border-2 border-green-300 hover:border-green-500 hover:bg-green-50 cursor-pointer transition-all hover:shadow-md active:scale-95">
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <p class="text-sm font-semibold text-gray-800">{{ sig.assignedTo }}</p>
                    <div class="flex items-center gap-2 mt-1">
                      <span class="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">Page {{ sig.page }}</span>
                      <span v-if="isSequentialOrderEnforced"
                        class="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded font-semibold">#{{ sig.approvalOrder }}</span>
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
              <div v-for="sig in mySignatures.waiting" :key="sig.index" @click="goToSignature(sig)"
                class="p-3 bg-white rounded-lg border-2 border-purple-300 hover:border-purple-500 hover:bg-purple-50 cursor-pointer transition-all hover:shadow-md active:scale-95">
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <p class="text-sm font-semibold text-gray-800">{{ sig.assignedTo }}</p>
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
              <div v-for="sig in mySignatures.completed" :key="sig.index" @click="goToSignature(sig)"
                class="p-3 bg-white rounded-lg border-2 border-blue-300 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all hover:shadow-md active:scale-95">
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <p class="text-sm font-semibold text-gray-800">{{ sig.assignedTo }}</p>
                    <div class="flex items-center gap-2 mt-1">
                      <span class="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">Page {{ sig.page }}</span>
                      <span v-if="isSequentialOrderEnforced"
                        class="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded font-semibold">#{{ sig.approvalOrder }}</span>
                    </div>
                  </div>
                  <svg class="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div v-if="mySignatures.ready.length === 0 && mySignatures.waiting.length === 0 && mySignatures.completed.length === 0"
            class="text-center py-12 px-4">
            <div class="bg-white rounded-lg p-6 border-2 border-dashed border-gray-300">
              <svg class="w-16 h-16 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p class="text-sm font-semibold text-gray-700 mb-1">No Signatures Assigned</p>
              <p class="text-xs text-gray-500">You don't have any signature boxes in this document</p>
            </div>
          </div>
        </div>

        <!-- Show sidebar toggle -->
        <button v-if="!showSidebar" @click="showSidebar = true"
          class="fixed left-4 top-1/2 -translate-y-1/2 bg-blue-600 text-white p-3 rounded-lg shadow-xl hover:bg-blue-700 transition-all z-50 flex flex-col items-center gap-2 group"
          title="Show My Signatures">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
            <span class="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap text-sm font-semibold">My Signatures</span>
          </div>
          <div class="flex gap-1 text-xs">
            <span v-if="mySignatures.ready.length > 0" class="bg-green-500 px-2 py-0.5 rounded font-bold">{{ mySignatures.ready.length }}</span>
            <span v-if="mySignatures.waiting.length > 0" class="bg-purple-500 px-2 py-0.5 rounded font-bold">{{ mySignatures.waiting.length }}</span>
            <span v-if="mySignatures.completed.length > 0" class="bg-white text-blue-600 px-2 py-0.5 rounded font-bold">{{ mySignatures.completed.length }}</span>
          </div>
        </button>

        <!-- ════════════════════ PDF CANVAS AREA ═══════════════════════════ -->
        <div class="flex-1 overflow-auto p-6 relative" :class="{ 'ml-0': !showSidebar }">
          <div ref="containerRef" class="relative inline-block" @mousemove="handleMouseMove">
            <div class="relative border-2 border-gray-300 rounded shadow-sm">
              <div class="absolute -top-3 left-4 bg-white px-2 py-1 text-xs font-semibold text-gray-600 border">
                Page {{ currentViewPage }}
              </div>
              <canvas v-for="i in totalPages" :key="i" v-show="i === currentViewPage"
                :ref="el => { if (el) canvasRefs[i - 1] = el }" class="block"></canvas>
            </div>

            <!-- REMOVED: REMOTE LIVE DRAG OVERLAYS -->

            <!-- REMOVED: REMOTE CURSOR DOTS -->

            <!-- ─── SIGNATURE BOXES ─── -->
            <div v-for="(sig, index) in localSignatures" :key="'preplaced-' + index"
              :ref="el => { if (el) prePlacedSigRefs[index] = el }" v-show="sig.page === currentViewPage"
              class="absolute rounded signature-box group" :class="{
                'sig-needs-signing border-4 border-green-500 bg-green-50 cursor-pointer hover:bg-green-100': canUserSign(sig),
                'ring-4 ring-yellow-400 ring-offset-2 animate-pulse z-highlighted': highlightedSignatureIndex === index,
                'border-2 border-dashed border-purple-400 bg-purple-50 cursor-not-allowed z-base': isUserWaiting(sig),
                'border-2 border-dashed border-gray-300 bg-gray-50 cursor-not-allowed z-base': sig.isEmpty && sig.assignedEmplId !== currentEmplId && !isUserWaiting(sig),
                'border-2 border-blue-500 bg-blue-50 z-signed': canUserEdit(sig) && editingSignatureIndex === index && !sig.imageSrc,
                'border-2 border-blue-500 z-signed': canUserEdit(sig) && editingSignatureIndex === index && sig.imageSrc,
                'border-2 border-blue-400 bg-blue-50 hover:border-blue-600 z-signed': canUserEdit(sig) && editingSignatureIndex !== index && !sig.imageSrc,
                'border-2 border-blue-400 hover:border-blue-600 z-signed': canUserEdit(sig) && editingSignatureIndex !== index && sig.imageSrc,
                'border-2 border-gray-400 bg-gray-100 z-base': !sig.isEmpty && sig.signedBy !== currentUserName && !sig.imageSrc,
                'border-2 border-gray-400 z-base': !sig.isEmpty && sig.signedBy !== currentUserName && sig.imageSrc,
                'cursor-move': canUserEdit(sig),
                'z-active active-drag': isActiveDrag(index) && isDraggingSignature,
                'z-active active-resize': editingSignatureIndex === index && isResizingSignature,
                'dimmed-box': isDraggingSignature && !isActiveDrag(index),
              }" :style="{ width: sig.width + 'px', height: sig.height + 'px', left: sig.x + 'px', top: sig.y + 'px' }"
              @mouseup="handlePrePlacedClick(sig, index)"
              @mousedown="(!isSignatureLocked(sig) && canUserEdit(sig)) ? startDraggingSignature($event, index) : null"
              :title="sig.isEmpty ? `Assigned to: ${sig.assignedTo}` : `Signed by: ${sig.signedBy}`">

              <!-- Name tooltip -->
              <div class="absolute -top-8 left-0 text-white text-xs px-3 py-1.5 rounded-md font-semibold whitespace-nowrap flex items-center gap-1.5 shadow-lg transition-all duration-200 pointer-events-none"
                :class="{
                  'opacity-0 group-hover:opacity-100': !isActiveDrag(index),
                  'opacity-100 scale-105': isActiveDrag(index),
                }" :style="{ backgroundColor: sig.color || '#3b82f6' }">
                {{ sig.assignedTo }}
                <span v-if="isSequentialOrderEnforced" class="ml-1 px-1.5 py-0.5 bg-white bg-opacity-30 rounded">#{{ sig.approvalOrder }}</span>
                <span v-if="isSignatureLocked(sig) && !sig.isEmpty">🔒</span>
              </div>

              <!-- Corner dot -->
              <div v-if="!isActiveDrag(index)"
                class="absolute -top-2 -left-2 w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center shadow-md transition-all duration-200 pointer-events-none"
                :class="{ 'opacity-60': isOtherDragging(index), 'opacity-100 hover:scale-110': !isDraggingSignature }"
                :style="{ backgroundColor: sig.color || '#3b82f6' }">
                {{ isSequentialOrderEnforced ? sig.approvalOrder : (sig.assignedTo || '').trim().split(' ').filter(Boolean).map(n => n[0]).slice(0, 1).concat((sig.assignedTo || '').trim().split(' ').slice(-1).map(n => n[0])).join('').toUpperCase() }}
              </div>

              <!-- Sign here beacon -->
              <div v-if="canUserSign(sig)" class="sign-here-beacon pointer-events-none"
                :class="isSmallSignatureBox(sig) ? 'beacon-small' : 'beacon-normal'">
                <span class="beacon-arrow">▼</span>
                <span class="beacon-label">Sign Here<span v-if="isSequentialOrderEnforced"> #{{ sig.approvalOrder }}</span></span>
              </div>

              <!-- Waiting state -->
              <div v-if="isUserWaiting(sig)" class="flex flex-col items-center justify-center h-full p-2 pointer-events-none relative">
                <div v-if="isSmallSignatureBox(sig)" class="flex flex-col items-center justify-center h-full">
                  <svg class="w-8 h-8 text-purple-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p class="text-xs text-purple-700 font-semibold text-center">Waiting</p>
                </div>
                <div v-else class="flex flex-col items-center justify-center h-full">
                  <svg class="w-8 h-8 text-purple-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p class="text-xs text-purple-700 font-semibold text-center">Waiting</p>
                  <p class="text-xs text-purple-600 mt-1 text-center">Signer Number {{ sig.approvalOrder }}</p>
                </div>
              </div>

              <!-- Ready to sign -->
              <div v-else-if="canUserSign(sig)" class="flex flex-col items-center justify-center h-full p-2 pointer-events-none relative">
                <div v-if="!isSmallSignatureBox(sig)" class="flex flex-col items-center justify-center h-full">
                  <svg class="w-8 h-8 text-green-600 mb-1 drop-shadow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  <p class="text-xs text-green-800 font-bold text-center">Click to sign</p>
                  <p v-if="isSequentialOrderEnforced" class="text-xs text-green-700 mt-1 text-center">Signer Number {{ sig.approvalOrder }}</p>
                  <p class="text-xs text-green-700 mt-1 text-center">{{ sig.assignedTo }}</p>
                </div>
                <div v-else class="flex items-center justify-center h-full">
                  <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </div>
              </div>

              <!-- Other user empty box -->
              <div v-else-if="sig.isEmpty" class="flex flex-col items-center justify-center h-full p-2 pointer-events-none">
                <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                <p v-if="isSequentialOrderEnforced && !isSmallSignatureBox(sig)" class="text-xs text-gray-400 text-center">Signer Number {{ sig.approvalOrder }}</p>
                <p v-show="!isSmallSignatureBox(sig)" class="text-xs text-gray-400 text-center">{{ isSequentialOrderEnforced ? "(Waiting)" : "(Pending)" }}</p>
              </div>

              <!-- Filled signature -->
              <div v-else class="relative w-full h-full flex flex-col">
                <template v-if="sig.showName">
                  <div class="flex flex-col items-center justify-end pb-2 px-2" style="margin-top: auto;">
                    <div class="flex items-end justify-center" style="margin-bottom: -10px;">
                      <img :src="sig.imageSrc" class="select-none pointer-events-none object-contain"
                        :style="{ maxWidth: Math.max(sig.width - 16, sig.signedBy.length * 8) + 'px', maxHeight: (sig.height - 30) + 'px' }" />
                    </div>
                    <div class="text-center pointer-events-none pt-0.5 text-xs" :style="{ minWidth: Math.max(100, sig.signedBy.length * 8) + 'px' }">
                      <div class="font-medium text-gray-800">{{ sig.signedBy }}</div>
                    </div>
                  </div>
                </template>
                <template v-else>
                  <img :src="sig.imageSrc" class="w-full h-full object-contain select-none pointer-events-none" />
                </template>

                <!-- Edit hint -->
                <div v-if="canUserEdit(sig)"
                  class="absolute top-0 left-0 right-0 text-white text-xs px-2 py-1 text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  :class="sig.signatureLock ? 'bg-red-500' : 'bg-blue-500'">
                  <span v-if="!sig.signatureLock">{{ !isSmallSignatureBox(sig) ? "Drag to Move" : "" }}</span>
                  <span v-else>Locked</span>
                </div>

                <!-- Resize handle -->
                <div v-if="canUserEdit(sig) && !isSignatureLocked(sig)"
                  class="absolute w-4 h-4 bg-blue-500 rounded-full -bottom-1 -right-1 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  @mousedown.stop="startResizingSignature($event, index)"></div>
              </div>
            </div>

            <!-- ─── DATE BOXES ─── -->
            <template v-for="(sig, filteredIndex) in localSignatures.filter(s => s.datePosition)" :key="'date-' + filteredIndex">
              <div
                :ref="el => { if (el) prePlacedDateRefs[filteredIndex] = el }"
                v-show="sig.page === currentViewPage"
                class="absolute select-none text-sm font-semibold text-gray-700 rounded px-2 py-1 border border-gray-300 date-box"
                :class="{
                  'cursor-move hover:bg-blue-400 hover:border-blue-500 bg-blue-200': currentUser(sig) && !sig.isEmpty,
                  'cursor-move hover:bg-green-400 hover:border-green-500 bg-green-200': currentUser(sig) && sig.isEmpty && !isUserWaiting(sig),
                  'cursor-default hover:bg-purple-300 hover:border-purple-400 bg-purple-100': isUserWaiting(sig),
                  'cursor-default hover:bg-gray-200 hover:border-gray-500 bg-gray-50': !currentUser(sig),
                  'z-50': currentDraggingDateIndex === localSignatures.indexOf(sig) && isDraggingDate,
                  'z-10': currentDraggingDateIndex !== localSignatures.indexOf(sig) || !isDraggingDate,
                  'active-drag-date': currentDraggingDateIndex === localSignatures.indexOf(sig) && isDraggingDate
                }"
                :style="{ left: sig.datePosition.x + 'px', top: sig.datePosition.y + 'px' }"
                @mousedown="(!isDateLocked(sig) && currentUser(sig) && !isUserWaiting(sig)) ? startDraggingDate($event, localSignatures.indexOf(sig)) : null"
                :title="isDateLocked(sig) ? 'Locked' : (currentUser(sig) ? 'Drag to move date' : 'Not your field')">
                {{ sig.datePosition.dateText ? sig.datePosition.dateText : "MM/DD/YYYY" }}
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- ════════════════════════ FOOTER ══════════════════════════════ -->
      <div class="flex items-center justify-between p-1 pl-2 border-t bg-gray-50">
        <div class="text-xs text-gray-600">
          <p class="font-semibold">💡 Tips:</p>
          <p v-if="isSequentialOrderEnforced" class="text-purple-600">• Purple boxes are waiting for previous signers</p>
          <p>• Click your box to sign, drag to move, resize from corner</p>
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
.select-none { user-select: none; }
.pointer-events-none { pointer-events: none; }

/* ─── Z-INDEX ─────────────────────────────────────────────────────── */
.sig-needs-signing { z-index: 30; }
.z-highlighted { z-index: 50 !important; }
.z-signed { z-index: 20; }
.z-base { z-index: 10; }
.z-active { z-index: 100 !important; }

/* ─── ANIMATED BORDER ─────────────────────────────────────────────── */
@keyframes border-pulse {
  0%, 100% { border-color: #16a34a; box-shadow: 0 0 0 0 rgba(22,163,74,.5); }
  50%       { border-color: #4ade80; box-shadow: 0 0 0 6px rgba(22,163,74,0); }
}
.sig-needs-signing { animation: border-pulse 2s ease-in-out infinite; }
.sig-needs-signing:hover { animation: none; border-color: #15803d; box-shadow: 0 0 0 4px rgba(22,163,74,.35); }

/* ─── SIGN-HERE BEACON ────────────────────────────────────────────── */
.sign-here-beacon { position:absolute; z-index:9999; pointer-events:none; display:flex; flex-direction:column; align-items:center; white-space:nowrap; filter:drop-shadow(0 2px 4px rgba(0,0,0,.25)); }
.beacon-normal { top:-52px; left:50%; transform:translateX(-50%); }
.beacon-small  { top:-56px; left:50%; transform:translateX(-50%); }
.beacon-label  { background:#16a34a; color:#fff; font-size:11px; font-weight:700; padding:3px 8px; border-radius:4px; order:1; }
@keyframes bounce-arrow { 0%,100%{transform:translateY(0)}50%{transform:translateY(4px)} }
.beacon-arrow  { font-size:14px; color:#16a34a; line-height:1; animation:bounce-arrow 1s ease-in-out infinite; order:2; }

/* ─── PULSE ───────────────────────────────────────────────────────── */
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.55} }
.animate-pulse { animation: pulse 2s cubic-bezier(.4,0,.6,1) infinite; }

/* ─── SIGNATURE BOX ───────────────────────────────────────────────── */
.signature-box { transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease, opacity .15s ease; }
.signature-box.dimmed-box { opacity:.35; filter:blur(.5px); }
.signature-box.active-drag { transform:scale(1.03); box-shadow:0 8px 16px rgba(0,0,0,.2),0 12px 24px rgba(0,0,0,.15); z-index:100!important; opacity:1!important; filter:none!important; }
.signature-box.active-resize { box-shadow:0 6px 12px rgba(0,0,0,.15); z-index:100!important; opacity:1!important; filter:none!important; }
.signature-box:active { transition:none; }

/* ─── DATE BOX ────────────────────────────────────────────────────── */
.date-box { transition: transform .15s ease, box-shadow .15s ease, background-color .15s ease; }
.date-box.active-drag-date { transform:scale(1.05); box-shadow:0 6px 12px rgba(0,0,0,.2); z-index:100!important; }
.date-box:active { transition:none; }

/* ─── TOAST TRANSITION ────────────────────────────────────────────── */
.toast-enter-active, .toast-leave-active { transition: all .3s ease; }
.toast-enter-from { opacity:0; transform:translateX(100%); }
.toast-leave-to   { opacity:0; transform:translateX(100%); }
</style>