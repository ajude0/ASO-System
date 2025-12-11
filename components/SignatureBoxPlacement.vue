<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
import draggable from 'vuedraggable';
import {
    getEmployees,
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
    }
});

// Emits
const emit = defineEmits(['close', 'save-signatures']);
const showModal = ref(false);

// Refs
const containerRef = ref(null);
const pdfDocument = ref(null);
const canvasRefs = ref([]);
const totalPages = ref(0);
const currentViewPage = ref(1);

// Signature boxes being placed
const signatureBoxes = ref([]);

// Drag/Resize state
const isDragging = ref(false);
const isResizing = ref(false);
const dragStart = ref({ x: 0, y: 0, boxX: 0, boxY: 0, boxWidth: 0, boxHeight: 0 });
const dragOffset = ref({ x: 0, y: 0 });
const resizeHandle = ref(null);
const dragTargetType = ref(null); // 'box' | 'date'

// Selected box ID
const selectedBoxId = ref(null);
const goToPageNumber = ref(1);

// Signers list and active selection
// signer: { name, emplId, color, approvalOrder }
const signers = ref([]);
const activeSignerKey = ref(null);

// Sequential approval toggle
const enforceSequentialOrder = ref(false);

// Color management
const colorPalette = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#06b6d4', // cyan
    '#22c55e', // emerald
    '#e11d48', // rose
    '#a3e635', // lime
    '#14b8a6', // teal
];

const hexToRgba = (hex, alpha = 0.2) => {
    const cleaned = hex.replace('#', '');
    const bigint = parseInt(cleaned, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const getNextColor = () => {
    const used = new Set(signers.value.map(s => s.color));
    for (const c of colorPalette) {
        if (!used.has(c)) return c;
    }
    return colorPalette[signers.value.length % colorPalette.length];
};

const findSigner = (emplId, name) =>
    signers.value.find(s => (emplId && s.emplId === emplId) || (name && s.name === name));

const getNextApprovalOrder = () => {
    if (signers.value.length === 0) return 1;
    const maxOrder = Math.max(
        ...signers.value.map(s => Number(s.approvalOrder || 0) || 0)
    );
    return maxOrder + 1;
};

const upsertSigner = ({ name, emplId, approvalOrder ,color}) => {
    if (!name && !emplId) return null;
    let s = findSigner(emplId, name);
    if (!s) {
        s = {
            name,
            emplId: emplId || null,
            color:color!=null?color: getNextColor(),
            approvalOrder: Number(
                approvalOrder != null ? approvalOrder : getNextApprovalOrder()
            ),
        };
        signers.value.push(s);
    } else if (approvalOrder != null) {
        s.approvalOrder = Number(approvalOrder);
    }
    return s;
};

const setActiveSigner = (signer) => {
    newBoxForm.value.assignedTo = signer.name;
    newBoxForm.value.assignedEmplId = signer.emplId || '';
    newBoxForm.value.assignedColor = signer.color;
    activeSignerKey.value = signer.emplId || signer.name;
    showAddForm.value = true;
};

// Move signer up in order (still allowed in addition to drag)
const moveSignerUp = (index) => {
    if (index === 0) return;
    const temp = signers.value[index];
    signers.value[index] = signers.value[index - 1];
    signers.value[index - 1] = temp;
    updateApprovalOrderFromList();
};

// Move signer down in order
const moveSignerDown = (index) => {
    if (index === signers.value.length - 1) return;
    const temp = signers.value[index];
    signers.value[index] = signers.value[index + 1];
    signers.value[index + 1] = temp;
    updateApprovalOrderFromList();
};

// Remove signer from list
const removeSigner = (index) => {
    const signer = signers.value[index];
    const hasBoxes = signatureBoxes.value.some(box =>
        box.assignedEmplId === signer.emplId || box.assignedTo === signer.name
    );

    if (hasBoxes) {
        alert('Cannot remove this signer as they have signature boxes assigned. Please delete those boxes first.');
        return;
    }

    signers.value.splice(index, 1);
    updateApprovalOrderFromList();
};

// When the signers list order changes (drag or up/down buttons),
// and sequential mode is ON, we want approvalOrder to reflect the list.
const updateApprovalOrderFromList = () => {
    if (!enforceSequentialOrder.value) return;

    signers.value.forEach((signer, idx) => {
        signer.approvalOrder = idx + 1;
    });

    signatureBoxes.value.forEach(box => {
        const signer = findSigner(box.assignedEmplId, box.assignedTo);
        if (signer) {
            box.approvalOrder = Number(signer.approvalOrder);
        }
    });
};

// Draggable (vuedraggable) handler – called after drag sorting
const onSignersDragEnd = () => {
    updateApprovalOrderFromList();
};

// New box form
const showAddForm = ref(false);
const newBoxForm = ref({
    assignedTo: '',
    hasDate: true,
    dateOffset: 5,
    assignedEmplId: "",
    assignedColor: undefined,
    signatureWidth: 200,
    signatureHeight: 60,
    signatureLock: false,
    dateLock: false,
    dateWidth: 100,
    dateHeight: 30,
});

// Optional: keyboard navigation in directory modal
const approverIndex = ref(-1);
const scrollContainer = ref(null);
const moveDown = () => {
    if (!Array.isArray(availableApprovers.value)) return;
    approverIndex.value = Math.min(approverIndex.value + 1, availableApprovers.value.length - 1);
    nextTick(() => {
        if (scrollContainer.value) {
            const items = scrollContainer.value.querySelectorAll('[data-approver]');
            const el = items[approverIndex.value];
            if (el) el.scrollIntoView({ block: 'nearest' });
        }
    });
};
const moveUp = () => {
    if (!Array.isArray(availableApprovers.value)) return;
    approverIndex.value = Math.max(approverIndex.value - 1, 0);
    nextTick(() => {
        if (scrollContainer.value) {
            const items = scrollContainer.value.querySelectorAll('[data-approver]');
            const el = items[approverIndex.value];
            if (el) el.scrollIntoView({ block: 'nearest' });
        }
    });
};

const handleAssignUser = async () => {
    showModal.value = true;
    await getEmployees();
};

const handleEnterKey = async () => {
    await getEmployees();
};

const cancelButton = async () => {
    showModal.value = false;
    query.value.search = "";
    availableApprovers.value = null;
    approverIndex.value = -1;
    newBoxForm.value = {
        assignedTo: '',
        hasDate: true,
        dateOffset: 5,
        assignedEmplId: "",
        assignedColor: undefined,
        signatureWidth: 200,
        signatureHeight: 60,
        signatureLock: false,
        dateLock: false,
        dateWidth: 100,
        dateHeight: 30,
    };
};

// User display formatting
const formatUserName = (user) => {
    if (!user) return '';

    if (user.employeename2 && user.employeename1) {
        return `${user.employeename2}, ${user.employeename1}`;
    }
    return user.employeename2 || user.employeename1 || user.name || 'Unknown User';
};

const selectUser = (user) => {
    const displayName = formatUserName(user);
    const signer = upsertSigner({
        name: displayName,
        emplId: user.emplId,
        color: user.color
    });
    if (signer) setActiveSigner(signer);

    showModal.value = false;
    query.value.search = "";
    availableApprovers.value = null;
};

const scrollToPage = (pageNum) => {
    if (pageNum >= 1 && pageNum <= totalPages.value) {
        currentViewPage.value = pageNum;
    }
};

// Unique ID
const generateId = () => `sig_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

watch(currentViewPage, async () => {
    await nextTick();
    signatureBoxes.value = signatureBoxes.value.map(box => ({ ...box }));
});

// Load PDF and data
watch(() => props.isOpen, async (newVal) => {
    if (newVal && props.pdfFile) {
        await loadPdf();

        signers.value = [];

        if (props.existingSignatures && props.existingSignatures.length > 0) {
            // 1) Build signers with approvalOrder from existing signatures
            for (const sig of props.existingSignatures) {
                upsertSigner({
                    name: sig.assignedTo,
                    emplId: sig.assignedEmplId,
                    approvalOrder: sig.approvalOrder,
                    color:sig.color
                });
            }

            // 2) Sort signers by approvalOrder so visual order matches number
            signers.value.sort((a, b) =>
                Number(a.approvalOrder || 0) - Number(b.approvalOrder || 0)
            );

            // 3) Build boxes and sort them by approvalOrder
            const seenIds = new Set();
            const boxes = props.existingSignatures.map(sig => {
                let safeId = sig.id;
                if (!safeId || seenIds.has(safeId)) {
                    safeId = generateId();
                }
                seenIds.add(safeId);

                const s = findSigner(sig.assignedEmplId, sig.assignedTo);

                return {
                    ...sig,
                    hasDate: sig.hasDate === true || (sig.datePosition !== null && sig.datePosition !== undefined),
                    id: safeId,
                    color: sig.color || s?.color || getNextColor(),
                    signatureLock: sig.signatureLock ?? true,
                    dateLock: sig.dateLock ?? true,
                    approvalOrder: Number(sig.approvalOrder ?? s?.approvalOrder ?? 1),
                };
            });

            boxes.sort((a, b) => Number(a.approvalOrder || 0) - Number(b.approvalOrder || 0));
            signatureBoxes.value = boxes;

            if (props.existingSignatures.some(sig => sig.enforceSequentialOrder)) {
                enforceSequentialOrder.value = true;
            }
        } else {
            signatureBoxes.value = [];
        }

        // Default active signer from availableUsers (optional)
        if (props.availableUsers.length > 0 && signers.value.length === 0) {
            const first = props.availableUsers[0];
            let signer;
            if (typeof first === 'string') {
                signer = upsertSigner({ name: first, emplId: null });
            } else if (first && typeof first === 'object') {
                const displayName = formatUserName(first);
                signer = upsertSigner({ name: displayName, emplId: first.emplId });
            }
            if (signer) setActiveSigner(signer);
        }
    }
});

// Load PDF Logic
const loadPdf = async () => {
    try {
        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        const arrayBuffer = await props.pdfFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        pdfDocument.value = pdf;
        totalPages.value = pdf.numPages;
        canvasRefs.value = [];
        await nextTick();
        for (let i = 1; i <= pdf.numPages; i++) await renderPage(i);
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
    } catch (error) {
        console.error('Error rendering page:', error);
    }
};

// CLICK-TO-PLACE: place a fixed-size signature box
const placeSignatureOnClick = (e) => {
    if (e.target.closest('.draggable-item')) return;

    if (!showAddForm.value || !newBoxForm.value.assignedTo) {
        alert('Please select a user to assign the signature to first!');
        showAddForm.value = true;
        return;
    }

    const canvas = canvasRefs.value[currentViewPage.value - 1];
    const canvasRect = canvas.getBoundingClientRect();
    const rawX = e.clientX - canvasRect.left;
    const rawY = e.clientY - canvasRect.top;

    const sigW = Math.max(20, Number(newBoxForm.value.signatureWidth || 0));
    const sigH = Math.max(20, Number(newBoxForm.value.signatureHeight || 0));

    const x = Math.max(0, Math.min(rawX, canvas.width - sigW));
    const y = Math.max(0, Math.min(rawY, canvas.height - sigH));

    const signer = findSigner(newBoxForm.value.assignedEmplId, newBoxForm.value.assignedTo);
    const signerColor = newBoxForm.value.assignedColor || signer?.color || getNextColor();

    const box = {
        id: generateId(),
        assignedTo: newBoxForm.value.assignedTo,
        assignedEmplId: newBoxForm.value.assignedEmplId,
        page: currentViewPage.value,
        x,
        y,
        width: sigW,
        height: sigH,
        hasDate: newBoxForm.value.hasDate,
        isEmpty: true,
        datePosition: null,
        color: signerColor,
        signatureLock: !!newBoxForm.value.signatureLock,
        dateLock: !!newBoxForm.value.dateLock,
        approvalOrder: Number(signer?.approvalOrder || 1),
    };

    if (box.hasDate) {
        const dateW = Math.max(30, Number(newBoxForm.value.dateWidth || 0));
        const dateH = Math.max(16, Number(newBoxForm.value.dateHeight || 0));
        const offset = Math.max(0, Number(newBoxForm.value.dateOffset || 0));

        const dateX = Math.max(0, Math.min(box.x, canvas.width - dateW));
        const dateY = Math.max(0, Math.min(box.y + box.height + offset, canvas.height - dateH));

        box.datePosition = {
            x: dateX,
            y: dateY,
            width: dateW,
            height: dateH,
        };
    }

    signatureBoxes.value.push(box);
    selectedBoxId.value = box.id;
};

// Dragging and resizing
const startDragging = (e, id, type = 'box') => {
    e.stopPropagation();

    const box = signatureBoxes.value.find(b => b.id === id);
    if (!box) return;

    selectedBoxId.value = id;

    if (box.isEmpty === false) {
        return;
    }

    isDragging.value = true;
    dragTargetType.value = type;

    const canvasRect = canvasRefs.value[box.page - 1].getBoundingClientRect();

    if (type === 'box') {
        dragOffset.value = {
            x: e.clientX - canvasRect.left - box.x,
            y: e.clientY - canvasRect.top - box.y
        };
    } else if (type === 'date' && box.datePosition) {
        dragOffset.value = {
            x: e.clientX - canvasRect.left - box.datePosition.x,
            y: e.clientY - canvasRect.top - box.datePosition.y
        };
    }
};

const dragBox = (e) => {
    if (!isDragging.value || !selectedBoxId.value) return;

    const box = signatureBoxes.value.find(b => b.id === selectedBoxId.value);
    if (!box || box.page !== currentViewPage.value) return;

    const canvas = canvasRefs.value[box.page - 1];
    const canvasRect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - canvasRect.left;
    const mouseY = e.clientY - canvasRect.top;

    if (dragTargetType.value === 'box') {
        const oldX = box.x;
        const oldY = box.y;

        const newX = mouseX - dragOffset.value.x;
        const newY = mouseY - dragOffset.value.y;

        box.x = Math.max(0, Math.min(newX, canvas.width - box.width));
        box.y = Math.max(0, Math.min(newY, canvas.height - box.height));

        if (box.hasDate && box.datePosition) {
            const deltaX = box.x - oldX;
            const deltaY = box.y - oldY;
            box.datePosition.x = Math.max(0, Math.min(box.datePosition.x + deltaX, canvas.width - (box.datePosition.width || 100)));
            box.datePosition.y = Math.max(0, Math.min(box.datePosition.y + deltaY, canvas.height - (box.datePosition.height || 30)));
        }
    } else if (dragTargetType.value === 'date' && box.datePosition) {
        const newDateX = mouseX - dragOffset.value.x;
        const newDateY = mouseY - dragOffset.value.y;

        box.datePosition.x = Math.max(0, Math.min(newDateX, canvas.width - box.datePosition.width));
        box.datePosition.y = Math.max(0, Math.min(newDateY, canvas.height - box.datePosition.height));
    }
};

const startResizing = (e, id, handle) => {
    e.stopPropagation();

    const box = signatureBoxes.value.find(b => b.id === id);
    if (!box || box.isEmpty === false || box.signatureLock) {
        return;
    }

    isResizing.value = true;
    selectedBoxId.value = id;
    resizeHandle.value = handle;

    const canvasRect = canvasRefs.value[box.page - 1].getBoundingClientRect();

    dragStart.value = {
        x: e.clientX - canvasRect.left,
        y: e.clientY - canvasRect.top,
        boxX: box.x,
        boxY: box.y,
        boxWidth: box.width,
        boxHeight: box.height
    };
};

const resizeBox = (e) => {
    if (!isResizing.value || !selectedBoxId.value) return;

    const box = signatureBoxes.value.find(b => b.id === selectedBoxId.value);
    if (!box || box.page !== currentViewPage.value) return;

    const canvas = canvasRefs.value[box.page - 1];
    const canvasRect = canvas.getBoundingClientRect();
    const dx = (e.clientX - canvasRect.left) - dragStart.value.x;
    const dy = (e.clientY - canvasRect.top) - dragStart.value.y;

    switch (resizeHandle.value) {
        case 'se':
            box.width = Math.min(Math.max(50, dragStart.value.boxWidth + dx), canvas.width - box.x);
            box.height = Math.min(Math.max(30, dragStart.value.boxHeight + dy), canvas.height - box.y);
            break;
        case 'sw':
            box.width = Math.max(50, dragStart.value.boxWidth - dx);
            box.height = Math.min(Math.max(30, dragStart.value.boxHeight + dy), canvas.height - box.y);
            box.width = Math.min(box.width, dragStart.value.boxX + dragStart.value.boxWidth);
            box.x = dragStart.value.boxX + (dragStart.value.boxWidth - box.width);
            break;
        case 'ne':
            box.width = Math.min(Math.max(50, dragStart.value.boxWidth + dx), canvas.width - box.x);
            box.height = Math.max(30, dragStart.value.boxHeight - dy);
            box.height = Math.min(box.height, dragStart.value.boxY + dragStart.value.boxHeight);
            box.y = dragStart.value.boxY + (dragStart.value.boxHeight - box.height);
            break;
        case 'nw':
            box.width = Math.max(50, dragStart.value.boxWidth - dx);
            box.height = Math.max(30, dragStart.value.boxHeight - dy);
            box.width = Math.min(box.width, dragStart.value.boxX + dragStart.value.boxWidth);
            box.height = Math.min(box.height, dragStart.value.boxY + dragStart.value.boxHeight);
            box.x = dragStart.value.boxX + (dragStart.value.boxWidth - box.width);
            box.y = dragStart.value.boxY + (dragStart.value.boxHeight - box.height);
            break;
    }

    if (box.hasDate && box.datePosition) {
        box.datePosition.x = Math.max(0, Math.min(box.datePosition.x, canvas.width - (box.datePosition.width || 100)));
        box.datePosition.y = Math.max(0, Math.min(box.datePosition.y, canvas.height - (box.datePosition.height || 30)));
    }
};

const handleMouseUp = () => {
    isDragging.value = false;
    isResizing.value = false;
    resizeHandle.value = null;
    dragTargetType.value = null;
};

const handleMouseMove = (e) => {
    if (isDragging.value) dragBox(e);
    else if (isResizing.value) resizeBox(e);
};

const deleteBox = (index) => {
    const boxToDelete = signatureBoxes.value[index];
    if (selectedBoxId.value === boxToDelete.id) {
        selectedBoxId.value = null;
    }
    signatureBoxes.value.splice(index, 1);
};

const getCurrentPageBoxes = () =>
    signatureBoxes.value.filter(box => box.page === currentViewPage.value);

// Position-only styles
const getBoxStyle = (box) => {
    const canvas = canvasRefs.value[box.page - 1];
    if (!canvas || !containerRef.value) return {};
    const canvasRect = canvas.getBoundingClientRect();
    const containerRect = containerRef.value.getBoundingClientRect();

    return {
        left: (canvasRect.left - containerRect.left + box.x) + 'px',
        top: (canvasRect.top - containerRect.top + box.y) + 'px',
        width: box.width + 'px',
        height: box.height + 'px'
    };
};

const getDateStyle = (box) => {
    if (!box.datePosition) return {};
    const canvas = canvasRefs.value[box.page - 1];
    if (!canvas || !containerRef.value) return {};
    const canvasRect = canvas.getBoundingClientRect();
    const containerRect = containerRef.value.getBoundingClientRect();

    return {
        left: (canvasRect.left - containerRect.left + box.datePosition.x) + 'px',
        top: (canvasRect.top - containerRect.top + box.datePosition.y) + 'px',
        width: (box.datePosition.width || 100) + 'px',
        height: (box.datePosition.height || 30) + 'px'
    };
};

// Color-aware visual styles
const getBoxVisualStyle = (box) => {
    const base = getBoxStyle(box);
    const color = box.color || '#3b82f6';
    const selected = selectedBoxId.value === box.id;
    const bgAlpha = box.isEmpty ? (selected ? 0.25 : 0.15) : 0;
    return {
        ...base,
        borderColor: color,
        backgroundColor: bgAlpha ? hexToRgba(color, bgAlpha) : 'transparent'
    };
};

const getDateVisualStyle = (box) => {
    const base = getDateStyle(box);
    const color = box.color || '#3b82f6';

    if (!box.signedDate && !box.signedBy) {
        return {
            ...base,
            borderColor: color,
            color: color,
            backgroundColor: hexToRgba(color, 0.1),
        };
    } else {
        return {
            ...base,
            borderColor: '#36454F',
            color: '#36454F',
        };
    }
};

const goToNextPage = () => { if (currentViewPage.value < totalPages.value) currentViewPage.value++; };
const goToPrevPage = () => { if (currentViewPage.value > 1) currentViewPage.value--; };

// Scroll to box and select
const selectAndScrollToBox = async (box) => {
    selectedBoxId.value = box.id;
    currentViewPage.value = box.page;

    await nextTick();

    if (containerRef.value && containerRef.value.parentElement) {
        const scrollContainerEl = containerRef.value.parentElement;
        const containerHeight = scrollContainerEl.clientHeight;
        const targetScrollTop = box.y - (containerHeight / 2) + (box.height / 2);

        scrollContainerEl.scrollTo({
            top: Math.max(0, targetScrollTop),
            behavior: 'smooth'
        });
    }
};

const saveSignatures = () => {
    if (signatureBoxes.value.length === 0) {
        alert('Please add at least one signature box!');
        return;
    }

    const formattedData = signatureBoxes.value.map(box => {
        const canvas = canvasRefs.value[box.page - 1];
        if (!canvas) return null;

        const pdfLibY = Math.round(canvas.height - box.y - box.height);

        let dateObj = null;
        if (box.hasDate && box.datePosition) {
            dateObj = {
                x: Math.round(box.datePosition.x),
                y: Math.round(box.datePosition.y),
                width: Math.round(box.datePosition.width || 100),
                height: Math.round(box.datePosition.height || 30),
                canvasWidth: canvas.width,
                canvasHeight: canvas.height,
                dateText: new Date().toLocaleDateString('en-US')
            };
        }

        const existingSignature = props.existingSignatures?.find(sig => sig.id === box.id);
        const signer = findSigner(box.assignedEmplId, box.assignedTo);

        return {
            id: box.id,
            assignedTo: box.assignedTo,
            assignedEmplId: box.assignedEmplId,
            page: box.page,
            x: Math.round(box.x),
            y: Math.round(box.y),
            width: Math.round(box.width),
            height: Math.round(box.height),
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            pdfLibY: pdfLibY,

            imageSrc: existingSignature?.imageSrc || box.imageSrc || null,
            isEmpty: existingSignature?.isEmpty ?? box.isEmpty ?? true,
            signedBy: existingSignature?.signedBy || box.signedBy || null,

            hasDate: box.hasDate,
            datePosition: dateObj,

            color: box.color || signer?.color || null,
            signatureLock: !!box.signatureLock,
            dateLock: !!box.dateLock,
            approvalOrder: Number(box.approvalOrder || signer?.approvalOrder || 1),
            enforceSequentialOrder: enforceSequentialOrder.value,
        };
    }).filter(Boolean);

    emit('save-signatures', formattedData);
    emit('close');

    query.value.search = "";
    availableApprovers.value = null;
    approverIndex.value = -1;
    newBoxForm.value = {
        assignedTo: '',
        hasDate: true,
        dateOffset: 5,
        assignedEmplId: "",
        assignedColor: undefined,
        signatureWidth: 200,
        signatureHeight: 60,
        signatureLock: false,
        dateLock: false,
        dateWidth: 100,
        dateHeight: 30,
    };
};

onMounted(() => document.addEventListener('mouseup', handleMouseUp));
onUnmounted(() => document.removeEventListener('mouseup', handleMouseUp));
</script>

<template>
    <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center w-full z-50"
        @click.self="emit('close')">
        <div class="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[95vh] flex flex-col m-4">

            <!-- Header -->
            <div class="flex items-center justify-between p-4 border-b">
                <div>
                    <h2 class="text-xl font-semibold">Place Signature Boxes</h2>
                    <p class="text-sm text-gray-600 mt-1">Click to place a fixed-size signature area. Drag to move.</p>
                </div>
                <button @click="emit('close')" class="p-2 hover:bg-gray-100 rounded-full transition">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div class="flex flex-1 overflow-hidden">
                <!-- Left Sidebar -->
                <div class="w-80 border-r bg-gray-50 p-4 overflow-y-auto">

                    <!-- Sequential Order Toggle -->
                    <div class="bg-white rounded-lg shadow p-4 mb-4">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    v-model="enforceSequentialOrder" 
                                    id="sequentialOrder" 
                                    class="rounded w-4 h-4"
                                />
                                <label for="sequentialOrder" class="text-sm font-semibold text-gray-700">
                                    Enforce Sequential Signer Order
                                </label>
                            </div>
                            <div v-if="enforceSequentialOrder" class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                ENABLED
                            </div>
                        </div>
                        <p class="text-xs text-gray-500 mt-2">
                            When enabled, signatures must be completed in the order listed below.
                        </p>
                    </div>

                    <!-- Signers List (Draggable) -->
                    <div class="bg-white rounded-lg shadow p-4 mb-4">
                        <h3 class="font-semibold mb-3">Signers ({{ signers.length }})</h3>
                        <div v-if="signers.length === 0" class="text-sm text-gray-500">
                            No signers yet. Use "Assign" to add from the directory.
                        </div>

                        <draggable
                            v-model="signers"
                            item-key="emplId"
                            @end="onSignersDragEnd"
                            handle=".signer-drag-handle"
                            class="space-y-2"
                        >
                            <template #item="{ element: s, index }">
                                <div
                                    class="w-full border rounded p-2 transition flex items-center justify-between gap-2"
                                    :class="(newBoxForm.assignedEmplId === s.emplId || newBoxForm.assignedTo === s.name)
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-300'"
                                >
                                    <!-- Left side: drag handle, number, color, name -->
                                    <div class="flex items-center gap-2 flex-1 min-w-0">
                                        <span
                                            class="signer-drag-handle cursor-move text-gray-400 hover:text-gray-600"
                                            title="Drag to reorder"
                                        >
                                            ⋮⋮
                                        </span>
                                        <span
                                            v-if="enforceSequentialOrder"
                                            class="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 text-gray-700 text-xs font-bold flex items-center justify-center"
                                        >
                                            {{ s.approvalOrder }}
                                        </span>
                                        <span
                                            class="flex-shrink-0 inline-block w-3 h-3 rounded"
                                            :style="{ backgroundColor: s.color }"
                                        ></span>
                                        <span class="font-medium truncate">{{ s.name }}</span>
                                    </div>

                                    <!-- Right side: action buttons -->
                                    <div class="flex items-center gap-1 flex-shrink-0">
                                        <!-- Up/Down (optional, you can remove them if dragging is enough) -->
                                        <!-- <template v-if="enforceSequentialOrder">
                                            <button
                                                @click="moveSignerUp(index)"
                                                :disabled="index === 0"
                                                class="p-1 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                                title="Move up"
                                            >
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                                                </svg>
                                            </button>
                                            <button
                                                @click="moveSignerDown(index)"
                                                :disabled="index === signers.length - 1"
                                                class="p-1 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                                title="Move down"
                                            >
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>
                                        </template> -->

                                        <button
                                            @click="setActiveSigner(s)"
                                            class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                                        >
                                            Select
                                        </button>

                                        <button
                                            @click="removeSigner(index)"
                                            class="p-1 hover:bg-red-100 text-red-600 rounded"
                                            title="Remove signer"
                                        >
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </template>
                        </draggable>
                    </div>

                    <!-- Add Box Form -->
                    <div class="bg-white rounded-lg shadow p-4 mb-4">
                        <button @click="showAddForm = !showAddForm"
                            class="w-full flex items-center justify-between text-left font-semibold mb-2">
                            <span>📝 New Signature Box</span>
                            <svg class="w-5 h-5 transition-transform" :class="showAddForm ? 'rotate-180' : ''"
                                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        <div v-show="showAddForm" class="space-y-3 pt-2 border-t">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Assign To *
                                </label>

                                <div class="flex gap-2 items-center">
                                    <input v-model="newBoxForm.assignedTo" type="text" placeholder="Enter user name..."
                                        class="flex-1 border rounded px-3 py-2 text-sm" disabled />

                                    <button @click="handleAssignUser"
                                        class="px-2 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                                        Assign
                                    </button>
                                </div>
                            </div>
                            <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
                                <div class="flex items-center gap-2">
                                    <input type="checkbox" v-model="newBoxForm.hasDate" id="hasDate" class="rounded" />
                                    <label for="hasDate" class="text-sm font-medium text-gray-700">Date field</label>
                                </div>
                                <div class="flex items-center gap-2">
                                    <input type="checkbox" v-model="newBoxForm.signatureLock" id="signatureLock"
                                        class="rounded" />
                                    <label for="signatureLock" class="text-sm font-medium text-gray-700">Sig Lock</label>
                                </div>
                                <div class="flex items-center gap-2">
                                    <input type="checkbox" v-model="newBoxForm.dateLock" id="dateLock" class="rounded" />
                                    <label for="dateLock" class="text-sm font-medium text-gray-700">Date Lock</label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Boxes List -->
                    <div class="bg-white rounded-lg shadow p-4">
                        <h3 class="font-semibold mb-3">Boxes ({{ signatureBoxes.length }})</h3>
                        <div class="space-y-2 max-h-96 overflow-y-auto">
                            <div v-for="(box, index) in signatureBoxes" :key="box.id"
                                class="p-3 border rounded text-sm cursor-pointer transition-all"
                                :class="selectedBoxId === box.id ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'"
                                @click="selectAndScrollToBox(box)">
                                <div class="flex items-start justify-between mb-1">
                                    <p class="font-semibold text-gray-900 flex items-center gap-2">
                                        <span class="inline-block w-3 h-3 rounded"
                                            :style="{ backgroundColor: box.color || '#3b82f6' }"></span>
                                        {{ box.assignedTo }}
                                        <span v-if="enforceSequentialOrder" 
                                            class="text-xs px-1.5 py-0.5 rounded text-white"
                                            :style="{ backgroundColor: box.color || '#3b82f6' }">
                                            #{{ box.approvalOrder }}
                                        </span>
                                    </p>
                                    <button @click.stop="deleteBox(index)"
                                        class="text-red-500 hover:text-red-700">🗑️</button>
                                </div>
                                <div class="text-xs text-gray-500">
                                    Page {{ box.page }} <span v-if="box.hasDate"
                                        class="text-green-600 ml-1">(+Date)</span>
                                </div>
                                <div class="text-xs text-gray-500">
                                    Signature Lock =
                                   <span v-if="box.signatureLock == true" class="text-white rounded-lg bg-green-600 px-2"> True</span>
                                   <span v-else class="text-white rounded-lg bg-red-600 px-2">  False</span>
                                </div>
                                <div class="text-xs text-gray-500">
                                    Date Lock = 
                                   <span v-if="box.dateLock == true" class="text-white rounded-lg bg-green-600 px-2"> True</span>
                                   <span v-else class="text-white rounded-lg bg-red-600 px-2"> False</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Main Content -->
                <div class="flex-1 flex flex-col overflow-hidden">
                    <!-- Pagination -->
                    <div class="mt-4 flex items-center justify-center gap-4 flex-wrap">
                        <button @click="goToPrevPage" :disabled="currentViewPage === 1"
                            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M15 19l-7-7 7-7" />
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
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M9 5l7 7-7 7" />
                            </svg>
                        </button>

                        <div class="flex items-center gap-2">
                            <input type="number" min="1" :max="totalPages" v-model.number="goToPageNumber"
                                @keydown.enter="scrollToPage(goToPageNumber)"
                                class="border rounded px-2 py-1 w-16 text-sm" placeholder="Page #" />
                            <button @click="scrollToPage(goToPageNumber)"
                                class="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm">
                                Go
                            </button>
                        </div>
                    </div>

                    <!-- PDF Canvas Area -->
                    <div class="flex-1 overflow-auto p-6 bg-gray-100">
                        <div ref="containerRef" class="relative inline-block" @mousemove="handleMouseMove">
                            <div class="relative border-2 border-gray-400 rounded shadow-lg bg-white"
                                @mousedown="placeSignatureOnClick">
                                <canvas v-for="i in totalPages" :key="i" v-show="i === currentViewPage"
                                    :ref="el => { if (el) canvasRefs[i - 1] = el }"
                                    class="block cursor-crosshair"></canvas>
                            </div>

                            <!-- Placed items -->
                            <template v-for="box in getCurrentPageBoxes()" :key="box.id">

                                <!-- Signature Box -->
                                <div class="absolute rounded transition-all draggable-item group"
                                    :style="getBoxVisualStyle(box)" :class="{
                                        'border-2': !box.signedBy,
                                        'cursor-default': !box.isEmpty,
                                        'cursor-move': box.isEmpty && !(isDragging && selectedBoxId === box.id && dragTargetType === 'box'),
                                        'cursor-grabbing': box.isEmpty && isDragging && selectedBoxId === box.id && dragTargetType === 'box'
                                    }" @mousedown.stop="startDragging($event, box.id, 'box')">

                                    <div v-if="!box.signedBy"
                                        class="absolute -top-6 left-0 text-white text-xs px-2 py-1 rounded font-semibold whitespace-nowrap flex items-center gap-1"
                                        :style="{ backgroundColor: box.color || '#3b82f6' }">
                                        {{ box.assignedTo }}
                                        <span v-if="enforceSequentialOrder" class="ml-1 px-1 py-0.5 bg-white bg-opacity-30 rounded">
                                            #{{ box.approvalOrder }}
                                        </span>
                                        <span v-if="box.signatureLock">🔒</span>
                                    </div>

                                    <template v-if="box.isEmpty || box.isEmpty == null">
                                        <template v-if="!box.signatureLock">
                                            <div class="absolute w-3 h-3 bg-blue-500 rounded-full -top-1 -left-1 cursor-nw-resize opacity-0 group-hover:opacity-100"
                                                @mousedown.stop="startResizing($event, box.id, 'nw')"></div>
                                            <div class="absolute w-3 h-3 bg-blue-500 rounded-full -top-1 -right-1 cursor-ne-resize opacity-0 group-hover:opacity-100"
                                                @mousedown.stop="startResizing($event, box.id, 'ne')"></div>
                                            <div class="absolute w-3 h-3 bg-blue-500 rounded-full -bottom-1 -left-1 cursor-sw-resize opacity-0 group-hover:opacity-100"
                                                @mousedown.stop="startResizing($event, box.id, 'sw')"></div>
                                            <div class="absolute w-3 h-3 bg-blue-500 rounded-full -bottom-1 -right-1 cursor-se-resize opacity-0 group-hover:opacity-100"
                                                @mousedown.stop="startResizing($event, box.id, 'se')"></div>
                                        </template>

                                        <div class="flex items-center justify-center h-full">
                                            <span class="text-xs font-bold opacity-50"
                                                :style="{ color: box.color || '#3b82f6' }">Signature Area</span>
                                        </div>
                                    </template>

                                    <template v-else>
                                        <img v-if="box.imageSrc" :src="box.imageSrc" alt="Signature"
                                            class="w-full h-full object-contain" />
                                        <div v-else class="flex items-center justify-center h-full bg-gray-100">
                                            <span class="text-xs text-gray-600">Signature Area</span>
                                        </div>
                                    </template>
                                </div>

                                <!-- Date Box -->
                                <div v-if="box.hasDate"
                                    class="absolute px-2 py-1 text-xs font-semibold rounded draggable-item flex items-center justify-center hover:z-50"
                                    :class="{
                                        'border border-dashed': box.isEmpty || box.isEmpty == null,
                                        'ring-2 ring-blue-300': selectedBoxId === box.id && !box.signedBy,
                                        'cursor-default': !box.isEmpty,
                                        'cursor-grabbing': box.isEmpty && isDragging && selectedBoxId === box.id && dragTargetType === 'date',
                                        'cursor-move': box.isEmpty && !(isDragging && selectedBoxId === box.id && dragTargetType === 'date')
                                    }" :style="getDateVisualStyle(box)"
                                    @mousedown.stop="startDragging($event, box.id, 'date')">

                                    <span class="flex items-center">
                                        {{ box.isEmpty || box.isEmpty == null ? "MM/DD/YYYY" :
                                        box.datePosition?.dateText }}
                                        <span v-if="box.dateLock && box.isEmpty" class="ml-1 text-xs">🔒</span>
                                    </span>
                                </div>

                            </template>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="flex items-center justify-between p-4 border-t bg-gray-50">
                <div class="text-sm text-gray-600">
                    {{ signatureBoxes.length }} item(s) placed
                    <span v-if="enforceSequentialOrder" class="ml-2 text-blue-600 font-semibold">
                        • Sequential Order Enabled
                    </span>
                </div>
                <div class="flex gap-3">
                    <button @click="emit('close')" class="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
                    <button @click="saveSignatures"
                        class="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold">
                        Save Output
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Directory Modal -->
    <div v-if="showModal" @click.self="cancelButton" @keydown.esc="cancelButton"
        class="fixed inset-0 p-4 flex flex-wrap justify-center items-center w-full h-full z-[1000] before:fixed before:inset-0 before:w-full before:h-full before:bg-[rgba(0,0,0,0.5)] overflow-auto font-[sans-serif]">
        <div class="w-full max-w-4xl bg-white shadow-lg rounded-lg p-6 relative">
            <div class="flex gap-2">
                <input type="text" v-model="query.search" @keydown.enter.prevent="handleEnterKey"
                    @keydown.down.prevent="moveDown" @keydown.up.prevent="moveUp"
                    placeholder="Please enter user's name..."
                    class="w-full h-11 p-4 rounded border border-gray-600 focus:outline-none" />
                <button @click="getEmployees"
                    class="py-3 px-4 bg-blue-500 h-11 text-white rounded-md hover:bg-blue-700">
                    <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" stroke-linecap="round" stroke-width="2"
                            d="m21 21-3.5-3.5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
                    </svg>
                </button>
            </div>
            <div class="max-h-60 overflow-y-auto border border-gray-300 rounded mt-2" ref="scrollContainer">
                <div tabindex="0">
                    <div v-for="(user, index) in availableApprovers" :key="index" data-approver
                        @click="selectUser(user)" class="px-4 py-2 hover:bg-gray-200 cursor-pointer"
                        :class="{ 'bg-gray-200 font-bold': index === approverIndex }">
                        <div class="font-medium">{{ formatUserName(user) }}</div>
                    </div>
                    <div v-if="loading" class="p-2 text-gray-400 text-center">
                        Loading users...
                    </div>
                    <div v-else-if="!availableApprovers || availableApprovers.length === 0"
                        class="p-2 text-gray-400 text-center">
                        No users found.
                    </div>
                </div>
            </div>
            <div class="mt-4 flex justify-end gap-2">
                <button @click="cancelButton" class="px-4 py-2 bg-red-500 text-white rounded-lg">
                    Cancel
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.cursor-crosshair {
    cursor: crosshair;
}
.signer-drag-handle {
    user-select: none;
}
</style>