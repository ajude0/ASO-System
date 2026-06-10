<script setup>
import { ref } from "vue";
import { getProfile, user } from "~/js/fetchUserProfile";
import {
  getsignaturepositons,
  prePlacedSignatures,
} from "~/js/fetchsignatureposition";
import { getusersignature } from "~/js/checkusersignature";
import { API_BASE_URL } from "~/config";
import { getToken, getShareDocumentId } from "~/js/cryptoToken";
import { fetchDocumentPdf, pdfFile } from "~/js/fetchDocumentPdf";
import {
  fetchDocumentTitle,
  title,
  isLiveView,
  isFreeSign,
  isCancelled
} from "~/js/fetchDocumentTitle";
import { emailsignaturereminder, sharedemailsignaturereminder } from "~/js/emailsignaturereminder";
import LoadingModal from "~/components/modal/LoadingModal.vue";


// State
const { $swal } = useNuxtApp();
const isSigningModalOpen = ref(false);
const isPlacementModalOpen = ref(false);
const signatureFile = ref(null);
const currentUserName = ref();
const strDocId = ref("");
const currentEmplId = ref();
const pdfTitle = ref();
const loading = ref(true);

const formatDateToISO = (d) => {
  const [month, day, year] = d.split("-");
  return `${year}-${month}-${day}`;
};

// Open placement modal
const openPlacementModal = () => {
  if (!pdfFile.value) {
    alert("Please upload a PDF first!");
    return;
  }
  isPlacementModalOpen.value = true;
};

const resendEmail = async(emplId) => {
  const docid = await getShareDocumentId();
  sharedemailsignaturereminder(emplId, $swal,docid);
};

// Save signature boxes from placement modal
const handleSaveSignatures = async (boxes) => {
  loading.value = true;
  const token = getToken();
  const docId = getShareDocumentId();
  console.log(boxes);
  const form = new FormData();
  form.append("title", "SAMPLE");
  form.append("file", pdfFile.value);
  // append array correctly
  boxes.forEach((sig, i) => {
    form.append(
      `signatories[${i}].id`,
      typeof sig.id === "number" ? sig.id : 0,
    );
    form.append(`signatories[${i}].employeeId`, sig.assignedEmplId);
    form.append(`signatories[${i}].hasName`, sig.showName == true ? 1 : 0);
    form.append(`signatories[${i}].canvasHeight`, sig.canvasHeight);
    form.append(`signatories[${i}].canvasWidth`, sig.canvasWidth);
    form.append(`signatories[${i}].color`, sig.color);
    form.append(`signatories[${i}].dateLock`, sig.dateLock == true ? 1 : 0);
    form.append(
      `signatories[${i}].dateX`,
      sig.datePosition ? sig.datePosition.x : 0,
    );
    form.append(
      `signatories[${i}].dateY`,
      sig.datePosition ? sig.datePosition.y : 0,
    );
    form.append(
      `signatories[${i}].dateCanvasHeight`,
      sig.datePosition ? sig.datePosition.canvasHeight : 0,
    );
    form.append(
      `signatories[${i}].dateCanvasWidth`,
      sig.datePosition ? sig.datePosition.canvasWidth : 0,
    );
    form.append(
      `signatories[${i}].dateWidth`,
      sig.datePosition ? sig.datePosition.width : 0,
    );
    form.append(
      `signatories[${i}].dateHeight`,
      sig.datePosition ? sig.datePosition.height : 0,
    );
    form.append(`signatories[${i}].hasDate`, sig.hasDate == true ? 1 : 0);
    form.append(`signatories[${i}].height`, sig.height);
    form.append(`signatories[${i}].width`, sig.width);
    form.append(`signatories[${i}].page`, sig.page);
    form.append(
      `signatories[${i}].signatureLock`,
      sig.signatureLock == true ? 1 : 0,
    );
    form.append(`signatories[${i}].y`, sig.y);
    form.append(`signatories[${i}].x`, sig.x);
    form.append(`signatories[${i}].isEmpty`, sig.isEmpty == true ? 1 : 0);
    form.append(
      `signatories[${i}].enforceSequentialOrder`,
      sig.enforceSequentialOrder == true ? 1 : 0,
    );
    form.append(`signatories[${i}].approvalOrder`, sig.approvalOrder);
    form.append(
      `signatories[${i}].signatureDate`,
      sig.signatureDate
        ? formatDateToISO(sig.signatureDate)
        : new Date().toISOString(),
    );
  });
  try {
    await $fetch(
      `${API_BASE_URL}/api/DocumentUPload/EditSignatureDocument/${docId}`,
      {
        method: "POST",
        body: form,
        headers: {
          token: token,
        },
      },
    );

    await $swal.fire({
      title: "Update Successful!",
      text: "The signature placement was updated successfully.",
      icon: "success",
      timer: 1000,
      showConfirmButton: false,
    });
    await getsignaturepositons(docId);
  } catch (error) {
    prePlacedSignatures.value = null;
    let errorMessage = "Something went wrong. Please try again later.";

    if (error?.data?.message) {
      errorMessage = error.data.message;
      showToast({
        message: errorMessage,
        type: "error",
        timer: 1000,
        showConfirmButton: false,
      });
    }
  } finally {
    loading.value = false;
  }
};

const closePlacementModal = () => {
  isPlacementModalOpen.value = false;
};

const sequential = computed(() => {
  return prePlacedSignatures.value.some(
    (sig) => sig.enforceSequentialOrder === true,
  );
});

const signatureStatuses = computed(() => {
  const grouped = {};
  let signatures = [...prePlacedSignatures.value];

  if (sequential.value) {
    signatures.sort((a, b) => a.approvalOrder - b.approvalOrder);
    const firstUnsigned = signatures.find((sig) => sig.isEmpty);

    signatures = signatures.map((sig) => {
      let approvalStatus;
      if (!sig.isEmpty) {
        approvalStatus = "signed";
      } else if (
        firstUnsigned &&
        sig.approvalOrder === firstUnsigned.approvalOrder
      ) {
        approvalStatus = "pending";
      } else {
        approvalStatus = "waiting";
      }
      return { ...sig, approvalStatus };
    });
  } else {
    signatures = signatures.map((sig) => ({
      ...sig,
      approvalStatus: sig.isEmpty ? "pending" : "signed",
    }));
  }

  signatures.forEach((sig) => {
    const key = sig.assignedEmplId;
    if (!grouped[key]) {
      grouped[key] = {
        assignedEmplId: key,
        assignedTo: sig.assignedTo,
        total: 0,
        signed: 0,
        pending: 0,
        waiting: 0,
      };
    }
    grouped[key].total++;
    if (sig.approvalStatus === "signed") grouped[key].signed++;
    if (sig.approvalStatus === "pending") grouped[key].pending++;
    if (sig.approvalStatus === "waiting") grouped[key].waiting++;
  });

  return Object.values(grouped);
});

const signatureStatusestemp = computed(() => {
  if (!sequential.value) {
    return prePlacedSignatures.value.map((sig) => ({
      ...sig,
      approvalStatus: sig.isEmpty ? "pending" : "signed",
    }));
  }

  const sorted = [...prePlacedSignatures.value].sort(
    (a, b) => a.approvalOrder - b.approvalOrder,
  );
  const firstUnsigned = sorted.find((sig) => sig.isEmpty);

  return sorted.map((sig) => {
    let status;
    if (!sig.isEmpty) {
      status = "signed";
    } else if (
      firstUnsigned &&
      sig.approvalOrder === firstUnsigned.approvalOrder
    ) {
      status = "pending";
    } else {
      status = "waiting";
    }
    return { ...sig, approvalStatus: status };
  });
});

const getStats = () => {
  const items = signatureStatusestemp.value;
  const total = items.length;
  const signed = items.filter((s) => s.approvalStatus === "signed").length;
  const pending = items.filter((s) => s.approvalStatus === "pending").length;
  const waiting = items.filter((s) => s.approvalStatus === "waiting").length;
  const pendingSig = items.find((s) => s.approvalStatus === "pending");

  return {
    total,
    signed,
    pending,
    waiting,
    nextApproverNumber: pendingSig ? pendingSig.approvalOrder : null,
  };
};

onMounted(async () => {
  loading.value = true;
  const documentid = getShareDocumentId();
  strDocId.value = documentid?.toString();
  await getsignaturepositons(documentid);
  await fetchDocumentPdf(documentid);
  await fetchDocumentTitle(documentid);
     if (isCancelled.value) {
        const result = await $swal.fire({
            title: "Document Unavailable",
            text: "This document is unavailable because it has been cancelled.",
            icon: "error",
            confirmButtonText: "Close",
            allowOutsideClick: false,
            allowEscapeKey: false,
        });

        if (result.isConfirmed) {
            navigateTo("/main/Activity/639134769128106649");
        }
      }
  pdfTitle.value = title.value;
  loading.value = false;
});
</script>

<template>
  <div v-if="loading">
    <LoadingModal />
  </div>
  <div v-else class="min-h-screen bg-gray-50 p-8">
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
          <!-- Document Title + Live View Toggle Card -->
          <div
            class="bg-white rounded-2xl border border-zinc-100 shadow-sm px-5 py-4 gap-4"
            :class="
              isEditingTitle
                ? 'flex-row'
                : 'flex flex-col sm:flex-row justify-between'
            "
          >
            <!-- Title -->
            <div class="flex items-center gap-3 w-full">
              <!-- Display mode -->
              <div class="flex items-center gap-2 min-w-0">
                <h2
                  class="font-semibold text-zinc-800 truncate tracking-tight text-2xl"
                >
                  {{ pdfTitle }}
                </h2>
              </div>
            </div>
          </div>

          <!-- Step 1: Place Signature Boxes -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex items-center gap-2 mb-4">
              <div
                class="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold"
              >
                1
              </div>
              <h2 class="text-xl font-semibold">
                {{ isFreeSign ? "Add Member" : "Place Signature Boxes" }}
              </h2>
            </div>
            <p class="text-sm text-gray-600 mb-4">
              {{
                isFreeSign
                  ? "Add members who will sign this document"
                  : "Draw boxes on the PDF where each person should sign"
              }}
            </p>
            <button
              @click="openPlacementModal"
              :disabled="!pdfFile"
              class="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2"
            >
              <div v-if="!isFreeSign" class="flex gap-1 items-center">
                <svg
                  class="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Place Signature Boxes
              </div>
              <div v-else>Add Member/s</div>
            </button>
            <p
              v-if="prePlacedSignatures.length > 0"
              class="text-sm text-green-600 mt-2 text-center"
            >
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
              <div class="flex justify-between items-center">
                <span class="text-gray-600">Waiting:</span>
                <span class="font-bold text-lg text-gray-600">{{
                  getStats().waiting
                }}</span>
              </div>

              <div class="mt-4 pt-4 border-t">
                <div class="w-full bg-gray-200 rounded-full h-4">
                  <div
                    class="bg-green-600 h-4 rounded-full transition-all duration-300"
                    :style="{
                      width: `${
                        getStats().total > 0
                          ? (getStats().signed / getStats().total) * 100
                          : 0
                      }%`,
                    }"
                  ></div>
                </div>
                <p class="text-xs text-gray-500 text-center mt-1">
                  {{
                    getStats().total > 0
                      ? Math.round((getStats().signed / getStats().total) * 100)
                      : 0
                  }}% Complete
                </p>
              </div>

              <!-- Live View status indicator in progress card -->
              <div class="pt-3 border-t">
                <div class="flex items-center gap-2 text-xs">
                  <span
                    class="w-2 h-2 rounded-full shrink-0"
                    :class="isLiveView ? 'bg-blue-500' : 'bg-zinc-300'"
                  ></span>
                  <span
                    :class="
                      isLiveView ? 'text-blue-600 font-medium' : 'text-zinc-400'
                    "
                  >
                    Live View
                    {{ isLiveView ? "ON — visible on dashboard" : "OFF" }}
                  </span>
                </div>
              </div>

              <p
                class="text-sm text-center mt-3 font-medium"
                :class="{
                  'text-green-700': getStats().signed === getStats().total,
                  'text-orange-700': getStats().pending === 1,
                  'text-gray-600':
                    getStats().waiting > 0 && getStats().pending === 0,
                }"
              >
                <template v-if="getStats().signed === getStats().total">
                  ✅ All signatures completed.
                </template>
                <template v-else-if="getStats().nextApproverNumber">
                  ⏳ Waiting for Signer #{{ getStats().nextApproverNumber }} to
                  sign…
                </template>
                <template v-else> ⏳ Waiting for signatures… </template>
              </p>
            </div>
          </div>

          <!-- Signature Boxes List -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-xl font-semibold mb-4">All Signature Boxes</h2>

            <div
              v-if="prePlacedSignatures.length === 0"
              class="text-gray-400 text-center py-8 text-sm"
            >
              No signature boxes placed yet
            </div>

            <div v-else class="space-y-2 max-h-96 overflow-y-auto">
              <div
                v-for="sig in signatureStatuses"
                :key="sig.assignedEmplId"
                class="p-3 border rounded text-sm"
                :class="{
                  'border-green-300 bg-green-50':
                    sig.pending === 0 && sig.waiting === 0,
                  'border-blue-300 bg-blue-50': sig.pending > 0,
                  'border-gray-300 bg-gray-50':
                    sig.pending === 0 && sig.waiting > 0,
                }"
              >
                <div class="flex justify-between items-start">
                  <div>
                    <p class="font-semibold">{{ sig.assignedTo }}</p>
                    <p class="text-xs text-gray-600">
                      Total signatures: {{ sig.total }}
                    </p>
                    <p class="text-xs text-gray-500">
                      Signed: {{ sig.signed }} / Pending: {{ sig.pending }}
                      <span v-if="sig.waiting > 0">
                        / Waiting: {{ sig.waiting }}</span
                      >
                    </p>
                  </div>

                  <div class="flex flex-col items-end">
                    <span
                      v-if="sig.pending > 0"
                      class="text-orange-500 text-xs font-bold"
                      >⏳ Pending</span
                    >
                    <span
                      v-else-if="sig.waiting > 0"
                      class="text-gray-500 text-xs font-bold"
                      >⏳ Waiting</span
                    >
                    <span v-else class="text-green-600 text-xs font-bold"
                      >✓ Completed</span
                    >

                    <button
                      v-if="sig.pending > 0"
                      @click="resendEmail(sig.assignedEmplId)"
                      class="mt-2 flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg shadow hover:bg-blue-700 transition-all duration-200"
                    >
                      Resend
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Signature Box Placement Modal -->
    <SignatureBoxPlacement
      :is-open="isPlacementModalOpen"
      :pdf-file="pdfFile"
      :free-sign="isFreeSign"
      :existingSignatures="prePlacedSignatures"
      @close="closePlacementModal"
      @save-signatures="handleSaveSignatures"
    />

  </div>
</template>

<script>
import SignatureBoxPlacement from "~/components/SignatureBoxPlacement.vue";
import SigntureModal from "~/components/SigntureModal.vue";
</script>
