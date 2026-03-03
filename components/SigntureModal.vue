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
  prePlacedSignatures: { type: Array, default: () => [] },
  freeSign: { type: Boolean, default: false }
});

const emit = defineEmits(['close', 'apply-signature', 'save-all-signatures']);

// ─────────────────────────────────────────────────────────────────────────────
// TUTORIAL SYSTEM
// ─────────────────────────────────────────────────────────────────────────────
const showTutorial      = ref(false);
const tutorialStep      = ref(0);
const tutorialHighlight = ref(null);

const TUTORIAL_KEY = 'pdfSigningModal_tutorialSeen';

const tutorialStepsNormal = [
  {
    id: 'welcome',
    title: '✍️ Welcome to PDF Signing!',
    body: 'This is where you review and sign your assigned signature boxes on the document. Let\'s walk through everything quickly.',
    target: null,
    position: 'center',
  },
  {
    id: 'find-sig',
    title: '🔍 Step 1 – Find Your Signature Boxes',
    body: 'Click <strong>Find My Signatures</strong> to jump directly to your next unsigned box. The number shows how many you still need to sign.',
    target: '.tutorial-target-find-sig',
    position: 'bottom',
  },
  {
    id: 'sidebar',
    title: '📋 Step 2 – Sidebar Overview',
    body: 'Click the <strong>blue arrow button</strong> on the left to open the sidebar. It lists all your assigned boxes grouped as <em>Ready</em>, <em>Waiting</em>, or <em>Completed</em>.',
    target: '.tutorial-target-sidebar-btn',
    position: 'right',
  },
  {
    id: 'sequential',
    title: '🔢 Sequential Signing',
    body: 'If a banner says <em>"Waiting for [Name]"</em>, the document uses ordered signing. You\'ll be able to sign only after the earlier signer completes their step.',
    target: '.tutorial-target-seq-banner',
    position: 'bottom',
  },
  {
    id: 'click-sign',
    title: '✅ Step 3 – Click to Sign',
    body: 'A <strong>green pulsing box</strong> with a "Sign Here" label is yours to sign. Simply click it and your signature image will be applied automatically.',
    target: '.tutorial-target-canvas-area',
    position: 'center',
  },
  {
    id: 'drag-move',
    title: '↔️ Step 4 – Reposition & Resize',
    body: 'After signing, you can <strong>drag</strong> your signature to reposition it. Hover to reveal the <strong>blue corner handle</strong> for resizing.',
    target: '.tutorial-target-canvas-area',
    position: 'center',
  },
  {
    id: 'date-box',
    title: '📅 Step 5 – Date Box',
    body: 'A coloured date label may appear alongside your signature. You can <strong>drag it independently</strong> to reposition it on the page.',
    target: '.tutorial-target-canvas-area',
    position: 'center',
  },
  {
    id: 'zoom',
    title: '🔎 Step 6 – Zoom & Navigation',
    body: 'Use the <strong>− / +</strong> zoom controls to get a closer look. Use <strong>Previous / Next</strong> or the page input to move between pages.',
    target: '.tutorial-target-nav',
    position: 'bottom',
  },
  {
    id: 'done',
    title: '💾 Step 7 – Save with "Done"',
    body: 'When you\'ve signed all your boxes, click <strong>Done</strong>. Nothing is saved until you press this button.',
    target: '.tutorial-target-done-btn',
    position: 'top',
  },
];

const tutorialStepsFreeSign = [
  {
    id: 'welcome',
    title: '✍️ Free-Sign Mode',
    body: 'In this mode you choose <em>where</em> to place your signature on the document. You can scroll through all pages and click anywhere to sign.',
    target: null,
    position: 'center',
  },
  {
    id: 'click-place',
    title: '🖱️ Step 1 – Click to Place',
    body: '<strong>Click anywhere on any page</strong> to drop your signature there. The document will scroll through all pages so you can pick the right spot.',
    target: '.tutorial-target-freesign-canvas',
    position: 'center',
  },
  {
    id: 'move-page',
    title: '📄 Step 2 – Move to Another Page',
    body: 'Already placed your signature but want it on a different page? <strong>Click any other page</strong> and it will move there instantly.',
    target: '.tutorial-target-freesign-canvas',
    position: 'center',
  },
  {
    id: 'drag-resize-free',
    title: '↔️ Step 3 – Drag & Resize',
    body: 'After placing, <strong>drag</strong> the signature to fine-tune its position. Use the <strong>blue corner handle</strong> to resize it.',
    target: '.tutorial-target-freesign-canvas',
    position: 'center',
  },
  {
    id: 'date-free',
    title: '📅 Step 4 – Date Label',
    body: 'A date box may appear below your signature. <strong>Drag it independently</strong> if you need it in a specific spot.',
    target: '.tutorial-target-freesign-canvas',
    position: 'center',
  },
  {
    id: 'page-dots',
    title: '🔵 Step 5 – Page Navigation',
    body: 'The numbered circles in the nav bar let you jump to any page. A <strong>green dot</strong> on a number means your signature is already on that page.',
    target: '.tutorial-target-nav',
    position: 'bottom',
  },
  {
    id: 'done-free',
    title: '💾 Step 6 – Save with "Done"',
    body: 'Once you\'re happy with the placement, click <strong>Done</strong>. Nothing is saved to the document until you press this button.',
    target: '.tutorial-target-done-btn',
    position: 'top',
  },
];

const tutorialSteps = computed(() =>
  props.freeSign ? tutorialStepsFreeSign : tutorialStepsNormal
);
const currentTutorialStep = computed(() => tutorialSteps.value[tutorialStep.value] || null);

const updateHighlight = async () => {
  await nextTick();
  const step = currentTutorialStep.value;
  if (!step || !step.target) { tutorialHighlight.value = null; return; }
  const el = document.querySelector(step.target);
  if (!el) { tutorialHighlight.value = null; return; }
  const rect = el.getBoundingClientRect();
  tutorialHighlight.value = {
    top:    rect.top    - 6,
    left:   rect.left   - 6,
    width:  rect.width  + 12,
    height: rect.height + 12,
  };
};

const tutorialNext = async () => {
  if (tutorialStep.value < tutorialSteps.value.length - 1) {
    tutorialStep.value++;
    await updateHighlight();
  } else {
    endTutorial();
  }
};
const tutorialPrev = async () => {
  if (tutorialStep.value > 0) { tutorialStep.value--; await updateHighlight(); }
};
const endTutorial = () => {
  showTutorial.value      = false;
  tutorialHighlight.value = null;
  try { localStorage.setItem(TUTORIAL_KEY, '1'); } catch (_) {}
};
const startTutorial = async () => {
  tutorialStep.value = 0;
  showTutorial.value = true;
  await updateHighlight();
};

const tooltipStyle = computed(() => {
  const step = currentTutorialStep.value;
  if (!step) return {};
  if (!step.target || step.position === 'center') {
    return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 10001 };
  }
  const h = tutorialHighlight.value;
  if (!h) return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 10001 };
  const TW = 300, TH = 190, GAP = 16;
  if (step.position === 'right')  return { position: 'fixed', top: `${Math.max(8, h.top)}px`,                       left: `${Math.min(h.left + h.width + GAP, window.innerWidth - TW - 8)}px`,  width: `${TW}px`, zIndex: 10001 };
  if (step.position === 'left')   return { position: 'fixed', top: `${Math.max(8, h.top)}px`,                       left: `${Math.max(8, h.left - TW - GAP)}px`,                               width: `${TW}px`, zIndex: 10001 };
  if (step.position === 'top')    return { position: 'fixed', top: `${Math.max(8, h.top - TH - GAP)}px`,            left: `${Math.max(8, Math.min(h.left + h.width / 2 - TW / 2, window.innerWidth - TW - 8))}px`, width: `${TW}px`, zIndex: 10001 };
  /* bottom */                    return { position: 'fixed', top: `${Math.min(h.top + h.height + GAP, window.innerHeight - TH - 8)}px`, left: `${Math.max(8, Math.min(h.left + h.width / 2 - TW / 2, window.innerWidth - TW - 8))}px`, width: `${TW}px`, zIndex: 10001 };
});

// ─────────────────────────────────────────────────────────────────────────────
// Original component logic (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
const BASE_SCALE    = 1.4;
const renderScale   = ref(BASE_SCALE);
const navBarVisible = ref(true);
const lastScrollTop = ref(0);
const isZooming     = ref(false);

const handleCanvasScroll = (e) => {
  const st = e.target.scrollTop;
  navBarVisible.value = st < lastScrollTop.value || st <= 10;
  lastScrollTop.value = st;
};

const userZoom    = ref(1.0);
const MIN_ZOOM    = 0.5;
const MAX_ZOOM    = 3.0;
const ZOOM_STEP   = 0.25;
const zoomPercent  = computed(() => Math.round(userZoom.value * 100));
const displayScale = computed(() => renderScale.value * userZoom.value);
const scaleFactor  = computed(() => displayScale.value / BASE_SCALE);
const sc           = (val) => val * scaleFactor.value;

const applyZoom = async () => {
  isZooming.value = true;
  try {
    for (let i = 1; i <= totalPages.value; i++) await renderPage(i);
    await nextTick();
    updateAllPositions();
  } finally { isZooming.value = false; }
};
const zoomIn    = async () => { userZoom.value = Math.min(MAX_ZOOM, +(userZoom.value + ZOOM_STEP).toFixed(2)); await applyZoom(); };
const zoomOut   = async () => { userZoom.value = Math.max(MIN_ZOOM, +(userZoom.value - ZOOM_STEP).toFixed(2)); await applyZoom(); };
const zoomReset = async () => { userZoom.value = 1.0; await applyZoom(); };

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

const containerRef        = ref(null);
const canvasWrapperRef    = ref(null);
const pdfDocument         = ref(null);
const userSignatureSrc    = ref(null);
const userSignatureBase64 = ref(null);
const canvasRefs          = ref([]);
const pageContainerRefs   = ref([]);
const totalPages          = ref(0);
const currentViewPage     = ref(1);
const currentDate         = ref(new Date().toLocaleDateString());
const goToPageNumber      = ref(1);
const prePlacedSigRefs    = ref([]);
const prePlacedDateRefs   = ref([]);

const SMALL_SIG_WIDTH = 120;
const MIN_SIG_WIDTH   = 50;
const MIN_SIG_HEIGHT  = 30;
const MAX_SIG_WIDTH   = 250;
const MAX_SIG_HEIGHT  = 100;
const FREE_SIG_W      = 160;
const FREE_SIG_H      = 60;
const FREE_DATE_W     = 120;
const FREE_DATE_H     = 28;

watchEffect(() => { console.log('signatureFile in modal:', props.signatureFile); });

const localSignatures = reactive([]);

const mySignatureIndex = computed(() =>
  localSignatures.findIndex(s => s.assignedEmplId === props.currentEmplId)
);
const mySignature = computed(() =>
  mySignatureIndex.value !== -1 ? localSignatures[mySignatureIndex.value] : null
);

const isSmallSignatureBox = (sig) => sc(sig.width) <= SMALL_SIG_WIDTH;

const isDraggingSignature      = ref(false);
const isResizingSignature      = ref(false);
const isDraggingDate           = ref(false);
const editingSignatureIndex    = ref(null);
const currentDraggingDateIndex = ref(null);
const dragOffsetSig            = ref({ x: 0, y: 0 });
const dragOffsetDate           = ref({ x: 0, y: 0 });
const resizeStartSig           = ref({ x: 0, y: 0, width: 0, height: 0 });
const draggedDistance          = ref(0);
const dragStartPos             = ref({ x: 0, y: 0 });

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

const blobUrlToBase64 = (blobUrl) => new Promise((resolve, reject) => {
  fetch(blobUrl).then(r => r.blob()).then(blob => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror   = reject;
    reader.readAsDataURL(blob);
  }).catch(reject);
});

watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    localSignatures.length = 0;
    props.prePlacedSignatures.forEach(sig => {
      localSignatures.push({ ...sig, datePosition: sig.datePosition ? { ...sig.datePosition } : null });
    });
    try { await hub.connect(); registerHubListeners(); }
    catch (err) { addToast('Real-time sync unavailable (offline mode)', 'warning'); }

    // Auto-show tutorial for first-time users
    await nextTick();
    try {
      const seen = localStorage.getItem(TUTORIAL_KEY);
      if (!seen) startTutorial();
    } catch (_) { startTutorial(); }
  } else { await hub.disconnect(); }
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

let resizeObserver = null;
const setupResizeObserver = () => {
  if (resizeObserver) resizeObserver.disconnect();
  if (!canvasWrapperRef.value) return;
  resizeObserver = new ResizeObserver(async (entries) => {
    if (isZooming.value) return;
    for (const entry of entries) {
      if (!pdfDocument.value) return;
      const page         = await pdfDocument.value.getPage(1);
      const baseViewport = page.getViewport({ scale: BASE_SCALE, rotation: 0 });
      const newScale     = (entry.contentRect.width - 48) < baseViewport.width
        ? Math.max(0.4, ((entry.contentRect.width - 48) / baseViewport.width) * BASE_SCALE)
        : BASE_SCALE;
      if (Math.abs(newScale - renderScale.value) > 0.01) {
        renderScale.value = newScale;
        for (let i = 1; i <= totalPages.value; i++) await renderPage(i);
        await nextTick();
        updateAllPositions();
      }
    }
  });
  resizeObserver.observe(canvasWrapperRef.value);
};

function registerHubListeners() {
  hub.onReconnecting(() => addToast('Reconnecting to real-time sync…', 'warning'));
  hub.onReconnected(()   => addToast('Real-time sync restored ✓', 'success'));
}

const loadPdf = async () => {
  try {
    const pdfjsLib    = window['pdfjs-dist/build/pdf'];
    const arrayBuffer = await props.pdfFile.arrayBuffer();
    const pdf         = await pdfjsLib.getDocument(arrayBuffer).promise;
    pdfDocument.value       = pdf;
    totalPages.value        = pdf.numPages;
    canvasRefs.value        = [];
    pageContainerRefs.value = [];
    prePlacedSigRefs.value  = [];
    prePlacedDateRefs.value = [];
    await nextTick(); await nextTick();
    setupResizeObserver();
    for (let i = 1; i <= pdf.numPages; i++) await renderPage(i);
    await nextTick();
    updateAllPositions();
    if (props.freeSign) setupPageObserver();
  } catch (error) { console.error('Error loading PDF:', error); }
};

let renderTasks = {};
const renderPage = async (pageNum) => {
  try {
    const page = await pdfDocument.value.getPage(pageNum);
    if (renderTasks[pageNum]) { renderTasks[pageNum].cancel(); }
    let viewport = page.getViewport({ scale: displayScale.value, rotation: 0 });
    const rotation = viewport.width > viewport.height ? 90 : 0;
    viewport = page.getViewport({ scale: displayScale.value, rotation });
    const canvas = canvasRefs.value[pageNum - 1];
    if (!canvas) return;
    canvas.width  = viewport.width;
    canvas.height = viewport.height;
    const renderTask = page.render({ canvasContext: canvas.getContext('2d'), viewport });
    renderTasks[pageNum] = renderTask;
    await renderTask.promise;
    renderTasks[pageNum] = null;
    await nextTick();
    updateAllPositions();
  } catch (error) {
    if (error?.name === 'RenderingCancelledException') return;
    console.error('Error rendering page:', error);
  }
};

const updateAllPositions = () => {
  if (!props.freeSign) updatePrePlacedPositions();
};

const updatePrePlacedPositions = () => {
  if (!containerRef.value || canvasRefs.value.length === 0) return;
  const containerRect = containerRef.value.getBoundingClientRect();
  localSignatures.forEach((sig, index) => {
    const canvas = canvasRefs.value[sig.page - 1];
    const el     = prePlacedSigRefs.value[index];
    if (!canvas || !el) return;
    const cr = canvas.getBoundingClientRect();
    el.style.left = (cr.left - containerRect.left + sc(sig.x)) + 'px';
    el.style.top  = (cr.top  - containerRect.top  + sc(sig.y)) + 'px';
  });
  localSignatures.forEach((sig, sigIndex) => {
    if (!sig.datePosition) return;
    const canvas    = canvasRefs.value[sig.page - 1];
    const dateIndex = localSignatures.slice(0, sigIndex).filter(s => s.datePosition).length;
    const el        = prePlacedDateRefs.value[dateIndex];
    if (!canvas || !el) return;
    const cr = canvas.getBoundingClientRect();
    el.style.left = (cr.left - containerRect.left + sc(sig.datePosition.x)) + 'px';
    el.style.top  = (cr.top  - containerRect.top  + sc(sig.datePosition.y)) + 'px';
  });
};

const updateSingleSigPosition = (index) => {
  if (props.freeSign) return;
  if (!containerRef.value) return;
  const sig    = localSignatures[index]; if (!sig) return;
  const cr     = containerRef.value.getBoundingClientRect();
  const canvas = canvasRefs.value[sig.page - 1];
  const el     = prePlacedSigRefs.value[index];
  if (canvas && el) {
    const ccr = canvas.getBoundingClientRect();
    el.style.left = (ccr.left - cr.left + sc(sig.x)) + 'px';
    el.style.top  = (ccr.top  - cr.top  + sc(sig.y)) + 'px';
  }
  if (sig.datePosition) {
    const di  = localSignatures.slice(0, index).filter(s => s.datePosition).length;
    const del = prePlacedDateRefs.value[di];
    if (canvas && del) {
      const ccr = canvas.getBoundingClientRect();
      del.style.left = (ccr.left - cr.left + sc(sig.datePosition.x)) + 'px';
      del.style.top  = (ccr.top  - cr.top  + sc(sig.datePosition.y)) + 'px';
    }
  }
};

const updateSingleDatePosition = (sigIndex) => {
  if (props.freeSign) return;
  if (!containerRef.value) return;
  const sig    = localSignatures[sigIndex]; if (!sig?.datePosition) return;
  const cr     = containerRef.value.getBoundingClientRect();
  const canvas = canvasRefs.value[sig.page - 1];
  const di     = localSignatures.slice(0, sigIndex).filter(s => s.datePosition).length;
  const el     = prePlacedDateRefs.value[di];
  if (canvas && el) {
    const ccr = canvas.getBoundingClientRect();
    el.style.left = (ccr.left - cr.left + sc(sig.datePosition.x)) + 'px';
    el.style.top  = (ccr.top  - cr.top  + sc(sig.datePosition.y)) + 'px';
  }
};

const getCanvasForSig = (sig) => canvasRefs.value[sig.page - 1];

const handleFreeSignPageClick = async (e, pageNum) => {
  if (e.target.closest('.sig-overlay') || e.target.closest('.date-overlay')) return;
  if (!userSignatureSrc.value) { alert('Please upload your signature first!'); return; }

  let imgSrc = userSignatureBase64.value;
  if (!imgSrc) {
    try { imgSrc = await blobUrlToBase64(userSignatureSrc.value); userSignatureBase64.value = imgSrc; }
    catch (err) { console.error('Failed to convert signature:', err); return; }
  }

  const idx = mySignatureIndex.value;
  if (idx === -1) { addToast('No signature box assigned to you.', 'warning'); return; }

  const canvas = canvasRefs.value[pageNum - 1];
  if (!canvas) return;

  const canvasRect = canvas.getBoundingClientRect();
  const canvasW    = canvas.width  / scaleFactor.value;
  const canvasH    = canvas.height / scaleFactor.value;
  const rawX = (e.clientX - canvasRect.left) / scaleFactor.value;
  const rawY = (e.clientY - canvasRect.top)  / scaleFactor.value;
  const x    = Math.max(0, Math.min(rawX - FREE_SIG_W / 2, canvasW - FREE_SIG_W));
  const y    = Math.max(0, Math.min(rawY - FREE_SIG_H / 2, canvasH - FREE_SIG_H));

  const sig = localSignatures[idx];
  const wasOnDifferentPage = sig.page !== pageNum;

  sig.page       = pageNum;
  sig.x          = x;
  sig.y          = y;
  sig.width      = sig.width  || FREE_SIG_W;
  sig.height     = sig.height || FREE_SIG_H;
  sig.imageSrc   = imgSrc;
  sig.isEmpty    = false;
  sig.signedBy   = props.currentUserName;
  sig.signedDate = currentDate.value;
  sig.hasDate    = sig.hasDate;

  if (Number(sig.hasDate) === 1) {
    const dateY = Math.min(y + sig.height + 4, canvasH - FREE_DATE_H);
    if (sig.datePosition) {
      sig.datePosition.x        = x;
      sig.datePosition.y        = dateY;
      sig.datePosition.width    = FREE_DATE_W;
      sig.datePosition.height   = FREE_DATE_H;
      sig.datePosition.dateText = currentDate.value;
    } else {
      sig.datePosition = { x, y: dateY, width: FREE_DATE_W, height: FREE_DATE_H, dateText: currentDate.value };
    }
  } else {
    sig.datePosition = null;
  }

  hub.sendSignaturePlaced(idx, { ...sig, imageSrc: imgSrc });

  addToast(
    wasOnDifferentPage ? `Signature moved to page ${pageNum}` : 'Signature placed!',
    'success', 2000
  );
};

const canUserSign       = (sig) => sig.isEmpty && sig.assignedEmplId === props.currentEmplId && !isUserWaiting(sig);
const currentUser       = (sig) => sig.assignedEmplId === props.currentEmplId;
const canUserEdit       = (sig) => !sig.isEmpty && sig.assignedEmplId === props.currentEmplId;
const isSignatureLocked = (sig) => sig.signatureLock === true;
const isDateLocked      = (sig) => sig.dateLock === true;

const handlePrePlacedClick = async (sig, index) => {
  if (draggedDistance.value > 5) return;
  if (canUserEdit(sig)) { editingSignatureIndex.value = index; return; }
  if (isUserWaiting(sig)) {
    const ns = getNextSignerInfo.value;
    alert(`Sequential approval is enabled. Waiting for "${ns?.name}" (Signer Number ${ns?.order}) to sign first.`);
    return;
  }
  if (sig.assignedEmplId !== props.currentEmplId) {
    if (!sig.isEmpty) return;
    alert(`This signature box is assigned to "${sig.assignedTo}". You cannot sign here.`);
    return;
  }
  if (!canUserSign(sig)) return;
  if (!userSignatureSrc.value) { alert('Please upload your signature first!'); return; }
  let imgSrc = userSignatureBase64.value;
  if (!imgSrc) {
    try { imgSrc = await blobUrlToBase64(userSignatureSrc.value); userSignatureBase64.value = imgSrc; }
    catch { addToast('Failed to prepare signature image for sync', 'error'); return; }
  }
  const updated = {
    ...sig, imageSrc: imgSrc, isEmpty: false,
    signedBy: props.currentUserName, signedDate: currentDate.value,
    datePosition: sig.datePosition ? { ...sig.datePosition, dateText: currentDate.value } : null
  };
  localSignatures[index] = { ...updated, imageSrc: userSignatureSrc.value };
  hub.sendSignaturePlaced(index, updated);
};

const startDraggingSignature = (e, index) => {
  const sig = localSignatures[index];
  if (!canUserEdit(sig) || isSignatureLocked(sig)) return;
  e.stopPropagation(); e.preventDefault();
  isDraggingSignature.value   = true;
  editingSignatureIndex.value = index;
  draggedDistance.value       = 0;
  dragStartPos.value          = { x: e.clientX, y: e.clientY };
  const canvas = getCanvasForSig(sig);
  if (!canvas) return;
  const cr = canvas.getBoundingClientRect();
  dragOffsetSig.value = {
    x: (e.clientX - cr.left) / scaleFactor.value - sig.x,
    y: (e.clientY - cr.top)  / scaleFactor.value - sig.y,
  };
};

const startDraggingDate = (e, sigIndex) => {
  const sig = localSignatures[sigIndex];
  if (!canUserEdit(sig) || !sig.datePosition || isDateLocked(sig)) return;
  e.stopPropagation(); e.preventDefault();
  isDraggingDate.value           = true;
  currentDraggingDateIndex.value = sigIndex;
  draggedDistance.value          = 0;
  dragStartPos.value             = { x: e.clientX, y: e.clientY };
  const canvas = getCanvasForSig(sig);
  if (!canvas) return;
  const cr = canvas.getBoundingClientRect();
  dragOffsetDate.value = {
    x: (e.clientX - cr.left) / scaleFactor.value - sig.datePosition.x,
    y: (e.clientY - cr.top)  / scaleFactor.value - sig.datePosition.y,
  };
};

const dragSignature = (e) => {
  if (!isDraggingSignature.value || editingSignatureIndex.value === null) return;
  const idx    = editingSignatureIndex.value;
  const sig    = localSignatures[idx];
  if (isSignatureLocked(sig)) return;
  const canvas = getCanvasForSig(sig);
  if (!canvas) return;
  const cr  = canvas.getBoundingClientRect();
  const dx  = e.clientX - dragStartPos.value.x;
  const dy  = e.clientY - dragStartPos.value.y;
  draggedDistance.value = Math.sqrt(dx * dx + dy * dy);
  const rawX = (e.clientX - cr.left) / scaleFactor.value;
  const rawY = (e.clientY - cr.top)  / scaleFactor.value;
  const cW   = canvas.width  / scaleFactor.value;
  const cH   = canvas.height / scaleFactor.value;
  const oldX = sig.x, oldY = sig.y;
  sig.x = Math.max(0, Math.min(rawX - dragOffsetSig.value.x, cW - sig.width));
  sig.y = Math.max(0, Math.min(rawY - dragOffsetSig.value.y, cH - sig.height));
  if (sig.datePosition && !isDateLocked(sig)) {
    sig.datePosition.x = Math.max(0, Math.min(sig.datePosition.x + (sig.x - oldX), cW - FREE_DATE_W));
    sig.datePosition.y = Math.max(0, Math.min(sig.datePosition.y + (sig.y - oldY), cH - FREE_DATE_H));
  }
  updateSingleSigPosition(idx);
  const st = { ...sig, datePosition: sig.datePosition ? { ...sig.datePosition } : null };
  if (st.imageSrc?.startsWith('blob:') && userSignatureBase64.value) st.imageSrc = userSignatureBase64.value;
  hub.sendSignatureMoved(idx, st);
};

const dragDate = (e) => {
  if (!isDraggingDate.value || currentDraggingDateIndex.value === null) return;
  const idx = currentDraggingDateIndex.value;
  const sig = localSignatures[idx];
  if (isDateLocked(sig)) return;
  const canvas = getCanvasForSig(sig);
  if (!canvas) return;
  const cr = canvas.getBoundingClientRect();
  draggedDistance.value = Math.sqrt((e.clientX - dragStartPos.value.x) ** 2 + (e.clientY - dragStartPos.value.y) ** 2);
  const cW = canvas.width  / scaleFactor.value;
  const cH = canvas.height / scaleFactor.value;
  sig.datePosition.x = Math.max(0, Math.min((e.clientX - cr.left) / scaleFactor.value - dragOffsetDate.value.x, cW - FREE_DATE_W));
  sig.datePosition.y = Math.max(0, Math.min((e.clientY - cr.top)  / scaleFactor.value - dragOffsetDate.value.y, cH - FREE_DATE_H));
  updateSingleDatePosition(idx);
  hub.sendDateMoved(idx, { ...sig.datePosition });
};

const startResizingSignature = (e, index) => {
  const sig = localSignatures[index];
  if (!canUserEdit(sig) || isSignatureLocked(sig)) return;
  e.stopPropagation();
  isResizingSignature.value   = true;
  editingSignatureIndex.value = index;
  const canvas = getCanvasForSig(sig);
  if (!canvas) return;
  const cr = canvas.getBoundingClientRect();
  resizeStartSig.value = {
    x:      (e.clientX - cr.left) / scaleFactor.value,
    y:      (e.clientY - cr.top)  / scaleFactor.value,
    width:  sig.width,
    height: sig.height,
  };
};

const resizeSignature = (e) => {
  if (!isResizingSignature.value || editingSignatureIndex.value === null) return;
  const idx = editingSignatureIndex.value;
  const sig = localSignatures[idx];
  if (isSignatureLocked(sig)) return;
  const canvas = getCanvasForSig(sig);
  if (!canvas) return;
  const cr   = canvas.getBoundingClientRect();
  const curX = (e.clientX - cr.left) / scaleFactor.value;
  const curY = (e.clientY - cr.top)  / scaleFactor.value;
  sig.width  = Math.min(MAX_SIG_WIDTH,  Math.max(MIN_SIG_WIDTH,  resizeStartSig.value.width  + (curX - resizeStartSig.value.x)));
  sig.height = Math.min(MAX_SIG_HEIGHT, Math.max(MIN_SIG_HEIGHT, resizeStartSig.value.height + (curY - resizeStartSig.value.y)));
  updateSingleSigPosition(idx);
  hub.sendSignatureResized(idx, sig.width, sig.height);
};

const handleMouseMove = (e) => {
  if (isDraggingSignature.value)      dragSignature(e);
  else if (isDraggingDate.value)      dragDate(e);
  else if (isResizingSignature.value) resizeSignature(e);

  const refEl = props.freeSign
    ? (pageContainerRefs.value[currentViewPage.value - 1] || null)
    : containerRef.value;
  if (refEl) {
    const rect = refEl.getBoundingClientRect();
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
  updateAllPositions();
  setTimeout(() => { draggedDistance.value = 0; }, 100);
};

const isActiveDrag    = (i) => isDraggingSignature.value && editingSignatureIndex.value === i;
const isOtherDragging = (i) => isDraggingSignature.value && editingSignatureIndex.value !== i;

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
  const boxes = mySignatures.value.ready;
  if (!boxes.length) { alert('No signatures available to sign!'); return; }
  goToSignature(boxes[currentSignatureNavigationIndex.value]);
  currentSignatureNavigationIndex.value = (currentSignatureNavigationIndex.value + 1) % boxes.length;
};
const showSidebar = ref(false);

const goToNextPage = () => {
  if (currentViewPage.value < totalPages.value) {
    currentViewPage.value++;
    nextTick(() => updateAllPositions());
  }
};
const goToPrevPage = () => {
  if (currentViewPage.value > 1) {
    currentViewPage.value--;
    nextTick(() => updateAllPositions());
  }
};
const scrollToPage = (pageNum) => {
  if (pageNum < 1 || pageNum > totalPages.value) return;
  currentViewPage.value = pageNum;
  if (props.freeSign) pageContainerRefs.value[pageNum - 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  else nextTick(() => updateAllPositions());
};

let pageObserver = null;
const setupPageObserver = () => {
  if (pageObserver) pageObserver.disconnect();
  pageObserver = new IntersectionObserver((entries) => {
    let best = null, bestRatio = 0;
    entries.forEach(e => { if (e.intersectionRatio > bestRatio) { bestRatio = e.intersectionRatio; best = e; } });
    if (best) { const idx = pageContainerRefs.value.indexOf(best.target); if (idx !== -1) currentViewPage.value = idx + 1; }
  }, { threshold: [0.3, 0.5, 0.7] });
  pageContainerRefs.value.forEach(el => { if (el) pageObserver.observe(el); });
};

const handleDone = () => {
  let signaturesToSave = [];

  if (props.freeSign) {
    const sig = mySignature.value;
    if (!sig || sig.isEmpty) {
      addToast('Please place your signature before saving.', 'warning');
      return;
    }
    const canvas  = canvasRefs.value[sig.page - 1];
    const canvasW = canvas ? canvas.width  / scaleFactor.value : 595;
    const canvasH = canvas ? canvas.height / scaleFactor.value : 842;

    signaturesToSave = [{
      ...sig,
      imageSrc:     (sig.imageSrc?.startsWith('blob:') && userSignatureBase64.value) ? userSignatureBase64.value : sig.imageSrc,
      canvasWidth:  Math.round(canvasW),
      canvasHeight: Math.round(canvasH),
      pdfLibY:      Math.round(canvasH - sig.y - sig.height),
      hasSigned:    true,
      datePosition: sig.datePosition
        ? { ...sig.datePosition, canvasWidth: Math.round(canvasW), canvasHeight: Math.round(canvasH) }
        : null,
      isFreeSign: true,
    }];
  } else {
    signaturesToSave = localSignatures
      .filter(s => s.assignedEmplId === props.currentEmplId)
      .map(sig => ({
        ...sig,
        imageSrc:     (sig.imageSrc?.startsWith('blob:') && userSignatureBase64.value) ? userSignatureBase64.value : sig.imageSrc,
        datePosition: sig.datePosition ? { ...sig.datePosition } : null,
        hasSigned:    !!sig.imageSrc,
        isFreeSign:   false,
      }));
  }

  hub.sendSignaturesSaved(signaturesToSave);
  emit('save-all-signatures', signaturesToSave);
  emit('close');
};

onMounted(() => {
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup',   handleMouseUp);
  window.addEventListener('resize', () => updateAllPositions());
});
onUnmounted(async () => {
  if (userSignatureSrc.value) URL.revokeObjectURL(userSignatureSrc.value);
  if (resizeObserver) resizeObserver.disconnect();
  if (pageObserver)   pageObserver.disconnect();
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup',   handleMouseUp);
  await hub.disconnect();
});
</script>

<template>
  <!-- ═══════════════════════════════════════════════════════════════════════
       TUTORIAL OVERLAY
       ═══════════════════════════════════════════════════════════════════════ -->
  <Teleport to="body">
    <template v-if="showTutorial">
      <!-- Dimming backdrop -->
      <div class="fixed inset-0 bg-black bg-opacity-40 z-[9998] pointer-events-none"></div>

      <!-- Spotlight ring around target element -->
      <div v-if="tutorialHighlight"
        class="fixed z-[9999] pointer-events-none rounded-lg ring-4 ring-white ring-opacity-90 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
        :style="{
          top:    tutorialHighlight.top    + 'px',
          left:   tutorialHighlight.left   + 'px',
          width:  tutorialHighlight.width  + 'px',
          height: tutorialHighlight.height + 'px',
        }">
      </div>

      <!-- Tooltip card -->
      <div :style="tooltipStyle"
        class="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 pointer-events-auto"
        style="min-width:260px; max-width:300px;">

        <!-- Progress dots -->
        <div class="flex items-center gap-1.5 mb-3">
          <span v-for="(_, i) in tutorialSteps" :key="i"
            class="block rounded-full transition-all duration-300"
            :class="i === tutorialStep ? 'w-4 h-2 bg-blue-600'
                  : i < tutorialStep   ? 'w-2 h-2 bg-blue-300'
                  :                      'w-2 h-2 bg-gray-200'">
          </span>
          <span class="ml-auto text-[11px] text-gray-400 font-medium">
            {{ tutorialStep + 1 }} / {{ tutorialSteps.length }}
          </span>
        </div>

        <!-- Title & body -->
        <h4 class="font-bold text-gray-900 text-sm mb-1.5" v-if="currentTutorialStep">
          {{ currentTutorialStep.title }}
        </h4>
        <p class="text-xs text-gray-600 leading-relaxed" v-if="currentTutorialStep"
          v-html="currentTutorialStep.body"></p>

        <!-- Actions -->
        <div class="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          <button @click="endTutorial"
            class="text-xs text-gray-400 hover:text-gray-600 transition underline underline-offset-2">
            Skip
          </button>
          <div class="flex gap-2">
            <button v-if="tutorialStep > 0" @click="tutorialPrev"
              class="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition text-gray-600 font-medium">
              ← Back
            </button>
            <button @click="tutorialNext"
              class="px-4 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold shadow-sm">
              {{ tutorialStep === tutorialSteps.length - 1 ? '🎉 Got it!' : 'Next →' }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </Teleport>

  <!-- ═══════════════════════════════════════════════════════════════════════
       MAIN MODAL — works in both portrait & landscape on all devices
       ═══════════════════════════════════════════════════════════════════════ -->
  <div v-if="isOpen"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center w-full z-50"
    @click.self="emit('close')">
    <div class="bg-white rounded-lg shadow-xl w-full flex flex-col mx-1 sm:mx-4"
      style="max-height: 100dvh; max-width: min(98vw, 1280px);">

      <!-- TOASTS -->
      <div class="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        <transition-group name="toast" tag="div" class="flex flex-col gap-2">
          <div v-for="toast in toasts" :key="toast.id"
            class="px-4 py-3 rounded-lg shadow-lg text-sm font-semibold flex items-center gap-2 pointer-events-auto max-w-xs"
            :class="{ 'bg-blue-600 text-white': toast.type==='info', 'bg-green-600 text-white': toast.type==='success', 'bg-yellow-500 text-white': toast.type==='warning', 'bg-red-600 text-white': toast.type==='error' }">
            <span>{{ { info:'ℹ️', success:'✅', warning:'⚠️', error:'❌' }[toast.type] }}</span>
            {{ toast.message }}
          </div>
        </transition-group>
      </div>

      <!-- ═══ HEADER ═══ -->
      <div class="flex items-start justify-between p-2 border-b flex-shrink-0">
        <div class="flex-1 min-w-0">
          <h2 class="text-base sm:text-xl font-semibold truncate">Sign PDF Document</h2>
          <div v-if="freeSign" class="mt-1 flex items-center gap-1.5 text-xs font-medium"
            :class="mySignature && !mySignature.isEmpty ? 'text-green-600' : 'text-blue-600'">
            <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
            </svg>
            <span v-if="!mySignature || mySignature.isEmpty">Click anywhere on any page to place your signature</span>
            <span v-else>✓ Signature placed on page {{ mySignature.page }} — click any other page to move it there</span>
          </div>
          <div v-else class="mt-1 flex items-center gap-1">
            <span :class="hub.isConnected.value ? 'bg-green-500' : 'bg-yellow-400 animate-pulse'" class="w-2 h-2 rounded-full inline-block flex-shrink-0"></span>
            <span class="text-xs text-gray-400">{{ hub.isConnected.value ? 'Live sync active' : 'Connecting…' }}</span>
          </div>
          <!-- Sequential banner -->
          <div v-if="!freeSign && isSequentialOrderEnforced && getNextSignerInfo"
            class="tutorial-target-seq-banner mt-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200">
            🔄 Waiting for <strong>{{ getNextSignerInfo.name }}</strong> (#{{ getNextSignerInfo.order }})
          </div>
        </div>

        <div class="flex items-center gap-1.5 ml-2 flex-shrink-0">
          <!-- Tutorial button -->
          <button @click="startTutorial" title="How to use"
            class="flex items-center gap-1 px-2 py-1.5 text-xs bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 transition font-semibold flex-shrink-0">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span class="hidden sm:inline">How to use</span>
          </button>

          <div v-if="freeSign && mySignature && !mySignature.isEmpty"
            class="px-2 py-1.5 bg-green-50 border border-green-200 text-green-700 rounded-lg text-xs font-semibold flex items-center gap-1">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            <span class="hidden sm:inline">Signed — Pg {{ mySignature.page }}</span>
            <span class="sm:hidden">Pg {{ mySignature.page }}</span>
          </div>

          <!-- Find my signatures button -->
          <button v-if="!freeSign && mySignatures.ready.length > 0" @click="findNextSignature"
            class="tutorial-target-find-sig px-2 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-1 font-semibold shadow-md text-xs">
            <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <span class="hidden sm:inline">Find My Signatures</span>
            <span class="font-bold">({{ mySignatures.ready.length }})</span>
          </button>

          <button @click="emit('close')" class="p-1.5 hover:bg-gray-100 rounded-full transition flex-shrink-0">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      <!-- ═══ NAV BAR ═══ -->
      <Transition name="nav-slide">
        <div v-show="navBarVisible"
          class="tutorial-target-nav flex items-center justify-center gap-1.5 sm:gap-3 px-2 py-1.5 border-b flex-shrink-0 flex-wrap">
          <template v-if="!freeSign">
            <button @click="goToPrevPage" :disabled="currentViewPage===1" class="px-2 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1 text-xs sm:text-sm">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
              <span class="hidden sm:inline">Previous</span>
            </button>
            <span class="text-xs sm:text-sm font-semibold text-gray-700">Page {{ currentViewPage }} / {{ totalPages }}</span>
            <button @click="goToNextPage" :disabled="currentViewPage===totalPages" class="px-2 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1 text-xs sm:text-sm">
              <span class="hidden sm:inline">Next</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </button>
            <div class="flex items-center gap-1">
              <input type="number" min="1" :max="totalPages" v-model.number="goToPageNumber" @keydown.enter="scrollToPage(goToPageNumber)" class="border rounded px-2 py-1 w-12 text-xs text-center"/>
              <button @click="scrollToPage(goToPageNumber)" class="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 text-xs">Go</button>
            </div>
          </template>
          <template v-else>
            <span class="text-xs sm:text-sm font-semibold text-gray-700">Page {{ currentViewPage }} / {{ totalPages }}</span>
            <div class="flex items-center gap-1 flex-wrap justify-center">
              <button v-for="p in totalPages" :key="p" @click="scrollToPage(p)"
                class="w-7 h-7 rounded-full text-xs font-bold transition relative"
                :class="p===currentViewPage ? 'bg-blue-600 text-white shadow' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'">
                {{ p }}
                <span v-if="mySignature && !mySignature.isEmpty && mySignature.page===p"
                  class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></span>
              </button>
            </div>
          </template>
          <div class="hidden sm:block w-px h-5 bg-gray-300"></div>
          <div class="flex items-center gap-1 bg-gray-200 rounded-lg p-1">
            <button @click="zoomOut" :disabled="userZoom<=MIN_ZOOM" class="w-7 h-7 flex items-center justify-center rounded hover:bg-white transition disabled:opacity-40 disabled:cursor-not-allowed font-bold text-gray-700 text-lg leading-none">−</button>
            <button @click="zoomReset" class="px-2 py-0.5 text-xs font-semibold text-gray-700 hover:bg-white rounded transition min-w-[42px] text-center">{{ zoomPercent }}%</button>
            <button @click="zoomIn"   :disabled="userZoom>=MAX_ZOOM" class="w-7 h-7 flex items-center justify-center rounded hover:bg-white transition disabled:opacity-40 disabled:cursor-not-allowed font-bold text-gray-700 text-lg leading-none">+</button>
          </div>
        </div>
      </Transition>

      <!-- ═══ BODY ═══ -->
      <div class="flex flex-1 overflow-hidden relative">

        <!-- SIDEBAR (normal mode only) -->
        <template v-if="!freeSign">
          <div v-if="showSidebar" class="border-r bg-gray-50 p-3 sm:p-4 overflow-y-auto flex-shrink-0 w-52 sm:w-64 lg:w-72 absolute sm:relative inset-y-0 left-0 z-30 sm:z-auto shadow-xl sm:shadow-none">
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-semibold text-sm sm:text-lg">My Signatures</h3>
              <button @click="showSidebar=false" class="p-1 hover:bg-gray-200 rounded transition">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/></svg>
              </button>
            </div>
            <template v-for="(group, label) in { 'Ready': mySignatures.ready, 'Waiting': mySignatures.waiting, 'Completed': mySignatures.completed }" :key="label">
              <div v-if="group.length > 0" class="mb-4">
                <h4 class="text-xs font-semibold mb-2" :class="{ 'text-green-700': label==='Ready', 'text-purple-700': label==='Waiting', 'text-blue-700': label==='Completed' }">{{ label }} ({{ group.length }})</h4>
                <div class="space-y-1.5">
                  <div v-for="sig in group" :key="sig.index" @click="goToSignature(sig)"
                    class="p-2 bg-white rounded-lg border-2 cursor-pointer transition-all hover:shadow-md active:scale-95"
                    :class="{ 'border-green-300 hover:border-green-500 hover:bg-green-50': label==='Ready', 'border-purple-300 hover:border-purple-500 hover:bg-purple-50': label==='Waiting', 'border-blue-300 hover:border-blue-500 hover:bg-blue-50': label==='Completed' }">
                    <div class="flex items-center justify-between">
                      <div class="flex-1 min-w-0">
                        <p class="text-xs font-semibold text-gray-800 truncate">{{ sig.assignedTo }}</p>
                        <div class="flex items-center gap-1 mt-0.5">
                          <span class="text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">Pg {{ sig.page }}</span>
                          <span v-if="isSequentialOrderEnforced" class="text-xs px-1.5 py-0.5 rounded font-semibold"
                            :class="{ 'text-green-600 bg-green-100': label==='Ready', 'text-purple-600 bg-purple-100': label==='Waiting', 'text-blue-600 bg-blue-100': label==='Completed' }">#{{ sig.approvalOrder }}</span>
                        </div>
                      </div>
                      <svg class="w-4 h-4 flex-shrink-0" :class="{ 'text-green-500': label==='Ready', 'text-purple-500': label==='Waiting', 'text-blue-500': label==='Completed' }" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                    </div>
                  </div>
                </div>
              </div>
            </template>
            <div v-if="!mySignatures.ready.length && !mySignatures.waiting.length && !mySignatures.completed.length" class="text-center py-8 px-3">
              <div class="bg-white rounded-lg p-4 border-2 border-dashed border-gray-300">
                <svg class="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                <p class="text-xs font-semibold text-gray-700">No Signatures Assigned</p>
              </div>
            </div>
          </div>

          <div v-if="showSidebar" class="fixed inset-0 bg-black bg-opacity-20 z-20 sm:hidden" @click="showSidebar=false"></div>

          <!-- Sidebar toggle -->
          <button v-if="!showSidebar" @click="showSidebar=true"
            class="tutorial-target-sidebar-btn absolute left-1 top-1/2 -translate-y-1/2 bg-blue-600 text-white p-2 rounded-lg shadow-xl hover:bg-blue-700 transition z-40 flex flex-col items-center gap-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>
            <div class="flex gap-0.5 text-xs">
              <span v-if="mySignatures.ready.length"     class="bg-green-500  px-1.5 py-0.5 rounded font-bold text-[10px]">{{ mySignatures.ready.length }}</span>
              <span v-if="mySignatures.waiting.length"   class="bg-purple-500 px-1.5 py-0.5 rounded font-bold text-[10px]">{{ mySignatures.waiting.length }}</span>
              <span v-if="mySignatures.completed.length" class="bg-white text-blue-600 px-1.5 py-0.5 rounded font-bold text-[10px]">{{ mySignatures.completed.length }}</span>
            </div>
          </button>
        </template>

        <!-- ═══ PDF CANVAS AREA ═══ -->
        <div ref="canvasWrapperRef" class="flex-1 overflow-auto bg-gray-100 flex justify-center"
          :class="freeSign ? 'p-0 cursor-crosshair' : 'p-2 sm:p-6'"
          @scroll="handleCanvasScroll">

          <!-- ══ NORMAL MODE ══ -->
          <template v-if="!freeSign">
            <div ref="containerRef" class="relative inline-block" @mousemove="handleMouseMove">
              <!-- Canvas wrapper -->
              <div class="tutorial-target-canvas-area relative border-2 border-gray-300 rounded shadow-sm">
                <div class="absolute -top-3 left-3 bg-white px-2 py-0.5 text-xs font-semibold text-gray-600 border rounded">Page {{ currentViewPage }}</div>
                <canvas v-for="i in totalPages" :key="i" v-show="i===currentViewPage" :ref="el => { if (el) canvasRefs[i-1]=el }" class="block"></canvas>
              </div>

              <!-- SIGNATURE BOXES -->
              <div v-for="(sig, index) in localSignatures" :key="'pp-'+index"
                :ref="el => { if (el) prePlacedSigRefs[index]=el }"
                v-show="sig.page===currentViewPage"
                class="absolute rounded signature-box group"
                :class="{
                  'sig-needs-signing border-4 border-green-500 bg-green-50 cursor-pointer hover:bg-green-100': canUserSign(sig),
                  'ring-4 ring-yellow-400 ring-offset-2 animate-pulse z-highlighted': highlightedSignatureIndex===index,
                  'border-2 border-dashed border-purple-400 bg-purple-50 cursor-not-allowed z-base': isUserWaiting(sig),
                  'border-2 border-dashed border-gray-300 bg-gray-50 cursor-not-allowed z-base': sig.isEmpty && sig.assignedEmplId!==currentEmplId && !isUserWaiting(sig),
                  'border-2 border-blue-500 bg-blue-50 z-signed': canUserEdit(sig) && editingSignatureIndex===index && !sig.imageSrc,
                  'border-2 border-blue-500 z-signed': canUserEdit(sig) && editingSignatureIndex===index && sig.imageSrc,
                  'border-2 border-blue-400 bg-blue-50 hover:border-blue-600 z-signed': canUserEdit(sig) && editingSignatureIndex!==index && !sig.imageSrc,
                  'border-2 border-blue-400 hover:border-blue-600 z-signed': canUserEdit(sig) && editingSignatureIndex!==index && sig.imageSrc,
                  'border-2 border-gray-400 bg-gray-100 z-base': !sig.isEmpty && sig.signedBy!==currentUserName && !sig.imageSrc,
                  'border-2 border-gray-400 z-base': !sig.isEmpty && sig.signedBy!==currentUserName && sig.imageSrc,
                  'cursor-move': canUserEdit(sig),
                  'z-active active-drag': isActiveDrag(index) && isDraggingSignature,
                  'z-active active-resize': editingSignatureIndex===index && isResizingSignature,
                  'dimmed-box': isDraggingSignature && !isActiveDrag(index),
                }"
                :style="{ width: sc(sig.width)+'px', height: sc(sig.height)+'px' }"
                @mouseup="handlePrePlacedClick(sig, index)"
                @mousedown="(!isSignatureLocked(sig) && canUserEdit(sig)) ? startDraggingSignature($event, index) : null">

                <div class="absolute -top-7 left-0 text-white text-xs px-2 py-1 rounded font-semibold whitespace-nowrap flex items-center gap-1 shadow-lg pointer-events-none transition-all duration-200"
                  :class="{ 'opacity-0 group-hover:opacity-100': !isActiveDrag(index), 'opacity-100': isActiveDrag(index) }"
                  :style="{ backgroundColor: sig.color||'#3b82f6' }">
                  {{ sig.assignedTo }}
                  <span v-if="isSequentialOrderEnforced" class="ml-1 px-1 py-0.5 bg-white bg-opacity-30 rounded">#{{ sig.approvalOrder }}</span>
                  <span v-if="isSignatureLocked(sig) && !sig.isEmpty">🔒</span>
                </div>
                <div v-if="!isActiveDrag(index)" class="absolute -top-2 -left-2 w-5 h-5 rounded-full text-white text-[9px] font-bold flex items-center justify-center shadow-md pointer-events-none"
                  :class="{ 'opacity-60': isOtherDragging(index) }" :style="{ backgroundColor: sig.color||'#3b82f6' }">
                  {{ isSequentialOrderEnforced ? sig.approvalOrder : (sig.assignedTo||'').trim().split(' ').filter(Boolean).map(n=>n[0]).slice(0,1).concat((sig.assignedTo||'').trim().split(' ').slice(-1).map(n=>n[0])).join('').toUpperCase() }}
                </div>

                <div v-if="canUserSign(sig)" class="sign-here-beacon pointer-events-none" :class="isSmallSignatureBox(sig)?'beacon-small':'beacon-normal'">
                  <span class="beacon-arrow">▼</span>
                  <span class="beacon-label">Sign Here<span v-if="isSequentialOrderEnforced"> #{{ sig.approvalOrder }}</span></span>
                </div>

                <div v-if="isUserWaiting(sig)" class="flex flex-col items-center justify-center h-full p-1 pointer-events-none">
                  <svg class="w-5 h-5 text-purple-500 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  <p v-if="!isSmallSignatureBox(sig)" class="text-xs text-purple-700 font-semibold text-center">Waiting #{{ sig.approvalOrder }}</p>
                </div>
                <div v-else-if="canUserSign(sig)" class="flex flex-col items-center justify-center h-full p-1 pointer-events-none">
                  <svg class="w-5 h-5 text-green-600 drop-shadow" :class="{'w-7 h-7':!isSmallSignatureBox(sig)}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                  <p v-if="!isSmallSignatureBox(sig)" class="text-xs text-green-800 font-bold text-center mt-0.5">Click to sign</p>
                </div>
                <div v-else-if="sig.isEmpty" class="flex flex-col items-center justify-center h-full p-1 pointer-events-none">
                  <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                  <p v-if="!isSmallSignatureBox(sig)" class="text-xs text-gray-400 text-center">Pending</p>
                </div>
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

                  <div v-if="canUserEdit(sig)" class="absolute top-0 left-0 right-0 text-white text-xs px-1 py-0.5 text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" :class="sig.signatureLock?'bg-red-500':'bg-blue-500'">
                    <span v-if="!sig.signatureLock">{{ !isSmallSignatureBox(sig)?'Drag to Move':'' }}</span>
                    <span v-else>Locked</span>
                  </div>
                  <div v-if="canUserEdit(sig) && !isSignatureLocked(sig)" class="absolute w-4 h-4 bg-blue-500 rounded-full -bottom-1 -right-1 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity z-10 touch-none" @mousedown.stop="startResizingSignature($event, index)"></div>
                </div>
              </div>

              <!-- DATE BOXES (normal mode) -->
              <template v-for="(sig, fi) in localSignatures.filter(s=>s.datePosition && Number(s.hasDate)===1)" :key="'date-'+fi">
                <div :ref="el => { if (el) prePlacedDateRefs[fi]=el }" v-show="sig.page===currentViewPage"
                  class="absolute select-none text-xs sm:text-sm font-semibold text-gray-700 rounded px-1.5 py-0.5 border date-box"
                  :class="{
                    'cursor-move hover:bg-blue-400 hover:border-blue-500 bg-blue-200': currentUser(sig) && !sig.isEmpty,
                    'cursor-move hover:bg-green-400 hover:border-green-500 bg-green-200': currentUser(sig) && sig.isEmpty && !isUserWaiting(sig),
                    'cursor-default bg-purple-100': isUserWaiting(sig),
                    'cursor-default bg-gray-50': !currentUser(sig),
                    'z-50 active-drag-date': currentDraggingDateIndex===localSignatures.indexOf(sig) && isDraggingDate,
                    'z-10': currentDraggingDateIndex!==localSignatures.indexOf(sig) || !isDraggingDate,
                  }"
                  @mousedown="(!isDateLocked(sig) && currentUser(sig) && !isUserWaiting(sig)) ? startDraggingDate($event, localSignatures.indexOf(sig)) : null">
                  {{ sig.datePosition.dateText || 'MM/DD/YYYY' }}
                </div>
              </template>
            </div>
          </template>

          <!-- ══ FREE-SIGN MODE ══ -->
          <template v-else>
            <div class="flex flex-col items-center gap-6 py-4 px-3 w-full" @mousemove="handleMouseMove">
              <div v-for="pageNum in totalPages" :key="'pg-'+pageNum"
                :ref="el => { if (el) pageContainerRefs[pageNum-1]=el }"
                class="tutorial-target-freesign-canvas relative border-2 rounded shadow-sm flex-shrink-0 page-canvas-wrapper cursor-crosshair"
                :class="mySignature && !mySignature.isEmpty && mySignature.page===pageNum ? 'border-blue-400 shadow-blue-200' : 'border-gray-300'"
                @mousedown="handleFreeSignPageClick($event, pageNum)">

                <div class="absolute -top-3 left-3 bg-white px-2 py-0.5 text-xs font-semibold text-gray-600 border rounded z-10 pointer-events-none select-none">
                  Page {{ pageNum }}
                  <span v-if="mySignature && !mySignature.isEmpty && mySignature.page===pageNum" class="ml-1 text-blue-600">✓ signed here</span>
                </div>

                <canvas :ref="el => { if (el) canvasRefs[pageNum-1]=el }" class="block pointer-events-none select-none"></canvas>

                <div v-if="(!mySignature || mySignature.isEmpty) && pageNum===1" class="absolute inset-0 flex items-end justify-center pb-6 pointer-events-none z-20">
                  <div class="bg-blue-600 bg-opacity-90 text-white text-sm font-semibold px-4 py-2 rounded-full flex items-center gap-2 shadow-lg animate-bounce-slow">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                    Click anywhere to place your signature
                  </div>
                </div>

                <div v-if="mySignature && !mySignature.isEmpty && mySignature.page!==pageNum"
                  class="absolute inset-0 flex items-center justify-center pointer-events-none z-20 move-hint-overlay">
                  <div class="bg-blue-600 bg-opacity-80 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 opacity-0 transition-opacity duration-200">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
                    Move signature here
                  </div>
                </div>

                <template v-if="mySignature && !mySignature.isEmpty && mySignature.page===pageNum">
                  <div class="absolute rounded sig-overlay signature-box group border-2 border-blue-500 z-signed"
                    :class="{
                      'cursor-grabbing active-drag': isActiveDrag(mySignatureIndex),
                      'active-resize': editingSignatureIndex===mySignatureIndex && isResizingSignature,
                      'cursor-move': !isActiveDrag(mySignatureIndex) && !(editingSignatureIndex===mySignatureIndex && isResizingSignature),
                    }"
                    :style="{
                      width:  sc(mySignature.width)  + 'px',
                      height: sc(mySignature.height) + 'px',
                      left:   sc(mySignature.x)      + 'px',
                      top:    sc(mySignature.y)       + 'px',
                    }"
                    @mousedown.stop="startDraggingSignature($event, mySignatureIndex)">

                    <div class="absolute -top-7 left-0 text-white text-xs px-2 py-1 rounded font-semibold whitespace-nowrap flex items-center gap-1 shadow-lg pointer-events-none transition-all duration-200"
                      :class="isActiveDrag(mySignatureIndex) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'"
                      :style="{ backgroundColor: mySignature.color||'#3b82f6' }">
                      {{ mySignature.assignedTo }}
                    </div>
                    <div v-if="!isActiveDrag(mySignatureIndex)"
                      class="absolute -top-2 -left-2 w-5 h-5 rounded-full text-white text-[9px] font-bold flex items-center justify-center shadow-md pointer-events-none"
                      :style="{ backgroundColor: mySignature.color||'#3b82f6' }">
                      {{ (mySignature.assignedTo||'').trim().split(' ').filter(Boolean).map(n=>n[0]).slice(0,1).concat((mySignature.assignedTo||'').trim().split(' ').slice(-1).map(n=>n[0])).join('').toUpperCase() }}
                    </div>

                    <div class="relative w-full h-full flex flex-col">
                      <img :src="mySignature.imageSrc" class="w-full h-full object-contain select-none pointer-events-none"/>
                      <div class="absolute top-0 left-0 right-0 bg-blue-500 text-white text-xs px-1 py-0.5 text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        {{ sc(mySignature.width) > SMALL_SIG_WIDTH ? 'Drag to Move' : '' }}
                      </div>
                      <div class="absolute w-4 h-4 bg-blue-500 rounded-full -bottom-1 -right-1 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity z-10 touch-none"
                        @mousedown.stop="startResizingSignature($event, mySignatureIndex)"></div>
                    </div>
                  </div>

                  <div v-if="mySignature.datePosition && Number(mySignature.hasDate) === 1"
                    class="absolute select-none text-xs font-semibold text-gray-700 rounded px-1.5 py-0.5 border date-box date-overlay bg-blue-200 border-blue-400 hover:bg-blue-300"
                    :class="{
                      'cursor-grabbing active-drag-date': isDraggingDate && currentDraggingDateIndex===mySignatureIndex,
                      'cursor-move': !(isDraggingDate && currentDraggingDateIndex===mySignatureIndex),
                    }"
                    :style="{
                      left: sc(mySignature.datePosition.x) + 'px',
                      top:  sc(mySignature.datePosition.y) + 'px',
                    }"
                    @mousedown.stop="startDraggingDate($event, mySignatureIndex)">
                    {{ mySignature.datePosition.dateText }}
                  </div>
                </template>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- ═══ FOOTER ═══ -->
      <div class="flex items-center justify-between p-2 border-t bg-gray-50 flex-shrink-0">
        <div class="text-xs text-gray-500 hidden sm:block">
          <template v-if="freeSign">
            <p>• Scroll through all pages · Click any page to place your signature · Drag to reposition · Resize from corner</p>
            <p class="text-orange-600">⚠️ Changes saved only when you click "Done"</p>
          </template>
          <template v-else>
            <p>• Click your box to sign · Drag to move · Resize from corner</p>
            <p class="text-orange-600">⚠️ Changes saved only when you click "Done"</p>
          </template>
        </div>
        <div class="text-xs text-orange-600 sm:hidden">⚠️ Tap "Done" to save</div>
        <!-- Done button -->
        <button @click="handleDone"
          class="tutorial-target-done-btn px-4 py-2 sm:px-6 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm font-semibold ml-auto sm:ml-0">
          Done
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.select-none { user-select: none; }
.pointer-events-none { pointer-events: none; }
.sig-needs-signing { z-index: 30; }
.z-highlighted { z-index: 50 !important; }
.z-signed { z-index: 20; }
.z-base { z-index: 10; }
.z-active { z-index: 100 !important; }

@keyframes border-pulse {
  0%,100% { border-color:#16a34a; box-shadow:0 0 0 0 rgba(22,163,74,.5); }
  50% { border-color:#4ade80; box-shadow:0 0 0 6px rgba(22,163,74,0); }
}
.sig-needs-signing { animation: border-pulse 2s ease-in-out infinite; }
.sig-needs-signing:hover { animation:none; border-color:#15803d; box-shadow:0 0 0 4px rgba(22,163,74,.35); }

.sign-here-beacon { position:absolute; z-index:9999; pointer-events:none; display:flex; flex-direction:column; align-items:center; white-space:nowrap; filter:drop-shadow(0 2px 4px rgba(0,0,0,.25)); }
.beacon-normal { top:-50px; left:50%; transform:translateX(-50%); }
.beacon-small  { top:-54px; left:50%; transform:translateX(-50%); }
.beacon-label  { background:#16a34a; color:#fff; font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px; order:1; }
@keyframes bounce-arrow { 0%,100%{transform:translateY(0)} 50%{transform:translateY(4px)} }
.beacon-arrow { font-size:12px; color:#16a34a; line-height:1; animation:bounce-arrow 1s ease-in-out infinite; order:2; }

@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.55} }
.animate-pulse { animation:pulse 2s cubic-bezier(.4,0,.6,1) infinite; }
@keyframes bounce-slow { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
.animate-bounce-slow { animation: bounce-slow 2s ease-in-out infinite; }

.signature-box { transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease, opacity .15s ease; }
.signature-box.dimmed-box   { opacity:.35; filter:blur(.5px); }
.signature-box.active-drag  { transform:scale(1.03); box-shadow:0 8px 16px rgba(0,0,0,.2); z-index:100!important; opacity:1!important; filter:none!important; }
.signature-box.active-resize{ box-shadow:0 6px 12px rgba(0,0,0,.15); z-index:100!important; opacity:1!important; filter:none!important; }
.signature-box:active { transition:none; }

.date-box { transition: transform .15s ease, box-shadow .15s ease, background-color .15s ease; border-color:#d1d5db; }
.date-box.active-drag-date { transform:scale(1.05); box-shadow:0 6px 12px rgba(0,0,0,.2); z-index:100!important; }
.date-box:active { transition:none; }

.page-canvas-wrapper:hover .move-hint-overlay > div { opacity: 1 !important; }

.toast-enter-active, .toast-leave-active { transition: all .3s ease; }
.toast-enter-from { opacity:0; transform:translateX(100%); }
.toast-leave-to   { opacity:0; transform:translateX(100%); }

.nav-slide-enter-active, .nav-slide-leave-active { transition: max-height .25s ease, opacity .25s ease, padding .25s ease; overflow:hidden; }
.nav-slide-enter-from, .nav-slide-leave-to   { max-height:0;   opacity:0; padding-top:0; padding-bottom:0; }
.nav-slide-enter-to,   .nav-slide-leave-from { max-height:80px; opacity:1; }
</style>