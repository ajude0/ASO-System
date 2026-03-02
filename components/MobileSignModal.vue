<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick, reactive, computed, watchEffect } from 'vue';
import { usePdfSigningHub } from '~/js/usePdfSigningHub';

const props = defineProps({
  isOpen: Boolean,
  pdfFile: File,
  signatureFile: File,
  currentUserName: String,
  currentEmplId: String,
  documentId: { type: String, required: true },
  prePlacedSignatures: { type: Array, default: () => [] }
});

const emit = defineEmits(['close', 'apply-signature', 'save-all-signatures']);

// ─────────────────────────────────────────────────────────────────────────────
// Scale system
// BASE_SCALE   : the PDF.js scale at which all stored coords were saved.
// renderScale  : reactive — recomputed by ResizeObserver for responsive fit.
// userZoom     : user-controlled multiplier (1.0 = 100%).
// displayScale : renderScale × userZoom — what PDF.js actually renders at.
// scaleFactor  : displayScale / BASE_SCALE — multiply stored coords → px.
// ─────────────────────────────────────────────────────────────────────────────
const BASE_SCALE  = 1.4;
const renderScale = ref(BASE_SCALE);   // updated by ResizeObserver
const navBarVisible  = ref(true);
const lastScrollTop  = ref(0);
const isZooming = ref(false);

const handleCanvasScroll = (e) => {

  const st = e.target.scrollTop;
  // scrolling up → show, scrolling down → hide
  navBarVisible.value = st < lastScrollTop.value || st <= 10;
  lastScrollTop.value = st;
};

const userZoom    = ref(1.0);
const MIN_ZOOM    = 0.5;
const MAX_ZOOM    = 3.0;
const ZOOM_STEP   = 0.25;
const zoomPercent = computed(() => Math.round(userZoom.value * 100));

const displayScale = computed(() => renderScale.value * userZoom.value);
const scaleFactor  = computed(() => displayScale.value / BASE_SCALE);

// Convert a stored coordinate → current pixel position
const sc = (val) => val * scaleFactor.value;

// ── Zoom actions ──────────────────────────────────────────────
const applyZoom = async () => {
  isZooming.value = true;                                    // 🔒 block ResizeObserver
  try {
    for (let i = 1; i <= totalPages.value; i++) await renderPage(i);
    await nextTick();
    updatePrePlacedPositions();
  } finally {
    isZooming.value = false;                                 // 🔓 always release
  }
};
const zoomIn    = async () => { userZoom.value = Math.min(MAX_ZOOM, +(userZoom.value + ZOOM_STEP).toFixed(2)); await applyZoom(); };
const zoomOut   = async () => { userZoom.value = Math.max(MIN_ZOOM, +(userZoom.value - ZOOM_STEP).toFixed(2)); await applyZoom(); };
const zoomReset = async () => { userZoom.value = 1.0; await applyZoom(); };

// ─────────────────────────────────────────────────────────────────────────────
// SignalR hub
// ─────────────────────────────────────────────────────────────────────────────
const hub = usePdfSigningHub(
  computed(() => props.documentId),
  computed(() => props.currentEmplId),
  computed(() => props.currentUserName)
);

const toasts = ref([]);
function addToast(message, type = 'info', duration = 3500) {
  const id = Date.now();
  toasts.value.push({ id, message, type });
  setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id); }, duration);
}

// ─────────────────────────────────────────────────────────────────────────────
// Core refs
// ─────────────────────────────────────────────────────────────────────────────
const containerRef         = ref(null);
const canvasWrapperRef     = ref(null);
const pdfDocument          = ref(null);
const userSignatureSrc     = ref(null);
const userSignatureBase64  = ref(null);
const canvasRefs           = ref([]);
const totalPages           = ref(0);
const prePlacedSigRefs     = ref([]);
const prePlacedDateRefs    = ref([]);
const currentViewPage      = ref(1);
const currentDate          = ref(new Date().toLocaleDateString());
const goToPageNumber       = ref(1);

const SMALL_SIG_WIDTH  = 120;
const MIN_SIG_WIDTH    = 50;
const MIN_SIG_HEIGHT   = 30;
const MAX_SIG_WIDTH    = 250;
const MAX_SIG_HEIGHT   = 100;

const isSmallSignatureBox = (sig) => sc(sig.width) <= SMALL_SIG_WIDTH;

watchEffect(() => { console.log('signatureFile in modal:', props.signatureFile); });

const editingSignatureIndex    = ref(null);
const isDraggingSignature      = ref(false);
const isResizingSignature      = ref(false);
const isDraggingDate           = ref(false);
const currentDraggingDateIndex = ref(null);
const dragOffsetSig            = ref({ x: 0, y: 0 });
const dragOffsetDate           = ref({ x: 0, y: 0 });
const resizeStartSig           = ref({ x: 0, y: 0, width: 0, height: 0 });

const localSignatures = reactive([]);

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
// Helper — blob URL → base64
// ─────────────────────────────────────────────────────────────────────────────
const blobUrlToBase64 = (blobUrl) => new Promise((resolve, reject) => {
  fetch(blobUrl).then(r => r.blob()).then(blob => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror   = reject;
    reader.readAsDataURL(blob);
  }).catch(reject);
});

// ─────────────────────────────────────────────────────────────────────────────
// Watchers
// ─────────────────────────────────────────────────────────────────────────────
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    localSignatures.length = 0;
    props.prePlacedSignatures.forEach(sig => {
      localSignatures.push({ ...sig, datePosition: sig.datePosition ? { ...sig.datePosition } : null });
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
    userSignatureSrc.value    = URL.createObjectURL(newFile);
    userSignatureBase64.value = null;
    try { userSignatureBase64.value = await blobUrlToBase64(userSignatureSrc.value); }
    catch (err) { console.error('Failed to pre-cache signature as base64:', err); }
  }
}, { immediate: true });

// ─────────────────────────────────────────────────────────────────────────────
// ResizeObserver — recalculates renderScale only (independent of userZoom)
// ─────────────────────────────────────────────────────────────────────────────
let resizeObserver = null;

const setupResizeObserver = () => {
  if (resizeObserver) resizeObserver.disconnect();
  if (!canvasWrapperRef.value) return;

  resizeObserver = new ResizeObserver(async (entries) => {
      if (isZooming.value) return;     
    for (const entry of entries) {
      const availableWidth = entry.contentRect.width;
      if (!pdfDocument.value) return;

      const page         = await pdfDocument.value.getPage(1);
      const rotation     = page.rotate ?? 0;
      const baseViewport = page.getViewport({ scale: BASE_SCALE, rotation });
      const naturalWidth = baseViewport.width;
      const PADDING      = 48;
      const usable       = availableWidth - PADDING;

      const newScale = usable < naturalWidth
        ? Math.max(0.4, (usable / naturalWidth) * BASE_SCALE)
        : BASE_SCALE;

      if (Math.abs(newScale - renderScale.value) > 0.01) {
        renderScale.value = newScale;
        for (let i = 1; i <= totalPages.value; i++) await renderPage(i);
        await nextTick();
        updatePrePlacedPositions();
      }
    }
  });

  resizeObserver.observe(canvasWrapperRef.value);
};

function registerHubListeners() {
  hub.onReconnecting(() => addToast('Reconnecting to real-time sync…', 'warning'));
  hub.onReconnected(()   => addToast('Real-time sync restored ✓', 'success'));
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF loading / rendering — uses displayScale
// ─────────────────────────────────────────────────────────────────────────────
const loadPdf = async () => {
  try {
    const pdfjsLib    = window['pdfjs-dist/build/pdf'];
    const arrayBuffer = await props.pdfFile.arrayBuffer();
    const pdf         = await pdfjsLib.getDocument(arrayBuffer).promise;
    pdfDocument.value       = pdf;
    totalPages.value        = pdf.numPages;
    canvasRefs.value        = [];
    prePlacedSigRefs.value  = [];
    prePlacedDateRefs.value = [];
    await nextTick();
    await nextTick();
    setupResizeObserver();
    for (let i = 1; i <= pdf.numPages; i++) await renderPage(i);
    await nextTick();
    updatePrePlacedPositions();
  } catch (error) {
    console.error('Error loading PDF:', error);
  }
};

let renderTasks = {};

const renderPage = async (pageNum) => {
  try {
    const page = await pdfDocument.value.getPage(pageNum);
    if (renderTasks[pageNum]) { renderTasks[pageNum].cancel(); }

    let rotation = page.rotate ?? 0;
    let viewport = page.getViewport({ scale: displayScale.value, rotation: 0 });
    const isLandscape = viewport.width > viewport.height;
    rotation = isLandscape ? 90 : 0;
    viewport = page.getViewport({ scale: displayScale.value, rotation });

    const canvas = canvasRefs.value[pageNum - 1];
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width  = viewport.width;
    canvas.height = viewport.height;

    const renderTask = page.render({ canvasContext: ctx, viewport });
    renderTasks[pageNum] = renderTask;
    await renderTask.promise;
    renderTasks[pageNum] = null;

    await nextTick();
    updatePrePlacedPositions();
  } catch (error) {
    if (error?.name === 'RenderingCancelledException') return;
    console.error('Error rendering page:', error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Position helpers — all stored coords run through sc()
// ─────────────────────────────────────────────────────────────────────────────
const updatePrePlacedPositions = () => {
  if (!containerRef.value || canvasRefs.value.length === 0) return;
  const containerRect = containerRef.value.getBoundingClientRect();

  localSignatures.forEach((sig, index) => {
    const canvas     = canvasRefs.value[sig.page - 1];
    const sigElement = prePlacedSigRefs.value[index];
    if (!canvas || !sigElement) return;
    const canvasRect      = canvas.getBoundingClientRect();
    sigElement.style.left = (canvasRect.left - containerRect.left + sc(sig.x)) + 'px';
    sigElement.style.top  = (canvasRect.top  - containerRect.top  + sc(sig.y)) + 'px';
  });

  localSignatures.forEach((sig, sigIndex) => {
    if (!sig.datePosition) return;
    const canvas      = canvasRefs.value[sig.page - 1];
    const dateIndex   = localSignatures.slice(0, sigIndex).filter(s => s.datePosition).length;
    const dateElement = prePlacedDateRefs.value[dateIndex];
    if (!canvas || !dateElement) return;
    const canvasRect       = canvas.getBoundingClientRect();
    dateElement.style.left = (canvasRect.left - containerRect.left + sc(sig.datePosition.x)) + 'px';
    dateElement.style.top  = (canvasRect.top  - containerRect.top  + sc(sig.datePosition.y)) + 'px';
  });
};

const updateSingleSigPosition = (index) => {
  if (!containerRef.value || canvasRefs.value.length === 0) return;
  const sig = localSignatures[index];
  if (!sig) return;
  const containerRect = containerRef.value.getBoundingClientRect();
  const canvas        = canvasRefs.value[sig.page - 1];
  const sigElement    = prePlacedSigRefs.value[index];
  if (canvas && sigElement) {
    const canvasRect      = canvas.getBoundingClientRect();
    sigElement.style.left = (canvasRect.left - containerRect.left + sc(sig.x)) + 'px';
    sigElement.style.top  = (canvasRect.top  - containerRect.top  + sc(sig.y)) + 'px';
  }
  if (sig.datePosition) {
    const dateIndex   = localSignatures.slice(0, index).filter(s => s.datePosition).length;
    const dateElement = prePlacedDateRefs.value[dateIndex];
    if (canvas && dateElement) {
      const canvasRect       = canvas.getBoundingClientRect();
      dateElement.style.left = (canvasRect.left - containerRect.left + sc(sig.datePosition.x)) + 'px';
      dateElement.style.top  = (canvasRect.top  - containerRect.top  + sc(sig.datePosition.y)) + 'px';
    }
  }
};

const updateSingleDatePosition = (sigIndex) => {
  if (!containerRef.value || canvasRefs.value.length === 0) return;
  const sig = localSignatures[sigIndex];
  if (!sig?.datePosition) return;
  const containerRect = containerRef.value.getBoundingClientRect();
  const canvas        = canvasRefs.value[sig.page - 1];
  const dateIndex     = localSignatures.slice(0, sigIndex).filter(s => s.datePosition).length;
  const dateElement   = prePlacedDateRefs.value[dateIndex];
  if (canvas && dateElement) {
    const canvasRect       = canvas.getBoundingClientRect();
    dateElement.style.left = (canvasRect.left - containerRect.left + sc(sig.datePosition.x)) + 'px';
    dateElement.style.top  = (canvasRect.top  - containerRect.top  + sc(sig.datePosition.y)) + 'px';
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Permission helpers
// ─────────────────────────────────────────────────────────────────────────────
const canUserSign       = (sig) => sig.isEmpty && sig.assignedEmplId === props.currentEmplId && !isUserWaiting(sig);
const currentUser       = (sig) => sig.assignedEmplId === props.currentEmplId;
const canUserEdit       = (sig) => !sig.isEmpty && sig.assignedEmplId === props.currentEmplId;
const isSignatureLocked = (sig) => sig.signatureLock === true;
const isDateLocked      = (sig) => sig.dateLock === true;

// ─────────────────────────────────────────────────────────────────────────────
// Click to sign
// ─────────────────────────────────────────────────────────────────────────────
const draggedDistance = ref(0);
const dragStartPos    = ref({ x: 0, y: 0 });

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
    imageSrc:     transferableImageSrc,
    isEmpty:      false,
    signedBy:     props.currentUserName,
    signedDate:   currentDate.value,
    datePosition: sig.datePosition ? { ...sig.datePosition, dateText: currentDate.value } : null,
  };

  localSignatures[index] = { ...updated, imageSrc: userSignatureSrc.value };
  hub.sendSignaturePlaced(index, updated);
};

// ─────────────────────────────────────────────────────────────────────────────
// Drag / resize — divide screen px by scaleFactor.value before storing
// ─────────────────────────────────────────────────────────────────────────────
const startDraggingSignature = (e, index) => {
  const sig = localSignatures[index];
  if (!canUserEdit(sig) || isSignatureLocked(sig)) return;
  e.stopPropagation(); e.preventDefault();
  isDraggingSignature.value   = true;
  editingSignatureIndex.value = index;
  draggedDistance.value       = 0;
  dragStartPos.value          = { x: e.clientX, y: e.clientY };
  const canvasRect = canvasRefs.value[sig.page - 1].getBoundingClientRect();
  dragOffsetSig.value = {
    x: (e.clientX - canvasRect.left) / scaleFactor.value - sig.x,
    y: (e.clientY - canvasRect.top)  / scaleFactor.value - sig.y,
  };
};

const startDraggingDate = (e, sigIndex) => {
  const sig = localSignatures[sigIndex];
  if (!canUserEdit(sig) || !sig.datePosition || isDateLocked(sig)) return;
  e.stopPropagation(); e.preventDefault();
  isDraggingDate.value             = true;
  currentDraggingDateIndex.value   = sigIndex;
  draggedDistance.value            = 0;
  dragStartPos.value               = { x: e.clientX, y: e.clientY };
  const canvasRect = canvasRefs.value[sig.page - 1].getBoundingClientRect();
  dragOffsetDate.value = {
    x: (e.clientX - canvasRect.left) / scaleFactor.value - sig.datePosition.x,
    y: (e.clientY - canvasRect.top)  / scaleFactor.value - sig.datePosition.y,
  };
};

const dragSignature = (e) => {
  if (!isDraggingSignature.value || editingSignatureIndex.value === null) return;
  const idx = editingSignatureIndex.value;
  const sig = localSignatures[idx];
  if (isSignatureLocked(sig)) return;
  const canvas     = canvasRefs.value[sig.page - 1];
  const canvasRect = canvas.getBoundingClientRect();
  const dx = e.clientX - dragStartPos.value.x;
  const dy = e.clientY - dragStartPos.value.y;
  draggedDistance.value = Math.sqrt(dx * dx + dy * dy);
  const rawX    = (e.clientX - canvasRect.left) / scaleFactor.value;
  const rawY    = (e.clientY - canvasRect.top)  / scaleFactor.value;
  const canvasW = canvas.width  / scaleFactor.value;
  const canvasH = canvas.height / scaleFactor.value;
  const oldX = sig.x, oldY = sig.y;
  sig.x = Math.max(0, Math.min(rawX - dragOffsetSig.value.x, canvasW - sig.width));
  sig.y = Math.max(0, Math.min(rawY - dragOffsetSig.value.y, canvasH - sig.height));
  if (sig.datePosition && !isDateLocked(sig)) {
    sig.datePosition.x = Math.max(0, Math.min(sig.datePosition.x + (sig.x - oldX), canvasW - 100));
    sig.datePosition.y = Math.max(0, Math.min(sig.datePosition.y + (sig.y - oldY), canvasH - 30));
  }
  updateSingleSigPosition(idx);
  const sigToSend = { ...sig, datePosition: sig.datePosition ? { ...sig.datePosition } : null };
  if (sigToSend.imageSrc?.startsWith('blob:') && userSignatureBase64.value) sigToSend.imageSrc = userSignatureBase64.value;
  hub.sendSignatureMoved(idx, sigToSend);
};

const dragDate = (e) => {
  if (!isDraggingDate.value || currentDraggingDateIndex.value === null) return;
  const idx = currentDraggingDateIndex.value;
  const sig = localSignatures[idx];
  if (isDateLocked(sig)) return;
  const canvas     = canvasRefs.value[sig.page - 1];
  const canvasRect = canvas.getBoundingClientRect();
  const dx = e.clientX - dragStartPos.value.x;
  const dy = e.clientY - dragStartPos.value.y;
  draggedDistance.value = Math.sqrt(dx * dx + dy * dy);
  const rawX    = (e.clientX - canvasRect.left) / scaleFactor.value;
  const rawY    = (e.clientY - canvasRect.top)  / scaleFactor.value;
  const canvasW = canvas.width  / scaleFactor.value;
  const canvasH = canvas.height / scaleFactor.value;
  sig.datePosition.x = Math.max(0, Math.min(rawX - dragOffsetDate.value.x, canvasW - 100));
  sig.datePosition.y = Math.max(0, Math.min(rawY - dragOffsetDate.value.y, canvasH - 30));
  updateSingleDatePosition(idx);
  hub.sendDateMoved(idx, { ...sig.datePosition });
};

const startResizingSignature = (e, index) => {
  const sig = localSignatures[index];
  if (!canUserEdit(sig) || isSignatureLocked(sig)) return;
  e.stopPropagation();
  isResizingSignature.value   = true;
  editingSignatureIndex.value = index;
  const canvasRect = canvasRefs.value[sig.page - 1].getBoundingClientRect();
  resizeStartSig.value = {
    x:      (e.clientX - canvasRect.left) / scaleFactor.value,
    y:      (e.clientY - canvasRect.top)  / scaleFactor.value,
    width:  sig.width,
    height: sig.height,
  };
};

const resizeSignature = (e) => {
  if (!isResizingSignature.value || editingSignatureIndex.value === null) return;
  const idx = editingSignatureIndex.value;
  const sig = localSignatures[idx];
  if (isSignatureLocked(sig)) return;
  const canvasRect = canvasRefs.value[sig.page - 1].getBoundingClientRect();
  const curX = (e.clientX - canvasRect.left) / scaleFactor.value;
  const curY = (e.clientY - canvasRect.top)  / scaleFactor.value;
  const dx   = curX - resizeStartSig.value.x;
  const dy   = curY - resizeStartSig.value.y;
  sig.width  = Math.min(MAX_SIG_WIDTH,  Math.max(MIN_SIG_WIDTH,  resizeStartSig.value.width  + dx));
  sig.height = Math.min(MAX_SIG_HEIGHT, Math.max(MIN_SIG_HEIGHT, resizeStartSig.value.height + dy));
  updateSingleSigPosition(idx);
  hub.sendSignatureResized(idx, sig.width, sig.height);
};

// ─────────────────────────────────────────────────────────────────────────────
// Mouse handlers
// ─────────────────────────────────────────────────────────────────────────────
const handleMouseMove = (e) => {
  if (isDraggingSignature.value)      dragSignature(e);
  else if (isDraggingDate.value)      dragDate(e);
  else if (isResizingSignature.value) resizeSignature(e);
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect();
    hub.sendCursorMoved(
      (e.clientX - rect.left) / scaleFactor.value,
      (e.clientY - rect.top)  / scaleFactor.value,
      currentViewPage.value,
      localSignatures.find(s => s.assignedEmplId === props.currentEmplId)?.color || '#6366f1'
    );
  }
};

const handleMouseUp = () => {
  isDraggingSignature.value      = false;
  isDraggingDate.value           = false;
  isResizingSignature.value      = false;
  currentDraggingDateIndex.value = null;
  updatePrePlacedPositions();
  setTimeout(() => { draggedDistance.value = 0; }, 100);
};

const isActiveDrag    = (index) => isDraggingSignature.value && editingSignatureIndex.value === index;
const isOtherDragging = (index) => isDraggingSignature.value && editingSignatureIndex.value !== index;

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────────────────────────────────────
const mySignatures = computed(() => {
  const ready = [], waiting = [], completed = [];
  localSignatures.forEach((sig, index) => {
    if (sig.assignedEmplId !== props.currentEmplId) return;
    if (!sig.isEmpty)            completed.push({ ...sig, index });
    else if (isUserWaiting(sig)) waiting.push({ ...sig, index });
    else                         ready.push({ ...sig, index });
  });
  return { ready, waiting, completed };
});

const highlightedSignatureIndex = ref(null);
const goToSignature = (sig) => {
  currentViewPage.value           = sig.page;
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

const showSidebar = ref(false);

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
      imageSrc:     (sig.imageSrc?.startsWith('blob:') && userSignatureBase64.value) ? userSignatureBase64.value : sig.imageSrc,
      datePosition: sig.datePosition ? { ...sig.datePosition } : null,
      hasSigned:    sig.imageSrc ? true : false,
    }));
  hub.sendSignaturesSaved(mySignaturesCopy);
  emit('save-all-signatures', mySignaturesCopy);
  emit('close');
};

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────────────────
onMounted(() => {
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup',   handleMouseUp);
  window.addEventListener('resize',      updatePrePlacedPositions);
});

onUnmounted(async () => {
  if (userSignatureSrc.value) URL.revokeObjectURL(userSignatureSrc.value);
  if (resizeObserver) resizeObserver.disconnect();
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup',   handleMouseUp);
  window.removeEventListener('resize',      updatePrePlacedPositions);
  await hub.disconnect();
});
</script>

<template>
  <!-- PORTRAIT LOCK SCREEN -->
  <Teleport to="body">
    <div v-if="isOpen" class="portrait-gate fixed inset-0 z-[9999] bg-gray-950 flex flex-col items-center justify-center">
      <div class="phone-wrapper mb-8">
        <svg class="phone-rock w-20 h-20 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="5" y="2" width="14" height="20" rx="2.5" stroke-width="1.5"/>
          <circle cx="12" cy="18.5" r="0.8" fill="currentColor" stroke="none"/>
          <line x1="9" y1="4" x2="15" y2="4" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <svg class="rotate-hint w-10 h-10 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0114.93-4.36M20 15a9 9 0 01-14.93 4.36"/>
        </svg>
      </div>
      <p class="text-white text-2xl font-bold mb-2 tracking-tight">Rotate Your Device</p>
      <p class="text-gray-400 text-sm text-center leading-relaxed max-w-xs">
        Please switch to <span class="text-blue-400 font-semibold">landscape mode</span><br/>to sign this document.
      </p>
      <div class="flex items-center gap-2 mt-6">
        <svg class="w-7 h-7 text-blue-500 chevron-flow chev-1" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
        <svg class="w-7 h-7 text-blue-400 chevron-flow chev-2" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
        <svg class="w-7 h-7 text-blue-300 chevron-flow chev-3" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
      </div>
      <button @click="emit('close')" class="mt-10 px-5 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition">Cancel</button>
    </div>
  </Teleport>

  <!-- ACTUAL MODAL -->
  <div v-if="isOpen"
    class="modal-landscape-only fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center w-full z-50"
    @click.self="emit('close')">
    <div class="bg-white rounded-lg shadow-xl w-full max-h-[95vh] flex flex-col mx-2 sm:mx-4 max-w-[98vw] sm:max-w-3xl md:max-w-5xl lg:max-w-7xl">

      <!-- TOASTS -->
      <div class="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        <transition-group name="toast" tag="div" class="flex flex-col gap-2">
          <div v-for="toast in toasts" :key="toast.id"
            class="px-4 py-3 rounded-lg shadow-lg text-sm font-semibold flex items-center gap-2 pointer-events-auto max-w-xs"
            :class="{
              'bg-blue-600 text-white':   toast.type === 'info',
              'bg-green-600 text-white':  toast.type === 'success',
              'bg-yellow-500 text-white': toast.type === 'warning',
              'bg-red-600 text-white':    toast.type === 'error',
            }">
            <span v-if="toast.type === 'info'">ℹ️</span>
            <span v-else-if="toast.type === 'success'">✅</span>
            <span v-else-if="toast.type === 'warning'">⚠️</span>
            <span v-else>❌</span>
            {{ toast.message }}
          </div>
        </transition-group>
      </div>

      <!-- HEADER -->
      <div class="flex items-start justify-between p-2 sm:p-2 border-b flex-shrink-0">
        <div class="flex-1 min-w-0">
          <h2 class="text-base sm:text-xl font-semibold truncate">Sign PDF Document</h2>
          
          <div class="mt-1 flex items-center gap-1">
            <span v-if="hub.isConnected.value" class="w-2 h-2 bg-green-500 rounded-full inline-block flex-shrink-0"></span>
            <span v-else class="w-2 h-2 bg-yellow-400 rounded-full inline-block animate-pulse flex-shrink-0"></span>
            <span class="text-xs text-gray-400">{{ hub.isConnected.value ? 'Live sync active' : 'Connecting…' }}</span>
          </div>
          <div v-if="isSequentialOrderEnforced && getNextSignerInfo"
            class="mt-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200">
            🔄 Waiting for <strong>{{ getNextSignerInfo.name }}</strong> (#{{ getNextSignerInfo.order }})
          </div>
        </div>
        <div class="flex items-center gap-2 ml-2 flex-shrink-0">
          <button v-if="mySignatures.ready.length > 0" @click="findNextSignature"
            class="px-2 py-2 sm:px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-1.5 font-semibold shadow-md text-xs sm:text-sm">
            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span class="hidden sm:inline">Find My Signatures ({{ mySignatures.ready.length }})</span>
            <span class="sm:hidden">{{ mySignatures.ready.length }}</span>
          </button>
          <button @click="emit('close')" class="p-2 hover:bg-gray-100 rounded-full transition flex-shrink-0">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

     <!-- PAGE NAVIGATION + ZOOM — hides on scroll down, shows on scroll up -->
<Transition name="nav-slide">
  <div v-show="navBarVisible"
    class="flex items-center justify-center gap-2 sm:gap-3 px-3 py-2 border-b flex-shrink-0 flex-wrap">
    <button @click="goToPrevPage" :disabled="currentViewPage === 1"
      class="px-2 py-1.5 sm:px-4 sm:py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1 text-sm">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      <span class="hidden sm:inline">Previous</span>
    </button>

    <span class="text-xs sm:text-sm font-semibold text-gray-700">Page {{ currentViewPage }} / {{ totalPages }}</span>

    <button @click="goToNextPage" :disabled="currentViewPage === totalPages"
      class="px-2 py-1.5 sm:px-4 sm:py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1 text-sm">
      <span class="hidden sm:inline">Next</span>
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </button>

    <div class="flex items-center gap-1">
      <input type="number" min="1" :max="totalPages" v-model.number="goToPageNumber"
        @keydown.enter="scrollToPage(goToPageNumber)"
        class="border rounded px-2 py-1 w-12 sm:w-16 text-xs sm:text-sm text-center" />
      <button @click="scrollToPage(goToPageNumber)"
        class="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 text-xs sm:text-sm">Go</button>
    </div>

    <div class="hidden sm:block w-px h-5 bg-gray-300"></div>

    <!-- ★ Zoom controls ★ -->
    <div class="flex items-center gap-1 bg-gray-200 rounded-lg p-1">
      <button @click="zoomOut" :disabled="userZoom <= MIN_ZOOM"
        class="w-7 h-7 flex items-center justify-center rounded hover:bg-white transition disabled:opacity-40 disabled:cursor-not-allowed font-bold text-gray-700 text-lg leading-none"
        title="Zoom out">−</button>
      <button @click="zoomReset"
        class="px-2 py-0.5 text-xs font-semibold text-gray-700 hover:bg-white rounded transition min-w-[46px] text-center"
        title="Reset zoom">{{ zoomPercent }}%</button>
      <button @click="zoomIn" :disabled="userZoom >= MAX_ZOOM"
        class="w-7 h-7 flex items-center justify-center rounded hover:bg-white transition disabled:opacity-40 disabled:cursor-not-allowed font-bold text-gray-700 text-lg leading-none"
        title="Zoom in">+</button>
    </div>
  </div>
</Transition>

      <!-- BODY -->
      <div class="flex flex-1 overflow-hidden relative">

        <!-- SIDEBAR -->
        <div v-if="showSidebar"
          class="border-r bg-gray-50 p-3 sm:p-4 overflow-y-auto flex-shrink-0 w-52 sm:w-64 lg:w-72 absolute sm:relative inset-y-0 left-0 z-30 sm:z-auto shadow-xl sm:shadow-none">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-semibold text-sm sm:text-lg">My Signatures</h3>
            <button @click="showSidebar = false" class="p-1 hover:bg-gray-200 rounded transition">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>

          <!-- Ready -->
          <div v-if="mySignatures.ready.length > 0" class="mb-4">
            <h4 class="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Ready ({{ mySignatures.ready.length }})
            </h4>
            <div class="space-y-1.5">
              <div v-for="sig in mySignatures.ready" :key="sig.index" @click="goToSignature(sig)"
                class="p-2 bg-white rounded-lg border-2 border-green-300 hover:border-green-500 hover:bg-green-50 cursor-pointer transition-all hover:shadow-md active:scale-95">
                <div class="flex items-center justify-between">
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-semibold text-gray-800 truncate">{{ sig.assignedTo }}</p>
                    <div class="flex items-center gap-1 mt-0.5">
                      <span class="text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">Pg {{ sig.page }}</span>
                      <span v-if="isSequentialOrderEnforced" class="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded font-semibold">#{{ sig.approvalOrder }}</span>
                    </div>
                  </div>
                  <svg class="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <!-- Waiting -->
          <div v-if="mySignatures.waiting.length > 0" class="mb-4">
            <h4 class="text-xs font-semibold text-purple-700 mb-2 flex items-center gap-1">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Waiting ({{ mySignatures.waiting.length }})
            </h4>
            <div class="space-y-1.5">
              <div v-for="sig in mySignatures.waiting" :key="sig.index" @click="goToSignature(sig)"
                class="p-2 bg-white rounded-lg border-2 border-purple-300 hover:border-purple-500 hover:bg-purple-50 cursor-pointer transition-all active:scale-95">
                <div class="flex items-center justify-between">
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-semibold text-gray-800 truncate">{{ sig.assignedTo }}</p>
                    <div class="flex items-center gap-1 mt-0.5">
                      <span class="text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">Pg {{ sig.page }}</span>
                      <span class="text-xs text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded font-semibold">#{{ sig.approvalOrder }}</span>
                    </div>
                  </div>
                  <svg class="w-4 h-4 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <!-- Completed -->
          <div v-if="mySignatures.completed.length > 0" class="mb-4">
            <h4 class="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              Completed ({{ mySignatures.completed.length }})
            </h4>
            <div class="space-y-1.5">
              <div v-for="sig in mySignatures.completed" :key="sig.index" @click="goToSignature(sig)"
                class="p-2 bg-white rounded-lg border-2 border-blue-300 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all active:scale-95">
                <div class="flex items-center justify-between">
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-semibold text-gray-800 truncate">{{ sig.assignedTo }}</p>
                    <div class="flex items-center gap-1 mt-0.5">
                      <span class="text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">Pg {{ sig.page }}</span>
                      <span v-if="isSequentialOrderEnforced" class="text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded font-semibold">#{{ sig.approvalOrder }}</span>
                    </div>
                  </div>
                  <svg class="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div v-if="mySignatures.ready.length === 0 && mySignatures.waiting.length === 0 && mySignatures.completed.length === 0"
            class="text-center py-8 px-3">
            <div class="bg-white rounded-lg p-4 border-2 border-dashed border-gray-300">
              <svg class="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p class="text-xs font-semibold text-gray-700">No Signatures Assigned</p>
            </div>
          </div>
        </div>

        <!-- Mobile backdrop -->
        <div v-if="showSidebar" class="fixed inset-0 bg-black bg-opacity-20 z-20 sm:hidden" @click="showSidebar = false"></div>

        <!-- Sidebar toggle -->
        <button v-if="!showSidebar" @click="showSidebar = true"
          class="absolute left-2 top-1/2 -translate-y-1/2 bg-blue-600 text-white p-2 sm:p-3 rounded-lg shadow-xl hover:bg-blue-700 transition z-40 flex flex-col items-center gap-1"
          title="Show My Signatures">
          <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
          <div class="flex gap-0.5 text-xs">
            <span v-if="mySignatures.ready.length > 0"     class="bg-green-500  px-1.5 py-0.5 rounded font-bold text-[10px]">{{ mySignatures.ready.length }}</span>
            <span v-if="mySignatures.waiting.length > 0"   class="bg-purple-500 px-1.5 py-0.5 rounded font-bold text-[10px]">{{ mySignatures.waiting.length }}</span>
            <span v-if="mySignatures.completed.length > 0" class="bg-white text-blue-600 px-1.5 py-0.5 rounded font-bold text-[10px]">{{ mySignatures.completed.length }}</span>
          </div>
        </button>

        <!-- PDF CANVAS AREA -->
        <div ref="canvasWrapperRef" class="flex-1 overflow-auto p-3 sm:p-6 bg-gray-100 flex justify-center"
  @scroll="handleCanvasScroll">
          <div ref="containerRef" class="relative inline-block" @mousemove="handleMouseMove">

            <div class="relative border-2 border-gray-300 rounded shadow-sm">
              <div class="absolute -top-3 left-3 bg-white px-2 py-0.5 text-xs font-semibold text-gray-600 border rounded">
                Page {{ currentViewPage }}
              </div>
              <canvas v-for="i in totalPages" :key="i" v-show="i === currentViewPage"
                :ref="el => { if (el) canvasRefs[i - 1] = el }" class="block"></canvas>
            </div>

            <!-- SIGNATURE BOXES -->
            <div v-for="(sig, index) in localSignatures" :key="'preplaced-' + index"
              :ref="el => { if (el) prePlacedSigRefs[index] = el }"
              v-show="sig.page === currentViewPage"
              class="absolute rounded signature-box group"
              :class="{
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
                'z-active active-drag':   isActiveDrag(index) && isDraggingSignature,
                'z-active active-resize': editingSignatureIndex === index && isResizingSignature,
                'dimmed-box': isDraggingSignature && !isActiveDrag(index),
              }"
              :style="{ width: sc(sig.width) + 'px', height: sc(sig.height) + 'px' }"
              @mouseup="handlePrePlacedClick(sig, index)"
              @mousedown="(!isSignatureLocked(sig) && canUserEdit(sig)) ? startDraggingSignature($event, index) : null"
              :title="sig.isEmpty ? `Assigned to: ${sig.assignedTo}` : `Signed by: ${sig.signedBy}`">

              <!-- Name tooltip -->
              <div class="absolute -top-7 left-0 text-white text-xs px-2 py-1 rounded font-semibold whitespace-nowrap flex items-center gap-1 shadow-lg pointer-events-none transition-all duration-200"
                :class="{ 'opacity-0 group-hover:opacity-100': !isActiveDrag(index), 'opacity-100': isActiveDrag(index) }"
                :style="{ backgroundColor: sig.color || '#3b82f6' }">
                {{ sig.assignedTo }}
                <span v-if="isSequentialOrderEnforced" class="ml-1 px-1 py-0.5 bg-white bg-opacity-30 rounded">#{{ sig.approvalOrder }}</span>
                <span v-if="isSignatureLocked(sig) && !sig.isEmpty">🔒</span>
              </div>

              <!-- Corner dot -->
              <div v-if="!isActiveDrag(index)"
                class="absolute -top-2 -left-2 w-5 h-5 rounded-full text-white text-[9px] font-bold flex items-center justify-center shadow-md pointer-events-none"
                :class="{ 'opacity-60': isOtherDragging(index) }"
                :style="{ backgroundColor: sig.color || '#3b82f6' }">
                {{ isSequentialOrderEnforced ? sig.approvalOrder : (sig.assignedTo || '').trim().split(' ').filter(Boolean).map(n => n[0]).slice(0, 1).concat((sig.assignedTo || '').trim().split(' ').slice(-1).map(n => n[0])).join('').toUpperCase() }}
              </div>

              <!-- Sign here beacon -->
              <div v-if="canUserSign(sig)" class="sign-here-beacon pointer-events-none"
                :class="isSmallSignatureBox(sig) ? 'beacon-small' : 'beacon-normal'">
                <span class="beacon-arrow">▼</span>
                <span class="beacon-label">Sign Here<span v-if="isSequentialOrderEnforced"> #{{ sig.approvalOrder }}</span></span>
              </div>

              <!-- Waiting -->
              <div v-if="isUserWaiting(sig)" class="flex flex-col items-center justify-center h-full p-1 pointer-events-none">
                <svg class="w-5 h-5 text-purple-500 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p v-if="!isSmallSignatureBox(sig)" class="text-xs text-purple-700 font-semibold text-center">Waiting #{{ sig.approvalOrder }}</p>
              </div>

              <!-- Ready to sign -->
              <div v-else-if="canUserSign(sig)" class="flex flex-col items-center justify-center h-full p-1 pointer-events-none">
                <svg class="w-5 h-5 text-green-600 drop-shadow" :class="{ 'w-7 h-7': !isSmallSignatureBox(sig) }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <p v-if="!isSmallSignatureBox(sig)" class="text-xs text-green-800 font-bold text-center mt-0.5">Click to sign</p>
                <p v-if="!isSmallSignatureBox(sig) && isSequentialOrderEnforced" class="text-xs text-green-700 text-center">#{{ sig.approvalOrder }}</p>
              </div>

              <!-- Other user empty -->
              <div v-else-if="sig.isEmpty" class="flex flex-col items-center justify-center h-full p-1 pointer-events-none">
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <p v-if="!isSmallSignatureBox(sig)" class="text-xs text-gray-400 text-center">{{ isSequentialOrderEnforced ? `#${sig.approvalOrder}` : 'Pending' }}</p>
              </div>

              <!-- Filled signature -->
              <div v-else class="relative w-full h-full flex flex-col">
                <template v-if="sig.showName">
                  <div class="flex flex-col items-center justify-end pb-1 px-1 h-full">
                    <div class="flex items-end justify-center" style="margin-bottom: -8px;">
                      <img :src="sig.imageSrc" class="select-none pointer-events-none object-contain"
                        :style="{ maxWidth: Math.max(sc(sig.width) - 12, (sig.signedBy || '').length * 8) + 'px', maxHeight: (sc(sig.height) - 24) + 'px' }" />
                    </div>
                    <div class="text-center pointer-events-none pt-0.5 text-xs"
                      :style="{ minWidth: Math.max(80, (sig.signedBy || '').length * 7) + 'px' }">
                      <div class="font-medium text-gray-800 truncate">{{ sig.signedBy }}</div>
                    </div>
                  </div>
                </template>
                <template v-else>
                  <img :src="sig.imageSrc" class="w-full h-full object-contain select-none pointer-events-none" />
                </template>
                <div v-if="canUserEdit(sig)"
                  class="absolute top-0 left-0 right-0 text-white text-xs px-1 py-0.5 text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  :class="sig.signatureLock ? 'bg-red-500' : 'bg-blue-500'">
                  <span v-if="!sig.signatureLock">{{ !isSmallSignatureBox(sig) ? 'Drag to Move' : '' }}</span>
                  <span v-else>Locked</span>
                </div>
                <div v-if="canUserEdit(sig) && !isSignatureLocked(sig)"
                  class="absolute w-4 h-4 bg-blue-500 rounded-full -bottom-1 -right-1 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity z-10 touch-none"
                  @mousedown.stop="startResizingSignature($event, index)">
                </div>
              </div>
            </div>

            <!-- DATE BOXES -->
            <template v-for="(sig, filteredIndex) in localSignatures.filter(s => s.datePosition)" :key="'date-' + filteredIndex">
              <div :ref="el => { if (el) prePlacedDateRefs[filteredIndex] = el }"
                v-show="sig.page === currentViewPage"
                class="absolute select-none text-xs sm:text-sm font-semibold text-gray-700 rounded px-1.5 py-0.5 border date-box"
                :class="{
                  'cursor-move hover:bg-blue-400 hover:border-blue-500 bg-blue-200':   currentUser(sig) && !sig.isEmpty,
                  'cursor-move hover:bg-green-400 hover:border-green-500 bg-green-200': currentUser(sig) && sig.isEmpty && !isUserWaiting(sig),
                  'cursor-default hover:bg-purple-300 hover:border-purple-400 bg-purple-100': isUserWaiting(sig),
                  'cursor-default hover:bg-gray-200 hover:border-gray-500 bg-gray-50':  !currentUser(sig),
                  'z-50': currentDraggingDateIndex === localSignatures.indexOf(sig) && isDraggingDate,
                  'z-10': currentDraggingDateIndex !== localSignatures.indexOf(sig) || !isDraggingDate,
                  'active-drag-date': currentDraggingDateIndex === localSignatures.indexOf(sig) && isDraggingDate,
                }"
                @mousedown="(!isDateLocked(sig) && currentUser(sig) && !isUserWaiting(sig)) ? startDraggingDate($event, localSignatures.indexOf(sig)) : null"
                :title="isDateLocked(sig) ? 'Locked' : (currentUser(sig) ? 'Drag to move date' : 'Not your field')">
                {{ sig.datePosition.dateText || 'MM/DD/YYYY' }}
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- FOOTER -->
      <div class="flex items-center justify-between p-2 sm:p-3 border-t bg-gray-50 flex-shrink-0">
        <div class="text-xs text-gray-500 hidden sm:block">
          <p>• Click your box to sign · Drag to move · Resize from corner</p>
          <p class="text-orange-600">⚠️ Changes saved only when you click "Done"</p>
        </div>
        <div class="text-xs text-orange-600 sm:hidden">⚠️ Click "Done" to save</div>
        <button @click="handleDone"
          class="px-4 py-2 sm:px-6 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm font-semibold ml-auto sm:ml-0">
          Done
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.select-none         { user-select: none; }
.pointer-events-none { pointer-events: none; }

.sig-needs-signing { z-index: 30; }
.z-highlighted     { z-index: 50 !important; }
.z-signed          { z-index: 20; }
.z-base            { z-index: 10; }
.z-active          { z-index: 100 !important; }

@keyframes border-pulse {
  0%,100% { border-color:#16a34a; box-shadow:0 0 0 0 rgba(22,163,74,.5); }
  50%      { border-color:#4ade80; box-shadow:0 0 0 6px rgba(22,163,74,0); }
}
.sig-needs-signing { animation: border-pulse 2s ease-in-out infinite; }
.sig-needs-signing:hover { animation:none; border-color:#15803d; box-shadow:0 0 0 4px rgba(22,163,74,.35); }

.sign-here-beacon { position:absolute; z-index:9999; pointer-events:none; display:flex; flex-direction:column; align-items:center; white-space:nowrap; filter:drop-shadow(0 2px 4px rgba(0,0,0,.25)); }
.beacon-normal    { top:-50px; left:50%; transform:translateX(-50%); }
.beacon-small     { top:-54px; left:50%; transform:translateX(-50%); }
.beacon-label     { background:#16a34a; color:#fff; font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px; order:1; }
@keyframes bounce-arrow { 0%,100%{transform:translateY(0)} 50%{transform:translateY(4px)} }
.beacon-arrow     { font-size:12px; color:#16a34a; line-height:1; animation:bounce-arrow 1s ease-in-out infinite; order:2; }

@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.55} }
.animate-pulse { animation:pulse 2s cubic-bezier(.4,0,.6,1) infinite; }

.signature-box { transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease, opacity .15s ease; }
.signature-box.dimmed-box    { opacity:.35; filter:blur(.5px); }
.signature-box.active-drag   { transform:scale(1.03); box-shadow:0 8px 16px rgba(0,0,0,.2); z-index:100!important; opacity:1!important; filter:none!important; }
.signature-box.active-resize { box-shadow:0 6px 12px rgba(0,0,0,.15); z-index:100!important; opacity:1!important; filter:none!important; }
.signature-box:active        { transition:none; }

.date-box { transition: transform .15s ease, box-shadow .15s ease, background-color .15s ease; border-color: #d1d5db; }
.date-box.active-drag-date { transform:scale(1.05); box-shadow:0 6px 12px rgba(0,0,0,.2); z-index:100!important; }
.date-box:active { transition:none; }

.toast-enter-active, .toast-leave-active { transition: all .3s ease; }
.toast-enter-from { opacity:0; transform:translateX(100%); }
.toast-leave-to   { opacity:0; transform:translateX(100%); }

.portrait-gate        { display: none; }
.modal-landscape-only { display: flex; }
@media (max-width: 1023px) and (orientation: portrait) {
  .portrait-gate        { display: flex; }
  .modal-landscape-only { display: none !important; }
}
@media (max-width: 1023px) and (orientation: landscape) {
  .portrait-gate        { display: none; }
  .modal-landscape-only { display: flex; }
}

@keyframes phone-rock {
  0%   { transform: rotate(0deg); }
  20%  { transform: rotate(-25deg); }
  40%  { transform: rotate(0deg); }
  60%  { transform: rotate(-25deg); }
  80%  { transform: rotate(0deg); }
  100% { transform: rotate(0deg); }
}
.phone-rock { animation: phone-rock 2.4s ease-in-out infinite; transform-origin: center; }

@keyframes spin-hint {
  0%   { transform: rotate(0deg) scale(1);    opacity: 0.7; }
  50%  { transform: rotate(180deg) scale(1.1); opacity: 1; }
  100% { transform: rotate(360deg) scale(1);   opacity: 0.7; }
}
.rotate-hint { animation: spin-hint 2.4s linear infinite; }

.phone-wrapper { position: relative; display: inline-flex; align-items: center; justify-content: center; }
.rotate-hint   { position: absolute; bottom: -8px; right: -14px; }

@keyframes chev-flow {
  0%, 100% { opacity: 0.2; transform: translateX(-6px); }
  50%       { opacity: 1;   transform: translateX(4px);  }
}
.chev-1 { animation: chev-flow 1.2s ease-in-out infinite; animation-delay: 0ms;   }
.chev-2 { animation: chev-flow 1.2s ease-in-out infinite; animation-delay: 160ms; }
.chev-3 { animation: chev-flow 1.2s ease-in-out infinite; animation-delay: 320ms; }
/* Nav bar slide transition */
.nav-slide-enter-active,
.nav-slide-leave-active {
  transition: max-height 0.25s ease, opacity 0.25s ease, padding 0.25s ease;
  overflow: hidden;
}
.nav-slide-enter-from,
.nav-slide-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}
.nav-slide-enter-to,
.nav-slide-leave-from {
  max-height: 80px;
  opacity: 1;
}
</style>