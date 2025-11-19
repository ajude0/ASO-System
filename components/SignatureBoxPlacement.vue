<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
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

// Current box being drawn/resized
const isDrawing = ref(false);
const isDragging = ref(false);
const isResizing = ref(false);
const currentBox = ref(null);
const dragStart = ref({ x: 0, y: 0 });
const dragOffset = ref({ x: 0, y: 0 });
const resizeHandle = ref(null);
const dragTargetType = ref(null); // 'box' | 'date'

// Selected box ID
const selectedBoxId = ref(null);
const goToPageNumber = ref(1);

// New box form
const showAddForm = ref(false);
const newBoxForm = ref({
    assignedTo: '',
    hasDate: true,
    dateOffset: 5,
    assignedEmplId: "",
});

const  handleAssignUser = async () => {
  showModal.value = true;
   await getEmployees();
};

const selectUser = (user) => {
    newBoxForm.value.assignedTo = user.employeename2;
    newBoxForm.value.assignedEmplId = user.emplId;
    console.log(newBoxForm.value.assignedEmplId);
    showModal.value = false;
}

const scrollToPage = (pageNum) => {
    if (pageNum >= 1 && pageNum <= totalPages.value) {
        currentViewPage.value = pageNum;
    }
};

// Helper to generate truly unique IDs
const generateId = () => `sig_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
watch(currentViewPage, async () => {
    await nextTick(); // wait for DOM to update
    // Force Vue to recalc positions of boxes
    signatureBoxes.value = signatureBoxes.value.map(box => ({ ...box }));
});
// Load PDF and Data
watch(() => props.isOpen, async (newVal) => {
    if (newVal && props.pdfFile) {
        await loadPdf();

        if (props.existingSignatures && props.existingSignatures.length > 0) {
            const seenIds = new Set();

            signatureBoxes.value = props.existingSignatures.map(sig => {
                let safeId = sig.id;
                if (!safeId || seenIds.has(safeId)) {
                    safeId = generateId();
                }
                seenIds.add(safeId);

                return {
                    ...sig,
                    hasDate: sig.hasDate === true || (sig.datePosition !== null && sig.datePosition !== undefined),
                    id: safeId
                };
            });
        } else {
            signatureBoxes.value = [];
        }

        if (props.availableUsers.length > 0) {
            newBoxForm.value.assignedTo = props.availableUsers[0];
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

// Drawing Logic
const startDrawingBox = (e) => {
    if (e.target.closest('.draggable-item')) return;

    if (!showAddForm.value || !newBoxForm.value.assignedTo) {
        alert('Please select a user to assign the signature to first!');
        showAddForm.value = true;
        return;
    }

    const canvas = canvasRefs.value[currentViewPage.value - 1];
    const canvasRect = canvas.getBoundingClientRect();
    const x = e.clientX - canvasRect.left;
    const y = e.clientY - canvasRect.top;

    isDrawing.value = true;
    dragStart.value = { x, y };

    currentBox.value = {
        id: generateId(),
        assignedTo: newBoxForm.value.assignedTo,
        page: currentViewPage.value,
        x: x,
        y: y,
        width: 0,
        height: 0,
        hasDate: newBoxForm.value.hasDate,
        assignedEmplId: newBoxForm.value.assignedEmplId,
        datePosition: null
    };
};

const drawBox = (e) => {
    if (!isDrawing.value || !currentBox.value) return;
    const canvasRect = canvasRefs.value[currentViewPage.value - 1].getBoundingClientRect();
    const currentX = e.clientX - canvasRect.left;
    const currentY = e.clientY - canvasRect.top;

    currentBox.value.width = Math.abs(currentX - dragStart.value.x);
    currentBox.value.height = Math.abs(currentY - dragStart.value.y);
    currentBox.value.x = Math.min(dragStart.value.x, currentX);
    currentBox.value.y = Math.min(dragStart.value.y, currentY);
};

const finishDrawingBox = () => {
    if (isDrawing.value && currentBox.value) {
        if (currentBox.value.width > 10 && currentBox.value.height > 10) {
            if (currentBox.value.hasDate) {
                currentBox.value.datePosition = {
                    x: currentBox.value.x,
                    y: currentBox.value.y + currentBox.value.height + newBoxForm.value.dateOffset,
                    width: 100,
                    height: 30
                };
            }
            signatureBoxes.value.push(currentBox.value);
            selectedBoxId.value = currentBox.value.id;
        }
        currentBox.value = null;
    }
    isDrawing.value = false;
};

const startDragging = (e, id, type = 'box') => {
    e.stopPropagation();
    isDragging.value = true;
    selectedBoxId.value = id;
    dragTargetType.value = type;

    const box = signatureBoxes.value.find(b => b.id === id);
    if (!box) return;

    const canvasRect = canvasRefs.value[box.page - 1].getBoundingClientRect();

    if (type === 'box') {
        dragOffset.value = {
            x: e.clientX - canvasRect.left - box.x,
            y: e.clientY - canvasRect.top - box.y
        };
    } else if (type === 'date') {
        dragOffset.value = {
            x: e.clientX - canvasRect.left - box.datePosition.x,
            y: e.clientY - canvasRect.top - box.datePosition.y
        };
    }
};

const dragBox = (e) => {
    if (!isDragging.value || !selectedBoxId.value) return;

    const box = signatureBoxes.value.find(b => b.id === selectedBoxId.value);
    // Safety Guard: Ensure box exists and we are on the correct page
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
            box.datePosition.x += deltaX;
            box.datePosition.y += deltaY;
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
    isResizing.value = true;
    selectedBoxId.value = id;
    resizeHandle.value = handle;

    const box = signatureBoxes.value.find(b => b.id === id);
    if (!box) return;

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

    const canvasRect = canvasRefs.value[box.page - 1].getBoundingClientRect();
    const dx = (e.clientX - canvasRect.left) - dragStart.value.x;
    const dy = (e.clientY - canvasRect.top) - dragStart.value.y;

    switch (resizeHandle.value) {
        case 'se':
            box.width = Math.max(50, dragStart.value.boxWidth + dx);
            box.height = Math.max(30, dragStart.value.boxHeight + dy);
            break;
        case 'sw':
            box.width = Math.max(50, dragStart.value.boxWidth - dx);
            box.height = Math.max(30, dragStart.value.boxHeight + dy);
            box.x = dragStart.value.boxX + (dragStart.value.boxWidth - box.width);
            break;
        case 'ne':
            box.width = Math.max(50, dragStart.value.boxWidth + dx);
            box.height = Math.max(30, dragStart.value.boxHeight - dy);
            box.y = dragStart.value.boxY + (dragStart.value.boxHeight - box.height);
            break;
        case 'nw':
            box.width = Math.max(50, dragStart.value.boxWidth - dx);
            box.height = Math.max(30, dragStart.value.boxHeight - dy);
            box.x = dragStart.value.boxX + (dragStart.value.boxWidth - box.width);
            box.y = dragStart.value.boxY + (dragStart.value.boxHeight - box.height);
            break;
    }
};

const handleMouseUp = () => {
    finishDrawingBox();
    isDragging.value = false;
    isResizing.value = false;
    resizeHandle.value = null;
    dragTargetType.value = null;
};

const handleMouseMove = (e) => {
    if (isDrawing.value) drawBox(e);
    else if (isDragging.value) dragBox(e);
    else if (isResizing.value) resizeBox(e);
};

const deleteBox = (index) => {
    const boxToDelete = signatureBoxes.value[index];
    if (selectedBoxId.value === boxToDelete.id) {
        selectedBoxId.value = null;
    }
    signatureBoxes.value.splice(index, 1);
};

const getCurrentPageBoxes = () => signatureBoxes.value.filter(box => box.page === currentViewPage.value);

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

const goToNextPage = () => { if (currentViewPage.value < totalPages.value) currentViewPage.value++; };
const goToPrevPage = () => { if (currentViewPage.value > 1) currentViewPage.value--; };

// --- NEW SCROLL FUNCTION ---
const selectAndScrollToBox = async (box) => {
    // 1. Set selection and switch page
    selectedBoxId.value = box.id;
    currentViewPage.value = box.page;

    // 2. Wait for Vue to update the DOM (so the correct canvas is visible)
    await nextTick();

    // 3. Calculate Scroll Position
    // containerRef is the inner wrapper. The scrollbar is on its PARENT.
    if (containerRef.value && containerRef.value.parentElement) {
        const scrollContainer = containerRef.value.parentElement;

        // Calculate the position to center the box in the viewport
        const containerHeight = scrollContainer.clientHeight;
        const targetScrollTop = box.y - (containerHeight / 2) + (box.height / 2);

        // Scroll smoothly
        scrollContainer.scrollTo({
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

        // **CRITICAL FIX: Preserve existing signature data**
        const existingSignature = props.existingSignatures?.find(sig => sig.id === box.id);

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

            // Preserve existing signature fields OR use defaults
            imageSrc: existingSignature?.imageSrc || null,
            isEmpty: existingSignature?.isEmpty ?? true,  // ?? preserves undefined/null, uses true as default
            signedBy: existingSignature?.signedBy || null,

            hasDate: box.hasDate,
            datePosition: dateObj
        };
    }).filter(Boolean);

    emit('save-signatures', formattedData);
    emit('close');
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
                    <p class="text-sm text-gray-600 mt-1">Draw boxes and position the date fields independently</p>
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

                                <div class="flex gap-2">
                                    <!-- INPUT -->
                                    <input v-model="newBoxForm.assignedTo" type="text" placeholder="Enter user name..."
                                        class="flex-1 border rounded px-3 py-2 text-sm" />

                                    <!-- BUTTON -->
                                    <button @click="handleAssignUser"
                                        class="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                                        Assign
                                    </button>
                                </div>
                            </div>


                            <div class="flex items-center gap-2">
                                <input type="checkbox" v-model="newBoxForm.hasDate" id="hasDate" class="rounded" />
                                <label for="hasDate" class="text-sm font-medium text-gray-700">Include date
                                    field</label>
                            </div>

                            <div v-if="newBoxForm.hasDate">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Default Date Offset</label>
                                <input v-model.number="newBoxForm.dateOffset" type="number" min="0"
                                    class="w-full border rounded px-3 py-2 text-sm" />
                            </div>
                        </div>
                    </div>

                    <!-- List -->
                    <div class="bg-white rounded-lg shadow p-4">
                        <h3 class="font-semibold mb-3">Boxes ({{ signatureBoxes.length }})</h3>
                        <div class="space-y-2 max-h-96 overflow-y-auto">
                            <div v-for="(box, index) in signatureBoxes" :key="box.id"
                                class="p-3 border rounded text-sm cursor-pointer transition-all"
                                :class="selectedBoxId === box.id ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'"
                                @click="selectAndScrollToBox(box)">
                                <div class="flex items-start justify-between mb-1">
                                    <p class="font-semibold text-gray-900">{{ box.assignedTo }}</p>
                                    <button @click.stop="deleteBox(index)"
                                        class="text-red-500 hover:text-red-700">🗑️</button>
                                </div>
                                <div class="text-xs text-gray-500">
                                    Page {{ box.page }} <span v-if="box.hasDate"
                                        class="text-green-600 ml-1">(+Date)</span>
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
                        <!-- Scroll Container is HERE (parent of containerRef) -->
                        <div ref="containerRef" class="relative inline-block" @mousemove="handleMouseMove">
                            <div class="relative border-2 border-gray-400 rounded shadow-lg bg-white"
                                @mousedown="startDrawingBox">
                                <canvas v-for="i in totalPages" :key="i" v-show="i === currentViewPage"
                                    :ref="el => { if (el) canvasRefs[i - 1] = el }"
                                    class="block cursor-crosshair"></canvas>
                            </div>

                            <!-- Drawing Preview -->
                            <div v-if="isDrawing && currentBox"
                                class="absolute border-2 border-dashed border-blue-500 bg-blue-100 bg-opacity-30 pointer-events-none"
                                :style="{
                                    left: currentBox.x + 'px',
                                    top: currentBox.y + 'px',
                                    width: currentBox.width + 'px',
                                    height: currentBox.height + 'px'
                                }"></div>

                            <!-- PLACED ITEMS -->
                            <template v-for="box in getCurrentPageBoxes()" :key="box.id">

                                <!-- 1. Signature Box -->
                                <div class="absolute border-2 rounded transition-all cursor-move group draggable-item"
                                    :class="selectedBoxId === box.id ? 'border-blue-500 bg-blue-100 bg-opacity-40' : 'border-purple-400 bg-purple-50 bg-opacity-30 hover:border-purple-600'"
                                    :style="getBoxStyle(box)" @mousedown.stop="startDragging($event, box.id, 'box')">
                                    <div
                                        class="absolute -top-6 left-0 bg-purple-600 text-white text-xs px-2 py-1 rounded font-semibold whitespace-nowrap">
                                        {{ box.assignedTo }}
                                    </div>

                                    <!-- Resize Handles -->
                                    <div class="absolute w-3 h-3 bg-blue-500 rounded-full -top-1 -left-1 cursor-nw-resize opacity-0 group-hover:opacity-100"
                                        @mousedown.stop="startResizing($event, box.id, 'nw')"></div>
                                    <div class="absolute w-3 h-3 bg-blue-500 rounded-full -top-1 -right-1 cursor-ne-resize opacity-0 group-hover:opacity-100"
                                        @mousedown.stop="startResizing($event, box.id, 'ne')"></div>
                                    <div class="absolute w-3 h-3 bg-blue-500 rounded-full -bottom-1 -left-1 cursor-sw-resize opacity-0 group-hover:opacity-100"
                                        @mousedown.stop="startResizing($event, box.id, 'sw')"></div>
                                    <div class="absolute w-3 h-3 bg-blue-500 rounded-full -bottom-1 -right-1 cursor-se-resize opacity-0 group-hover:opacity-100"
                                        @mousedown.stop="startResizing($event, box.id, 'se')"></div>

                                    <div class="flex items-center justify-center h-full">
                                        <span class="text-xs font-bold text-purple-700 opacity-50">{{ box.isEmpty
                                            }}</span>
                                    </div>
                                </div>

                                <!-- 2. Date Box -->
                                <div v-if="box.hasDate"
                                    class="absolute border border-dashed border-green-500 bg-green-50 bg-opacity-80 px-2 py-1 text-xs text-green-700 font-semibold rounded cursor-move draggable-item flex items-center justify-center hover:bg-green-100 hover:border-green-700 hover:z-50"
                                    :class="selectedBoxId === box.id ? 'ring-2 ring-green-300' : ''"
                                    :style="getDateStyle(box)" @mousedown.stop="startDragging($event, box.id, 'date')">
                                    Date: MM/DD/YYYY
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

  <div v-if="showModal"
    @click.self="cancelButton"
    @keydown.esc="cancelButton"     
    class="fixed inset-0 p-4 flex flex-wrap justify-center items-center w-full h-full z-[1000] before:fixed before:inset-0 before:w-full before:h-full before:bg-[rgba(0,0,0,0.5)] overflow-auto font-[sans-serif]">
    <div class="w-full max-w-4xl bg-white shadow-lg rounded-lg p-6 relative">
      <div class="flex gap-2">
        <input type="text" v-model="query.search" @keydown.enter.prevent="handleEnterKey"
          @keydown.down.prevent="moveDown" @keydown.up.prevent="moveUp" placeholder="Please enter user's name..."
          class="w-full h-11 p-4 rounded border border-gray-600 focus:outline-none" />
        <button @click="getEmployees" class="py-3 px-4 bg-blue-500 h-11 text-white rounded-md hover:bg-blue-700">
          <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
            width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-width="2"
              d="m21 21-3.5-3.5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
          </svg>
        </button>
      </div>
      <div class="max-h-60 overflow-y-auto border border-gray-300 rounded mt-2" ref="scrollContainer">
        <div tabindex="0">
          <div v-for="(user, index) in availableApprovers" :key="index" @click="selectUser(user)"
            class="px-4 py-2 hover:bg-gray-200 cursor-pointer"
            :class="{ 'bg-gray-200 font-bold': index === approverIndex }">
            {{ user.employeename2 }}
          </div>
          <div v-if="loading" class="p-2 text-gray-400 text-center">
            Loading users...
          </div>
          <div v-else-if="availableApprovers.length === 0" class="p-2 text-gray-400 text-center">
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
</style>