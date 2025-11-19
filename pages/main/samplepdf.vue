<template>
    <div class="container mx-auto p-6 max-w-4xl">
        <div class="bg-white rounded-lg shadow-lg p-6">
            <h1 class="text-2xl font-bold mb-6 text-gray-800">PDF Signature Tool</h1>

            <div class="grid md:grid-cols-2 gap-6">
                <!-- Left Column: Uploads -->
                <div>
                    <!-- Upload PDF -->
                    <div class="mb-6">
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Upload PDF Document
                        </label>
                        <div class="flex items-center gap-4">
                            <input type="file" accept="application/pdf" @change="handlePdfUpload"
                                class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                            <span v-if="pdfFile" class="text-green-600 text-sm">✓</span>
                        </div>
                        <p v-if="pdfFile" class="text-xs text-gray-500 mt-1">{{ pdfFile.name }}</p>
                    </div>

                    <!-- Upload Your Signature -->
                    <div class="mb-6">
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Upload Your Signature Image
                        </label>
                        <div class="flex items-center gap-4">
                            <input type="file" accept="image/*" @change="handleSignatureUpload"
                                class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100" />
                            <span v-if="signatureFile" class="text-green-600 text-sm">✓</span>
                        </div>
                        <p v-if="signatureFile" class="text-xs text-gray-500 mt-1">{{ signatureFile.name }}</p>

                        <!-- Preview Your Signature -->
                        <div v-if="signaturePreview" class="mt-3">
                            <p class="text-xs text-gray-600 mb-1">Preview:</p>
                            <img :src="signaturePreview" class="border border-blue-300 rounded p-2 max-h-20"
                                alt="Your signature preview" />
                        </div>
                    </div>

                    <!-- Open Modal Button -->
                    <button @click="openModal" :disabled="!pdfFile || !signatureFile"
                        class="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition">
                        {{ buttonText }}
                    </button>
                </div>

                <!-- Right Column: Pre-placed Signatures from Database -->
                <div>
                    <h3 class="text-sm font-medium text-gray-700 mb-2">
                        Pre-placed Signatures from Database ({{ prePlacedSignatures.length }})
                    </h3>

                    <div class="border rounded-lg p-4 max-h-96 overflow-auto bg-gray-50">
                        <div v-if="prePlacedSignatures.length === 0" class="text-center text-gray-400 py-8">
                            No pre-placed signatures in database
                        </div>

                        <div v-else class="space-y-3">
                            <div v-for="(sig, index) in prePlacedSignatures" :key="index"
                                class="bg-white border rounded-lg p-3">
                                <div class="flex items-start gap-3">
                                    <img :src="sig.imageSrc" class="w-16 h-16 object-contain border rounded bg-gray-50"
                                        alt="Pre-placed signature" />
                                    <div class="flex-1 text-xs">
                                        <p class="font-semibold text-gray-700">
                                            <span class="inline-block w-2 h-2 bg-gray-400 rounded-full mr-1"></span>
                                            Pre-placed #{index + 1}
                                        </p>
                                        <p class="text-gray-500">Page: {{ sig.page }}</p>
                                        <p class="text-gray-500">Position: ({{ sig.x }}, {{ sig.y }})</p>
                                        <p class="text-gray-500">Size: {{ sig.width }}×{{ sig.height }}px</p>
                                        <p v-if="sig.documentId" class="text-gray-400 text-xs">Doc ID: {{ sig.documentId
                                            }}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Load Sample Data Button -->
                    <button @click="loadSampleSignatures"
                        class="w-full mt-3 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded hover:bg-gray-200 transition">
                        Load Sample Pre-placed Signatures
                    </button>
                </div>
            </div>

            <!-- Result Display -->
            <div v-if="savedUserSignature" class="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 class="font-semibold text-green-800 mb-2">✓ Your Signature Position Saved</h3>
                <div class="text-sm text-gray-700 space-y-1">
                    <p><strong>Page:</strong> {{ savedUserSignature.page }}</p>
                    <p><strong>Position:</strong> X: {{ savedUserSignature.x }}px, Y: {{ savedUserSignature.y }}px</p>
                    <p><strong>Size:</strong> {{ savedUserSignature.width }}px × {{ savedUserSignature.height }}px</p>
                </div>

                <!-- JSON Output -->
                <details class="mt-3">
                    <summary class="cursor-pointer text-sm text-blue-600 hover:text-blue-800 font-medium">
                        View JSON Data (for saving to database)
                    </summary>
                    <pre
                        class="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">{{ JSON.stringify(savedUserSignature, null, 2) }}</pre>
                </details>
            </div>

            <!-- Info Box -->
            <div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 class="font-semibold text-blue-800 mb-2">ℹ️ How it works:</h3>
                <ul class="text-sm text-blue-700 space-y-1 list-disc list-inside">
                    <li><strong>Pre-placed signatures</strong> (gray borders) are loaded from database and displayed on
                        PDF - they cannot be moved</li>
                    <li><strong>Your signature</strong> (blue border) can be dragged to any position</li>
                    <li><strong>Date display</strong> (green border) can also be dragged to any position</li>
                    <li>When you click "Save Position", only your signature position is saved</li>
                    <li>The pre-placed signatures remain as they are in the database</li>
                </ul>
            </div>
        </div>

        <!-- PDF Signature Modal -->
        <DraggableSignaturePdf :isOpen="isModalOpen" :pdfFile="pdfFile" :signatureFile="signatureFile"
            :prePlacedSignatures="prePlacedSignatures" @close="isModalOpen = false"
            @save-position="handleSaveUserSignature" />
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import DraggableSignaturePdf from '~/components/DraggableSignaturePdf.vue';

const pdfFile = ref(null);
const signatureFile = ref(null);
const signaturePreview = ref(null);
const isModalOpen = ref(false);
const savedUserSignature = ref(null);

// Pre-placed signatures from database
// In real app, this would come from: await $fetch('/api/signatures?documentId=123')
const prePlacedSignatures = ref([
    // Example format matching your database structure:
    {
        canvasHeight: 1108,
        canvasWidth: 856,
        datePosition: {
            canvasHeight: 1108,
            canvasWidth: 856,
            dateText: "01-10-2032",
            height:31,
            width: 103,
            x: 672,
            y: 394,
        },
        height: 172,
        imageSrc: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', // placeholder
        page: 16,
        pdfLibY: 639,
        width: 261,
        x: 445,
        y: 297
    },
     {
        canvasHeight: 1108,
        canvasWidth: 856,
        datePosition: {
            canvasHeight: 1108,
            canvasWidth: 856,
            dateText: "11-18-2032",
            height:31,
            width: 103,
            x: 676,
            y: 607,
        },
        height: 48,
        imageSrc: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', // placeholder
        page: 16,
        pdfLibY: 465,
        width: 93,
        x: 534,
        y: 595
    }
]);

const handlePdfUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
        pdfFile.value = file;
        // In real app, you might load pre-placed signatures here
        // loadPrePlacedSignatures(file);
    } else {
        alert('Please select a valid PDF file');
    }
};

const handleSignatureUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        signatureFile.value = file;
        signaturePreview.value = URL.createObjectURL(file);
    } else {
        alert('Please select a valid image file');
    }
};

const openModal = () => {
    if (pdfFile.value && signatureFile.value) {
        isModalOpen.value = true;
    }
};
const handleSaveUserSignature = (positionData) => {
    console.log('User signature position:', positionData);

    // Log the date position specifically
    if (positionData.datePosition) {
        console.log('Date position captured from modal:', positionData.datePosition);
    }

    savedUserSignature.value = positionData;

    // Save to your database
    saveUserSignatureToDatabase(positionData);
};
// Example: Save user's signature to database
const saveUserSignatureToDatabase = async (data) => {
    try {
        // Add documentId if needed
        const signatureData = {
            documentId: 'your-document-id', // Get this from your app state
            page: data.page,
            x: data.x,
            y: data.y,
            width: data.width,
            height: data.height,
            imageSrc: data.imageSrc
        };

        // await $fetch('/api/signatures', {
        //   method: 'POST',
        //   body: signatureData
        // });

        console.log('Would save to database:', signatureData);
    } catch (error) {
        console.error('Error saving signature:', error);
    }
};

// Example: Load pre-placed signatures from database
const loadPrePlacedSignatures = async (documentId) => {
    try {
        // const response = await $fetch(`/api/signatures?documentId=${documentId}`);
        // prePlacedSignatures.value = response.signatures;

        console.log('Would load from database for document:', documentId);
    } catch (error) {
        console.error('Error loading signatures:', error);
    }
};

// Load sample pre-placed signatures for demonstration
const loadSampleSignatures = () => {
    prePlacedSignatures.value = [
        {
            documentId: 'doc-123',
            page: 1,
            x: 100,
            y: 150,
            width: 120,
            height: 60,
            imageSrc: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' // placeholder
        },
        {
            documentId: 'doc-123',
            page: 2,
            x: 492,
            y: 610,
            canvasHeight: 1178,
            canvasWidth: 833,
            width: 128,
            height: 48,
            pdfLiby: 521,
            imageSrc: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' // placeholder
        }
    ];
    alert('Sample signatures loaded! Open the PDF to see them.');
};

const buttonText = computed(() => {
    if (!pdfFile.value && !signatureFile.value) {
        return 'Upload PDF and Your Signature First';
    } else if (!pdfFile.value) {
        return 'Upload PDF First';
    } else if (!signatureFile.value) {
        return 'Upload Your Signature First';
    }
    return 'Open PDF to Place Your Signature';
});
</script>

<style scoped>
.container {
    min-height: 100vh;
    background: linear-gradient(to bottom right, #f3f4f6, #e5e7eb);
}

.space-y-3>*+* {
    margin-top: 0.75rem;
}
</style>