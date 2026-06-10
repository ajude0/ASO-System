<script setup>
import { ref } from "vue";
import { getToken } from "~/js/cryptoToken";
import { getProfile, user } from "~/js/fetchUserProfile";
import { getusersignature } from "~/js/checkusersignature";
import { API_BASE_URL } from "~/config";
import LoadingModal from "~/components/modal/LoadingModal.vue";
import { getMaxlength, maxlength } from "~/js/getmaxlength";
import {
  getEmployeesForSigner,
  availableApprovers,
  query,
  loading,
} from "~/js/fetchEmployees";

// State
const { $swal } = useNuxtApp();
const isLoading = ref(false);
const isPlacementModalOpen = ref(false);
const pdfFile = ref(null);
const signatureFile = ref(null);
const currentUserName = ref();
const currentEmplId = ref();
const pdfTitle = ref();
const isLiveView = ref(false);
const isFreeSign = ref(false);
const titleError = ref("");

// Pre-placed signature boxes with user assignments
const prePlacedSignatures = ref([]);

// ─── Share Users ───────────────────────────────────────────────────────────────
const sharedUsers = ref([]);
const showShareModal = ref(false);
const shareApproverIndex = ref(-1);
const shareScrollContainer = ref(null);

const formatUserName = (user) => {
  if (!user) return "";
  if (user.employeename2 && user.employeename1)
    return `${user.employeename2}, ${user.employeename1}`;
  return user.employeename2 || user.employeename1 || user.name || "Unknown User";
};

const openShareModal = async () => {
  showShareModal.value = true;
  query.value.search = "";
  availableApprovers.value = null;
  shareApproverIndex.value = -1;
  await getEmployeesForSigner();
};

const closeShareModal = () => {
  showShareModal.value = false;
  query.value.search = "";
  availableApprovers.value = null;
  shareApproverIndex.value = -1;
};

const handleShareEnterKey = async () => {
  await getEmployeesForSigner();
};

const moveShareDown = () => {
  if (!Array.isArray(availableApprovers.value)) return;
  shareApproverIndex.value = Math.min(
    shareApproverIndex.value + 1,
    availableApprovers.value.length - 1
  );
  nextTick(() => {
    shareScrollContainer.value
      ?.querySelectorAll("[data-approver]")
      [shareApproverIndex.value]?.scrollIntoView({ block: "nearest" });
  });
};

const moveShareUp = () => {
  if (!Array.isArray(availableApprovers.value)) return;
  shareApproverIndex.value = Math.max(shareApproverIndex.value - 1, 0);
  nextTick(() => {
    shareScrollContainer.value
      ?.querySelectorAll("[data-approver]")
      [shareApproverIndex.value]?.scrollIntoView({ block: "nearest" });
  });
};

const isUserAlreadyShared = (user) => {
  const name = formatUserName(user);
  return sharedUsers.value.some(
    (u) => (u.emplId && u.emplId === user.emplId) || u.name === name
  );
};

const toggleShareUser = (user) => {
  const name = formatUserName(user);
  const existingIndex = sharedUsers.value.findIndex(
    (u) => (u.emplId && u.emplId === user.emplId) || u.name === name
  );
  if (existingIndex !== -1) {
    sharedUsers.value.splice(existingIndex, 1);
  } else {
    sharedUsers.value.push({
      name,
      emplId: user.emplId || null,
      branchname: user.branchname || "",
      positionname: user.positionname || "",
      fullAccess: false, // default: read only
    });
  }
};

const toggleAccess = (index) => {
  sharedUsers.value[index].fullAccess = !sharedUsers.value[index].fullAccess;
};

const removeSharedUser = (index) => {
  sharedUsers.value.splice(index, 1);
};
// ──────────────────────────────────────────────────────────────────────────────

// File upload handlers
const handlePdfUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  if (file.type !== "application/pdf") {
    alert("Only PDF files are allowed.");
    event.target.value = "";
    return;
  }
  if (file.name.length > maxlength.value.Title) {
    $swal.fire({
      title: "Info",
      text: `File name must not exceed ${maxlength.value.Title} characters.`,
      icon: "info",
      timer: 1000,
      showConfirmButton: false,
    });
    event.target.value = "";
    return;
  }
  pdfFile.value = file;
};

// Toggle handlers
const handleLiveViewToggle = async () => {
  const newValue = !isLiveView.value;
  isLiveView.value = newValue;
  if (newValue) {
    await $swal.fire({
      title: '<span style="font-size:1.2rem;font-weight:700;">Live View Enabled</span>',
      html: `
        <div style="text-align:left; padding: 4px 0;">
          <div style="display:flex; align-items:flex-start; gap:12px; margin-bottom:12px;">
            <span style="font-size:1.5rem;">📊</span>
            <p style="margin:0; color:#374151; font-size:0.9rem; line-height:1.5;">
              This document will appear on the <strong>dashboard</strong>.
            </p>
          </div>
          <div style="display:flex; align-items:flex-start; gap:12px;">
            <span style="font-size:1.5rem;">🔴</span>
            <p style="margin:0; color:#374151; font-size:0.9rem; line-height:1.5;">
              The user can view all signers in real-time as they complete their signatures.
            </p>
          </div>
        </div>`,
      icon: "info",
      confirmButtonText: "Got it!",
      confirmButtonColor: "#2563EB",
    });
  } else {
    await $swal.fire({
      title: '<span style="font-size:1.2rem;font-weight:700;">Live View Disabled</span>',
      html: `
        <div style="text-align:left; padding: 4px 0;">
          <div style="display:flex; align-items:flex-start; gap:12px;">
            <span style="font-size:1.5rem;">🔒</span>
            <p style="margin:0; color:#374151; font-size:0.9rem; line-height:1.5;">
              This document will <strong>not</strong> be reflected on the dashboard.
            </p>
          </div>
        </div>`,
      icon: "info",
      confirmButtonText: "Understood",
      confirmButtonColor: "#6B7280",
    });
  }
};

const handleFreeSignToggle = async () => {
  const newValue = !isFreeSign.value;
  isFreeSign.value = newValue;
  if (newValue) {
    await $swal.fire({
      title: '<span style="font-size:1.2rem;font-weight:700;">Free Sign Enabled</span>',
      html: `
        <div style="text-align:left; padding: 4px 0;">
          <div style="display:flex; align-items:flex-start; gap:12px;">
            <span style="font-size:1.5rem;">✍️</span>
            <p style="margin:0; color:#374151; font-size:0.9rem; line-height:1.5;">
              Signers can place their signature <strong>anywhere on the document</strong> — no fixed signature boxes required.
            </p>
          </div>
        </div>`,
      icon: "info",
      confirmButtonText: "Got it!",
      confirmButtonColor: "#7C3AED",
    });
  } else {
    await $swal.fire({
      title: '<span style="font-size:1.2rem;font-weight:700;">Free Sign Disabled</span>',
      html: `
        <div style="text-align:left; padding: 4px 0;">
          <div style="display:flex; align-items:flex-start; gap:12px;">
            <span style="font-size:1.5rem;">📌</span>
            <p style="margin:0; color:#374151; font-size:0.9rem; line-height:1.5;">
              Each signer <strong>must sign within their designated signature box</strong>.
            </p>
          </div>
        </div>`,
      icon: "info",
      confirmButtonText: "Understood",
      confirmButtonColor: "#6B7280",
    });
  }
};

// Open placement modal
const openPlacementModal = async () => {
  if (!pdfFile.value) {
    alert("Please upload a PDF first!");
    return;
  }
  if (!pdfTitle.value) {
    titleError.value = "Please input a Document Title first";
    await $swal.fire({
      title: "Missing Document Title",
      text: "Please enter a document title before proceeding.",
      icon: "info",
      timer: 1200,
      showConfirmButton: false,
    });
    return;
  }
  isPlacementModalOpen.value = true;
};

const handleSaveSignatures = async (boxes) => {
  isLoading.value = true;
  const token = getToken();
  const form = new FormData();

  form.append("title", pdfTitle.value == "undefined" ? null : pdfTitle.value);
  form.append("isliveview", isLiveView.value == true ? 1 : 0);
  form.append("isfreesign", isFreeSign.value == true ? 1 : 0);
  form.append("file", pdfFile.value);

  // Append shared users
  sharedUsers.value.forEach((u, i) => {
    form.append(`sharedUsers[${i}].emplid`, u.emplId || "");
    form.append(`sharedUsers[${i}].fullAccess`, u.fullAccess ? 1 : 0);
  });

  // Append signatories
  boxes.forEach((sig, i) => {
    form.append(`signatories[${i}].employeeId`, sig.assignedEmplId);
    form.append(`signatories[${i}].hasName`, sig.showName == true ? 1 : 0);
    form.append(`signatories[${i}].canvasHeight`, sig.canvasHeight);
    form.append(`signatories[${i}].canvasWidth`, sig.canvasWidth);
    form.append(`signatories[${i}].color`, sig.color);
    form.append(`signatories[${i}].dateLock`, sig.dateLock == true ? 1 : 0);
    form.append(`signatories[${i}].dateX`, sig.datePosition ? sig.datePosition.x : 0);
    form.append(`signatories[${i}].dateY`, sig.datePosition ? sig.datePosition.y : 0);
    form.append(`signatories[${i}].dateCanvasHeight`, sig.datePosition ? sig.datePosition.canvasHeight : 0);
    form.append(`signatories[${i}].dateCanvasWidth`, sig.datePosition ? sig.datePosition.canvasWidth : 0);
    form.append(`signatories[${i}].dateWidth`, sig.datePosition ? sig.datePosition.width : 0);
    form.append(`signatories[${i}].dateHeight`, sig.datePosition ? sig.datePosition.height : 0);
    form.append(`signatories[${i}].hasDate`, sig.hasDate == true ? 1 : 0);
    form.append(`signatories[${i}].height`, sig.height);
    form.append(`signatories[${i}].width`, sig.width);
    form.append(`signatories[${i}].page`, sig.page);
    form.append(`signatories[${i}].signatureLock`, sig.signatureLock == true ? 1 : 0);
    form.append(`signatories[${i}].y`, sig.y);
    form.append(`signatories[${i}].x`, sig.x);
    form.append(`signatories[${i}].enforceSequentialOrder`, sig.enforceSequentialOrder == true ? 1 : 0);
    form.append(`signatories[${i}].approvalOrder`, sig.approvalOrder);
    form.append(`signatories[${i}].signatureDate`, sig.signatureDate ? formatDateToISO(sig.signatureDate) : new Date().toISOString());
  });

  try {
    await $fetch(`${API_BASE_URL}/api/DocumentUpload/UploadDocument`, {
      method: "POST",
      body: form,
      headers: { token: token },
    });
    await $swal.fire({
      title: "Document Uploaded!",
      text: "The request has been uploaded successfully.",
      icon: "success",
      timer: 1000,
      showConfirmButton: false,
    });
    navigateTo("/main/activity/638992220838277083");
  } catch (error) {
    let errorMessage = "Something went wrong. Please try again later.";
    if (error?.data?.message) {
      errorMessage = error.data.message;
      showToast({
        message: errorMessage || "Error",
        type: "error",
        timer: 1000,
        showConfirmButton: false,
      });
    }
  } finally {
    isLoading.value = false;
  }
};

const closePlacementModal = () => {
  isPlacementModalOpen.value = false;
};

const getStats = () => {
  const total = prePlacedSignatures.value.length;
  const signed = prePlacedSignatures.value.filter((s) => !s.isEmpty).length;
  const pending = total - signed;
  return { total, signed, pending };
};

onMounted(async () => {
  await getProfile();
  await getMaxlength($swal, "AsoDocumentUpload");
  signatureFile.value = await getusersignature($swal);
  currentEmplId.value = user.value.empid;
  currentUserName.value = user.value.requestorname;
});
</script>

<template>
  <div v-if="isLoading"><LoadingModal /></div>
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
        <!-- Left Column -->
        <div class="lg:col-span-2 space-y-6">

          <!-- Step 1: Upload PDF -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex items-center gap-2 mb-4">
              <div class="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">1</div>
              <h2 class="text-xl font-semibold">Upload PDF Document</h2>
            </div>

            <div class="mb-1">
              <label class="block text-sm font-medium text-gray-700 mb-1">Document Title</label>
              <input
                type="text"
                v-model="pdfTitle"
                @input="titleError = null"
                :maxlength="maxlength.Title"
                class="block w-full text-sm text-gray-700 border rounded-md px-3 py-2"
                :class="titleError ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'"
              />
              <div :class="titleError ? 'flex justify-between' : 'flex justify-end'">
                <p v-if="titleError" class="text-sm text-red-500">{{ titleError }}</p>
                <div class="text-xs text-gray-500 mt-1">{{ pdfTitle?.length || 0 }}/{{ maxlength.Title }}</div>
              </div>
            </div>

            <label class="block text-sm font-medium text-gray-700 mb-1">Select PDF File</label>
            <input
              type="file"
              accept="application/pdf"
              @change="handlePdfUpload"
              class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <p v-if="pdfFile" class="text-sm text-green-600 mt-2">✓ {{ pdfFile.name }}</p>

            <!-- Live View Toggle -->
            <div class="mt-6">
              <div
                class="flex items-center justify-between p-4 rounded-xl border transition-all duration-300"
                :class="isLiveView ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50'"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="w-9 h-9 rounded-lg flex items-center justify-center transition-colors duration-300 flex-shrink-0"
                    :class="isLiveView ? 'bg-blue-600' : 'bg-gray-300'"
                  >
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M15 10l4.553-2.069A1 1 0 0121 8.868v6.264a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                    </svg>
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-gray-800">Live View</p>
                    <p class="text-xs transition-colors duration-300" :class="isLiveView ? 'text-blue-600' : 'text-gray-400'">
                      {{ isLiveView ? 'Visible on dashboard in real-time' : 'Not visible on dashboard' }}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  @click="handleLiveViewToggle"
                  class="relative inline-flex h-7 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex-shrink-0 ml-3"
                  :class="isLiveView ? 'bg-blue-600' : 'bg-gray-300'"
                  style="width: 52px;"
                >
                  <span class="sr-only">Toggle Live View</span>
                  <span
                    class="inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ease-in-out"
                    :style="isLiveView ? 'transform: translateX(28px)' : 'transform: translateX(4px)'"
                  ></span>
                </button>
              </div>
            </div>

            <!-- Free Sign Toggle -->
            <div class="mt-3">
              <div
                class="flex items-center justify-between p-4 rounded-xl border transition-all duration-300"
                :class="isFreeSign ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-gray-50'"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="w-9 h-9 rounded-lg flex items-center justify-center transition-colors duration-300 flex-shrink-0"
                    :class="isFreeSign ? 'bg-purple-600' : 'bg-gray-300'"
                  >
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-2.828 1.172H7v-2a4 4 0 011.172-2.828z" />
                    </svg>
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-gray-800">Free Sign</p>
                    <p class="text-xs transition-colors duration-300" :class="isFreeSign ? 'text-purple-600' : 'text-gray-400'">
                      {{ isFreeSign ? 'Signers can sign anywhere' : 'Signers must use placed boxes' }}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  @click="handleFreeSignToggle"
                  class="relative inline-flex h-7 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 flex-shrink-0 ml-3"
                  :class="isFreeSign ? 'bg-purple-600' : 'bg-gray-300'"
                  style="width: 52px;"
                >
                  <span class="sr-only">Toggle Free Sign</span>
                  <span
                    class="inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ease-in-out"
                    :style="isFreeSign ? 'transform: translateX(28px)' : 'transform: translateX(4px)'"
                  ></span>
                </button>
              </div>
            </div>
          </div>

          <!-- Step 2: Share Document -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex items-center gap-2 mb-4">
              <div class="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">2</div>
              <h2 class="text-xl font-semibold">Share Document</h2>
            </div>
            <p class="text-sm text-gray-600 mb-4">
              Select people who can access this document and set their permissions.
            </p>

            <!-- Add users button -->
            <button
              @click="openShareModal"
              class="w-full px-4 py-2.5 border-2 border-dashed border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition font-semibold text-sm flex items-center justify-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Add People to Share With
            </button>

            <!-- Shared users list -->
            <div v-if="sharedUsers.length > 0" class="mt-4 space-y-3">
              <p class="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Shared with — {{ sharedUsers.length }}
              </p>

              <div
                v-for="(u, index) in sharedUsers"
                :key="u.emplId || u.name"
                class="border border-gray-200 rounded-xl overflow-hidden"
              >
                <!-- User info row + access toggle -->
                <div class="flex items-center gap-3 px-3 py-3 bg-white">
                  <!-- Avatar -->
                  <div class="w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {{ u.name.split(',')[0]?.trim()?.charAt(0) || '?' }}
                  </div>

                  <!-- Name & position -->
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-gray-800 truncate">{{ u.name }}</p>
                    <p class="text-xs text-gray-400 truncate">{{ u.positionname || u.branchname || 'No info' }}</p>
                  </div>

                  <!-- Single toggle button -->
                <div class="flex items-center gap-2 flex-shrink-0">
                  <span class="text-xs font-medium" :class="u.fullAccess ? 'text-purple-600' : 'text-blue-600'">
                    {{ u.fullAccess ? 'Full Access' : 'Read Only' }}
                  </span>
                  <button
                    type="button"
                    @click="toggleAccess(index)"
                    class="relative inline-flex h-6 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 flex-shrink-0"
                    :class="u.fullAccess ? 'bg-purple-600 focus:ring-purple-500' : 'bg-blue-600 focus:ring-blue-500'"
                    style="width: 44px;"
                  >
                    <span class="sr-only">Toggle Access</span>
                    <span
                      class="inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300 ease-in-out"
                      :style="u.fullAccess ? 'transform: translateX(24px)' : 'transform: translateX(4px)'"
                    ></span>
                  </button>
                </div>
                  <!-- Remove -->
                  <button
                    @click="removeSharedUser(index)"
                    class="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition flex-shrink-0"
                    title="Remove"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <!-- Info note — shown only when Read Only -->
                <div
                  v-if="!u.fullAccess"
                  class="flex items-start gap-2 px-3 py-2 bg-blue-50 border-t border-blue-100 text-xs text-blue-700"
                >
                  <svg class="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    This document will only be visible to this person after
                    <strong>all signers have signed</strong>.
                  </span>
                </div>
              </div>
            </div>

            <!-- Empty state -->
            <div v-else class="mt-4 flex flex-col items-center py-6 text-gray-300">
              <svg class="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M17 20h5v-2a4 4 0 00-5.356-3.712M9 20H4v-2a4 4 0 015.356-3.712M15 7a4 4 0 11-8 0 4 4 0 018 0zm6 3a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p class="text-sm text-gray-400">No one added yet.</p>
              <p class="text-xs text-gray-300 mt-0.5">Optional — leave empty to keep it private.</p>
            </div>
          </div>

          <!-- Step 3: Place Signature Boxes -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex items-center gap-2 mb-4">
              <div class="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">3</div>
              <h2 class="text-xl font-semibold">
                {{ isFreeSign ? "Add Member" : "Place Signature Boxes" }}
              </h2>
            </div>
            <p class="text-sm text-gray-600 mb-4">
              {{ isFreeSign ? "Add members who will sign this document" : "Draw boxes on the PDF where each person should sign" }}
            </p>
            <button
              @click="openPlacementModal"
              :disabled="!pdfFile"
              class="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2"
            >
              <div v-if="!isFreeSign" class="flex gap-1 items-center">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Place Signature Boxes
              </div>
              <div v-else>Add Member/s</div>
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
                <span class="font-bold text-lg text-green-600">{{ getStats().signed }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-orange-600">Pending:</span>
                <span class="font-bold text-lg text-orange-600">{{ getStats().pending }}</span>
              </div>
              <div class="mt-4 pt-4 border-t">
                <div class="w-full bg-gray-200 rounded-full h-4">
                  <div
                    class="bg-green-600 h-4 rounded-full transition-all duration-300"
                    :style="{ width: `${getStats().total > 0 ? (getStats().signed / getStats().total) * 100 : 0}%` }"
                  ></div>
                </div>
                <p class="text-xs text-gray-500 text-center mt-1">
                  {{ getStats().total > 0 ? Math.round((getStats().signed / getStats().total) * 100) : 0 }}% Complete
                </p>
              </div>
            </div>

            <!-- Active flags summary -->
            <div class="mt-4 pt-4 border-t space-y-2">
              <div class="flex items-center gap-2 text-xs">
                <span class="w-2 h-2 rounded-full flex-shrink-0" :class="isLiveView ? 'bg-blue-500' : 'bg-gray-300'"></span>
                <span :class="isLiveView ? 'text-blue-600 font-medium' : 'text-gray-400'">
                  Live View {{ isLiveView ? 'ON' : 'OFF' }}
                </span>
              </div>
              <div class="flex items-center gap-2 text-xs">
                <span class="w-2 h-2 rounded-full flex-shrink-0" :class="isFreeSign ? 'bg-purple-500' : 'bg-gray-300'"></span>
                <span :class="isFreeSign ? 'text-purple-600 font-medium' : 'text-gray-400'">
                  Free Sign {{ isFreeSign ? 'ON' : 'OFF' }}
                </span>
              </div>
              <div class="flex items-center gap-2 text-xs">
                <span class="w-2 h-2 rounded-full flex-shrink-0" :class="sharedUsers.length > 0 ? 'bg-blue-500' : 'bg-gray-300'"></span>
                <span :class="sharedUsers.length > 0 ? 'text-blue-600 font-medium' : 'text-gray-400'">
                  Shared with {{ sharedUsers.length }} person{{ sharedUsers.length !== 1 ? 's' : '' }}
                </span>
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
              <div
                v-for="(sig, index) in prePlacedSignatures"
                :key="sig.id"
                class="p-3 border rounded text-sm"
                :class="{
                  'border-green-300 bg-green-50': !sig.isEmpty,
                  'border-blue-300 bg-blue-50': sig.isEmpty && sig.assignedTo === currentUserName,
                  'border-gray-300 bg-gray-50': sig.isEmpty && sig.assignedTo !== currentUserName,
                }"
              >
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
    <SignatureBoxPlacement
      :is-open="isPlacementModalOpen"
      :pdf-file="pdfFile"
      :free-sign="isFreeSign"
      :existingSignatures="prePlacedSignatures"
      @close="closePlacementModal"
      @save-signatures="handleSaveSignatures"
    />

    <!-- ── Share Users Modal ─────────────────────────────────────────────────── -->
    <div
      v-if="showShareModal"
      @click.self="closeShareModal"
      class="fixed inset-0 p-4 flex flex-wrap justify-center items-center w-full h-full z-[1000] before:fixed before:inset-0 before:w-full before:h-full before:bg-[rgba(0,0,0,0.5)] overflow-auto font-[sans-serif]"
    >
      <div class="w-full max-w-4xl bg-white shadow-lg rounded-2xl p-6 relative">

        <!-- Modal Header -->
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-lg font-bold text-gray-800">Share Document With</h3>
            <p class="text-xs text-gray-400 mt-0.5">Search and select multiple people. Click a row to toggle selection.</p>
          </div>
        </div>

        <!-- Search -->
        <div class="flex gap-2 mb-3">
          <input
            type="text"
            v-model="query.search"
            @keydown.enter.prevent="handleShareEnterKey"
            @keydown.down.prevent="moveShareDown"
            @keydown.up.prevent="moveShareUp"
            placeholder="Search by name..."
            class="w-full h-11 px-4 rounded-md border border-gray-700 focus:outline-none text-sm"
          />
          <button
            @click="getEmployeesForSigner"
            class="py-2 px-4 bg-blue-600 h-11 text-white rounded-lg hover:bg-blue-700 transition flex-shrink-0"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-width="2" d="m21 21-3.5-3.5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
            </svg>
          </button>
        </div>

        <!-- Results Table -->
        <div class="max-h-64 overflow-y-auto border border-gray-200 rounded-lg" ref="shareScrollContainer">
          <table class="min-w-full text-sm text-left">
            <thead class="bg-gray-50 sticky top-0">
              <tr>
                <th class="px-4 py-2.5 border-b text-xs font-bold text-gray-500 uppercase tracking-wide w-8"></th>
                <th class="px-4 py-2.5 border-b text-xs font-bold text-gray-500 uppercase tracking-wide">Name</th>
                <th class="px-4 py-2.5 border-b text-xs font-bold text-gray-500 uppercase tracking-wide">Branch</th>
                <th class="px-4 py-2.5 border-b text-xs font-bold text-gray-500 uppercase tracking-wide">Position</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(u, index) in availableApprovers"
                :key="index"
                @click="toggleShareUser(u)"
                class="cursor-pointer transition-colors"
                :class="[
                  isUserAlreadyShared(u) ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50',
                  index === shareApproverIndex ? 'ring-2 ring-inset ring-blue-400' : ''
                ]"
                data-approver
              >
                <td class="px-4 py-3 border-b">
                  <div
                    class="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                    :class="isUserAlreadyShared(u) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'"
                  >
                    <svg v-if="isUserAlreadyShared(u)" class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </td>
                <td class="px-4 py-3 border-b font-medium text-gray-800">{{ formatUserName(u) }}</td>
                <td class="px-4 py-3 border-b text-gray-500">{{ u.branchname }}</td>
                <td class="px-4 py-3 border-b text-gray-500">{{ u.positionname }}</td>
              </tr>
              <tr v-if="loading">
                <td colspan="4" class="p-3 text-gray-400 text-center text-sm">Loading users...</td>
              </tr>
              <tr v-else-if="!availableApprovers || availableApprovers.length === 0">
                <td colspan="4" class="p-3 text-gray-400 text-center text-sm">No users found.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Selected chips preview -->
        <div v-if="sharedUsers.length > 0" class="mt-4 pt-3 border-t">
          <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Selected</p>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="(u, i) in sharedUsers"
              :key="u.emplId || u.name"
              class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
              :class="u.fullAccess ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'"
            >
              {{ u.name.split(',')[0]?.trim() }}
              <span class="opacity-60">· {{ u.fullAccess ? 'Full Access' : 'Read Only' }}</span>
              <button @click.stop="removeSharedUser(i)" class="hover:text-red-600 transition leading-none font-bold">✕</button>
            </span>
          </div>
        </div>

        <!-- Footer -->
        <div class="mt-4 flex justify-end gap-2">
          <button
            @click="closeShareModal"
            class="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition font-medium"
          >
            Cancel
          </button>
          <button
            @click="closeShareModal"
            class="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition"
          >
            Done — {{ sharedUsers.length }} selected
          </button>
        </div>

      </div>
    </div>
    <!-- ── End Share Modal ───────────────────────────────────────────────────── -->

  </div>
</template>

<script>
import SignatureBoxPlacement from "~/components/SignatureBoxPlacement.vue";
</script>