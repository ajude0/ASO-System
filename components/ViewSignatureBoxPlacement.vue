<script setup>
import { ref, watch, onUnmounted, nextTick, computed } from 'vue';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { toRaw } from 'vue';

const props = defineProps({
    isOpen: Boolean,
    pdfTitle: String,
    pdfFile: File,
    signatures: { type: Array, default: () => [] }
});
const emit = defineEmits(['close']);

// ── Scale system ──────────────────────────────────────────────────────────────
const BASE_SCALE   = 1.4;
const renderScale  = ref(BASE_SCALE);
const userZoom     = ref(1.0);
const MIN_ZOOM     = 0.5;
const MAX_ZOOM     = 3.0;
const ZOOM_STEP    = 0.25;
const displayScale = computed(() => renderScale.value * userZoom.value);
const scaleFactor  = computed(() => displayScale.value / BASE_SCALE);
const zoomPercent  = computed(() => Math.round(userZoom.value * 100));
const sc           = (val) => val * scaleFactor.value;

const zoomIn    = async () => { userZoom.value = Math.min(MAX_ZOOM, +(userZoom.value + ZOOM_STEP).toFixed(2)); await applyZoom(); };
const zoomOut   = async () => { userZoom.value = Math.max(MIN_ZOOM, +(userZoom.value - ZOOM_STEP).toFixed(2)); await applyZoom(); };
const zoomReset = async () => { userZoom.value = 1.0; await applyZoom(); };
const applyZoom = async () => { for (let i = 1; i <= totalPages.value; i++) await renderPage(i); await nextTick(); };

// ── Refs ──────────────────────────────────────────────────────────────────────
const containerRef     = ref(null);
const canvasWrapperRef = ref(null);
const pdfDocument      = ref(null);
const canvasRefs       = ref([]);
const totalPages       = ref(0);
const currentViewPage  = ref(1);
const goToPageNumber   = ref(1);
const showSidebar      = ref(false);
const SIGNATURE_MARGIN_BOTTOM = 10;

// ── Watch ─────────────────────────────────────────────────────────────────────
watch(() => props.isOpen, async (v) => { if (v && props.pdfFile) { userZoom.value = 1.0; await loadPdf(); } });

// ── ResizeObserver ────────────────────────────────────────────────────────────
let resizeObserver = null;
const setupResizeObserver = () => {
    if (resizeObserver) resizeObserver.disconnect();
    if (!canvasWrapperRef.value) return;
    resizeObserver = new ResizeObserver(async (entries) => {
        for (const entry of entries) {
            const availableWidth = entry.contentRect.width;
            if (!pdfDocument.value) return;
            const page         = await pdfDocument.value.getPage(1);
            const rotation     = page.rotate ?? 0;
            const baseViewport = page.getViewport({ scale: BASE_SCALE, rotation });
            const naturalWidth = baseViewport.width;
            const usable       = availableWidth - 48;
            const newScale     = usable < naturalWidth ? Math.max(0.4, (usable / naturalWidth) * BASE_SCALE) : BASE_SCALE;
            if (Math.abs(newScale - renderScale.value) > 0.01) {
                renderScale.value = newScale;
                for (let i = 1; i <= totalPages.value; i++) await renderPage(i);
                await nextTick();
            }
        }
    });
    resizeObserver.observe(canvasWrapperRef.value);
};

// ── PDF load / render ─────────────────────────────────────────────────────────
const loadPdf = async () => {
    try {
        const pdfjsLib    = window['pdfjs-dist/build/pdf'];
        const arrayBuffer = await props.pdfFile.arrayBuffer();
        const pdf         = await pdfjsLib.getDocument(arrayBuffer).promise;
        pdfDocument.value = pdf;
        totalPages.value  = pdf.numPages;
        canvasRefs.value  = [];
        await nextTick(); await nextTick();
        setupResizeObserver();
        for (let i = 1; i <= pdf.numPages; i++) await renderPage(i);
    } catch (e) { console.error('Error loading PDF:', e); }
};

let renderTasks = {};
const renderPage = async (pageNum) => {
    try {
        const page = await pdfDocument.value.getPage(pageNum);
        if (renderTasks[pageNum]) { renderTasks[pageNum].cancel(); }
        let rotation = page.rotate ?? 0;
        let viewport = page.getViewport({ scale: displayScale.value, rotation: 0 });
        if (viewport.width > viewport.height) { rotation = 90; }
        viewport = page.getViewport({ scale: displayScale.value, rotation });
        const canvas = canvasRefs.value[pageNum - 1];
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width; canvas.height = viewport.height;
        const task = page.render({ canvasContext: ctx, viewport });
        renderTasks[pageNum] = task;
        await task.promise;
        renderTasks[pageNum] = null;
    } catch (e) { if (e?.name !== 'RenderingCancelledException') console.error(e); }
};

// ── Position helpers ──────────────────────────────────────────────────────────
const getBoxStyle = (sig) => {
    const canvas = canvasRefs.value[sig.page - 1];
    if (!canvas || !containerRef.value) return {};
    const cr = canvas.getBoundingClientRect();
    const pr = containerRef.value.getBoundingClientRect();
    return { left: (cr.left - pr.left + sc(sig.x)) + 'px', top: (cr.top - pr.top + sc(sig.y)) + 'px', width: sc(sig.width) + 'px', height: sc(sig.height) + 'px' };
};
const getDateStyle = (sig) => {
    if (!sig.datePosition) return {};
    const canvas = canvasRefs.value[sig.page - 1];
    if (!canvas || !containerRef.value) return {};
    const cr = canvas.getBoundingClientRect();
    const pr = containerRef.value.getBoundingClientRect();
    return { left: (cr.left - pr.left + sc(sig.datePosition.x)) + 'px', top: (cr.top - pr.top + sc(sig.datePosition.y)) + 'px', width: sc(sig.datePosition.width || 100) + 'px', height: sc(sig.datePosition.height || 30) + 'px' };
};
const getBoxVisualStyle = (sig) => {
    const base = getBoxStyle(sig);
    return { ...base, top: sig.showName ? (parseFloat(base.top || 0) - sc(SIGNATURE_MARGIN_BOTTOM)) + 'px' : base.top, backgroundColor: 'transparent' };
};
const getDateVisualStyle = (sig) => ({ ...getDateStyle(sig), borderColor: '#36454F', color: '#36454F' });

// ── Signature helpers ─────────────────────────────────────────────────────────
const getCurrentPageSignatures = () => props.signatures.filter(s => s.page === currentViewPage.value && s.imageSrc);
const getSignedSignatures      = () => props.signatures.filter(s => s.imageSrc);
const isSequentialOrder        = () => props.signatures.some(s => s.enforceSequentialOrder);
const getSignerGroups = () => {
    const groups = {};
    props.signatures.forEach(sig => {
        const key = sig.assignedEmplId || sig.assignedTo;
        if (!groups[key]) groups[key] = { name: sig.assignedTo, emplId: sig.assignedEmplId, color: sig.color, approvalOrder: sig.approvalOrder, signatures: [], signedCount: 0 };
        groups[key].signatures.push(sig);
        if (sig.imageSrc) groups[key].signedCount++;
    });
    const sorted = Object.values(groups).sort((a, b) => Number(a.approvalOrder || 0) - Number(b.approvalOrder || 0));
    if (isSequentialOrder()) {
        let prev = true;
        sorted.forEach(g => {
            const full = g.signedCount === g.signatures.length;
            if (prev && !full) { g.status = 'pending'; prev = false; } else if (full) { g.status = 'signed'; } else { g.status = 'waiting'; }
        });
    } else { sorted.forEach(g => { g.status = g.signedCount === g.signatures.length ? 'signed' : 'pending'; }); }
    return sorted;
};

// ── Navigation ────────────────────────────────────────────────────────────────
const goToNextPage = () => { if (currentViewPage.value < totalPages.value) currentViewPage.value++; };
const goToPrevPage = () => { if (currentViewPage.value > 1) currentViewPage.value--; };
const scrollToPage = (n) => { if (n >= 1 && n <= totalPages.value) currentViewPage.value = n; };
const scrollToSignature = async (sig) => {
    currentViewPage.value = sig.page;
    await nextTick();
    if (containerRef.value?.parentElement) {
        const el = containerRef.value.parentElement;
        el.scrollTo({ top: Math.max(0, sc(sig.y) - el.clientHeight / 2 + sc(sig.height) / 2), behavior: 'smooth' });
    }
};

// ── Download PDF ──────────────────────────────────────────────────────────────
const downloadPdf = async () => {
    try {
        if (!props.pdfFile) { alert('PDF file not found'); return; }
        if (!props.signatures?.length) { alert('No signatures found'); return; }
        const pdfDoc = await PDFDocument.load(await props.pdfFile.arrayBuffer());
        const font   = await pdfDoc.embedFont(StandardFonts.Helvetica);
        for (const sigRaw of props.signatures) {
            const sig = toRaw(sigRaw);
            if (!sig || sig.isEmpty || !sig.imageSrc) continue;
            const pageIdx = Math.max(0, (sig.page || 1) - 1);
            if (pageIdx >= pdfDoc.getPageCount()) continue;
            const page = pdfDoc.getPage(pageIdx);
            const pw = page.getWidth(); const ph = page.getHeight();
            const sx = pw / (sig.canvasWidth  || pw);
            const sy = ph / (sig.canvasHeight || ph);
            const imgBytes = await (await fetch(sig.imageSrc)).arrayBuffer();
            let img; try { img = await pdfDoc.embedPng(imgBytes); } catch { img = await pdfDoc.embedJpg(imgBytes); }
            const mw = sig.width * sx; const mh = sig.height * sy;
            const ar = img.width / img.height;
            let dw = mw; let dh = dw / ar;
            if (dh > mh) { dh = mh; dw = dh * ar; }
            const xp = sig.x * sx + (mw - dw) / 2;
            const hasName = !!sig.showName;
            const fs = Math.max(8, dh * 0.18);
            let yp = ph - (sig.y + dh) * sy - (hasName ? fs / 2 : fs) - 4 * sy;
            page.drawImage(img, { x: xp, y: yp, width: dw, height: dh });
            if (hasName) {
                const tw = Math.min(font.widthOfTextAtSize(sig.signedBy, fs), dw);
                page.drawText(sig.signedBy, { x: xp + (dw - tw) / 2, y: yp - fs / 3, size: fs, font, color: rgb(0, 0, 0) });
            }
            if (sig.hasDate && sig.datePosition) {
                const dp = toRaw(sig.datePosition);
                const dfs = (dp.fontSize || 14) * sy;
                const dy  = ph - (dp.y + dp.height) * sy - (hasName ? fs / 10 : 0) + (dp.height * sy - dfs) / 2;
                page.drawText(sig.dateText || sig.signedDate || '', { x: dp.x * sx + 2, y: dy, size: dfs, font, color: rgb(0, 0, 0) });
            }
        }
        const blob = new Blob([await pdfDoc.save()], { type: 'application/pdf' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a'); a.href = url; a.download = props.pdfTitle || 'SignedDocument.pdf';
        document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (e) { console.error('PDF download failed:', e); alert('Failed to generate PDF.'); }
};

onUnmounted(() => { if (resizeObserver) resizeObserver.disconnect(); });
</script>

<template>
    <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center w-full z-50" @click.self="emit('close')">
        <div class="bg-white rounded-lg shadow-xl w-full max-h-[95vh] flex flex-col mx-2 sm:mx-4 max-w-[98vw] sm:max-w-3xl md:max-w-5xl lg:max-w-7xl">

            <!-- HEADER -->
            <div class="flex items-center justify-between p-3 sm:p-4 border-b flex-shrink-0">
                <div class="flex-1 min-w-0">
                    <h2 class="text-base sm:text-xl font-semibold truncate">View Document</h2>
                    <p class="text-xs sm:text-sm text-gray-600 mt-0.5">Tracking all signers and completed signatures</p>
                </div>
                <button @click="emit('close')" class="p-2 hover:bg-gray-100 rounded-full transition flex-shrink-0 ml-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>

            <!-- BODY -->
            <div class="flex flex-1 overflow-hidden relative">

                <!-- SIDEBAR -->
                <div v-if="showSidebar" class="border-r bg-gray-50 p-3 sm:p-4 overflow-y-auto flex-shrink-0 w-64 sm:w-72 lg:w-80 absolute sm:relative inset-y-0 left-0 z-30 sm:z-auto shadow-xl sm:shadow-none">
                    <div class="flex items-center justify-between mb-3">
                        <h3 class="font-semibold text-sm sm:text-base">Signers</h3>
                        <button @click="showSidebar = false" class="p-1 hover:bg-gray-200 rounded transition">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/></svg>
                        </button>
                    </div>

                    <div v-if="isSequentialOrder()" class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                        <div class="flex items-center gap-2 text-blue-700">
                            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            <span class="text-xs sm:text-sm font-semibold">Sequential Signing</span>
                        </div>
                        <p class="text-xs text-blue-600 mt-1">Signatures completed in order.</p>
                    </div>

                    <div class="bg-white rounded-lg shadow p-3 sm:p-4 mb-4">
                        <h3 class="font-semibold mb-3 text-sm">Signers ({{ getSignerGroups().length }})</h3>
                        <div v-if="!getSignerGroups().length" class="text-xs text-gray-500">No signers assigned.</div>
                        <div v-else class="space-y-2">
                            <div v-for="group in getSignerGroups()" :key="group.emplId || group.name"
                                :class="['border rounded p-2.5', group.status==='signed'?'bg-green-50 border-green-200':group.status==='pending'?'bg-orange-50 border-orange-200':'bg-gray-50 border-gray-300']">
                                <div class="flex items-center gap-2">
                                    <span v-if="isSequentialOrder()" :class="['flex-shrink-0 w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center', group.status==='signed'?'bg-green-500':group.status==='pending'?'bg-orange-500':'bg-gray-400']">{{ group.approvalOrder }}</span>
                                    <span class="inline-block w-3 h-3 rounded flex-shrink-0" :style="{backgroundColor:group.color}"></span>
                                    <span class="font-medium text-xs truncate">{{ group.name }}</span>
                                </div>
                                <div class="flex items-center gap-2 mt-1.5 ml-7">
                                    <span v-if="group.status==='signed'" class="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-semibold">✓ Signed</span>
                                    <span v-else-if="group.status==='pending'" class="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded font-semibold">⏳ Pending</span>
                                    <span v-else class="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded font-semibold">⏸ Waiting</span>
                                    <span class="text-xs text-gray-500">{{ group.signedCount }}/{{ group.signatures.length }}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="bg-white rounded-lg shadow p-3 sm:p-4">
                        <h3 class="font-semibold mb-3 text-sm">Completed ({{ getSignedSignatures().length }})</h3>
                        <div v-if="!getSignedSignatures().length" class="text-xs text-gray-500">No completed signatures.</div>
                        <div v-else class="space-y-1.5 max-h-72 overflow-y-auto">
                            <div v-for="sig in getSignedSignatures()" :key="sig.id" class="p-2 border rounded cursor-pointer hover:border-blue-400 transition active:scale-95" @click="scrollToSignature(sig)">
                                <div class="flex items-center justify-between mb-0.5">
                                    <p class="font-semibold text-xs text-gray-900 flex items-center gap-1.5">
                                        <span class="inline-block w-2.5 h-2.5 rounded" :style="{backgroundColor:sig.color||'#3b82f6'}"></span>
                                        <span class="truncate max-w-[120px]">{{ sig.assignedTo }}</span>
                                        <span v-if="isSequentialOrder()" class="text-[10px] px-1 rounded text-white" :style="{backgroundColor:sig.color||'#3b82f6'}">#{{ sig.approvalOrder }}</span>
                                    </p>
                                    <span class="text-green-600 text-xs font-bold flex-shrink-0">✓</span>
                                </div>
                                <div class="text-[10px] text-gray-500">Pg {{ sig.page }}<span v-if="sig.hasDate" class="text-green-600 ml-1">(+Date)</span></div>
                                <div v-if="sig.signedBy" class="text-[10px] text-gray-700 font-medium">{{ sig.signedBy }}</div>
                                <div v-if="sig.signedDate||sig.datePosition?.dateText" class="text-[10px] text-gray-500">{{ sig.signedDate||sig.datePosition?.dateText }}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Mobile backdrop -->
                <div v-if="showSidebar" class="fixed inset-0 bg-black bg-opacity-20 z-20 sm:hidden" @click="showSidebar=false"></div>

                <!-- Sidebar toggle -->
                <button v-if="!showSidebar" @click="showSidebar=true"
                    class="absolute left-2 top-1/2 -translate-y-1/2 bg-blue-600 text-white p-2 sm:p-3 rounded-lg shadow-xl hover:bg-blue-700 transition z-40 flex flex-col items-center gap-1" title="Show Signers">
                    <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>
                    <div class="flex gap-0.5">
                        <span v-if="getSignedSignatures().length>0" class="bg-green-500 px-1.5 py-0.5 rounded font-bold text-[10px] text-white">{{ getSignedSignatures().length }}</span>
                        <span v-if="getSignerGroups().filter(g=>g.status!=='signed').length>0" class="bg-orange-400 px-1.5 py-0.5 rounded font-bold text-[10px] text-white">{{ getSignerGroups().filter(g=>g.status!=='signed').length }}</span>
                    </div>
                </button>

                <!-- MAIN CONTENT -->
                <div class="flex-1 flex flex-col overflow-hidden">

                    <!-- Pagination + Zoom -->
                    <div class="mt-3 flex items-center justify-center gap-2 sm:gap-3 px-3 flex-wrap flex-shrink-0">
                        <button @click="goToPrevPage" :disabled="currentViewPage===1"
                            class="px-2 py-1.5 sm:px-4 sm:py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1 text-sm">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                            <span class="hidden sm:inline">Previous</span>
                        </button>
                        <span class="text-xs sm:text-sm font-semibold text-gray-700">Page {{ currentViewPage }} / {{ totalPages }}</span>
                        <button @click="goToNextPage" :disabled="currentViewPage===totalPages"
                            class="px-2 py-1.5 sm:px-4 sm:py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1 text-sm">
                            <span class="hidden sm:inline">Next</span>
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                        </button>
                        <div class="flex items-center gap-1">
                            <input type="number" min="1" :max="totalPages" v-model.number="goToPageNumber" @keydown.enter="scrollToPage(goToPageNumber)" class="border rounded px-2 py-1 w-12 sm:w-16 text-xs sm:text-sm text-center"/>
                            <button @click="scrollToPage(goToPageNumber)" class="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 text-xs sm:text-sm">Go</button>
                        </div>
                        <div class="hidden sm:block w-px h-6 bg-gray-300"></div>
                        <!-- Zoom controls -->
                        <div class="flex items-center gap-1 bg-gray-200 rounded-lg p-1">
                            <button @click="zoomOut" :disabled="userZoom<=MIN_ZOOM" class="w-7 h-7 flex items-center justify-center rounded hover:bg-white transition disabled:opacity-40 disabled:cursor-not-allowed font-bold text-gray-700 text-lg leading-none" title="Zoom out">−</button>
                            <button @click="zoomReset" class="px-2 py-0.5 text-xs font-semibold text-gray-700 hover:bg-white rounded transition min-w-[46px] text-center" title="Reset zoom">{{ zoomPercent }}%</button>
                            <button @click="zoomIn" :disabled="userZoom>=MAX_ZOOM" class="w-7 h-7 flex items-center justify-center rounded hover:bg-white transition disabled:opacity-40 disabled:cursor-not-allowed font-bold text-gray-700 text-lg leading-none" title="Zoom in">+</button>
                        </div>
                    </div>

                    <!-- Canvas wrapper -->
                    <div ref="canvasWrapperRef" class="flex-1 overflow-auto p-3 sm:p-6 bg-gray-100 flex justify-center">
                        <div ref="containerRef" class="relative inline-block">
                            <div class="relative border-2 border-gray-400 rounded shadow-lg bg-white">
                                <div class="absolute -top-3 left-3 bg-white px-2 py-0.5 text-xs font-semibold text-gray-600 border rounded">Page {{ currentViewPage }}</div>
                                <canvas v-for="i in totalPages" :key="i" v-show="i===currentViewPage" :ref="el=>{if(el)canvasRefs[i-1]=el}" class="block"></canvas>
                            </div>

                            <!-- Signature overlays -->
                            <template v-for="sig in getCurrentPageSignatures()" :key="sig.id">
                                <div class="absolute pointer-events-none" :style="getBoxVisualStyle(sig)">
                                    <div class="flex flex-col items-center justify-center h-full relative">
                                        <img v-if="sig.imageSrc" :src="sig.imageSrc" alt="Signature" class="w-full h-full object-contain z-10"/>
                                        <span v-else class="text-sm font-bold text-gray-700 italic z-10">[Signature]</span>
                                        <span v-if="sig.showName" class="absolute bottom-0 text-[10px] font-semibold tracking-wide text-center w-full text-gray-700">{{ sig.assignedTo }}</span>
                                    </div>
                                </div>
                                <div v-if="sig.hasDate&&sig.datePosition" class="absolute px-1 py-0.5 text-xs font-semibold rounded pointer-events-none flex items-center justify-center" :style="getDateVisualStyle(sig)">
                                    {{ sig.signedDate||sig.datePosition?.dateText||new Date().toLocaleDateString('en-US') }}
                                </div>
                            </template>
                        </div>
                    </div>
                </div>
            </div>

            <!-- FOOTER -->
            <div class="flex items-center justify-between p-2 sm:p-3 border-t bg-gray-50 flex-shrink-0">
                <div class="text-xs sm:text-sm text-gray-600">
                    {{ getSignedSignatures().length }} completed signature{{ getSignedSignatures().length!==1?'s':'' }}
                    <span v-if="isSequentialOrder()" class="ml-2 text-blue-600 font-semibold hidden sm:inline">• Sequential Signing</span>
                </div>
                <div class="flex gap-2">
                    <button @click="downloadPdf" class="px-3 py-1.5 sm:px-6 sm:py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold text-sm">Download PDF</button>
                    <button @click="emit('close')" class="px-3 py-1.5 sm:px-6 sm:py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold text-sm">Close</button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* No special styles needed — all handled by Tailwind */
</style>