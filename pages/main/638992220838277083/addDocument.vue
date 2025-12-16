<script setup>
import { ref } from "vue";
import { getToken } from "~/js/cryptoToken";
import { getProfile, user } from "~/js/fetchUserProfile";
import { getusersignature } from "~/js/checkusersignature";
import { API_BASE_URL } from "~/config";

// State
const { $swal } = useNuxtApp();
const isPlacementModalOpen = ref(false);
const pdfFile = ref(null);
const signatureFile = ref(null);
const currentUserName = ref();
const currentEmplId = ref();
const pdfTitle = ref();

// Pre-placed signature boxes with user assignments
const prePlacedSignatures = ref([]);

// File upload handlers
const handlePdfUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type === "application/pdf") {
        pdfFile.value = file;
    }
};

// Open placement modal
const openPlacementModal = () => {
    if (!pdfFile.value) {
        alert("Please upload a PDF first!");
        return;
    }
    isPlacementModalOpen.value = true;
};

const handleSaveSignatures = async (boxes) => {
    prePlacedSignatures.value = boxes;
    console.log(boxes);
    const token = getToken();
    const form = new FormData()

    form.append("title", pdfTitle.value =="undefined" ? null : pdfTitle.value)

    form.append("file", pdfFile.value)

    // append array correctly
    boxes.forEach((sig, i) => {
        form.append(`signatories[${i}].employeeId`, sig.assignedEmplId)
        form.append(`signatories[${i}].hasName`, sig.showName == true ? 1 : 0)
        form.append(`signatories[${i}].canvasHeight`, sig.canvasHeight)
        form.append(`signatories[${i}].canvasWidth`, sig.canvasWidth)
        form.append(`signatories[${i}].color`, sig.color)
        form.append(`signatories[${i}].dateLock`, sig.dateLock == true ? 1 : 0)
        form.append(`signatories[${i}].dateX`, sig.datePosition? sig.datePosition.x :0)
        form.append(`signatories[${i}].dateY`, sig.datePosition? sig.datePosition.y :0)
        form.append(`signatories[${i}].dateCanvasHeight`, sig.datePosition? sig.datePosition.canvasHeight :0)
        form.append(`signatories[${i}].dateCanvasWidth`, sig.datePosition? sig.datePosition.canvasWidth :0)
        form.append(`signatories[${i}].dateWidth`, sig.datePosition? sig.datePosition.width:0)
        form.append(`signatories[${i}].dateHeight`, sig.datePosition? sig.datePosition.height :0)
        form.append(`signatories[${i}].hasDate`, sig.hasDate == true ? 1 : 0)
        form.append(`signatories[${i}].height`, sig.height)
        form.append(`signatories[${i}].width`, sig.width)
        form.append(`signatories[${i}].page`, sig.page)
        form.append(`signatories[${i}].signatureLock`, sig.signatureLock == true ? 1 : 0)
        form.append(`signatories[${i}].y`, sig.y)
        form.append(`signatories[${i}].x`, sig.x)
        form.append(`signatories[${i}].enforceSequentialOrder`, sig.enforceSequentialOrder == true ? 1 : 0)
        form.append(`signatories[${i}].approvalOrder`, sig.approvalOrder)
        form.append(`signatories[${i}].signatureDate`, sig.signatureDate ? formatDateToISO(sig.signatureDate) : new Date().toISOString());
    })
    console.log("here 2")
    try {

        await $fetch(`${API_BASE_URL}/api/DocumentUpload/UploadDocument`, {
            method: "POST",
            body: form,
            headers: {
                token: token,
            },
        });

        await $swal.fire({
            title: "Document Uploaded!",
            text: "The request has been upload successfully.",
            icon: "success",
            timer: 1000,
            showConfirmButton: false,
        });
        navigateTo("/main/638992220838277083")
    } catch (error) {
        let errorMessage = "Something went wrong. Please try again later.";

        // Check if the error response has a readable message
        if (error?.data?.message) {
            errorMessage = error.data.message;

            showToast({

                message: errorMessage,
                type: "error",
                timer: 1000,
                showConfirmButton: false,
            });
        }
    }

};

const closePlacementModal = () => {
    isPlacementModalOpen.value = false;
};

// Get statistics
const getStats = () => {
    const total = prePlacedSignatures.value.length;
    const signed = prePlacedSignatures.value.filter((s) => !s.isEmpty).length;
    const pending = total - signed;
    return { total, signed, pending };
};


onMounted(async () => {
    await getProfile();
    signatureFile.value = await getusersignature($swal);
    currentEmplId.value = user.value.empid;
    currentUserName.value = user.value.requestorname;
});
</script>

<template>
    <div class="min-h-screen bg-gray-50 p-8">
        <div class="mx-auto">
            <div class="mb-8">
                <h1 class="text-3xl font-bold text-gray-900 mb-2">
                    PDF Multi-User Signature System
                </h1>
                <p class="text-gray-600">
                    Place signature boxes, assign to users, and collect signatures
                </p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Left Column: Main Controls -->
                <div class="lg:col-span-2 space-y-6">
                    <!-- Step 1: Upload PDF -->
                    <div class="bg-white rounded-lg shadow-md p-6">
                        <div class="flex items-center gap-2 mb-4">
                            <div
                                class="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                                1
                            </div>
                            <h2 class="text-xl font-semibold">Upload PDF Document</h2>
                        </div>

                        <!-- Title Input -->
                        <label class="block text-sm font-medium text-gray-700 mb-1">Document Title</label>
                        <input type="text" v-model="pdfTitle"
                            class="block w-full text-sm text-gray-700 border border-gray-300 rounded-md px-3 py-2 mb-4 focus:ring-blue-500 focus:border-blue-500" />

                        <!-- PDF Upload -->
                        <label class="block text-sm font-medium text-gray-700 mb-1">Select PDF File</label>
                        <input type="file" accept="application/pdf" @change="handlePdfUpload"
                            class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />

                        <p v-if="pdfFile" class="text-sm text-green-600 mt-2">
                            ✓ {{ pdfFile.name }}
                        </p>
                    </div>


                    <!-- Step 2: Place Signature Boxes -->
                    <div class="bg-white rounded-lg shadow-md p-6">
                        <div class="flex items-center gap-2 mb-4">
                            <div
                                class="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                                2
                            </div>
                            <h2 class="text-xl font-semibold">Place Signature Boxes</h2>
                        </div>
                        <p class="text-sm text-gray-600 mb-4">
                            Draw boxes on the PDF where each person should sign
                        </p>
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
                                <span class="font-bold text-lg text-green-600">{{
                                    getStats().signed
                                }}</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-orange-600">Pending:</span>
                                <span class="font-bold text-lg text-orange-600">{{
                                    getStats().pending
                                }}</span>
                            </div>
                            <div class="mt-4 pt-4 border-t">
                                <div class="w-full bg-gray-200 rounded-full h-4">
                                    <div class="bg-green-600 h-4 rounded-full transition-all duration-300" :style="{
                                        width: `${getStats().total > 0
                                            ? (getStats().signed / getStats().total) * 100
                                            : 0
                                            }%`,
                                    }"></div>
                                </div>
                                <p class="text-xs text-gray-500 text-center mt-1">
                                    {{
                                        getStats().total > 0
                                            ? Math.round((getStats().signed / getStats().total) * 100)
                                            : 0
                                    }}% Complete
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
                            <div v-for="(sig, index) in prePlacedSignatures" :key="sig.id"
                                class="p-3 border rounded text-sm" :class="{
                                    'border-green-300 bg-green-50': !sig.isEmpty,
                                    'border-blue-300 bg-blue-50':
                                        sig.isEmpty && sig.assignedTo === currentUserName,
                                    'border-gray-300 bg-gray-50':
                                        sig.isEmpty && sig.assignedTo !== currentUserName,
                                }">
                                <div class="flex justify-between items-start">
                                    <div>
                                        <p class="font-semibold">{{ sig.assignedTo }}</p>
                                        <p class="text-xs text-gray-600">Page {{ sig.page }}</p>
                                        <p class="text-xs text-gray-500">
                                            {{ Math.round(sig.width) }}×{{ Math.round(sig.height) }}px
                                        </p>
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
        <SignatureBoxPlacement :is-open="isPlacementModalOpen" :pdf-file="pdfFile"
            :existingSignatures="prePlacedSignatures" @close="closePlacementModal"
            @save-signatures="handleSaveSignatures" />


    </div>
</template>

<script>
import SignatureBoxPlacement from "~/components/SignatureBoxPlacement.vue";

</script>
