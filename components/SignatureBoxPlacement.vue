<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick, computed } from 'vue';
import draggable from 'vuedraggable';
import {
    getEmployeesForSigner,
    availableApprovers,
    query,
    loading,
} from "~/js/fetchEmployees";

// Props
const props = defineProps({
    isOpen: Boolean,
    pdfFile: File,
    availableUsers: {
        type: Array,
        default: () => []
    },
    existingSignatures: {
        type: Array,
        default: () => []
    },
    freeSign: {
        type: Boolean,
        default: false
    }
});

// Emits
const emit = defineEmits(['close', 'save-signatures']);
const showModal   = ref(false);
const showSidebar = ref(true);
const isZooming   = ref(false);

// ─────────────────────────────────────────────────────────────────────────────
// TUTORIAL SYSTEM
// ─────────────────────────────────────────────────────────────────────────────
const showTutorial    = ref(false);
const tutorialStep    = ref(0);
const tutorialHighlight = ref(null); // { top, left, width, height }

const TUTORIAL_STORAGE_KEY = 'signaturePlacer_tutorialSeen';

// Steps differ between freeSign and normal mode
const tutorialStepsNormal = [
    {
        id: 'welcome',
        title: '👋 Welcome to Signature Placer!',
        body: 'This tool lets you define exactly where each person should sign on a PDF. Let\'s walk through how it works in just a few steps.',
        target: null,
        position: 'center',
    },
    {
        id: 'sidebar-signers',
        title: '👥 Step 1 – Add Signers',
        body: 'First, add the people who need to sign. Click <strong>Assign</strong> inside "New Signature Box" or use the <strong>Signers</strong> panel to pick from the employee directory.',
        target: '.tutorial-target-signers',
        position: 'right',
    },
    {
        id: 'sequential',
        title: '🔢 Step 2 – Set Signing Order (Optional)',
        body: 'Toggle <strong>Enforce Sequential Signer Order</strong> if signatures must happen in a specific sequence — e.g., employee signs first, then manager.',
        target: '.tutorial-target-sequential',
        position: 'right',
    },
    {
        id: 'place-box',
        title: '🖱️ Step 3 – Place Signature Boxes',
        body: 'With a signer selected, <strong>click anywhere on the PDF</strong> to drop a signature box there. You can place multiple boxes for the same person on different pages.',
        target: '.tutorial-target-canvas',
        position: 'left',
    },
    {
        id: 'drag-resize',
        title: '↔️ Step 4 – Drag & Resize',
        body: 'Hover a box to reveal <strong>corner handles</strong> for resizing. <strong>Click and drag</strong> the box body to reposition it anywhere on the page.',
        target: '.tutorial-target-canvas',
        position: 'left',
    },
    {
        id: 'date-field',
        title: '📅 Step 5 – Date Field',
        body: 'Check <strong>Date field</strong> in the form to automatically add a date placeholder below each signature. You can drag it independently.',
        target: '.tutorial-target-newbox',
        position: 'right',
    },
    {
        id: 'signature-lock',
        title: '🔒 Step 6 – Signature Lock',
        body: 'Enable <strong>Signature Lock</strong> to prevent the signer from moving or resizing their signature box after it is placed. The box position becomes fixed — useful when exact placement matters.',
        target: '.tutorial-target-newbox',
        position: 'right',
    },
    {
        id: 'date-lock',
        title: '🔒 Step 7 – Date Lock',
        body: 'Enable <strong>Date Lock</strong> to prevent the signer from repositioning the date field. The date will stay exactly where you placed it on the document.',
        target: '.tutorial-target-newbox',
        position: 'right',
    },
    {
        id: 'show-name',
        title: '🪪 Step 8 – Show Name on Box',
        body: 'Check <strong>Show name on box</strong> to print the signer\'s full name directly beneath their signature when they sign. This is useful for documents that require a legible printed name alongside the signature.',
        target: '.tutorial-target-newbox',
        position: 'right',
    },
    {
        id: 'boxes-list',
        title: '📋 Step 9 – Review Placed Boxes',
        body: 'All placed boxes appear in the <strong>Boxes</strong> list. Click any entry to jump to that box on the PDF. Use 🗑️ to remove it.',
        target: '.tutorial-target-boxeslist',
        position: 'right',
    },
    {
        id: 'save',
        title: '✅ Step 10 – Save',
        body: 'When everything looks good, click <strong>Save Output</strong> to confirm the signature placements and send them to the document workflow.',
        target: '.tutorial-target-save',
        position: 'top',
    },
];

const tutorialStepsFreeSign = [
    {
        id: 'welcome',
        title: '👋 Welcome to Signer Selection!',
        body: 'In this mode you simply choose <em>who</em> needs to sign — the system will automatically place their signature boxes on the last page of the document.',
        target: null,
        position: 'center',
    },
    {
        id: 'add-signer',
        title: '➕ Step 1 – Add Signers',
        body: 'Click <strong>Add Signer from Directory</strong> to search for employees. You can add as many signers as needed.',
        target: '.tutorial-target-free-addbtn',
        position: 'bottom',
    },
    {
        id: 'sequential-free',
        title: '🔢 Step 2 – Sequential Order (Optional)',
        body: 'Enable <strong>Enforce Sequential Signing Order</strong> if signers must complete the document one at a time in the listed order.',
        target: '.tutorial-target-free-sequential',
        position: 'bottom',
    },
    {
        id: 'reorder',
        title: '↕️ Step 3 – Reorder Signers',
        body: 'Drag the <strong>⋮⋮</strong> handle on each signer card to rearrange the signing order. The numbered badge updates automatically.',
        target: '.tutorial-target-free-list',
        position: 'bottom',
    },
    {
        id: 'save-free',
        title: '✅ Step 4 – Save',
        body: 'Happy with your signer list? Click <strong>Save</strong> and the system will handle the rest.',
        target: '.tutorial-target-free-save',
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
    if (!step || !step.target) {
        tutorialHighlight.value = null;
        return;
    }
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
    if (tutorialStep.value > 0) {
        tutorialStep.value--;
        await updateHighlight();
    }
};

const endTutorial = () => {
    showTutorial.value      = false;
    tutorialHighlight.value = null;
    try { localStorage.setItem(TUTORIAL_STORAGE_KEY, '1'); } catch (_) {}
};

const startTutorial = async () => {
    tutorialStep.value = 0;
    showTutorial.value = true;
    await updateHighlight();
};

// Tooltip positioning
const tooltipStyle = computed(() => {
    const step = currentTutorialStep.value;
    if (!step) return {};
    if (!step.target || step.position === 'center') {
        return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 10001 };
    }
    const h = tutorialHighlight.value;
    if (!h) return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 10001 };

    const TW = 340; // tooltip width approx
    const TH = 180;
    const GAP = 16;

    if (step.position === 'right') {
        return { position: 'fixed', top: `${Math.max(8, h.top)}px`, left: `${h.left + h.width + GAP}px`, width: `${TW}px`, zIndex: 10001 };
    }
    if (step.position === 'left') {
        return { position: 'fixed', top: `${Math.max(8, h.top)}px`, left: `${h.left - TW - GAP}px`, width: `${TW}px`, zIndex: 10001 };
    }
    if (step.position === 'top') {
        return { position: 'fixed', top: `${h.top - TH - GAP}px`, left: `${Math.max(8, h.left + h.width / 2 - TW / 2)}px`, width: `${TW}px`, zIndex: 10001 };
    }
    // bottom
    return { position: 'fixed', top: `${h.top + h.height + GAP}px`, left: `${Math.max(8, h.left + h.width / 2 - TW / 2)}px`, width: `${TW}px`, zIndex: 10001 };
});

// ─────────────────────────────────────────────────────────────────────────────
// Scale constants
// ─────────────────────────────────────────────────────────────────────────────
const BASE_SCALE  = 1.4;
const renderScale = ref(BASE_SCALE);

const getInitials = (fullName) => {
    if (!fullName) return '';
    const parts = fullName.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return parts[0].charAt(0).toUpperCase() + parts[parts.length - 1].charAt(0).toUpperCase();
};

const userZoom    = ref(1.0);
const MIN_ZOOM    = 0.5;
const MAX_ZOOM    = 3.0;
const ZOOM_STEP   = 0.25;
const zoomPercent = computed(() => Math.round(userZoom.value * 100));

const displayScale = computed(() => renderScale.value * userZoom.value);
const scaleFactor  = computed(() => displayScale.value / BASE_SCALE);

const zoomIn    = async () => { userZoom.value = Math.min(MAX_ZOOM, +(userZoom.value + ZOOM_STEP).toFixed(2)); await applyZoom(); };
const zoomOut   = async () => { userZoom.value = Math.max(MIN_ZOOM, +(userZoom.value - ZOOM_STEP).toFixed(2)); await applyZoom(); };
const zoomReset = async () => { userZoom.value = 1.0; await applyZoom(); };

const applyZoom = async () => {
    isZooming.value = true;
    try {
        for (let i = 1; i <= totalPages.value; i++) await renderPage(i);
        await nextTick();
        signatureBoxes.value = signatureBoxes.value.map(b => ({ ...b }));
    } finally {
        isZooming.value = false;
    }
};

const sc = (val) => val * scaleFactor.value;

// Refs
const containerRef     = ref(null);
const canvasWrapperRef = ref(null);
const pdfDocument      = ref(null);
const canvasRefs       = ref([]);
const totalPages       = ref(0);
const currentViewPage  = ref(1);

const signatureBoxes = ref([]);

const isDragging     = ref(false);
const isResizing     = ref(false);
const dragStart      = ref({ x: 0, y: 0, boxX: 0, boxY: 0, boxWidth: 0, boxHeight: 0 });
const dragOffset     = ref({ x: 0, y: 0 });
const resizeHandle   = ref(null);
const dragTargetType = ref(null);

const selectedBoxId  = ref(null);
const goToPageNumber = ref(1);

const signers         = ref([]);
const activeSignerKey = ref(null);

const enforceSequentialOrder = ref(false);

const MAX_SIG_WIDTH  = 250;
const MAX_SIG_HEIGHT = 100;

// Convert HEX to RGBA
const hexToRgba = (hex, alpha = 0.2) => {
  const cleaned = hex.replace('#', '');
  const bigint = parseInt(cleaned, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Generate visually distinct color using golden angle
const generateUniqueColor = (index) => {
  const goldenAngle = 137.508;
  const hue = (index * goldenAngle) % 360;
  return `hsl(${hue}, 65%, 55%)`;
};

const colorPalette = [
  '#303030', '#10b981', '#f59e0b', '#ef4444'
];

const getNextColor = () => {
  const usedColors = new Set(signers.value.map(s => s.color).filter(Boolean));
  for (const color of colorPalette) {
    if (!usedColors.has(color)) return color;
  }
  const index = signers.value.length;
  return generateUniqueColor(index);
};

const findSigner = (emplId, name) =>
    signers.value.find(s => (emplId && s.emplId === emplId) || (name && s.name === name));

const getNextApprovalOrder = () => {
    if (signers.value.length === 0) return 1;
    return Math.max(...signers.value.map(s => Number(s.approvalOrder || 0))) + 1;
};

const upsertSigner = ({ name, emplId, approvalOrder, color }) => {
    if (!name && !emplId) return null;
    let s = findSigner(emplId, name);
    if (!s) {
        s = {
            name,
            emplId:        emplId || null,
            color:         color != null ? color : getNextColor(),
            approvalOrder: Number(approvalOrder != null ? approvalOrder : getNextApprovalOrder()),
        };
        signers.value.push(s);
    } else if (approvalOrder != null) {
        s.approvalOrder = Number(approvalOrder);
    }
    return s;
};

const setActiveSigner = (signer) => {
    newBoxForm.value.assignedTo      = signer.name;
    newBoxForm.value.assignedEmplId  = signer.emplId || '';
    newBoxForm.value.assignedColor   = signer.color;
    activeSignerKey.value            = signer.emplId || signer.name;
    showAddForm.value                = true;
};

const moveSignerUp   = (index) => { if (index === 0) return; [signers.value[index], signers.value[index - 1]] = [signers.value[index - 1], signers.value[index]]; updateApprovalOrderFromList(); };
const moveSignerDown = (index) => { if (index === signers.value.length - 1) return; [signers.value[index], signers.value[index + 1]] = [signers.value[index + 1], signers.value[index]]; updateApprovalOrderFromList(); };

const removeSigner = (index) => {
    if (!props.freeSign) {
        const signer   = signers.value[index];
        const hasBoxes = signatureBoxes.value.some(b => b.assignedEmplId === signer.emplId || b.assignedTo === signer.name);
        if (hasBoxes) {
            alert('Cannot remove this signer as they have signature boxes assigned. Please delete those boxes first.');
            return;
        }
    }
    signers.value.splice(index, 1);
    updateApprovalOrderFromList();
};

const updateApprovalOrderFromList = () => {
    if (!enforceSequentialOrder.value) return;
    signers.value.forEach((s, i) => { s.approvalOrder = i + 1; });
    signatureBoxes.value.forEach(box => {
        const s = findSigner(box.assignedEmplId, box.assignedTo);
        if (s) box.approvalOrder = Number(s.approvalOrder);
    });
};

const onSignersDragEnd = () => { updateApprovalOrderFromList(); };

// New box form
const showAddForm = ref(true);
const newBoxForm  = ref({
    assignedTo: '', hasDate: false, dateOffset: 5, assignedEmplId: '',
    assignedColor: undefined, signatureWidth: 200, signatureHeight: 60,
    signatureLock: false, dateLock: false, dateWidth: 100, dateHeight: 30, showName: false,
});

// Directory keyboard navigation
const approverIndex   = ref(-1);
const scrollContainer = ref(null);

const moveDown = () => {
    if (!Array.isArray(availableApprovers.value)) return;
    approverIndex.value = Math.min(approverIndex.value + 1, availableApprovers.value.length - 1);
    nextTick(() => { scrollContainer.value?.querySelectorAll('[data-approver]')[approverIndex.value]?.scrollIntoView({ block: 'nearest' }); });
};
const moveUp = () => {
    if (!Array.isArray(availableApprovers.value)) return;
    approverIndex.value = Math.max(approverIndex.value - 1, 0);
    nextTick(() => { scrollContainer.value?.querySelectorAll('[data-approver]')[approverIndex.value]?.scrollIntoView({ block: 'nearest' }); });
};

const handleAssignUser = async () => { showModal.value = true; await getEmployeesForSigner(); };
const handleEnterKey   = async () => { await getEmployeesForSigner(); };

const resetForm = () => {
    query.value.search       = '';
    availableApprovers.value = null;
    approverIndex.value      = -1;
    newBoxForm.value = {
        assignedTo: '', hasDate: true, dateOffset: 5, assignedEmplId: '',
        assignedColor: undefined, signatureWidth: 200, signatureHeight: 60,
        signatureLock: false, dateLock: false, dateWidth: 100, dateHeight: 30, showName: false,
    };
};

const cancelButton = async () => {
    showModal.value = false;
    resetForm();
};

const formatUserName = (user) => {
    if (!user) return '';
    if (user.employeename2 && user.employeename1) return `${user.employeename2}, ${user.employeename1}`;
    return user.employeename2 || user.employeename1 || user.name || 'Unknown User';
};

const selectUser = (user) => {
    const displayName = formatUserName(user);
    const signer      = upsertSigner({ name: displayName, emplId: user.emplId, color: user.color });
    if (signer && !props.freeSign) setActiveSigner(signer);
    showModal.value = false;
    query.value.search       = '';
    availableApprovers.value = null;
};

const scrollToPage = (pageNum) => { if (pageNum >= 1 && pageNum <= totalPages.value) currentViewPage.value = pageNum; };

const generateId = () => `sig_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

watch(currentViewPage, async () => {
    await nextTick();
    signatureBoxes.value = signatureBoxes.value.map(b => ({ ...b }));
});

// ─────────────────────────────────────────────────────────────────────────────
// ResizeObserver
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

            const PADDING  = 48;
            const usable   = availableWidth - PADDING;

            const newScale = usable < naturalWidth
                ? Math.max(0.4, (usable / naturalWidth) * BASE_SCALE)
                : BASE_SCALE;

            if (Math.abs(newScale - renderScale.value) > 0.01) {
                renderScale.value = newScale;
                for (let i = 1; i <= totalPages.value; i++) await renderPage(i);
                await nextTick();
                signatureBoxes.value = signatureBoxes.value.map(b => ({ ...b }));
            }
        }
    });

    resizeObserver.observe(canvasWrapperRef.value);
};

// ─────────────────────────────────────────────────────────────────────────────
// Load PDF and data
// ─────────────────────────────────────────────────────────────────────────────
watch(() => props.isOpen, async (newVal) => {
    if (newVal) {
        signers.value            = [];
        signatureBoxes.value     = [];
        enforceSequentialOrder.value = false;

        if (!props.freeSign && props.pdfFile) {
            await loadPdf();
        }

        if (props.existingSignatures && props.existingSignatures.length > 0) {
            for (const sig of props.existingSignatures) {
                upsertSigner({ name: sig.assignedTo, emplId: sig.assignedEmplId, approvalOrder: sig.approvalOrder, color: sig.color });
            }
            signers.value.sort((a, b) => Number(a.approvalOrder || 0) - Number(b.approvalOrder || 0));

            if (!props.freeSign) {
                const seenIds = new Set();
                const boxes   = props.existingSignatures.map(sig => {
                    let safeId = sig.id;
                    if (!safeId || seenIds.has(safeId)) safeId = generateId();
                    seenIds.add(safeId);
                    const s = findSigner(sig.assignedEmplId, sig.assignedTo);
                    return {
                        ...sig,
                        hasDate:       sig.hasDate === true || (sig.datePosition !== null && sig.datePosition !== undefined),
                        id:            safeId,
                        color:         sig.color || s?.color || getNextColor(),
                        signatureLock: sig.signatureLock ?? true,
                        dateLock:      sig.dateLock ?? true,
                        approvalOrder: Number(sig.approvalOrder ?? s?.approvalOrder ?? 1),
                    };
                });
                boxes.sort((a, b) => Number(a.approvalOrder || 0) - Number(b.approvalOrder || 0));
                signatureBoxes.value = boxes;
            }

            if (props.existingSignatures.some(sig => sig.enforceSequentialOrder)) {
                enforceSequentialOrder.value = true;
            }
        }

        if (!props.freeSign && props.availableUsers.length > 0 && signers.value.length === 0) {
            const first = props.availableUsers[0];
            let signer;
            if (typeof first === 'string') {
                signer = upsertSigner({ name: first, emplId: null });
            } else if (first && typeof first === 'object') {
                signer = upsertSigner({ name: formatUserName(first), emplId: first.emplId });
            }
            if (signer) setActiveSigner(signer);
        }

        // Auto-show tutorial on first open
        await nextTick();
        try {
            const seen = localStorage.getItem(TUTORIAL_STORAGE_KEY);
            if (!seen) startTutorial();
        } catch (_) {
            startTutorial();
        }
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// PDF loading / rendering
// ─────────────────────────────────────────────────────────────────────────────
const loadPdf = async () => {
    try {
        const pdfjsLib    = window['pdfjs-dist/build/pdf'];
        const arrayBuffer = await props.pdfFile.arrayBuffer();
        const pdf         = await pdfjsLib.getDocument(arrayBuffer).promise;
        pdfDocument.value = pdf;
        totalPages.value  = pdf.numPages;
        canvasRefs.value  = [];
        await nextTick();
        await nextTick();
        setupResizeObserver();
        for (let i = 1; i <= pdf.numPages; i++) await renderPage(i);
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
        const ctx      = canvas.getContext('2d');
        canvas.width   = viewport.width;
        canvas.height  = viewport.height;

        const renderTask = page.render({ canvasContext: ctx, viewport });
        renderTasks[pageNum] = renderTask;
        await renderTask.promise;
        renderTasks[pageNum] = null;
    } catch (error) {
        if (error?.name === 'RenderingCancelledException') return;
        console.error('Error rendering page:', error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Position helpers
// ─────────────────────────────────────────────────────────────────────────────
const getBoxStyle = (box) => {
    const canvas = canvasRefs.value[box.page - 1];
    if (!canvas || !containerRef.value) return {};
    const canvasRect    = canvas.getBoundingClientRect();
    const containerRect = containerRef.value.getBoundingClientRect();
    return {
        left:   (canvasRect.left - containerRect.left + sc(box.x))  + 'px',
        top:    (canvasRect.top  - containerRect.top  + sc(box.y))  + 'px',
        width:  sc(box.width)  + 'px',
        height: sc(box.height) + 'px',
    };
};

const getDateStyle = (box) => {
    if (!box.datePosition) return {};
    const canvas = canvasRefs.value[box.page - 1];
    if (!canvas || !containerRef.value) return {};
    const canvasRect    = canvas.getBoundingClientRect();
    const containerRect = containerRef.value.getBoundingClientRect();
    return {
        left:   (canvasRect.left - containerRect.left + sc(box.datePosition.x))             + 'px',
        top:    (canvasRect.top  - containerRect.top  + sc(box.datePosition.y))             + 'px',
        width:  sc(box.datePosition.width  || 100) + 'px',
        height: sc(box.datePosition.height || 30)  + 'px',
    };
};

const getBoxVisualStyle = (box) => {
    const base     = getBoxStyle(box);
    const color    = box.color || '#3b82f6';
    const selected = selectedBoxId.value === box.id;
    const isBeingDragged = isDragging.value && selectedBoxId.value === box.id && dragTargetType.value === 'box';
    const bgAlpha  = box.isEmpty ? (selected ? 0.3 : 0.2) : 0;

    if (isBeingDragged) {
        return { ...base, borderColor: color, borderWidth: '3px', backgroundColor: hexToRgba(color, 0.35), boxShadow: `0 0 0 5px ${hexToRgba(color, 0.4)}, 0 8px 16px ${hexToRgba(color, 0.6)}, 0 12px 24px rgba(0,0,0,0.3)`, outline: `3px solid ${color}`, outlineOffset: '3px', transform: 'scale(1.02)', zIndex: 100 };
    }

    return {
        ...base,
        borderColor:     color,
        borderWidth:     selected ? '3px' : '2px',
        backgroundColor: bgAlpha ? hexToRgba(color, bgAlpha) : 'transparent',
        boxShadow:       selected ? `0 0 0 4px ${hexToRgba(color, 0.3)}, 0 4px 8px ${hexToRgba(color, 0.5)}` : `0 2px 6px ${hexToRgba(color, 0.5)}`,
        outline:         selected ? `2px solid ${color}` : 'none',
        outlineOffset:   selected ? '2px' : '0',
    };
};

const getDateVisualStyle = (box) => {
    const base     = getDateStyle(box);
    const color    = box.color || '#3b82f6';
    const selected = selectedBoxId.value === box.id;
    const isBeingDragged = isDragging.value && selectedBoxId.value === box.id && dragTargetType.value === 'date';

    if (!box.signedDate && !box.signedBy) {
        if (isBeingDragged) {
            return { ...base, borderColor: color, borderWidth: '2px', color, backgroundColor: hexToRgba(color, 0.25), boxShadow: `0 0 0 4px ${hexToRgba(color, 0.3)}, 0 6px 12px ${hexToRgba(color, 0.5)}, 0 8px 16px rgba(0,0,0,0.2)`, transform: 'scale(1.05)', zIndex: 100 };
        }
        return { ...base, borderColor: color, borderWidth: selected ? '2px' : '1px', color, backgroundColor: hexToRgba(color, 0.15), boxShadow: selected ? `0 0 0 3px ${hexToRgba(color, 0.2)}` : `0 1px 3px ${hexToRgba(color, 0.3)}` };
    }
    return { ...base, borderColor: '#36454F', borderWidth: '1px', color: '#36454F' };
};

// ─────────────────────────────────────────────────────────────────────────────
// Click-to-place
// ─────────────────────────────────────────────────────────────────────────────
const placeSignatureOnClick = (e) => {
    if (e.target.closest('.draggable-item')) return;

    if (!showAddForm.value || !newBoxForm.value.assignedTo) {
        alert('Please select a user to assign the signature to first!');
        showAddForm.value = true;
        return;
    }

    const canvas     = canvasRefs.value[currentViewPage.value - 1];
    const canvasRect = canvas.getBoundingClientRect();

    const rawX = (e.clientX - canvasRect.left) / scaleFactor.value;
    const rawY = (e.clientY - canvasRect.top)  / scaleFactor.value;

    const canvasW = canvas.width  / scaleFactor.value;
    const canvasH = canvas.height / scaleFactor.value;

    const sigW = Math.max(20, Number(newBoxForm.value.signatureWidth  || 0));
    const sigH = Math.max(20, Number(newBoxForm.value.signatureHeight || 0));

    const x = Math.max(0, Math.min(rawX, canvasW - sigW));
    const y = Math.max(0, Math.min(rawY, canvasH - sigH));

    const signer      = findSigner(newBoxForm.value.assignedEmplId, newBoxForm.value.assignedTo);
    const signerColor = newBoxForm.value.assignedColor || signer?.color || getNextColor();

    const box = {
        id:             generateId(),
        assignedTo:     newBoxForm.value.assignedTo,
        assignedEmplId: newBoxForm.value.assignedEmplId,
        page:           currentViewPage.value,
        x,
        y,
        width:          sigW,
        height:         sigH,
        hasDate:        newBoxForm.value.hasDate,
        isEmpty:        true,
        datePosition:   null,
        color:          signerColor,
        showName:       newBoxForm.value.showName,
        signatureLock:  !!newBoxForm.value.signatureLock,
        dateLock:       !!newBoxForm.value.dateLock,
        approvalOrder:  Number(signer?.approvalOrder || 1),
    };

    if (box.hasDate) {
        const dateW  = Math.max(30, Number(newBoxForm.value.dateWidth  || 0));
        const dateH  = Math.max(16, Number(newBoxForm.value.dateHeight || 0));
        const offset = Math.max(0,  Number(newBoxForm.value.dateOffset || 0));
        box.datePosition = {
            x:      Math.max(0, Math.min(box.x,               canvasW - dateW)),
            y:      Math.max(0, Math.min(box.y + box.height + offset, canvasH - dateH)),
            width:  dateW,
            height: dateH,
        };
    }

    signatureBoxes.value.push(box);
    selectedBoxId.value = box.id;
};

// ─────────────────────────────────────────────────────────────────────────────
// Drag
// ─────────────────────────────────────────────────────────────────────────────
const startDragging = (e, id, type = 'box') => {
    e.stopPropagation();
    const box = signatureBoxes.value.find(b => b.id === id);
    if (!box) return;
    selectedBoxId.value = id;
    if (box.isEmpty === false) return;

    isDragging.value     = true;
    dragTargetType.value = type;

    const canvasRect = canvasRefs.value[box.page - 1].getBoundingClientRect();

    if (type === 'box') {
        dragOffset.value = {
            x: (e.clientX - canvasRect.left) / scaleFactor.value - box.x,
            y: (e.clientY - canvasRect.top)  / scaleFactor.value - box.y,
        };
    } else if (type === 'date' && box.datePosition) {
        dragOffset.value = {
            x: (e.clientX - canvasRect.left) / scaleFactor.value - box.datePosition.x,
            y: (e.clientY - canvasRect.top)  / scaleFactor.value - box.datePosition.y,
        };
    }
};

const dragBox = (e) => {
    if (!isDragging.value || !selectedBoxId.value) return;
    const box = signatureBoxes.value.find(b => b.id === selectedBoxId.value);
    if (!box || box.page !== currentViewPage.value) return;

    const canvas     = canvasRefs.value[box.page - 1];
    const canvasRect = canvas.getBoundingClientRect();

    const rawX    = (e.clientX - canvasRect.left) / scaleFactor.value;
    const rawY    = (e.clientY - canvasRect.top)  / scaleFactor.value;
    const canvasW = canvas.width  / scaleFactor.value;
    const canvasH = canvas.height / scaleFactor.value;

    if (dragTargetType.value === 'box') {
        const oldX = box.x, oldY = box.y;
        box.x = Math.max(0, Math.min(rawX - dragOffset.value.x, canvasW - box.width));
        box.y = Math.max(0, Math.min(rawY - dragOffset.value.y, canvasH - box.height));

        if (box.hasDate && box.datePosition) {
            const dx = box.x - oldX, dy = box.y - oldY;
            box.datePosition.x = Math.max(0, Math.min(box.datePosition.x + dx, canvasW - (box.datePosition.width  || 100)));
            box.datePosition.y = Math.max(0, Math.min(box.datePosition.y + dy, canvasH - (box.datePosition.height || 30)));
        }
    } else if (dragTargetType.value === 'date' && box.datePosition) {
        box.datePosition.x = Math.max(0, Math.min(rawX - dragOffset.value.x, canvasW - box.datePosition.width));
        box.datePosition.y = Math.max(0, Math.min(rawY - dragOffset.value.y, canvasH - box.datePosition.height));
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Resize
// ─────────────────────────────────────────────────────────────────────────────
const startResizing = (e, id, handle) => {
    e.stopPropagation();
    const box = signatureBoxes.value.find(b => b.id === id);
    if (!box || box.isEmpty === false || box.signatureLock) return;

    isResizing.value    = true;
    selectedBoxId.value = id;
    resizeHandle.value  = handle;

    const canvasRect = canvasRefs.value[box.page - 1].getBoundingClientRect();
    dragStart.value  = {
        x:         (e.clientX - canvasRect.left) / scaleFactor.value,
        y:         (e.clientY - canvasRect.top)  / scaleFactor.value,
        boxX:      box.x,
        boxY:      box.y,
        boxWidth:  box.width,
        boxHeight: box.height,
    };
};

const resizeBox = (e) => {
    if (!isResizing.value || !selectedBoxId.value) return;
    const box = signatureBoxes.value.find(b => b.id === selectedBoxId.value);
    if (!box || box.page !== currentViewPage.value) return;

    const canvas     = canvasRefs.value[box.page - 1];
    const canvasRect = canvas.getBoundingClientRect();
    const canvasW    = canvas.width  / scaleFactor.value;
    const canvasH    = canvas.height / scaleFactor.value;

    const curX = (e.clientX - canvasRect.left) / scaleFactor.value;
    const curY = (e.clientY - canvasRect.top)  / scaleFactor.value;
    const dx   = curX - dragStart.value.x;
    const dy   = curY - dragStart.value.y;

    switch (resizeHandle.value) {
        case 'se':
            box.width  = Math.min(MAX_SIG_WIDTH,  Math.min(Math.max(50, dragStart.value.boxWidth  + dx), canvasW - box.x));
            box.height = Math.min(MAX_SIG_HEIGHT, Math.min(Math.max(30, dragStart.value.boxHeight + dy), canvasH - box.y));
            break;
        case 'sw':
            box.width  = Math.min(MAX_SIG_WIDTH,  Math.min(Math.max(50, dragStart.value.boxWidth  - dx), dragStart.value.boxX + dragStart.value.boxWidth));
            box.height = Math.min(MAX_SIG_HEIGHT, Math.min(Math.max(30, dragStart.value.boxHeight + dy), canvasH - box.y));
            box.x      = dragStart.value.boxX + (dragStart.value.boxWidth - box.width);
            break;
        case 'ne':
            box.width  = Math.min(MAX_SIG_WIDTH,  Math.min(Math.max(50, dragStart.value.boxWidth  + dx), canvasW - box.x));
            box.height = Math.min(MAX_SIG_HEIGHT, Math.min(Math.max(30, dragStart.value.boxHeight - dy), dragStart.value.boxY + dragStart.value.boxHeight));
            box.y      = dragStart.value.boxY + (dragStart.value.boxHeight - box.height);
            break;
        case 'nw':
            box.width  = Math.min(MAX_SIG_WIDTH,  Math.min(Math.max(50, dragStart.value.boxWidth  - dx), dragStart.value.boxX + dragStart.value.boxWidth));
            box.height = Math.min(MAX_SIG_HEIGHT, Math.min(Math.max(30, dragStart.value.boxHeight - dy), dragStart.value.boxY + dragStart.value.boxHeight));
            box.x      = dragStart.value.boxX + (dragStart.value.boxWidth  - box.width);
            box.y      = dragStart.value.boxY + (dragStart.value.boxHeight - box.height);
            break;
    }

    if (box.hasDate && box.datePosition) {
        box.datePosition.x = Math.max(0, Math.min(box.datePosition.x, canvasW - (box.datePosition.width  || 100)));
        box.datePosition.y = Math.max(0, Math.min(box.datePosition.y, canvasH - (box.datePosition.height || 30)));
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Mouse handlers
// ─────────────────────────────────────────────────────────────────────────────
const handleMouseUp = () => {
    isDragging.value     = false;
    isResizing.value     = false;
    resizeHandle.value   = null;
    dragTargetType.value = null;
};

const handleMouseMove = (e) => {
    if (isDragging.value)       dragBox(e);
    else if (isResizing.value)  resizeBox(e);
};

const deleteBox = (index) => {
    if (selectedBoxId.value === signatureBoxes.value[index].id) selectedBoxId.value = null;
    signatureBoxes.value.splice(index, 1);
};

const deleteBoxById = (id) => {
    const index = signatureBoxes.value.findIndex(b => b.id === id);
    if (index !== -1) deleteBox(index);
};

const getCurrentPageBoxes = () => signatureBoxes.value.filter(b => b.page === currentViewPage.value);

const goToNextPage = () => { if (currentViewPage.value < totalPages.value) currentViewPage.value++; };
const goToPrevPage = () => { if (currentViewPage.value > 1) currentViewPage.value--; };

const selectAndScrollToBox = async (box) => {
    selectedBoxId.value   = box.id;
    currentViewPage.value = box.page;
    await nextTick();
    if (containerRef.value?.parentElement) {
        const el = containerRef.value.parentElement;
        el.scrollTo({ top: Math.max(0, sc(box.y) - el.clientHeight / 2 + sc(box.height) / 2), behavior: 'smooth' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Save
// ─────────────────────────────────────────────────────────────────────────────
const saveSignatures = () => {
    if (props.freeSign) {
        if (signers.value.length === 0) { alert('Please add at least one signer!'); return; }

        const CANVAS_W  = 595;
        const CANVAS_H  = 842;
        const SIG_W     = 160;
        const SIG_H     = 60;
        const DATE_W    = 120;
        const DATE_H    = 28;
        const DATE_GAP  = 6;
        const MARGIN_X  = 20;
        const MARGIN_B  = 20;
        const GAP_X     = 16;

        const total      = signers.value.length;
        const totalWidth = total * SIG_W + (total - 1) * GAP_X;
        let   startX     = Math.max(MARGIN_X, (CANVAS_W - totalWidth) / 2);
        const dateY      = CANVAS_H - MARGIN_B - DATE_H;
        const sigY       = dateY - DATE_GAP - SIG_H;

        const formattedData = signers.value.map((signer) => {
            const x   = startX;
            startX   += SIG_W + GAP_X;
            const pdfLibY = Math.round(CANVAS_H - sigY - SIG_H);

            return {
                id:             generateId(),
                assignedTo:     signer.name,
                assignedEmplId: signer.emplId || '',
                page:           -1,
                x:              Math.round(x),
                y:              Math.round(sigY),
                width:          SIG_W,
                height:         SIG_H,
                canvasWidth:    CANVAS_W,
                canvasHeight:   CANVAS_H,
                pdfLibY,
                imageSrc:       null,
                isEmpty:        true,
                signedBy:       null,
                hasDate:        false,
                datePosition: {
                    x:            Math.round(x),
                    y:            Math.round(dateY),
                    width:        DATE_W,
                    height:       DATE_H,
                    canvasWidth:  CANVAS_W,
                    canvasHeight: CANVAS_H,
                    dateText:     new Date().toLocaleDateString('en-US'),
                },
                showName:               false,
                color:                  signer.color,
                signatureLock:          false,
                dateLock:               false,
                approvalOrder:          Number(signer.approvalOrder || 1),
                enforceSequentialOrder: enforceSequentialOrder.value,
                freeSign:               true,
            };
        });

        emit('save-signatures', formattedData);
        emit('close');
        resetForm();
        return;
    }

    if (signatureBoxes.value.length === 0) { alert('Please add at least one signature box!'); return; }

    const formattedData = signatureBoxes.value.map(box => {
        const canvas = canvasRefs.value[box.page - 1];
        if (!canvas) return null;

        const canvasW = canvas.width  / scaleFactor.value;
        const canvasH = canvas.height / scaleFactor.value;
        const pdfLibY = Math.round(canvasH - box.y - box.height);

        let dateObj = null;
        if (box.hasDate && box.datePosition) {
            dateObj = {
                x:            Math.round(box.datePosition.x),
                y:            Math.round(box.datePosition.y),
                width:        Math.round(box.datePosition.width  || 100),
                height:       Math.round(box.datePosition.height || 30),
                canvasWidth:  Math.round(canvasW),
                canvasHeight: Math.round(canvasH),
                dateText:     new Date().toLocaleDateString('en-US'),
            };
        }

        const existing = props.existingSignatures?.find(sig => sig.id === box.id);
        const signer   = findSigner(box.assignedEmplId, box.assignedTo);

        return {
            id:             box.id,
            assignedTo:     box.assignedTo,
            assignedEmplId: box.assignedEmplId,
            page:           box.page,
            x:              Math.round(box.x),
            y:              Math.round(box.y),
            width:          Math.round(box.width),
            height:         Math.round(box.height),
            canvasWidth:    Math.round(canvasW),
            canvasHeight:   Math.round(canvasH),
            pdfLibY,
            imageSrc:       existing?.imageSrc  || box.imageSrc  || null,
            isEmpty:        existing?.isEmpty   ?? box.isEmpty   ?? true,
            signedBy:       existing?.signedBy  || box.signedBy  || null,
            hasDate:        box.hasDate,
            datePosition:   dateObj,
            showName:       box.showName,
            color:          box.color || signer?.color || null,
            signatureLock:  !!box.signatureLock,
            dateLock:       !!box.dateLock,
            approvalOrder:  Number(box.approvalOrder || signer?.approvalOrder || 1),
            enforceSequentialOrder: enforceSequentialOrder.value,
        };
    }).filter(Boolean);

    emit('save-signatures', formattedData);
    emit('close');
    resetForm();
};

onMounted(() => {
    document.addEventListener('mouseup',  handleMouseUp);
    window.addEventListener('resize',     () => signatureBoxes.value = signatureBoxes.value.map(b => ({ ...b })));
});

onUnmounted(() => {
    if (resizeObserver) resizeObserver.disconnect();
    document.removeEventListener('mouseup', handleMouseUp);
});
</script>

<template>
  <div v-if="isOpen"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center w-full z-50"
    @click.self="emit('close')">

    <!-- ═══════════════════════════════════════════════════════════════════════
         TUTORIAL OVERLAY
         ═══════════════════════════════════════════════════════════════════════ -->
    <teleport to="body">
      <template v-if="showTutorial">
        <!-- Dim backdrop -->
        <div class="fixed inset-0 bg-black bg-opacity-40 z-[9998] pointer-events-none"></div>

        <!-- Spotlight cutout -->
        <div v-if="tutorialHighlight"
          class="fixed z-[9999] pointer-events-none rounded-lg ring-4 ring-white ring-opacity-80 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
          :style="{
            top:    tutorialHighlight.top  + 'px',
            left:   tutorialHighlight.left + 'px',
            width:  tutorialHighlight.width  + 'px',
            height: tutorialHighlight.height + 'px',
          }"></div>

        <!-- Tooltip card -->
        <div :style="tooltipStyle"
          class="bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 pointer-events-auto"
          style="min-width:280px; max-width:340px;">

          <!-- Progress dots -->
          <div class="flex items-center gap-1.5 mb-3">
            <span v-for="(_, i) in tutorialSteps" :key="i"
              class="block rounded-full transition-all duration-300"
              :class="i === tutorialStep
                ? 'w-4 h-2 bg-blue-600'
                : i < tutorialStep
                  ? 'w-2 h-2 bg-blue-300'
                  : 'w-2 h-2 bg-gray-200'">
            </span>
            <span class="ml-auto text-[11px] text-gray-400 font-medium">
              {{ tutorialStep + 1 }} / {{ tutorialSteps.length }}
            </span>
          </div>

          <!-- Content -->
          <h4 class="font-bold text-gray-900 text-sm mb-1.5" v-if="currentTutorialStep">
            {{ currentTutorialStep.title }}
          </h4>
          <p class="text-xs text-gray-600 leading-relaxed" v-if="currentTutorialStep"
            v-html="currentTutorialStep.body"></p>

          <!-- Actions -->
          <div class="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
            <button @click="endTutorial"
              class="text-xs text-gray-400 hover:text-gray-600 transition underline underline-offset-2">
              Skip tutorial
            </button>
            <div class="flex gap-2">
              <button v-if="tutorialStep > 0" @click="tutorialPrev"
                class="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition text-gray-600 font-medium">
                ← Back
              </button>
              <button @click="tutorialNext"
                class="px-4 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold shadow-sm">
                {{ tutorialStep === tutorialSteps.length - 1 ? '🎉 Done' : 'Next →' }}
              </button>
            </div>
          </div>
        </div>
      </template>
    </teleport>

    <!-- ═══════════════════════════════════════════════════════════════════════
         FREE SIGN MODE
         ═══════════════════════════════════════════════════════════════════════ -->
    <div v-if="freeSign"
      class="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 flex flex-col max-h-[90vh]">

      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b">
        <div>
          <h2 class="text-lg font-bold text-gray-800">Select Signers</h2>
          <p class="text-xs text-gray-400 mt-0.5">Add everyone who needs to sign this document.</p>
        </div>
        <div class="flex items-center gap-2">
          <!-- Tutorial trigger button -->
          <button @click="startTutorial" title="How to use"
            class="p-2 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 transition text-sm font-bold">
            ?
          </button>
          <button @click="emit('close')"
            class="p-2 hover:bg-gray-100 rounded-full transition text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto px-6 py-5 space-y-4">

        <!-- Sequential toggle -->
        <div class="tutorial-target-free-sequential flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <div class="flex items-center gap-2.5">
            <input type="checkbox" v-model="enforceSequentialOrder" id="seqFree"
              class="rounded w-4 h-4 accent-blue-600"/>
            <label for="seqFree" class="text-sm font-semibold text-gray-700 cursor-pointer">
              Enforce Sequential Signing Order
            </label>
          </div>
          <span v-if="enforceSequentialOrder"
            class="text-xs bg-blue-600 text-white px-2.5 py-0.5 rounded-full font-semibold tracking-wide">
            ON
          </span>
        </div>

        <!-- Add signer button -->
        <button @click="handleAssignUser"
          class="tutorial-target-free-addbtn w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-blue-300 rounded-xl text-blue-600 font-semibold text-sm hover:bg-blue-50 hover:border-blue-400 transition">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Add Signer from Directory
        </button>

        <!-- Signers list -->
        <div v-if="signers.length > 0" class="tutorial-target-free-list">
          <p class="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
            Signers &mdash; {{ signers.length }}
          </p>

          <draggable v-model="signers" item-key="emplId" @end="onSignersDragEnd"
            handle=".signer-drag-handle" class="space-y-2">
            <template #item="{ element: s, index }">
              <div class="flex items-center gap-3 bg-white border-2 rounded-xl px-3 py-3 shadow-sm transition hover:shadow-md"
                :style="{ borderColor: s.color }">

                <span class="signer-drag-handle cursor-move text-gray-300 hover:text-gray-500 text-base leading-none select-none">
                  ⋮⋮
                </span>

                <span v-if="enforceSequentialOrder"
                  class="flex-shrink-0 w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center shadow-sm"
                  :style="{ backgroundColor: s.color }">
                  {{ s.approvalOrder }}
                </span>

                <span class="flex-shrink-0 w-3 h-3 rounded-full border border-white shadow-sm"
                  :style="{ backgroundColor: s.color }"></span>

                <span class="flex-1 font-medium text-gray-800 text-sm truncate">{{ s.name }}</span>

                <button @click="removeSigner(index)"
                  class="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                  title="Remove signer">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </template>
          </draggable>
        </div>

        <!-- Empty state -->
        <div v-else class="flex flex-col items-center justify-center py-12 text-gray-300">
          <svg class="w-14 h-14 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.2"
              d="M17 20h5v-2a4 4 0 00-5.356-3.712M9 20H4v-2a4 4 0 015.356-3.712M15 7a4 4 0 11-8 0 4 4 0 018 0zm6 3a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          <p class="text-sm font-medium text-gray-400">No signers added yet.</p>
          <p class="text-xs text-gray-300 mt-1">Click "Add Signer" above to get started.</p>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
        <span class="text-xs text-gray-400">
          {{ signers.length }} signer{{ signers.length !== 1 ? 's' : '' }} selected
        </span>
        <div class="flex gap-2">
          <button @click="emit('close')"
            class="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition font-medium">
            Cancel
          </button>
          <button @click="saveSignatures"
            :disabled="signers.length === 0"
            class="tutorial-target-free-save px-5 py-2 bg-green-600 text-white rounded-lg font-semibold text-sm hover:bg-green-700 transition disabled:opacity-40 disabled:cursor-not-allowed">
            Save
          </button>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════════════
         NORMAL MODE — full PDF canvas UI
         ═══════════════════════════════════════════════════════════════════════ -->
    <div v-else
      class="bg-white rounded-lg shadow-xl w-full max-h-[95vh] flex flex-col
             mx-2 sm:mx-4
             max-w-[98vw] sm:max-w-3xl md:max-w-5xl lg:max-w-7xl">

      <!-- Header -->
      <div class="flex items-center justify-between p-3 sm:p-4 border-b flex-shrink-0">
        <div class="flex-1 min-w-0">
          <h2 class="text-base sm:text-xl font-semibold truncate">Place Signature Boxes</h2>
          <p class="text-xs sm:text-sm text-gray-600 mt-0.5">Click on the PDF to place a signature area.</p>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0 ml-2">
          <!-- Tutorial trigger -->
          <button @click="startTutorial" title="How to use this tool"
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 transition font-semibold">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            How to use
          </button>
          <button @click="emit('close')" class="p-2 hover:bg-gray-100 rounded-full transition">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="flex flex-1 overflow-hidden relative">

        <!-- ──────────── SIDEBAR ──────────── -->
        <div v-if="showSidebar"
          class="border-r bg-gray-50 p-3 sm:p-4 overflow-y-auto flex-shrink-0
                 w-64 sm:w-72 lg:w-80
                 absolute sm:relative inset-y-0 left-0 z-30 sm:z-auto shadow-xl sm:shadow-none">

          <div class="flex items-center justify-between mb-3">
            <h3 class="font-semibold text-sm sm:text-base">Options</h3>
            <button @click="showSidebar = false" class="p-1 hover:bg-gray-200 rounded transition">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/>
              </svg>
            </button>
          </div>

          <!-- Sequential Order Toggle -->
          <div class="tutorial-target-sequential bg-white rounded-lg shadow p-3 sm:p-4 mb-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <input type="checkbox" v-model="enforceSequentialOrder" id="sequentialOrder" class="rounded w-4 h-4"/>
                <label for="sequentialOrder" class="text-sm font-semibold text-gray-700">Enforce Sequential Signer Order</label>
              </div>
              <div v-if="enforceSequentialOrder" class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">ENABLED</div>
            </div>
            <p class="text-xs text-gray-500 mt-2">When enabled, signatures must be completed in the order listed below.</p>
          </div>

          <!-- Signers List -->
          <div class="tutorial-target-signers bg-white rounded-lg shadow p-4 mb-4">
            <h3 class="font-semibold mb-3">Signers ({{ signers.length }})</h3>
            <div v-if="signers.length === 0" class="text-sm text-gray-500">No signers yet. Use "Assign" to add from the directory.</div>

            <draggable v-model="signers" item-key="emplId" @end="onSignersDragEnd"
              handle=".signer-drag-handle" class="space-y-2">
              <template #item="{ element: s, index }">
                <div class="w-full border-2 rounded p-2 transition flex items-center justify-between gap-2"
                  :style="{
                    borderColor: s.color,
                    backgroundColor: (newBoxForm.assignedEmplId === s.emplId || newBoxForm.assignedTo === s.name) ? hexToRgba(s.color, 0.15) : 'transparent'
                  }"
                  :class="(newBoxForm.assignedEmplId === s.emplId || newBoxForm.assignedTo === s.name) ? 'ring-2' : ''">
                  <div class="flex items-center gap-2 flex-1 min-w-0">
                    <span class="signer-drag-handle cursor-move text-gray-400 hover:text-gray-600" title="Drag to reorder">⋮⋮</span>
                    <span v-if="enforceSequentialOrder"
                      class="flex-shrink-0 w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center"
                      :style="{ backgroundColor: s.color }">{{ s.approvalOrder }}</span>
                    <span class="flex-shrink-0 inline-block w-4 h-4 rounded border border-gray-300"
                      :style="{ backgroundColor: s.color }"></span>
                    <span class="font-medium truncate">{{ s.name }}</span>
                  </div>
                  <div class="flex items-center gap-1 flex-shrink-0">
                    <button @click="setActiveSigner(s)"
                      class="px-2 py-1 text-xs text-white rounded hover:opacity-90 transition"
                      :style="{ backgroundColor: s.color }">Select</button>
                    <button @click="removeSigner(index)"
                      class="p-1 hover:bg-red-100 text-red-600 rounded" title="Remove signer">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </template>
            </draggable>
          </div>

          <!-- Add Box Form -->
          <div class="tutorial-target-newbox bg-white rounded-lg shadow p-4 mb-4">
            <button @click="showAddForm = !showAddForm"
              class="w-full flex items-center justify-between text-left font-semibold mb-2">
              <span>📝 New Signature Box</span>
              <svg class="w-5 h-5 transition-transform" :class="showAddForm ? 'rotate-180' : ''"
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>

            <div v-show="showAddForm" class="space-y-3 pt-2 border-t">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Assign To *</label>
                <div class="flex gap-2 items-center">
                  <div class="flex-1 flex items-center gap-2 border rounded px-3 py-2 text-sm bg-gray-50"
                    :style="newBoxForm.assignedColor ? { borderColor: newBoxForm.assignedColor, borderWidth: '2px' } : {}">
                    <span v-if="newBoxForm.assignedColor"
                      class="inline-block w-3 h-3 rounded flex-shrink-0"
                      :style="{ backgroundColor: newBoxForm.assignedColor }"></span>
                    <input v-model="newBoxForm.assignedTo" type="text" placeholder="Enter user name..."
                      class="flex-1 bg-transparent border-none outline-none w-5" disabled/>
                  </div>
                  <button @click="handleAssignUser"
                    class="px-2 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">Search</button>
                </div>
              </div>
              <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
                <div class="flex items-center gap-2">
                  <input type="checkbox" v-model="newBoxForm.hasDate" id="hasDate" class="rounded"/>
                  <label for="hasDate" class="text-sm font-medium text-gray-700">Date field</label>
                </div>
                <div class="flex items-center gap-2">
                  <input type="checkbox" v-model="newBoxForm.signatureLock" id="signatureLock" class="rounded"/>
                  <label for="signatureLock" class="text-sm font-medium text-gray-700">Signature Lock</label>
                </div>
                <div class="flex items-center gap-2">
                  <input type="checkbox" v-model="newBoxForm.dateLock" id="dateLock" class="rounded"/>
                  <label for="dateLock" class="text-sm font-medium text-gray-700">Date Lock</label>
                </div>
                <div class="flex items-center gap-2">
                  <input type="checkbox" v-model="newBoxForm.showName" id="showNameOnBox" class="rounded"/>
                  <label for="showNameOnBox" class="text-sm font-medium text-gray-700">Show name on box</label>
                </div>
              </div>
            </div>
          </div>

          <!-- Boxes List -->
          <div class="tutorial-target-boxeslist bg-white rounded-lg shadow p-3 sm:p-4">
            <h3 class="font-semibold mb-3 text-sm sm:text-base">Boxes ({{ signatureBoxes.length }})</h3>
            <div class="space-y-2 max-h-96 overflow-y-auto">
              <div v-for="(box, index) in signatureBoxes" :key="box.id"
                class="p-3 border-2 rounded text-sm cursor-pointer transition-all"
                :style="{ borderColor: box.color || '#3b82f6', backgroundColor: selectedBoxId === box.id ? hexToRgba(box.color || '#3b82f6', 0.1) : 'transparent' }"
                :class="selectedBoxId === box.id ? 'ring-2' : ''"
                @click="selectAndScrollToBox(box)">
                <div class="flex items-start justify-between mb-1">
                  <p class="font-semibold text-gray-900 flex items-center gap-2">
                    <span class="inline-block w-4 h-4 rounded border border-gray-300"
                      :style="{ backgroundColor: box.color || '#3b82f6' }"></span>
                    {{ box.assignedTo }}
                    <span v-if="enforceSequentialOrder"
                      class="text-xs px-1.5 py-0.5 rounded text-white font-bold"
                      :style="{ backgroundColor: box.color || '#3b82f6' }">#{{ box.approvalOrder }}</span>
                  </p>
                  <button @click.stop="deleteBox(index)" class="text-red-500 hover:text-red-700">🗑️</button>
                </div>
                <div class="text-xs text-gray-500">
                  Page {{ box.page }}
                  <span v-if="box.hasDate" class="text-green-600 ml-1">(+Date)</span>
                </div>
                <div class="text-xs text-gray-500">
                  Has Name = <span :class="box.showName ? 'text-white rounded-lg bg-green-600 px-2' : 'text-white rounded-lg bg-red-600 px-2'">{{ box.showName ? 'True' : 'False' }}</span>
                </div>
                <div class="text-xs text-gray-500">
                  Signature Lock = <span :class="box.signatureLock ? 'text-white rounded-lg bg-green-600 px-2' : 'text-white rounded-lg bg-red-600 px-2'">{{ box.signatureLock ? 'True' : 'False' }}</span>
                </div>
                <div class="text-xs text-gray-500">
                  Date Lock = <span :class="box.dateLock ? 'text-white rounded-lg bg-green-600 px-2' : 'text-white rounded-lg bg-red-600 px-2'">{{ box.dateLock ? 'True' : 'False' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Mobile backdrop for sidebar -->
        <div v-if="showSidebar" class="fixed inset-0 bg-black bg-opacity-20 z-20 sm:hidden"
          @click="showSidebar = false"></div>

        <!-- Sidebar toggle button -->
        <button v-if="!showSidebar" @click="showSidebar = true"
          class="absolute left-2 top-1/2 -translate-y-1/2 bg-blue-600 text-white p-2 sm:p-3 rounded-lg shadow-xl hover:bg-blue-700 transition z-40 flex flex-col items-center gap-1"
          title="Show Options">
          <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"/>
          </svg>
          <div class="flex gap-0.5 text-xs">
            <span v-if="signatureBoxes.length > 0" class="bg-green-500 px-1.5 py-0.5 rounded font-bold text-[10px]">{{ signatureBoxes.length }}</span>
            <span v-if="signers.length > 0" class="bg-white text-blue-600 px-1.5 py-0.5 rounded font-bold text-[10px]">{{ signers.length }}</span>
          </div>
        </button>

        <!-- Main Content -->
        <div class="flex-1 flex flex-col overflow-hidden">

          <!-- Pagination + Zoom -->
          <div class="mt-3 flex items-center justify-center gap-2 sm:gap-3 px-3 flex-wrap">
            <button @click="goToPrevPage" :disabled="currentViewPage === 1"
              class="px-2 py-1.5 sm:px-4 sm:py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1 text-sm">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
              <span class="hidden sm:inline">Previous</span>
            </button>
            <span class="text-xs sm:text-sm font-semibold text-gray-700">Page {{ currentViewPage }} / {{ totalPages }}</span>
            <button @click="goToNextPage" :disabled="currentViewPage === totalPages"
              class="px-2 py-1.5 sm:px-4 sm:py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1 text-sm">
              <span class="hidden sm:inline">Next</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
            <div class="flex items-center gap-1">
              <input type="number" min="1" :max="totalPages" v-model.number="goToPageNumber"
                @keydown.enter="scrollToPage(goToPageNumber)"
                class="border rounded px-2 py-1 w-12 sm:w-16 text-xs sm:text-sm text-center"/>
              <button @click="scrollToPage(goToPageNumber)"
                class="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 text-xs sm:text-sm">Go</button>
            </div>

            <div class="hidden sm:block w-px h-6 bg-gray-300"></div>

            <!-- Zoom controls -->
            <div class="flex items-center gap-1 bg-gray-200 rounded-lg p-1">
              <button @click="zoomOut" :disabled="userZoom <= 0.5"
                class="w-7 h-7 flex items-center justify-center rounded hover:bg-white transition disabled:opacity-40 disabled:cursor-not-allowed font-bold text-gray-700 text-lg leading-none"
                title="Zoom out">−</button>
              <button @click="zoomReset"
                class="px-2 py-0.5 text-xs font-semibold text-gray-700 hover:bg-white rounded transition min-w-[46px] text-center"
                title="Reset zoom">{{ zoomPercent }}%</button>
              <button @click="zoomIn" :disabled="userZoom >= 3.0"
                class="w-7 h-7 flex items-center justify-center rounded hover:bg-white transition disabled:opacity-40 disabled:cursor-not-allowed font-bold text-gray-700 text-lg leading-none"
                title="Zoom in">+</button>
            </div>
          </div>

          <!-- PDF Canvas Area -->
          <div ref="canvasWrapperRef" class="flex-1 overflow-auto p-3 sm:p-6 bg-gray-100 flex justify-center">
            <div ref="containerRef" class="relative inline-block" @mousemove="handleMouseMove">
              <div class="tutorial-target-canvas relative border-2 border-gray-400 rounded shadow-lg bg-white"
                @mousedown="placeSignatureOnClick">
                <canvas
                  v-for="i in totalPages" :key="i"
                  v-show="i === currentViewPage"
                  :ref="el => { if (el) canvasRefs[i - 1] = el }"
                  class="block cursor-crosshair">
                </canvas>
              </div>

              <!-- Placed items -->
              <template v-for="box in getCurrentPageBoxes()" :key="box.id">

                <!-- Signature Box -->
                <div class="absolute rounded transition-all draggable-item group"
                  :style="getBoxVisualStyle(box)"
                  :class="{
                    'border-2':        !box.signedBy,
                    'cursor-default':  !box.isEmpty,
                    'cursor-move':     box.isEmpty && !(isDragging && selectedBoxId === box.id && dragTargetType === 'box'),
                    'cursor-grabbing': box.isEmpty && isDragging && selectedBoxId === box.id && dragTargetType === 'box',
                    'z-50':  selectedBoxId === box.id || (isDragging && selectedBoxId === box.id),
                    'z-10':  selectedBoxId !== box.id && !(isDragging && selectedBoxId === box.id),
                    'active-drag-box':   isDragging  && selectedBoxId === box.id && dragTargetType === 'box',
                    'active-resize-box': isResizing  && selectedBoxId === box.id,
                    'dimmed-box':        isDragging  && selectedBoxId !== box.id,
                  }"
                  @mousedown.stop="startDragging($event, box.id, 'box')">

                  <div v-if="!box.signedBy"
                    class="absolute -top-8 left-0 text-white text-xs px-3 py-1.5 rounded-md font-semibold whitespace-nowrap flex items-center gap-1.5 shadow-lg transition-all duration-200 pointer-events-none"
                    :class="{
                      'opacity-0 group-hover:opacity-100': !(isDragging && selectedBoxId === box.id),
                      'opacity-100 scale-105':              isDragging && selectedBoxId === box.id
                    }"
                    :style="{ backgroundColor: box.color || '#3b82f6' }">
                    {{ box.assignedTo }}
                    <span v-if="enforceSequentialOrder" class="ml-1 px-1.5 py-0.5 bg-white bg-opacity-30 rounded">#{{ box.approvalOrder }}</span>
                    <span v-if="box.signatureLock">🔒</span>
                  </div>

                  <div v-if="!box.signedBy && !(isDragging && selectedBoxId === box.id)"
                    class="absolute -top-2 -left-2 w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center shadow-md transition-all duration-200 pointer-events-none"
                    :class="{ 'opacity-60': isDragging && selectedBoxId !== box.id, 'opacity-100 hover:scale-110': !isDragging }"
                    :style="{ backgroundColor: box.color || '#3b82f6' }">
                    {{ enforceSequentialOrder ? box.approvalOrder : getInitials(box.assignedTo) }}
                  </div>

                  <button
                    class="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-20"
                    @mousedown.stop @click.stop="deleteBoxById(box.id)" title="Remove box">
                    ✕
                  </button>

                  <template v-if="box.isEmpty || box.isEmpty == null">
                    <template v-if="!box.signatureLock">
                      <div class="absolute w-3 h-3 bg-white border-2 rounded-full -top-1.5 -left-1.5  cursor-nw-resize opacity-0 group-hover:opacity-100 transition-opacity" :style="{ borderColor: box.color || '#3b82f6' }" @mousedown.stop="startResizing($event, box.id, 'nw')"></div>
                      <div class="absolute w-3 h-3 bg-white border-2 rounded-full -top-1.5 -right-1.5 cursor-ne-resize opacity-0 group-hover:opacity-100 transition-opacity" :style="{ borderColor: box.color || '#3b82f6' }" @mousedown.stop="startResizing($event, box.id, 'ne')"></div>
                      <div class="absolute w-3 h-3 bg-white border-2 rounded-full -bottom-1.5 -left-1.5  cursor-sw-resize opacity-0 group-hover:opacity-100 transition-opacity" :style="{ borderColor: box.color || '#3b82f6' }" @mousedown.stop="startResizing($event, box.id, 'sw')"></div>
                      <div class="absolute w-3 h-3 bg-white border-2 rounded-full -bottom-1.5 -right-1.5 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity" :style="{ borderColor: box.color || '#3b82f6' }" @mousedown.stop="startResizing($event, box.id, 'se')"></div>
                    </template>

                    <div class="flex flex-col items-center justify-center h-full relative">
                      <span class="text-xs font-bold opacity-50 italic z-10 px-1"
                        :style="{ color: box.color || '#3b82f6' }">Signature Area</span>
                      <div v-if="box.showName" class="absolute bottom-3 w-4/5 border-t border-gray-400 text-black pb-2"></div>
                      <span v-if="box.showName"
                        class="absolute bottom-0 text-[11px] font-semibold tracking-wide text-center w-full text-black">
                        {{ box.assignedTo }}
                      </span>
                    </div>
                  </template>

                  <template v-else>
                    <div class="flex flex-col items-center justify-center h-full relative">
                      <img v-if="box.imageSrc" :src="box.imageSrc" alt="Signature" class="w-full h-full object-contain z-10"/>
                      <span v-else class="text-xs font-bold opacity-50 italic z-10 bg-white px-1"
                        :style="{ color: box.color || '#3b82f6' }">Signature Area</span>
                      <div v-if="box.showName && box.isEmpty == true" class="absolute bottom-3 w-4/5 border-t border-gray-400 opacity-60"></div>
                      <span v-if="box.showName"
                        class="absolute bottom-0 text-[10px] font-semibold tracking-wide text-center w-full">
                        {{ box.assignedTo }}
                      </span>
                    </div>
                  </template>
                </div>

                <!-- Date Box -->
                <div v-if="box.hasDate"
                  class="absolute px-2 py-1 text-xs font-semibold rounded draggable-item flex items-center justify-center hover:z-50"
                  :class="{
                    'border border-dashed': box.isEmpty || box.isEmpty == null,
                    'cursor-default':  !box.isEmpty,
                    'cursor-grabbing': box.isEmpty && isDragging && selectedBoxId === box.id && dragTargetType === 'date',
                    'cursor-move':     box.isEmpty && !(isDragging && selectedBoxId === box.id && dragTargetType === 'date'),
                    'z-50':  selectedBoxId === box.id || (isDragging && selectedBoxId === box.id && dragTargetType === 'date'),
                    'z-10':  selectedBoxId !== box.id && !(isDragging && selectedBoxId === box.id && dragTargetType === 'date'),
                    'active-drag-date': isDragging && selectedBoxId === box.id && dragTargetType === 'date',
                    'dimmed-box':       isDragging && selectedBoxId !== box.id,
                  }"
                  :style="getDateVisualStyle(box)"
                  @mousedown.stop="startDragging($event, box.id, 'date')">
                  <span class="flex items-center">
                    {{ box.isEmpty || box.isEmpty == null ? 'MM/DD/YYYY' : box.datePosition?.dateText }}
                    <span v-if="box.dateLock && box.isEmpty" class="ml-1 text-xs">🔒</span>
                  </span>
                </div>

              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between p-2 sm:p-3 border-t bg-gray-50 flex-shrink-0">
        <div class="text-xs text-gray-600 hidden sm:block">
          {{ signatureBoxes.length }} item(s) placed
          <span v-if="enforceSequentialOrder" class="ml-2 text-blue-600 font-semibold">• Sequential Order Enabled</span>
        </div>
        <div class="text-xs text-gray-600 sm:hidden">{{ signatureBoxes.length }} box(es)</div>
        <div class="flex gap-2 sm:gap-3 ml-auto sm:ml-0">
          <button @click="emit('close')" class="px-3 py-1.5 sm:px-4 sm:py-2 border rounded hover:bg-gray-50 text-sm">Cancel</button>
          <button @click="saveSignatures"
            class="tutorial-target-save px-4 py-1.5 sm:px-6 sm:py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold text-sm">
            Save Output
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════════════
       Directory Modal
       ═══════════════════════════════════════════════════════════════════════ -->
  <div v-if="showModal" @click.self="cancelButton" @keydown.esc="cancelButton"
    class="fixed inset-0 p-4 flex flex-wrap justify-center items-center w-full h-full z-[1000] before:fixed before:inset-0 before:w-full before:h-full before:bg-[rgba(0,0,0,0.5)] overflow-auto font-[sans-serif]">
    <div class="w-full max-w-4xl bg-white shadow-lg rounded-lg p-6 relative">
      <div class="flex gap-2">
        <input type="text" v-model="query.search"
          @keydown.enter.prevent="handleEnterKey"
          @keydown.down.prevent="moveDown"
          @keydown.up.prevent="moveUp"
          placeholder="Please enter user's name..."
          class="w-full h-11 p-4 rounded border border-gray-600 focus:outline-none"/>
        <button @click="getEmployeesForSigner"
          class="py-3 px-4 bg-blue-500 h-11 text-white rounded-md hover:bg-blue-700">
          <svg class="w-6 h-6" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="m21 21-3.5-3.5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"/>
          </svg>
        </button>
      </div>

      <div class="max-h-60 overflow-y-auto border border-gray-300 rounded mt-2" ref="scrollContainer">
        <table class="min-w-full text-sm text-left">
          <thead class="bg-gray-100 sticky top-0">
            <tr>
              <th class="px-4 py-2 border-b">Name</th>
              <th class="px-4 py-2 border-b">Branch</th>
              <th class="px-4 py-2 border-b">Position</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(user, index) in availableApprovers" :key="index"
              @click="selectUser(user)"
              class="cursor-pointer hover:bg-gray-200"
              :class="{ 'bg-gray-200 font-bold': index === approverIndex }"
              data-approver>
              <td class="px-4 py-2 border-b">{{ formatUserName(user) }}</td>
              <td class="px-4 py-2 border-b">{{ user.branchname }}</td>
              <td class="px-4 py-2 border-b">{{ user.positionname }}</td>
            </tr>
            <tr v-if="loading">
              <td colspan="3" class="p-2 text-gray-400 text-center">Loading users...</td>
            </tr>
            <tr v-else-if="!availableApprovers || availableApprovers.length === 0">
              <td colspan="3" class="p-2 text-gray-400 text-center">No users found.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-4 flex justify-end gap-2">
        <button @click="cancelButton" class="px-4 py-2 bg-red-500 text-white rounded-lg">Cancel</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cursor-crosshair { cursor: crosshair; }
.signer-drag-handle { user-select: none; }

.draggable-item {
    transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
}
.draggable-item.dimmed-box        { opacity: 0.35; filter: blur(0.5px); }
.draggable-item.active-drag-box   { transform: scale(1.03); box-shadow: 0 8px 16px rgba(0,0,0,.2), 0 12px 24px rgba(0,0,0,.15); z-index: 100 !important; opacity: 1 !important; filter: none !important; }
.draggable-item.active-resize-box { box-shadow: 0 6px 12px rgba(0,0,0,.15), 0 8px 16px rgba(0,0,0,.1); z-index: 100 !important; opacity: 1 !important; filter: none !important; }
.draggable-item.active-drag-date  { transform: scale(1.05); box-shadow: 0 6px 12px rgba(0,0,0,.2), 0 8px 16px rgba(0,0,0,.12); z-index: 100 !important; opacity: 1 !important; filter: none !important; }
.draggable-item:active { transition: none; }
</style>