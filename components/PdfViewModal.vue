<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick, reactive, computed } from 'vue';
import { usePdfSigningHub } from '~/js/usePdfSigningHub';

const props = defineProps({
  pdfFile: File,
  currentUserName: String,
  currentEmplId: String,
  documentId: { type: String, required: true },
  prePlacedSignatures: { type: Array, default: () => [] }
});

const router = useRouter();

// ── Scale constants ────────────────────────────────────────────
const BASE_SCALE   = 1.4;
const RENDER_SCALE = 2.0;

// User-controlled zoom multiplier (1.0 = 100%)
const userZoom    = ref(1.0);
const MIN_ZOOM    = 0.5;
const MAX_ZOOM    = 3.0;
const ZOOM_STEP   = 0.25;
const zoomPercent = computed(() => Math.round(userZoom.value * 100));

// Combined display scale = RENDER_SCALE × userZoom
const displayScale = computed(() => RENDER_SCALE * userZoom.value);
// scaleFactor: multiply stored BASE_SCALE coords → current screen px
const scaleFactor  = computed(() => displayScale.value / BASE_SCALE);

// Convert a stored coordinate → current pixel position
const sc = (val) => val * scaleFactor.value;

// ── Zoom actions ───────────────────────────────────────────────
const applyZoom = async () => {
  for (let i = 1; i <= totalPages.value; i++) await renderPage(i);
  await nextTick();
  updatePrePlacedPositions();
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

const containerRef      = ref(null);
const pdfDocument       = ref(null);
const canvasRefs        = ref([]);
const prePlacedSigRefs  = ref([]);
const prePlacedDateRefs = ref([]);
const totalPages        = ref(0);
const currentViewPage   = ref(1);
const goToPageNumber    = ref(1);
const showSidebar       = ref(true);

const localSignatures     = reactive([]);
const remoteDragPositions = reactive({});

const goBack = () => {
  router.push("/main/639077158657004911");
};

const getSigState = (sig) => {
  if (sig.isEmpty === true) return 'pending';
  if (sig.hasSigned === true) return 'signed';
  return 'signing';
};

// ── Color helpers ──────────────────────────────────────────────
const getSigBorderColor = (sig) => {
  if (sig.color) return sig.color;
  const state = getSigState(sig);
  if (state === 'pending') return '#fb923c';
  if (state === 'signing') return '#60a5fa';
  return '#4ade80';
};

const hexToRgba = (hex, alpha) => {
  const h = hex.replace('#', '');
  const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8)  & 255;
  const b =  bigint        & 255;
  return `rgba(${r},${g},${b},${alpha})`;
};

// ── Box style uses sc() for width/height ──────────────────────
const getSigBoxStyle = (sig) => {
  const state       = getSigState(sig);
  const borderColor = getSigBorderColor(sig);
  const w           = sc(sig.width)  + 'px';
  const h           = sc(sig.height) + 'px';
  if (state === 'signed') {
    return { width: w, height: h, borderWidth: '1.5px', borderStyle: 'solid', borderColor, backgroundColor: 'transparent' };
  }
  return {
    width:           w,
    height:          h,
    borderWidth:     '2px',
    borderStyle:     state === 'pending' ? 'dashed' : 'solid',
    borderColor,
    backgroundColor: hexToRgba(borderColor, 0.07),
  };
};

const isSequentialOrderEnforced = computed(() =>
  localSignatures.some(sig => sig.enforceSequentialOrder === true)
);

const getCurrentRequiredOrder = computed(() => {
  if (!isSequentialOrderEnforced.value) return null;
  const emptyOrders = localSignatures.filter(s => s.isEmpty).map(s => s.approvalOrder || 1);
  return emptyOrders.length > 0 ? Math.min(...emptyOrders) : null;
});

const getNextSignerInfo = computed(() => {
  if (!isSequentialOrderEnforced.value) return null;
  const nextOrder = getCurrentRequiredOrder.value;
  if (!nextOrder) return null;
  const nextSig = localSignatures.find(s => s.isEmpty && s.approvalOrder === nextOrder);
  return nextSig ? { name: nextSig.assignedTo, order: nextSig.approvalOrder } : null;
});

// ── Remote overlay: positions are stored coords → need sc() ───
const remoteOverlayStyles = computed(() => {
  const styles = {};
  if (!containerRef.value) return styles;
  const containerRect = containerRef.value.getBoundingClientRect();
  Object.entries(remoteDragPositions).forEach(([sigIndexStr, { x, y }]) => {
    const sigIndex = Number(sigIndexStr);
    const sig      = localSignatures[sigIndex];
    if (!sig) return;
    const canvas = canvasRefs.value[sig.page - 1];
    if (!canvas) return;
    const canvasRect = canvas.getBoundingClientRect();
    styles[sigIndex] = {
      left: (canvasRect.left - containerRect.left + sc(x)) + 'px',
      top:  (canvasRect.top  - containerRect.top  + sc(y)) + 'px',
    };
  });
  return styles;
});

onMounted(async () => {
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
  if (props.pdfFile) await loadPdf();
  window.addEventListener('resize', updatePrePlacedPositions);
});

watch(() => props.pdfFile, async (newFile) => {
  if (newFile) await loadPdf();
});

function registerHubListeners() {
  hub.onUserJoined(({ userName }) => addToast(`${userName} joined the document`, 'info'));
  hub.onUserLeft(({ userName })   => addToast(`${userName} left the document`, 'info'));

  hub.onSignaturePlaced(({ sigIndex, sigData, placedBy }) => {
    if (sigIndex < 0 || sigIndex >= localSignatures.length) {
      addToast(`Sync error: signature index mismatch (index ${sigIndex})`, 'error');
      return;
    }
    Object.assign(localSignatures[sigIndex], sigData);
    nextTick(() => updatePrePlacedPositions());
    addToast(`${placedBy} signed a field`, 'success');
  });

  hub.onSignatureMoved(({ sigIndex, sigData, movedBy }) => {
    if (sigIndex < 0 || sigIndex >= localSignatures.length) return;
    Object.assign(localSignatures[sigIndex], sigData);
    remoteDragPositions[sigIndex] = { x: sigData.x, y: sigData.y, movedBy };
    updateSingleSigPosition(sigIndex);
  });

  hub.onSignatureResized(({ sigIndex, sigData }) => {
    if (sigIndex < 0 || sigIndex >= localSignatures.length) return;
    localSignatures[sigIndex].width  = sigData.width;
    localSignatures[sigIndex].height = sigData.height;
    updateSingleSigPosition(sigIndex);
  });

  hub.onDateMoved(({ sigIndex, datePosition }) => {
    if (sigIndex < 0 || sigIndex >= localSignatures.length) return;
    if (localSignatures[sigIndex]?.datePosition) {
      Object.assign(localSignatures[sigIndex].datePosition, datePosition);
      updateSingleDatePosition(sigIndex);
    }
  });

  hub.onSignaturesSaved(({ signatures, savedBy }) => {
    signatures.forEach(incomingSig => {
      const localIdx = localSignatures.findIndex(s => {
        if (incomingSig.id && s.id) return s.id === incomingSig.id;
        return s.assignedTo === incomingSig.assignedTo && s.page === incomingSig.page;
      });
      if (localIdx === -1) return;
      const current = localSignatures[localIdx];
      Object.assign(current, incomingSig);
      if (incomingSig.datePosition) {
        if (current.datePosition) {
          Object.assign(current.datePosition, incomingSig.datePosition);
        } else {
          current.datePosition = { ...incomingSig.datePosition };
        }
      }
    });
    nextTick(() => updatePrePlacedPositions());
    addToast(`${savedBy} saved signature/s`, 'success');
  });

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
    prePlacedSigRefs.value  = [];
    prePlacedDateRefs.value = [];
    await nextTick();
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

    const viewport = page.getViewport({ scale: displayScale.value });
    const canvas   = canvasRefs.value[pageNum - 1];
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width  = viewport.width;
    canvas.height = viewport.height;

    const task = page.render({ canvasContext: ctx, viewport });
    renderTasks[pageNum] = task;
    await task.promise;
    renderTasks[pageNum] = null;

    await nextTick();
    updatePrePlacedPositions();
  } catch (error) {
    if (error?.name === 'RenderingCancelledException') return;
    console.error('Error rendering page:', error);
  }
};

// ── All positions use sc() to convert stored → rendered coords ─
const updatePrePlacedPositions = () => {
  if (!containerRef.value || canvasRefs.value.length === 0) return;
  const containerRect = containerRef.value.getBoundingClientRect();

  localSignatures.forEach((sig, index) => {
    const canvas     = canvasRefs.value[sig.page - 1];
    const sigElement = prePlacedSigRefs.value[index];
    if (!canvas || !sigElement) return;
    const canvasRect         = canvas.getBoundingClientRect();
    sigElement.style.left    = (canvasRect.left - containerRect.left + sc(sig.x)) + 'px';
    sigElement.style.top     = (canvasRect.top  - containerRect.top  + sc(sig.y)) + 'px';
  });

  localSignatures.forEach((sig, sigIndex) => {
    if (!sig.datePosition) return;
    const canvas      = canvasRefs.value[sig.page - 1];
    const dateIndex   = localSignatures.slice(0, sigIndex).filter(s => s.datePosition).length;
    const dateElement = prePlacedDateRefs.value[dateIndex];
    if (!canvas || !dateElement) return;
    const canvasRect         = canvas.getBoundingClientRect();
    dateElement.style.left   = (canvasRect.left - containerRect.left + sc(sig.datePosition.x)) + 'px';
    dateElement.style.top    = (canvasRect.top  - containerRect.top  + sc(sig.datePosition.y)) + 'px';
    dateElement.style.width  = sc(sig.datePosition.width  || 100) + 'px';
    dateElement.style.height = sc(sig.datePosition.height || 30)  + 'px';
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

// ── Cursor: convert screen coords back to BASE_SCALE before sending ──
const handleMouseMove = (e) => {
  if (!containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  const rawX = e.clientX - rect.left;
  const rawY = e.clientY - rect.top;
  hub.sendCursorMoved(rawX / scaleFactor.value, rawY / scaleFactor.value, currentViewPage.value, '#6366f1');
};

const goToNextPage = () => {
  if (currentViewPage.value < totalPages.value) { currentViewPage.value++; nextTick(() => updatePrePlacedPositions()); }
};
const goToPrevPage = () => {
  if (currentViewPage.value > 1) { currentViewPage.value--; nextTick(() => updatePrePlacedPositions()); }
};
const scrollToPage = (pageNum) => {
  if (pageNum >= 1 && pageNum <= totalPages.value) { currentViewPage.value = pageNum; nextTick(() => updatePrePlacedPositions()); }
};

const signaturesSummary = computed(() => {
  return localSignatures.reduce((acc, sig, index) => {
    const item  = { ...sig, index };
    const state = getSigState(sig);
    if (state === 'pending')       acc.pending.push(item);
    else if (state === 'signed')   acc.completed.push(item);
    else                           acc.signing.push(item);
    return acc;
  }, { pending: [], signing: [], completed: [] });
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

const isSmallSignatureBox = (sig) => sc(sig.width) <= 120;

const getInitials = (sig) => {
  if (isSequentialOrderEnforced.value) return sig.approvalOrder;
  const name  = sig.assignedTo || sig.signedBy || '';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

onUnmounted(async () => {
  window.removeEventListener('resize', updatePrePlacedPositions);
  await hub.disconnect();
});
</script>

<template>
  <div class="flex flex-col w-full bg-gray-100 overflow-hidden">

    <!-- ════════════ TOAST NOTIFICATIONS ════════════ -->
    <div class="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
      <transition-group name="toast" tag="div" class="flex flex-col gap-2">
        <div
          v-for="toast in toasts" :key="toast.id"
          class="px-4 py-3 rounded-lg shadow-lg text-sm font-semibold flex items-center gap-2 pointer-events-auto max-w-xs"
          :class="{
            'bg-blue-600 text-white':   toast.type === 'info',
            'bg-green-600 text-white':  toast.type === 'success',
            'bg-yellow-500 text-white': toast.type === 'warning',
            'bg-red-600 text-white':    toast.type === 'error',
          }"
        >
          <span v-if="toast.type === 'info'">ℹ️</span>
          <span v-else-if="toast.type === 'success'">✅</span>
          <span v-else-if="toast.type === 'warning'">⚠️</span>
          <span v-else>❌</span>
          {{ toast.message }}
        </div>
      </transition-group>
    </div>

    <!-- ════════════════════ HEADER ════════════════════ -->
    <div class="flex items-center justify-between px-5 py-3 border-b bg-white shadow-sm flex-shrink-0">
      <div class="flex items-center gap-3 min-w-0">
        <button
          @click="goBack"
          class="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition flex-shrink-0"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <div class="h-5 w-px bg-gray-200 flex-shrink-0"></div>
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold border border-amber-300 flex-shrink-0">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          View Only
        </span>
        <h2 class="text-base font-semibold text-gray-800 truncate">PDF Document</h2>
      </div>

      <div class="flex items-center gap-4 flex-shrink-0">
        <div v-if="hub.activeUsers.value.length > 1" class="flex items-center gap-2">
          <span class="text-xs text-gray-400">Also viewing:</span>
          <div
            v-for="user in hub.activeUsers.value.filter(u => u.emplId !== currentEmplId)"
            :key="user.emplId"
            class="flex items-center gap-1 bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full font-semibold"
          >
            <span class="w-2 h-2 bg-green-500 rounded-full inline-block animate-pulse"></span>
            {{ user.userName }}
          </div>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full inline-block" :class="hub.isConnected.value ? 'bg-green-500' : 'bg-yellow-400 animate-pulse'"></span>
          <span class="text-xs text-gray-400">{{ hub.isConnected.value ? 'Live sync' : 'Connecting…' }}</span>
        </div>
        <span class="text-sm text-gray-500">
          Viewing as <span class="font-semibold text-gray-700">{{ currentUserName }}</span>
        </span>
      </div>
    </div>

    <!-- Sequential order banner -->
    <div
      v-if="isSequentialOrderEnforced && getNextSignerInfo"
      class="px-5 py-2 bg-blue-50 border-b border-blue-200 text-xs text-blue-700 flex items-center gap-1 flex-shrink-0"
    >
      🔄 Sequential Order: Waiting for
      <strong>{{ getNextSignerInfo.name }}</strong>
      (Signer Number {{ getNextSignerInfo.order }})
    </div>

    <!-- ════════════ PAGE NAVIGATION + ZOOM BAR ════════════ -->
    <div
      class="flex items-center justify-center gap-3 px-4 py-2 bg-white border-b flex-shrink-0 flex-wrap"
      :style="{ paddingLeft: showSidebar ? '16rem' : '0' }"
    >
      <button
        @click="goToPrevPage" :disabled="currentViewPage === 1"
        class="px-3 py-1.5 bg-gray-700 text-white rounded hover:bg-gray-900 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1.5 text-sm"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Previous
      </button>

      <span class="text-sm font-semibold text-gray-600">Page {{ currentViewPage }} of {{ totalPages }}</span>

      <button
        @click="goToNextPage" :disabled="currentViewPage === totalPages"
        class="px-3 py-1.5 bg-gray-700 text-white rounded hover:bg-gray-900 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1.5 text-sm"
      >
        Next
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <div class="flex items-center gap-1.5">
        <input
          type="number" min="1" :max="totalPages"
          v-model.number="goToPageNumber"
          @keydown.enter="scrollToPage(goToPageNumber)"
          class="border rounded px-2 py-1 w-16 text-sm text-center"
        />
        <button @click="scrollToPage(goToPageNumber)" class="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm">Go</button>
      </div>

      <!-- Divider -->
      <div class="w-px h-5 bg-gray-300"></div>

      <!-- ★ Zoom controls ★ -->
      <div class="flex items-center gap-1 bg-gray-200 rounded-lg p-1">
        <button
          @click="zoomOut" :disabled="userZoom <= MIN_ZOOM"
          class="w-7 h-7 flex items-center justify-center rounded hover:bg-white transition disabled:opacity-40 disabled:cursor-not-allowed font-bold text-gray-700 text-lg leading-none"
          title="Zoom out"
        >−</button>
        <button
          @click="zoomReset"
          class="px-2 py-0.5 text-xs font-semibold text-gray-700 hover:bg-white rounded transition min-w-[46px] text-center"
          title="Reset zoom"
        >{{ zoomPercent }}%</button>
        <button
          @click="zoomIn" :disabled="userZoom >= MAX_ZOOM"
          class="w-7 h-7 flex items-center justify-center rounded hover:bg-white transition disabled:opacity-40 disabled:cursor-not-allowed font-bold text-gray-700 text-lg leading-none"
          title="Zoom in"
        >+</button>
      </div>
    </div>

    <!-- ════════════ BODY ════════════ -->
    <div class="flex flex-1 overflow-hidden relative">

      <!-- ──────────────── SIDEBAR ──────────────── -->
      <div v-if="showSidebar" class="w-64 border-r bg-white p-4 overflow-y-auto flex-shrink-0 shadow-sm">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold text-base text-gray-800">Signatures</h3>
          <button @click="showSidebar = false" class="p-1 hover:bg-gray-100 rounded transition">
            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        <!-- Active users panel -->
        <div v-if="hub.activeUsers.value.length > 0" class="mb-4 bg-gray-50 rounded-lg border p-3">
          <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Active Now</h4>
          <div class="space-y-1">
            <div v-for="user in hub.activeUsers.value" :key="user.emplId" class="flex items-center gap-2 text-sm">
              <span class="w-2 h-2 rounded-full flex-shrink-0" :class="user.emplId === currentEmplId ? 'bg-blue-500' : 'bg-green-500 animate-pulse'"></span>
              <span class="truncate font-medium text-gray-700">{{ user.userName }}</span>
              <span v-if="user.emplId === currentEmplId" class="text-xs text-gray-400 ml-auto flex-shrink-0">(you)</span>
            </div>
          </div>
        </div>

        <!-- PENDING -->
        <div v-if="signaturesSummary.pending.length > 0" class="mb-4">
          <h4 class="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-2 flex items-center gap-1">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Pending ({{ signaturesSummary.pending.length }})
          </h4>
          <div class="space-y-1.5">
            <div v-for="sig in signaturesSummary.pending" :key="sig.index"
              @click="goToSignature(sig)"
              class="p-2.5 bg-white rounded-lg border hover:bg-gray-50 cursor-pointer transition-all text-sm"
              :style="{ borderColor: sig.color || '#fb923c' }">
              <div class="flex items-center justify-between gap-2">
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 mb-0.5">
                    <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ backgroundColor: sig.color || '#fb923c' }"></span>
                    <p class="font-semibold text-gray-800 truncate">{{ sig.assignedTo }}</p>
                  </div>
                  <div class="flex items-center gap-1.5 mt-0.5">
                    <span class="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">Pg {{ sig.page }}</span>
                    <span v-if="isSequentialOrderEnforced" class="text-xs font-semibold px-1.5 py-0.5 rounded" :style="{ color: sig.color || '#fb923c', backgroundColor: (sig.color ? sig.color + '20' : '#fff7ed') }">#{{ sig.approvalOrder }}</span>
                  </div>
                </div>
                <svg class="w-4 h-4 flex-shrink-0" :style="{ color: sig.color || '#fb923c' }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- SIGNING -->
        <div v-if="signaturesSummary.signing.length > 0" class="mb-4">
          <h4 class="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 animate-bounce-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Signing ({{ signaturesSummary.signing.length }})
            <span class="ml-auto flex items-center gap-1">
              <span class="relative flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
            </span>
          </h4>
          <div class="space-y-1.5">
            <div v-for="sig in signaturesSummary.signing" :key="sig.index"
              @click="goToSignature(sig)"
              class="p-2.5 rounded-lg border cursor-pointer transition-all text-sm relative overflow-hidden hover:brightness-95"
              :style="{ borderColor: sig.color || '#60a5fa', backgroundColor: sig.color ? sig.color + '12' : '#eff6ff' }">
              <div class="absolute inset-0 signing-shimmer pointer-events-none"></div>
              <div class="flex items-center justify-between gap-2 relative z-10">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5 mb-0.5">
                    <span class="w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse" :style="{ backgroundColor: sig.color || '#60a5fa' }"></span>
                    <p class="font-semibold text-gray-800 truncate">{{ sig.signedBy || sig.assignedTo }}</p>
                    <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap flex-shrink-0 text-white" :style="{ backgroundColor: sig.color || '#3b82f6' }">
                      <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                      In Progress
                    </span>
                  </div>
                  <div class="flex items-center gap-1.5 mt-0.5">
                    <span class="text-xs text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-200">Pg {{ sig.page }}</span>
                    <span v-if="isSequentialOrderEnforced" class="text-xs font-semibold px-1.5 py-0.5 rounded" :style="{ color: sig.color || '#3b82f6', backgroundColor: (sig.color ? sig.color + '20' : '#dbeafe') }">#{{ sig.approvalOrder }}</span>
                    <span v-if="sig.signedDate" class="text-xs text-gray-400">{{ sig.signedDate }}</span>
                  </div>
                </div>
                <div class="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center shadow-sm" :style="{ backgroundColor: sig.color || '#3b82f6' }">
                  <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- SIGNED / COMPLETED -->
        <div v-if="signaturesSummary.completed.length > 0" class="mb-4">
          <h4 class="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2 flex items-center gap-1">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Signed ({{ signaturesSummary.completed.length }})
          </h4>
          <div class="space-y-1.5">
            <div v-for="sig in signaturesSummary.completed" :key="sig.index"
              @click="goToSignature(sig)"
              class="p-2.5 bg-white rounded-lg border hover:bg-gray-50 cursor-pointer transition-all text-sm"
              :style="{ borderColor: sig.color || '#4ade80' }">
              <div class="flex items-center justify-between gap-2">
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 mb-0.5">
                    <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ backgroundColor: sig.color || '#4ade80' }"></span>
                    <p class="font-semibold text-gray-800 truncate">{{ sig.signedBy }}</p>
                  </div>
                  <div class="flex items-center gap-1.5 mt-0.5">
                    <span class="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">Pg {{ sig.page }}</span>
                    <span v-if="isSequentialOrderEnforced" class="text-xs font-semibold px-1.5 py-0.5 rounded" :style="{ color: sig.color || '#16a34a', backgroundColor: (sig.color ? sig.color + '20' : '#dcfce7') }">#{{ sig.approvalOrder }}</span>
                  </div>
                  <p v-if="sig.signedDate" class="text-xs text-gray-400 mt-0.5">{{ sig.signedDate }}</p>
                </div>
                <svg class="w-4 h-4 flex-shrink-0" :style="{ color: sig.color || '#4ade80' }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-if="signaturesSummary.pending.length === 0 && signaturesSummary.completed.length === 0 && signaturesSummary.signing.length === 0"
          class="text-center py-10 px-4">
          <div class="bg-gray-50 rounded-lg p-5 border-2 border-dashed border-gray-300">
            <svg class="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p class="text-sm text-gray-500">No signatures in this document</p>
          </div>
        </div>
      </div>

      <!-- Collapsed sidebar toggle -->
      <button
        v-if="!showSidebar"
        @click="showSidebar = true"
        class="absolute left-3 top-1/2 -translate-y-1/2 bg-gray-700 text-white p-2.5 rounded-lg shadow-xl hover:bg-gray-900 transition z-40"
        title="Show Signatures"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
      </button>

      <!-- ════════════ PDF CANVAS AREA ════════════ -->
      <div class="flex-1 overflow-auto p-6 bg-gray-100 flex justify-center">
        <div ref="containerRef" class="relative inline-block" @mousemove="handleMouseMove">

          <!-- PDF Canvas -->
          <div class="relative border border-gray-300 rounded shadow-md bg-white">
            <div class="absolute -top-3 left-4 bg-white px-2 py-0.5 text-xs font-semibold text-gray-500 border rounded">
              Page {{ currentViewPage }}
            </div>
            <canvas
              v-for="i in totalPages" :key="i"
              v-show="i === currentViewPage"
              :ref="el => { if (el) canvasRefs[i - 1] = el }"
              class="block"
            ></canvas>
          </div>

          <!-- REMOTE LIVE DRAG OVERLAYS -->
          <template v-for="(pos, sigIndex) in remoteDragPositions" :key="'remote-' + sigIndex">
            <div
              v-if="localSignatures[Number(sigIndex)]?.page === currentViewPage && remoteOverlayStyles[Number(sigIndex)]"
              class="absolute pointer-events-none rounded transition-none"
              :style="{
                ...remoteOverlayStyles[Number(sigIndex)],
                width:  sc(localSignatures[Number(sigIndex)]?.width  || 150) + 'px',
                height: sc(localSignatures[Number(sigIndex)]?.height || 75)  + 'px',
                border: `2px solid ${localSignatures[Number(sigIndex)]?.color || '#6366f1'}`,
                boxShadow: `0 0 0 1px ${localSignatures[Number(sigIndex)]?.color || '#6366f1'}40, 0 4px 16px ${localSignatures[Number(sigIndex)]?.color || '#6366f1'}30`,
                zIndex: 60
              }"
            >
              <div
                class="absolute -top-5 left-0 text-white text-[10px] font-semibold px-2 py-0.5 rounded whitespace-nowrap"
                :style="{ backgroundColor: localSignatures[Number(sigIndex)]?.color || '#6366f1' }"
              >
                {{ localSignatures[Number(sigIndex)]?.assignedTo || 'Remote user' }}
              </div>
            </div>
          </template>

          <!-- REMOTE CURSOR DOTS -->
          <template v-for="(cursor, emplId) in hub.remoteCursors.value" :key="'cursor-' + emplId">
            <div
              v-if="cursor.page === currentViewPage"
              class="absolute pointer-events-none z-50 transition-all duration-75"
              :style="{ left: (cursor.x * scaleFactor) + 'px', top: (cursor.y * scaleFactor) + 'px' }"
            >
              <div class="w-3 h-3 rounded-full border-2 border-white shadow-md" :style="{ background: cursor.color || '#6366f1', transform: 'translate(-50%, -50%)' }"></div>
              <div class="absolute top-3 left-3 text-white text-xs px-2 py-0.5 rounded whitespace-nowrap shadow" :style="{ backgroundColor: cursor.color || '#6366f1' }">
                {{ cursor.userName }}
              </div>
            </div>
          </template>

          <!-- SIGNATURE BOXES -->
          <div
            v-for="(sig, index) in localSignatures" :key="'sig-' + index"
            :ref="el => { if (el) prePlacedSigRefs[index] = el }"
            v-show="sig.page === currentViewPage"
            class="absolute rounded pointer-events-none"
            :class="{
              'ring-4 ring-yellow-400 ring-offset-2 animate-pulse': highlightedSignatureIndex === index,
              'signing-box-glow': getSigState(sig) === 'signing',
            }"
            :style="getSigBoxStyle(sig)"
          >
            <div
              v-if="getSigState(sig) !== 'signed'"
              class="absolute -top-2 -left-2 w-5 h-5 rounded-full text-white text-[9px] font-bold flex items-center justify-center shadow-md pointer-events-none z-10"
              :style="{ backgroundColor: sig.color || '#3b82f6' }"
            >
              {{ getInitials(sig) }}
            </div>

            <!-- PENDING -->
            <div v-if="getSigState(sig) === 'pending'" class="flex flex-col items-center justify-center h-full p-1 pointer-events-none">
              <svg class="w-5 h-5 mb-1" :style="{ color: sig.color || '#fb923c' }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p v-if="!isSmallSignatureBox(sig)" class="text-xs font-semibold text-center leading-tight" :style="{ color: sig.color || '#fb923c' }">Pending</p>
              <p v-if="!isSmallSignatureBox(sig) && sig.assignedTo" class="text-xs text-center truncate max-w-full px-1 opacity-70" :style="{ color: sig.color || '#fb923c' }">{{ sig.assignedTo }}</p>
            </div>

            <!-- SIGNING -->
            <div v-else-if="getSigState(sig) === 'signing'" class="relative w-full h-full flex flex-col pointer-events-none overflow-hidden rounded">
              <div class="relative w-full h-full">
                <template v-if="sig.showName">
                  <div class="flex flex-col items-center justify-end pb-2 px-2 h-full">
                    <div class="flex items-end justify-center" style="margin-bottom: -10px;">
                      <img :src="sig.imageSrc" class="object-contain select-none opacity-75"
                        :style="{ maxWidth: Math.max(sc(sig.width) - 16, (sig.signedBy || '').length * 8) + 'px', maxHeight: (sc(sig.height) - 30) + 'px' }" />
                    </div>
                    <div class="text-center pt-0.5 text-xs" :style="{ minWidth: Math.max(100, (sig.signedBy || '').length * 8) + 'px' }">
                      <div class="font-medium text-gray-700">{{ sig.signedBy }}</div>
                    </div>
                  </div>
                </template>
                <template v-else>
                  <img :src="sig.imageSrc" class="w-full h-full object-contain select-none opacity-75" />
                </template>
                <div class="absolute inset-0 rounded pointer-events-none opacity-10" :style="{ backgroundColor: sig.color || '#3b82f6' }"></div>
              </div>
              <div class="absolute top-1 right-1 flex items-center gap-0.5 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow pointer-events-none" :style="{ backgroundColor: sig.color || '#3b82f6' }">
                <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                <span v-if="!isSmallSignatureBox(sig)">Signing</span>
              </div>
            </div>

            <!-- SIGNED -->
            <div v-else class="relative w-full h-full flex flex-col pointer-events-none">
              <template v-if="sig.showName">
                <div class="flex flex-col items-center justify-end pb-2 px-2 h-full">
                  <div class="flex items-end justify-center" style="margin-bottom: -10px;">
                    <img :src="sig.imageSrc" class="object-contain select-none"
                      :style="{ maxWidth: Math.max(sc(sig.width) - 16, (sig.signedBy || '').length * 8) + 'px', maxHeight: (sc(sig.height) - 30) + 'px' }" />
                  </div>
                  <div class="text-center pt-0.5 text-xs" :style="{ minWidth: Math.max(100, (sig.signedBy || '').length * 8) + 'px' }">
                    <div class="font-medium text-gray-800">{{ sig.signedBy }}</div>
                  </div>
                </div>
              </template>
              <template v-else>
                <img :src="sig.imageSrc" class="w-full h-full object-contain select-none" />
              </template>
            </div>
          </div>

          <!-- DATE LABELS -->
          <template v-for="(sig, filteredIndex) in localSignatures.filter(s => s.datePosition)" :key="'date-' + filteredIndex">
            <div
              :ref="el => { if (el) prePlacedDateRefs[filteredIndex] = el }"
              v-show="sig.page === currentViewPage"
              class="absolute select-none text-sm font-semibold rounded px-2 py-0.5 pointer-events-none"
              :style="{
                left:            sig.datePosition.x + 'px',
                top:             sig.datePosition.y + 'px',
                border:          `1.5px solid ${sig.color || (getSigState(sig) === 'signed' ? '#4ade80' : getSigState(sig) === 'signing' ? '#60a5fa' : '#fb923c')}`,
                color:           sig.color || (getSigState(sig) === 'signed' ? '#166534' : getSigState(sig) === 'signing' ? '#1d4ed8' : '#c2410c'),
                backgroundColor: 'transparent',
              }"
            >
              {{ sig.datePosition.dateText || 'MM/DD/YYYY' }}
            </div>
          </template>

        </div>
      </div>
    </div>

    <!-- ════════════════════ FOOTER ════════════════════ -->
    <div class="flex items-center justify-between px-4 py-2 border-t bg-white flex-shrink-0">
      <div class="flex items-center gap-4 text-xs text-gray-500">
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded border-2 border-dashed border-orange-400 bg-orange-50 inline-block"></span>
          Pending
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded border-2 border-blue-400 bg-blue-50 inline-block relative overflow-hidden">
            <span class="absolute inset-0 signing-shimmer-mini"></span>
          </span>
          Signing
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded border-2 border-green-400 bg-white inline-block"></span>
          Signed
        </div>
        <span class="text-amber-600 font-semibold flex items-center gap-1">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          View only — you cannot sign or edit
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.select-none         { user-select: none; }
.pointer-events-none { pointer-events: none; }

@keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: .55 } }
.animate-pulse { animation: pulse 2s cubic-bezier(.4, 0, .6, 1) infinite; }

@keyframes signing-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.2); }
  50%       { box-shadow: 0 0 0 5px rgba(99, 102, 241, 0.12); }
}
.signing-box-glow { animation: signing-glow 2.4s ease-in-out infinite; }

@keyframes shimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
.signing-shimmer {
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.45) 50%, transparent 100%);
  animation: shimmer 2.2s ease-in-out infinite;
}
.signing-shimmer-mini {
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%);
  animation: shimmer 2s ease-in-out infinite;
}

@keyframes bounce-subtle {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-2px); }
}
.animate-bounce-subtle { animation: bounce-subtle 1.8s ease-in-out infinite; }

.toast-enter-active, .toast-leave-active { transition: all .3s ease; }
.toast-enter-from { opacity: 0; transform: translateX(100%); }
.toast-leave-to   { opacity: 0; transform: translateX(100%); }
</style>