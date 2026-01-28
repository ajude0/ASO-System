<script setup>
import { ref, watch, onMounted, nextTick } from 'vue';

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { toRaw } from "vue";

// Props
const props = defineProps({
    isOpen: Boolean,
    pdfTitle: String,
    pdfFile: File,
    signatures: {
        type: Array,
        default: () => []
    }
});

// Emits
const emit = defineEmits(['close']);

// Refs
const containerRef = ref(null);
const pdfDocument = ref(null);
const canvasRefs = ref([]);
const totalPages = ref(0);
const currentViewPage = ref(1);
const goToPageNumber = ref(1);

// Color helper
const hexToRgba = (hex, alpha = 0.2) => {
    const cleaned = hex.replace('#', '');
    const bigint = parseInt(cleaned, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Load PDF when modal opens
watch(() => props.isOpen, async (newVal) => {
    if (newVal && props.pdfFile) {
        await loadPdf();
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
        for (let i = 1; i <= pdf.numPages; i++) {
            await renderPage(i);
        }
    } catch (error) {
        console.error('Error loading PDF:', error);
    }
};


const downloadPdf = async () => {
  try {
    if (!props.pdfFile) {
      alert('PDF file not found');
      return;
    }
    if (!props.signatures || props.signatures.length === 0) {
      alert('No signatures found');
      return;
    }

    // Load PDF
    const pdfBytes = await props.pdfFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    for (const sigRaw of props.signatures) {
      const sig = toRaw(sigRaw);
      if (!sig || sig.isEmpty || !sig.imageSrc) continue;

      const pageIndex = Math.max(0, (sig.page || 1) - 1);
      if (pageIndex >= pdfDoc.getPageCount()) continue;
      const page = pdfDoc.getPage(pageIndex);

      const pageWidth = page.getWidth();
      const pageHeight = page.getHeight();

      // Scale coordinates from canvas to PDF

    // Scale coordinates from canvas to PDF
    const canvasWidth = sig.canvasWidth || pageWidth;
    const canvasHeight = sig.canvasHeight || pageHeight;

    const scaleX = pageWidth / canvasWidth;
    const scaleY = pageHeight / canvasHeight;


      // Embed signature image (PNG/JPG)
      const imgResp = await fetch(sig.imageSrc);
      const imgBytes = await imgResp.arrayBuffer();
      let embeddedImage;
      try {
        embeddedImage = await pdfDoc.embedPng(imgBytes);
      } catch {
        embeddedImage = await pdfDoc.embedJpg(imgBytes);
      }

      // Compute image dimensions with aspect ratio
      const maxImgWidth = sig.width * scaleX;
      const maxImgHeight = sig.height * scaleY;
      const imgAspect = embeddedImage.width / embeddedImage.height;
      let drawWidth = maxImgWidth;
      let drawHeight = drawWidth / imgAspect;
      if (drawHeight > maxImgHeight) {
        drawHeight = maxImgHeight;
        drawWidth = drawHeight * imgAspect;
      }

      // X/Y position for signature
      const xOnPdf = sig.x * scaleX + (maxImgWidth - drawWidth) / 2;
      let yOnPdf = pageHeight - (sig.y + drawHeight) * scaleY;
      

      // Name adjustment
      const hasName = !!sig.showName;
      let fontSize;
      if (hasName) {
        fontSize = Math.max(8, drawHeight * 0.18);
        yOnPdf -= fontSize / 2; // shift up for name
      }
      else{
        fontSize = Math.max(8, drawHeight * 0.18);
        yOnPdf -= fontSize / 1; // shift up for name
      }

      // Draw signature image
      page.drawImage(embeddedImage, {
        x: xOnPdf,
        y: yOnPdf,
        width: drawWidth,
        height: drawHeight,
      });

      // Draw name if exists
      if (hasName) {
        const textWidth = Math.min(
          helveticaFont.widthOfTextAtSize(sig.signedBy, fontSize),
          drawWidth
        );
        const textX = xOnPdf + (drawWidth - textWidth) / 2;
        const textY = yOnPdf - fontSize / 3;

        page.drawText(sig.signedBy, {
          x: textX,
          y: textY,
          size: fontSize,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });
      }

      // Draw date if exists
      if (sig.hasDate && sig.datePosition) {
        const dp = toRaw(sig.datePosition);
        const dateFontSize = (dp.fontSize || 14) * scaleY;

        // Adjust date Y for name shift
        const dateY =
          pageHeight -
          (dp.y + dp.height) * scaleY -
          (hasName ? fontSize / 10 : 0) +
          (dp.height * scaleY - dateFontSize) / 2;

        page.drawText(sig.dateText || sig.signedDate || "", {
          x: dp.x * scaleX + 2, // optional padding
          y: dateY,
          size: dateFontSize,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });
      }
    }

    // Save & download PDF
    const finalPdf = await pdfDoc.save();
    const blob = new Blob([finalPdf], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = props.pdfTitle || 'SignedDocument.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('PDF download failed:', err);
    alert('Failed to generate PDF. See console for details.');
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

// Get signatures for current page - FILTER TO SHOW ONLY SIGNED ONES
const getCurrentPageSignatures = () => {
    return props.signatures.filter(sig =>
        sig.page === currentViewPage.value && sig.imageSrc
    );
};

// Navigation
const goToNextPage = () => {
    if (currentViewPage.value < totalPages.value) currentViewPage.value++;
};

const goToPrevPage = () => {
    if (currentViewPage.value > 1) currentViewPage.value--;
};

const scrollToPage = (pageNum) => {
    if (pageNum >= 1 && pageNum <= totalPages.value) {
        currentViewPage.value = pageNum;
    }
};

// Scroll to specific signature
const scrollToSignature = async (signature) => {
    currentViewPage.value = signature.page;

    await nextTick();

    if (containerRef.value && containerRef.value.parentElement) {
        const scrollContainerEl = containerRef.value.parentElement;
        const containerHeight = scrollContainerEl.clientHeight;
        const targetScrollTop = signature.y - (containerHeight / 2) + (signature.height / 2);

        scrollContainerEl.scrollTo({
            top: Math.max(0, targetScrollTop),
            behavior: 'smooth'
        });
    }
};

// Position styles - FIXED for multi-page navigation
const getBoxStyle = (signature) => {
    const canvas = canvasRefs.value[signature.page - 1];
    if (!canvas) return {};

    // Since only current page canvas is visible, position relative to it directly
    return {
        left: signature.x + 'px',
        top: signature.y + 'px',
        width: signature.width + 'px',
        height: signature.height + 'px'
    };
};

const getDateStyle = (signature) => {
    if (!signature.datePosition) return {};
    const canvas = canvasRefs.value[signature.page - 1];
    if (!canvas) return {};

    // Since only current page canvas is visible, position relative to it directly
    return {
        left: signature.datePosition.x + 'px',
        top: signature.datePosition.y + 'px',
        width: (signature.datePosition.width || 100) + 'px',
        height: (signature.datePosition.height || 30) + 'px'
    };
};

// Visual styles - simplified for view mode
const getBoxVisualStyle = (signature) => {
    const base = getBoxStyle(signature);
    return {
        ...base,
        backgroundColor: 'transparent'
    };
};

const getDateVisualStyle = (signature) => {
    const base = getDateStyle(signature);
    return {
        ...base,
        borderColor: '#36454F',
        color: '#36454F',
    };
};

// Group signatures by signer - ALL SIGNERS (signed and unsigned)
const getSignerGroups = () => {
    const groups = {};

    // Include ALL signatures to show all signers
    props.signatures.forEach(sig => {
        const key = sig.assignedEmplId || sig.assignedTo;
        if (!groups[key]) {
            groups[key] = {
                name: sig.assignedTo,
                emplId: sig.assignedEmplId,
                color: sig.color,
                approvalOrder: sig.approvalOrder,
                signatures: [],
                signedCount: 0
            };
        }
        groups[key].signatures.push(sig);
        if (sig.imageSrc) {
            groups[key].signedCount++;
        }
    });

    const sortedGroups = Object.values(groups).sort((a, b) =>
        Number(a.approvalOrder || 0) - Number(b.approvalOrder || 0)
    );

    // Determine status for sequential signing
    if (isSequentialOrder()) {
        let previousCompleted = true;

        sortedGroups.forEach(group => {
            const isFullySigned = group.signedCount === group.signatures.length;

            if (previousCompleted && !isFullySigned) {
                group.status = 'pending'; // Current signer who needs to sign
                previousCompleted = false;
            } else if (isFullySigned) {
                group.status = 'signed'; // Already completed
            } else {
                group.status = 'waiting'; // Waiting for previous signers
            }
        });
    } else {
        // For non-sequential, just mark as signed or pending
        sortedGroups.forEach(group => {
            group.status = group.signedCount === group.signatures.length ? 'signed' : 'pending';
        });
    }

    return sortedGroups;
};

// Get only signed signatures for the list
const getSignedSignatures = () => {
    return props.signatures.filter(sig => sig.imageSrc);
};

// Check if sequential order is enforced
const isSequentialOrder = () => {
    return props.signatures.some(sig => sig.enforceSequentialOrder);
};
</script>

<template>
    <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center w-full z-50"
        @click.self="emit('close')">
        <div class="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[95vh] flex flex-col m-4">

            <!-- Header -->
            <div class="flex items-center justify-between p-4 border-b">
                <div>
                    <h2 class="text-xl font-semibold">View Document</h2>
                    <p class="text-sm text-gray-600 mt-1">
                        Tracking all signers and completed signatures
                    </p>
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

                    <!-- Sequential Order Info -->
                    <div v-if="isSequentialOrder()" class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                        <div class="flex items-center gap-2 text-blue-700">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span class="text-sm font-semibold">Sequential Signing</span>
                        </div>
                        <p class="text-xs text-blue-600 mt-1">
                            Signatures completed in order.
                        </p>
                    </div>

                    <!-- Signers List - ALL signers (signed and unsigned) -->
                    <div class="bg-white rounded-lg shadow p-4 mb-4">
                        <h3 class="font-semibold mb-3">Signers ({{ getSignerGroups().length }})</h3>

                        <div v-if="getSignerGroups().length === 0" class="text-sm text-gray-500">
                            No signers assigned.
                        </div>

                        <div v-else class="space-y-2">
                            <div v-for="(group, index) in getSignerGroups()" :key="group.emplId || group.name" :class="[
                                'border rounded p-3',
                                group.status === 'signed' ? 'bg-green-50 border-green-200' :
                                    group.status === 'pending' ? 'bg-orange-50 border-orange-200' :
                                        'bg-gray-50 border-gray-300'
                            ]">
                                <div class="flex items-center gap-2 mb-2">
                                    <span v-if="isSequentialOrder()" :class="[
                                        'flex-shrink-0 w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center',
                                        group.status === 'signed' ? 'bg-green-500' :
                                            group.status === 'pending' ? 'bg-orange-500' :
                                                'bg-gray-400'
                                    ]">
                                        {{ group.approvalOrder }}
                                    </span>
                                    <span class="inline-block w-3 h-3 rounded flex-shrink-0"
                                        :style="{ backgroundColor: group.color }"></span>
                                    <span class="font-medium text-sm">{{ group.name }}</span>
                                </div>

                                <div class="flex items-center gap-2 mt-2 ml-8">
                                    <span v-if="group.status === 'signed'"
                                        class="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded font-semibold">
                                        ✓ Signed
                                    </span>
                                    <span v-else-if="group.status === 'pending'"
                                        class="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded font-semibold">
                                        ⏳ Pending
                                    </span>
                                    <span v-else
                                        class="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded font-semibold">
                                        ⏸ Waiting
                                    </span>
                                    <span class="text-xs text-gray-600">
                                        {{ group.signedCount }}/{{ group.signatures.length }} signature{{
                                            group.signatures.length !== 1 ? 's' : '' }}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Signature Boxes List - Only signed ones -->
                    <div class="bg-white rounded-lg shadow p-4">
                        <h3 class="font-semibold mb-3">
                            Completed Signatures ({{ getSignedSignatures().length }})
                        </h3>

                        <div v-if="getSignedSignatures().length === 0" class="text-sm text-gray-500">
                            No completed signatures to display.
                        </div>

                        <div v-else class="space-y-2 max-h-96 overflow-y-auto">
                            <div v-for="(sig, index) in getSignedSignatures()" :key="sig.id"
                                class="p-3 border rounded text-sm cursor-pointer hover:border-blue-400 transition"
                                @click="scrollToSignature(sig)">
                                <div class="flex items-start justify-between mb-1">
                                    <p class="font-semibold text-gray-900 flex items-center gap-2">
                                        <span class="inline-block w-3 h-3 rounded"
                                            :style="{ backgroundColor: sig.color || '#3b82f6' }"></span>
                                        {{ sig.assignedTo }}
                                        <span v-if="isSequentialOrder()"
                                            class="text-xs px-1.5 py-0.5 rounded text-white"
                                            :style="{ backgroundColor: sig.color || '#3b82f6' }">
                                            #{{ sig.approvalOrder }}
                                        </span>
                                    </p>

                                    <span class="text-green-600 text-xs font-bold">✓</span>
                                </div>

                                <div class="text-xs text-gray-500">
                                    Page {{ sig.page }}
                                    <span v-if="sig.hasDate" class="text-green-600 ml-1">(+Date)</span>
                                </div>

                                <div v-if="sig.signedBy" class="text-xs text-gray-700 mt-1 font-medium">
                                    Signed by: {{ sig.signedBy }}
                                </div>

                                <div v-if="sig.signedDate || sig.datePosition?.dateText" class="text-xs text-gray-600">
                                    Date: {{ sig.signedDate || sig.datePosition?.dateText }}
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
                        <div ref="containerRef" class="relative inline-block">
                            <div class="relative border-2 border-gray-400 rounded shadow-lg bg-white">
                                <canvas v-for="i in totalPages" :key="i" v-show="i === currentViewPage"
                                    :ref="el => { if (el) canvasRefs[i - 1] = el }" class="block"></canvas>
                            </div>

                            <!-- Signature Boxes - ONLY SIGNED ONES (have imageSrc) -->
                            <template v-for="sig in getCurrentPageSignatures()" :key="sig.id">

                                <!-- Signature Box - Only render if signed -->
                                <div class="absolute pointer-events-none" :style="getBoxVisualStyle(sig)">

                                    <!-- Signed Signature Content -->
                                    <div class="flex flex-col items-center justify-center h-full relative">
                                        <!-- Signature Image -->
                                        <img v-if="sig.imageSrc" :src="sig.imageSrc" alt="Signature"
                                            class="w-full h-full object-contain z-10" />

                                        <!-- Fallback if no image but marked as signed -->
                                        <span v-else class="text-sm font-bold text-gray-700 italic z-10">
                                            [Signature]
                                        </span>

                                        <!-- Printed name below the line -->
                                        <span v-if="sig.showName"
                                            class="absolute bottom-0 text-[10px] font-semibold tracking-wide text-center w-full text-gray-700">
                                            {{ sig.assignedTo }}
                                        </span>
                                    </div>
                                </div>

                                <!-- Date Box - Only if signed and has date -->
                                <div v-if="sig.hasDate && sig.datePosition"
                                    class="absolute px-2 py-1 text-xs font-semibold rounded pointer-events-none flex items-center justify-center"
                                    :style="getDateVisualStyle(sig)">
                                    <span>
                                        {{ sig.signedDate || sig.datePosition?.dateText || new
                                        Date().toLocaleDateString('en-US') }}
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
                    {{ getSignedSignatures().length }} completed signature{{ getSignedSignatures().length !== 1 ? 's' :
                    '' }}
                    <span v-if="isSequentialOrder()" class="ml-2 text-blue-600 font-semibold">
                        • Sequential Signing Enforced
                    </span>
                </div>
                <div>
                    <button @click="downloadPdf"
                        class="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold mr-2">
                        Download PDF
                    </button>
                    <button @click="emit('close')"
                        class="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold">
                        Close
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* No special styles needed */
</style>