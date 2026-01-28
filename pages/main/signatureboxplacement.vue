<script setup>
import { ref } from 'vue';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { toRaw } from 'vue';
import { getProfile, user } from "~/js/fetchUserProfile";

// State
const isSigningModalOpen = ref(false);
const isPlacementModalOpen = ref(false);
const pdfFile = ref(null);
const signatureFile = ref(null);
const currentUserName = ref();
const currentEmplId = ref();

// Available users for assignment
const availableUsers = ref([
  'John Doe',
  'Jane Smith',
  'Mike Johnson',
  'Sarah Williams'
]);

// Pre-placed signature boxes with user assignments
const prePlacedSignatures = ref([]);

// File upload handlers
const handlePdfUpload = (event) => {
  const file = event.target.files[0];
  if (file && file.type === 'application/pdf') {
    pdfFile.value = file;
  }
};

const handleSignatureUpload = (event) => {
  const file = event.target.files[0];
  if (file && file.type.startsWith('image/')) {
    signatureFile.value = file;
  }
};

// Switch current user
const switchUser = (userName) => {
  currentUserName.value = userName;
  signatureFile.value = null;
};

// Open placement modal
const openPlacementModal = () => {
  if (!pdfFile.value) {
    alert('Please upload a PDF first!');
    return;
  }
  isPlacementModalOpen.value = true;
};

// Save signature boxes from placement modal
const handleSaveSignatures = (boxes) => {
  prePlacedSignatures.value = boxes;
  console.log('Signature boxes saved:', boxes);
  console.log(prePlacedSignatures.value);
};

// Open signing modal
const openSigningModal = () => {
  if (!pdfFile.value) {
    alert('Please upload a PDF first!');
    return;
  }
  if (!signatureFile.value) {
    alert('Please upload your signature image first!');
    return;
  }

  if (prePlacedSignatures.value.length === 0) {
    alert('Please place signature boxes first using "Place Signature Boxes" button!');
    return;
  }

  const userSignatures = prePlacedSignatures.value.filter(
    s => s.assignedEmplId === currentEmplId.value && s.isEmpty
  );

  if (userSignatures.length === 0) {
    alert(`No pending signatures for ${currentUserName.value}`);
    return;
  }

  isSigningModalOpen.value = true;
};

// Handle signature application
const handleSaveAllSignatures = (updatedSignatures) => {
  // Save all signatures at once
  prePlacedSignatures.value = updatedSignatures;
  // Or send to backend API
};

// Close modals
const closeSigningModal = () => {
  isSigningModalOpen.value = false;
};

const closePlacementModal = () => {
  isPlacementModalOpen.value = false;
};

// Clear all signatures
const clearAllSignatures = () => {
  if (confirm('Are you sure you want to clear all signature boxes?')) {
    prePlacedSignatures.value = [];
  }
};

// Reset signatures to unsigned
const resetSignatures = () => {
  if (confirm('Reset all signatures to unsigned?')) {
    prePlacedSignatures.value = prePlacedSignatures.value.map(sig => ({
      ...sig,
      isEmpty: true,
      imageSrc: null,
      signedBy: null,
      signedDate: null,
      datePosition: sig.hasDate ? { ...sig.datePosition, dateText: '' } : null
    }));
  }
};

// Get statistics
const getStats = () => {
  const total = prePlacedSignatures.value.length;
  const signed = prePlacedSignatures.value.filter(s => !s.isEmpty).length;
  const pending = total - signed;
  return { total, signed, pending };
};

const getUserStats = (userName) => {
  const userSigs = prePlacedSignatures.value.filter(s => s.assignedTo === userName);
  const signed = userSigs.filter(s => !s.isEmpty).length;
  const pending = userSigs.length - signed;
  return { total: userSigs.length, signed, pending };
};


const saveFinalPdf = async () => {
  try {
    const stats = getStats();
    if (stats.signed === 0) {
      alert('No signatures to save!');
      return;
    }
    if (stats.pending > 0 && !confirm(`There are still ${stats.pending} pending signature(s). Save anyway?`)) {
      return;
    }
    if (!pdfFile.value) {
      alert('No PDF uploaded.');
      return;
    }

    // Load PDF
    const pdfBytes = await pdfFile.value.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    for (const sigRaw of prePlacedSignatures.value) {
      const sig = toRaw(sigRaw);
      if (!sig || sig.isEmpty || !sig.imageSrc) continue;

      const pageIndex = Math.max(0, (sig.page || 1) - 1);
      if (pageIndex >= pdfDoc.getPageCount()) continue;
      const page = pdfDoc.getPage(pageIndex);

      const pageWidth = page.getWidth();
      const pageHeight = page.getHeight();

      // Scale coordinates from canvas to PDF
      const canvasWidth = sig.canvasWidth || pageWidth;
      const canvasHeight = sig.canvasHeight || pageHeight;

      const scaleX = pageWidth / canvasWidth;
      const scaleY = pageHeight / canvasHeight;

      const xOnPdf = sig.x * scaleX;
      const yOnPdf = pageHeight - sig.y * scaleY - sig.height * scaleY;
      const widthOnPdf = sig.width * scaleX;
      const heightOnPdf = sig.height * scaleY;

      // Embed signature image
      const imgResp = await fetch(sig.imageSrc);
      const imgBytes = await imgResp.arrayBuffer();
      let embeddedImage;
      try {
        embeddedImage = await pdfDoc.embedPng(imgBytes);
      } catch {
        embeddedImage = await pdfDoc.embedJpg(imgBytes);
      }

      page.drawImage(embeddedImage, {
        x: xOnPdf,
        y: yOnPdf,
        width: widthOnPdf,
        height: heightOnPdf
      });

      // Draw date if exists (no background)
      if (sig.hasDate && sig.datePosition) {
        const dp = toRaw(sig.datePosition);

        const dateX = dp.x * scaleX;
        const dateY = pageHeight - dp.y * scaleY - dp.height * scaleY;
        const fontSize = (dp.fontSize || 14) * scaleY;
        const dateText = dp.dateText || sig.signedDate || '';

        // Draw only the text
        page.drawText(dateText, {
          x: dateX + 2, // optional padding
          y: dateY + (dp.height * scaleY - fontSize) / 2,
          size: fontSize,
          font: helveticaFont,
          color: rgb(0, 0, 0)
        });
      }
    }

    // Save PDF and trigger download
    const finalPdfBytes = await pdfDoc.save();
    const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SignedDocument.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    alert('Signed PDF downloaded: SignedDocument.pdf');
  } catch (err) {
    console.error('Error saving final PDF:', err);
    alert('Failed to save PDF. Check console for details.');
  }
};
onMounted(async () => {
  await getProfile();
  currentEmplId.value = user.value.empid;
  currentUserName.value = user.value.requestorname
});


</script>

<template>
  <div class="min-h-screen bg-gray-50 p-8">
    <div class=" mx-auto">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">PDF Multi-User Signature System</h1>
        <p class="text-gray-600">Place signature boxes, assign to users, and collect signatures</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Left Column: Main Controls -->
        <div class="lg:col-span-2 space-y-6">

          <!-- Step 1: Upload PDF -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex items-center gap-2 mb-4">
              <div class="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">1
              </div>
              <h2 class="text-xl font-semibold">Upload PDF Document</h2>
            </div>
            <input type="file" accept="application/pdf" @change="handlePdfUpload"
              class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            <p v-if="pdfFile" class="text-sm text-green-600 mt-2">✓ {{ pdfFile.name }}</p>
          </div>

          <!-- Step 2: Place Signature Boxes -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex items-center gap-2 mb-4">
              <div class="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">2
              </div>
              <h2 class="text-xl font-semibold">Place Signature Boxes</h2>
            </div>
            <p class="text-sm text-gray-600 mb-4">Draw boxes on the PDF where each person should sign</p>
            <button @click="openPlacementModal" :disabled="!pdfFile"
              class="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Place Signature Boxes
            </button>
            <p v-if="prePlacedSignatures.length > 0" class="text-sm text-green-600 mt-2 text-center">
              ✓ {{ prePlacedSignatures.length }} box(es) placed
            </p>
          </div>

          <!-- Step 3: Current User & Sign -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex items-center gap-2 mb-4">
              <div class="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">3
              </div>
              <h2 class="text-xl font-semibold">Sign as User</h2>
            </div>

            <!-- Signature Upload -->
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Upload {{ currentUserName }}'s Signature
              </label>
              <input type="file" accept="image/*" @change="handleSignatureUpload"
                class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              <p v-if="signatureFile" class="text-sm text-green-600 mt-1">✓ {{ signatureFile.name }}</p>
            </div>

            <!-- Sign Button -->
            <button @click="openSigningModal" :disabled="!pdfFile || !signatureFile || prePlacedSignatures.length === 0"
              class="w-full px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed font-bold text-lg flex items-center justify-center gap-2">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Sign Document
            </button>
            <p class="text-xs text-gray-500 mt-2 text-center">
              {{ getUserStats(currentUserName).pending }} signature(s) pending for {{ currentUserName }}
            </p>
          </div>

          <!-- Actions -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-xl font-semibold mb-4">Actions</h2>
            <div class="flex flex-wrap gap-3">
              <button @click="resetSignatures" :disabled="prePlacedSignatures.length === 0"
                class="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold">
                Reset Signatures
              </button>
              <button @click="clearAllSignatures" :disabled="prePlacedSignatures.length === 0"
                class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold">
                Clear All Boxes
              </button>
              <button @click="saveFinalPdf" :disabled="getStats().signed === 0"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold">
                💾 Download PDF
              </button>
            </div>
          </div>
        </div>

        <!-- Right Column: Stats & Signature List -->
        <div class="space-y-6">

          <!-- Overall Progress -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-xl font-semibold mb-4">Document Progress</h2>
            <div class="space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-gray-600">Total Boxes:</span>
                <span class="font-bold text-lg">{{ getStats().total }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-green-600">Signed:</span>
                <span class="font-bold text-lg text-green-600">{{ getStats().signed }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-orange-600">Pending:</span>
                <span class="font-bold text-lg text-orange-600">{{ getStats().pending }}</span>
              </div>
              <div class="mt-4 pt-4 border-t">
                <div class="w-full bg-gray-200 rounded-full h-4">
                  <div class="bg-green-600 h-4 rounded-full transition-all duration-300"
                    :style="{ width: `${getStats().total > 0 ? (getStats().signed / getStats().total * 100) : 0}%` }">
                  </div>
                </div>
                <p class="text-xs text-gray-500 text-center mt-1">
                  {{ getStats().total > 0 ? Math.round(getStats().signed / getStats().total * 100) : 0 }}% Complete
                </p>
              </div>
            </div>
          </div>

          <!-- Signature Boxes List -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-xl font-semibold mb-4">All Signature Boxes</h2>

            <div v-if="prePlacedSignatures.length === 0" class="text-gray-400 text-center py-8 text-sm">
              No signature boxes placed yet
            </div>

            <div v-else class="space-y-2 max-h-96 overflow-y-auto">
              <div v-for="(sig, index) in prePlacedSignatures" :key="sig.id" class="p-3 border rounded text-sm" :class="{
                'border-green-300 bg-green-50': !sig.isEmpty,
                'border-blue-300 bg-blue-50': sig.isEmpty && sig.assignedTo === currentUserName,
                'border-gray-300 bg-gray-50': sig.isEmpty && sig.assignedTo !== currentUserName
              }">
                <div class="flex justify-between items-start">
                  <div>
                    <p class="font-semibold">{{ sig.assignedTo }}</p>
                    <p class="text-xs text-gray-600">Page {{ sig.page }}</p>
                    <p class="text-xs text-gray-500">{{ Math.round(sig.width) }}×{{ Math.round(sig.height) }}px</p>
                  </div>
                  <span v-if="!sig.isEmpty" class="text-green-600 text-xs font-bold">✓ Signed</span>
                  <span v-else class="text-orange-500 text-xs">⏳ Pending</span>
                </div>
                <div v-if="!sig.isEmpty" class="mt-2 pt-2 border-t text-xs text-gray-600">
                  <p>By: {{ sig.signedBy }}</p>
                  <p>Date: {{ sig.signedDate }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Signature Box Placement Modal -->
    <SignatureBoxPlacement :is-open="isPlacementModalOpen" :pdf-file="pdfFile" :existingSignatures="prePlacedSignatures"
      @close="closePlacementModal" @save-signatures="handleSaveSignatures" />

    <!-- Signing Modal -->
    <SigntureModal :is-open="isSigningModalOpen" :pdf-file="pdfFile" :signature-file="signatureFile"
      :current-user-name="currentUserName" :current-empl-id="currentEmplId" :pre-placed-signatures="prePlacedSignatures"
      @close="closeSigningModal" @save-all-signatures="handleSaveAllSignatures" />
  </div>
</template>

<script>
import SignatureBoxPlacement from '~/components/SignatureBoxPlacement.vue';
import SigntureModal from '~/components/SigntureModal.vue';



</script>