<template>
  <div v-if="showThankUPage">
    <ThankYouPage :key="thankYouKey" :transaction-id="urltransactionId" :transaction-name="formTitle"
      type-name="Transaction" @refresh="refreshThankYou" />
  </div>
  <div v-else class="w-full bg-white shadow-lg rounded-lg p-6 relative max-h-[90vh]">
    <div class="flex items-center pb-3 border-b border-gray-300">
      <h3 class="text-gray-800 text-xl font-bold flex-1">Transactions</h3>
        <button @click="getViewPdf(urltransactionId)" class="py-2 px-4 bg-green-600 tracking-wide hover:bg-green-800 text-white rounded-lg"> View Docs</button>
    </div>
    <div class="overflow-auto max-h-[60vh]">
      <div v-if="isTxLoading">
        <!-- Skeleton Loader -->
        <div class="animate-pulse pt-10 mb-6">
          <div class="h-16 bg-gray-300 rounded w-full mb-1"></div>
          <hr class="mb-3" />
          <div class="mt-3">
            <div class="h-10 bg-gray-300 rounded w-1/5 mb-2"></div>
            <div class="h-14 bg-gray-300 rounded w-full"></div>
          </div>
          <div class="mt-4">
            <div class="h-10 bg-gray-300 rounded w-1/5 mb-2"></div>
            <div class="h-14 bg-gray-300 rounded w-full"></div>
          </div>
          <div class="mt-4">
            <div class="h-10 bg-gray-300 rounded w-1/5 mb-2"></div>
            <div class="h-14 bg-gray-300 rounded w-full"></div>
          </div>
        </div>
        <LoadingModal />
      </div>
      <div v-if="!isTxLoading && readyToRender">
        <h1 class="text-2xl font-bold text-gray-800 mb-6 border-b pb-2 pt-10">
          {{ transactions.formTitle }}
        </h1>

        <div v-for="(item, index) in transactions?.formObjects" :key="index" class="mb-6">
          <div v-if="item.objectType !== 'LABEL' && item.objectType !== 'DYNAMICSIGNATORY'"
            class="flex justify-between">
            <label class="text-gray-700 font-semibold mb-2">
              {{ item.label }}
            </label>
          </div>
          <div v-if="item.objectType == 'DYNAMICSIGNATORY'" class="flex justify-between">
            <label class="text-gray-700 font-semibold mb-2 break-all block flex items-center gap-2">
              {{ item.label }}

              <!-- Count Badge -->
              <span class="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {{ item.dynamicsignatoriesvalues.length }}
              </span>
            </label>
          </div>
          <div v-if="item.objectType === 'LABEL'">
            <hr class="my-4 border-gray-400" />
            <h3 class="text-lg font-bold text-gray-800 mb-1">
              {{ item.label }}
            </h3>
          </div>
          <div v-else-if="item.objectType != 'DYNAMICSIGNATORY'" class="border p-3 rounded-md w-full text-gray-800">
            <span v-for="(value, index) in item.values" :key="index">
              {{ value
              }}<span v-if="index !== item.values.length - 1"> , </span>
            </span>
          </div>
          <div v-else-if="item.objectType === 'DYNAMICSIGNATORY'">
            <div v-for="(dynamic, index) in sortAllSignatories(item.dynamicsignatoriesvalues)" :key="index"
              class="mb-4">

              <div
                class="flex items-center justify-between p-4 border rounded-lg bg-gray-50 shadow-sm mb-4 transition-all duration-300"
                :class="{ 'highlight-pulse': isHighlighted && dynamic.currentuser }">
                <!-- Left: Name / Value -->
                <div class="group flex items-center gap-4">
                  <!-- Colored Bar Indicator -->
                  <div class="w-1 h-12 rounded-full bg-gradient-to-b"
                    :class="dynamic.currentuser ? 'from-blue-500 to-blue-600' : 'from-gray-300 to-gray-400'">
                  </div>

                  <!-- Content -->
                  <div class="flex-1">
                    <!-- Name Row -->
                    <div class="flex items-baseline gap-2 mb-0.5">
                      <span class="text-gray-900 font-medium text-md">
                        {{ dynamic.value }}
                      </span>

                      <span v-if="dynamic.currentuser" :id="dynamic.currentuser ? 'currentUserCard' : null"
                        class="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-extrabold text-blue-600 bg-blue-50 border border-blue-300 rounded uppercase tracking-wider">
                        <span class="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping absolute"></span>
                        <span class="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                        You
                      </span>
                    </div>

                    <!-- Meta Info -->
                    <div class="flex items-center gap-2 text-xs text-gray-500 ">
                      <span v-if="dynamic.position" class="hover:text-gray-700 transition-colors">
                        {{ dynamic.position }}
                      </span>
                      <span v-if="dynamic.position && dynamic.branch" class="w-1 h-1 rounded-full bg-gray-300"></span>
                      <span v-if="dynamic.branch" class="hover:text-gray-700 transition-colors">
                        {{ dynamic.branch }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Right: Status / Button -->
                <div>
                  <!-- If current user and response is 0, show approve button -->
                  <button v-if="dynamic.currentuser && dynamic.response === 0"
                    class="py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-800" @click="postSigned()">
                    SIGN
                  </button>

                  <!-- If current user and response is 1, show approved text -->
                  <span v-else-if="dynamic.currentuser && dynamic.response === 1"
                    class="inline-block px-3 py-1 text-sm font-semibold text-green-700 bg-green-100 rounded-full">
                    SIGNED -
                    {{
                      new Date(dynamic.responsedate).toLocaleString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "numeric",
                        minute: "numeric",
                        hour12: true, // optional, for 12-hour format with AM/PM
                      })
                    }}
                  </span>

                  <!-- Other statuses for non-current users -->
                  <span v-else-if="dynamic.response === 1"
                    class="inline-block px-3 py-1 text-sm font-semibold text-green-700 bg-green-100 rounded-full">
                    SIGNED -
                    {{
                      new Date(dynamic.responsedate).toLocaleString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "numeric",
                        minute: "numeric",
                        hour12: true, // optional, for 12-hour format with AM/PM
                      })
                    }}
                  </span>
                  <span v-else-if="dynamic.response === 0"
                    class="inline-block px-3 py-1 text-sm font-semibold text-yellow-800 bg-yellow-100 rounded-full">
                    PENDING
                  </span>
                  <span v-else
                    class="inline-block px-3 py-1 text-sm font-semibold text-gray-600 bg-gray-200 rounded-full">
                    UNKNOWN
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>

        <!-- Approver Section -->
        <div v-for="(approverGroup, approverNumber) in transactions.approvers" :key="approverNumber"
          class="mt-2 p-4 bg-gray-50 rounded-lg">
          <div v-if="
            getGroupVisibilityStatus(
              transactions.approvers,
              approverNumber
            ) !== 'hidden'
          ">
            <h2 class="text-md font-semibold text-gray-800 mb-2">
              Approver {{ approverNumber }} -
              <span :class="{
                'text-green-600':
                  getApprovalStatus(approverGroup) === 'approved',
                'text-red-600':
                  getApprovalStatus(approverGroup) === 'rejected',
                'text-yellow-600':
                  getApprovalStatus(approverGroup) !== 'approved' &&
                  getApprovalStatus(approverGroup) !== 'rejected' &&
                  getGroupVisibilityStatus(
                    transactions.approvers,
                    approverNumber
                  ) === 'pending',
                'text-gray-500':
                  getApprovalStatus(approverGroup) !== 'approved' &&
                  getApprovalStatus(approverGroup) !== 'rejected' &&
                  getGroupVisibilityStatus(
                    transactions.approvers,
                    approverNumber
                  ) === 'waiting',
              }">
                {{
                  getApprovalStatus(approverGroup) === "approved"
                    ? "Approved"
                    : getApprovalStatus(approverGroup) === "rejected"
                      ? "Disapproved"
                      : getGroupVisibilityStatus(
                        transactions.approvers,
                        approverNumber
                      ) === "pending"
                        ? "Pending"
                        : "Waiting"
                }}
              </span>
            </h2>

            <div v-for="approver in approverGroup" :key="approver.id" class="p-2 rounded-md shadow-sm mb-2" :class="[
              'rounded-xl p-5 shadow-md border mb-4 transition duration-300',
              approver.isCurrentApprover
                ? 'bg-gray-400 border-white-400 text-white'
                : 'bg-white text-gray-800',
            ]">
              <div class="flex justify-between">
                <div>
                  <h2 class="text-sm font-bold mb-2">
                    {{ approver.mainapprover ? "Main" : "Proxy" }}
                  </h2>
                </div>
                <div v-if="approver.isCurrentApprover" :id="approver.isCurrentApprover ? 'currentApproverCard' : null">
                  <span class="bg-white text-black text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                    You</span>
                </div>
              </div>
              <div class="flex justify-between">
                <div>
                  <p class="text-xs">
                    <strong>Name:</strong> {{ approver.approvername }}
                  </p>
                  <p class="text-xs">
                    <strong>Email:</strong> {{ approver.approveremail }}
                  </p>
                </div>
                <div v-if="approver.response == 1"
                  class="flex px-3 py-1 text-sm font-semibold text-green-700 bg-green-100 rounded-full">
                  <div class="text-md font-bold">
                    Approved -
                    {{
                      new Date(approver.responsedate).toLocaleString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "numeric",
                        minute: "numeric",
                        hour12: true, // optional, for 12-hour format with AM/PM
                      })
                    }}
                  </div>
                </div>
                <div v-if="approver.response == 2"
                  class="flex flex-col px-3 py-1 text-sm font-semibold text-red-700 bg-red-100 rounded-full">
                  <!-- Disapprove + Date -->
                  <div class="text-md font-bold">
                    Disapprove -
                    {{
                      new Date(approver.responsedate).toLocaleString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "numeric",
                        minute: "numeric",
                        hour12: true, // optional, for 12-hour format with AM/PM
                      })
                    }}
                  </div>

                  <!-- Remarks below -->
                  <div v-if="approver.remarks" class="flex text-gray-700 text-md mt-1 justify-end">
                    <div class="text-md font-bold">Remarks:</div>
                    <div class="text-md font-bold ml-1">
                      {{ approver.remarks }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="!transactions.hasResponse" class="flex gap-1 items-center justify-end mb-0 mr-4 mt-3">

      <button @click="postApprove()" v-if="transactions.hasCurrentApprover"
        class="py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-800">
        Approve
      </button>
      <button @click="postDisapprove()" v-if="transactions.hasCurrentApprover"
        class="py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-800">
        Disapprove
      </button>
    </div>
    <div class="flex gap-1 items-center justify-end mb-0 mr-4 mt-3">
      <button v-if="hasCurrentUserRef || transactions.hasResponse" type="button" @click="scrollToCurrentUser"
        class="px-4 py-2 rounded-lg text-white text-sm font-semibold tracking-wide bg-blue-500 hover:bg-blue-600 active:bg-blue-700 shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors duration-200">
        Find My Name
      </button>
      <button type="button" @click="moveToTransactions"
        class="px-4 py-2 rounded-lg text-gray-800 text-sm border-none outline-none tracking-wide bg-gray-200 hover:bg-gray-300 active:bg-gray-200">
        Close
      </button>
    </div>
  </div>
</template>

<script setup>
import {
  getTransaction,
  transactions,
  isTxLoading,
} from "~/js/fetchTransactions";
import LoadingModal from "~/components/modal/LoadingModal.vue";
import {
  confirmApproval,
  disapproveApproval,
} from "~/js/fetchListApprovalRequest";
import { getUrlTransactionId } from "~/js/cryptoToken";
import SignaturePad from "signature_pad";
import { checkusersignature, hasSignature } from "~/js/checkusersignature";
import { postusersignature } from "~/js/usersignature";
import ThankYouPage from "~/components/ThankYouPage.vue";
import { getusersignature } from "~/js/checkusersignature";
import { viewPdf } from "~/js/viewPdf";

const urltransactionId = ref();
const showThankUPage = ref(false);
const readyToRender = ref(false); // Flag to control rendering
const signatureFile = ref();
const formTitle = ref();
const router = useRouter();
const hasCurrentUserRef = ref(false);
const isHighlighted = ref(false);
const scrollToCurrentUser = () => {
  // First try to find in signatures
  let element = document.getElementById('currentUserCard');

  // If not found, try to find in approvers
  if (!element) {
    element = document.getElementById('currentApproverCard');
  }

  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Trigger highlight animation
    isHighlighted.value = true;

    // Remove highlight after animation completes
    setTimeout(() => {
      isHighlighted.value = false;
    }, 2000);
  }
};
const sortAllSignatories = (groups) => {
  console.log("herere", hasCurrentUserRef.value);
  // if (!groups || !Array.isArray(groups)) return [];

  // // Flatten all groups into one array
  // const allSignatories = groups.flatMap(group => group.value || []);

  if (!groups || !Array.isArray(groups)) {
    if (hasCurrentUserRef) hasCurrentUserRef.value = false;
    return [];
  }

  // Flatten all groups into one array
  const allSignatories = groups.flatMap(group => group.value || []);

  // Check if current user exists
  if (hasCurrentUserRef) {
    hasCurrentUserRef.value = allSignatories.some(
      s => s.currentuser === true
    );
  }
  console.log(hasCurrentUserRef.value);

  // Sort: current user first, then pending, then alphabetical
  return allSignatories.sort((a, b) => {
    // Current user always comes first
    if (a.currentuser && !b.currentuser) return -1;
    if (!a.currentuser && b.currentuser) return 1;

    // After current user, pending (response === 0) comes next
    if (a.response === 0 && b.response !== 0) return -1;
    if (a.response !== 0 && b.response === 0) return 1;

    // If both have same status, sort alphabetically by value
    return (a.value || '').localeCompare(b.value || '');
  });
};

const refreshThankYou = async () => {
  showThankUPage.value = false;
  await checkusersignature($swal);
  await getTransaction(urltransactionId.value);
}
const { $swal } = useNuxtApp();
const getApprovalStatus = (approverGroup) => {
  if (!Array.isArray(approverGroup)) return "pending"; // fallback

  const hasRejected = approverGroup.some((a) => a.response === 2);
  const hasApproved = approverGroup.some((a) => a.response === 1);
  const allPending = approverGroup.every(
    (a) => a.response === 0 || a.response == null
  );

  if (hasRejected) return "rejected";
  if (hasApproved) return "approved";
  if (allPending) return "pending";

  return "pending"; // fallback
};
const wasPreviousGroupRejected = (allGroups, currentIndex) => {
  const keys = Object.keys(allGroups)
    .map(Number)
    .sort((a, b) => a - b);
  for (let i = 0; i < keys.length; i++) {
    if (keys[i] >= currentIndex) break;
    if (getApprovalStatus(allGroups[keys[i]]) === "rejected") {
      return true;
    }
  }
  return false;
};

const areAllPreviousGroupsApproved = (allGroups, currentIndex) => {
  const keys = Object.keys(allGroups)
    .map(Number)
    .sort((a, b) => a - b);
  for (let i = 0; i < keys.length; i++) {
    if (keys[i] >= currentIndex) break;
    if (getApprovalStatus(allGroups[keys[i]]) !== "approved") {
      return false;
    }
  }
  return true;
};

const getGroupVisibilityStatus = (allGroups, currentIndex) => {
  if (wasPreviousGroupRejected(allGroups, currentIndex)) {
    return "hidden";
  }
  if (
    Number(currentIndex) === Math.min(...Object.keys(allGroups).map(Number))
  ) {
    return "pending";
  }
  if (areAllPreviousGroupsApproved(allGroups, currentIndex)) {
    return "pending";
  }
  if (transactions?.value.isinorder === 0) {
    return "pending";
  }
  return "waiting";
};
const postApprove = async () => {
  // ✅ Check if user has a saved signature
  if (hasSignature?.value == false) {
    const { isConfirmed } = await $swal.fire({
      title: "No Signature Found",
      text: "You don’t have a current signature. Do you want to create one?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, create one",
      cancelButtonText: "No",
      reverseButtons: true,
    });

    if (isConfirmed) {
      await createSignature("Approved"); // 🖋️ Create new signature
    }
  } else {
    // ✅ Ask confirmation before approving
    const imageUrl = await getusersignature($swal);
    signatureFile.value = URL.createObjectURL(imageUrl);
    const { isConfirmed } = await $swal.fire({
      title: "Confirm Approval",
      html: `
  <div style="font-size:15px; color:#374151; text-align:center;">
    <p>
      Are you sure you want to <strong>approve</strong> this form request?
    </p>

    <img 
      src="${signatureFile.value}" 
      alt="Signature Preview"
      style="
        margin:12px auto;
        max-width:220px;
        max-height:100px;
        object-fit:contain;
        border:1px solid #e5e7eb;
        padding:6px;
        background:white;
      "
    />

    <p style="font-size:13px; color:#6b7280;">
      Once signed, this action cannot be undone.
    </p>
  </div>
`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, approve it",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#d1d5db",
      reverseButtons: true,
    });

    if (isConfirmed) {
      await confirmApproval(urltransactionId.value, null);
      await $swal.fire({
        icon: "success",
        title: "Form Approved",
        text: "The form request has been successfully approved.",
        timer: 1500,
        showConfirmButton: false,
      });
      showThankUPage.value = true;
      formTitle.value = transactions.value.formTitle;
    }
  }
};

const postSigned = async () => {
  // ✅ Check if user has a saved signature
  if (hasSignature?.value == false || !hasSignature.value) {
    const { isConfirmed } = await $swal.fire({
      title: "No Signature Found",
      text: "You don’t have a current signature. Do you want to create one?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, create one",
      cancelButtonText: "No",
      reverseButtons: true,
    });

    if (isConfirmed) {
      await createSignature("Signed"); // 🖋️ Create new signature
    }
  } else {
    const imageUrl = await getusersignature($swal);
    signatureFile.value = URL.createObjectURL(imageUrl);
    // ✅ Ask confirmation before approving
    const { isConfirmed } = await $swal.fire({
      title: "Confirm Approval",
      html: `
  <div style="font-size:15px; color:#374151; text-align:center;">
    <p>
      Are you sure you want to <strong>sign</strong> this form request?
    </p>

    <img 
      src="${signatureFile.value}" 
      alt="Signature Preview"
      style="
        margin:12px auto;
        max-width:220px;
        max-height:100px;
        object-fit:contain;
        border:1px solid #e5e7eb;
        padding:6px;
        background:white;
      "
    />

    <p style="font-size:13px; color:#6b7280;">
      Once signed, this action cannot be undone.
    </p>
  </div>
`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, sign it",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#d1d5db",
      reverseButtons: true,
    });

    if (isConfirmed) {
      await confirmApproval(urltransactionId.value, null);
      await $swal.fire({
        title: "Form Signed!",
        text: "The request has been signed successfully.",
        icon: "success",
        timer: 1000,
        showConfirmButton: false,
      })
      showThankUPage.value = true;
      formTitle.value = transactions.value.formTitle;
    }
  }
}
const removeWhiteBackground = (file) => {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = () => (img.src = reader.result);
    reader.readAsDataURL(file);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Remove white / near-white pixels
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        if (r > 245 && g > 245 && b > 245) {
          data[i + 3] = 0; // transparent
        }
      }

      ctx.putImageData(imageData, 0, 0);

      canvas.toBlob(
        (blob) => resolve(blob),
        "image/png",
        1
      );
    };
  });
};
const getViewPdf = async (id) =>{
  isTxLoading.value = true;
  await viewPdf(id);
  isTxLoading.value = false;
}


const createSignature = async (text) => {
  const { value: result, isConfirmed } = await $swal.fire({
    title: '<span style="font-size:18px;font-weight:800;color:#0f172a;letter-spacing:-.02em;">Create Your Signature</span>',
    html: `
      <div style="display:flex;flex-direction:column;gap:18px;width:100%;align-items:center;box-sizing:border-box;">

        <!-- Pill toggle -->
        <div style="display:flex;background:#f1f5f9;border-radius:12px;padding:4px;gap:4px;width:fit-content;">
          <label id="lbl-draw"
            style="padding:8px 28px;font-weight:700;font-size:13px;cursor:pointer;
                   background:#2563eb;color:#fff;border-radius:9px;
                   transition:all .2s;letter-spacing:.01em;user-select:none;">
            <input type="radio" name="sigType" value="draw" checked style="display:none;"> ✏️&nbsp;&nbsp;Draw
          </label>
          <label id="lbl-upload"
            style="padding:8px 28px;font-weight:700;font-size:13px;cursor:pointer;
                   background:transparent;color:#64748b;border-radius:9px;
                   transition:all .2s;letter-spacing:.01em;user-select:none;">
            <input type="radio" name="sigType" value="upload" style="display:none;"> 📂&nbsp;&nbsp;Upload
          </label>
        </div>

        <!-- ══ DRAW PANEL ══ -->
        <div id="draw-wrapper" style="width:100%;text-align:center;">

          <p style="font-size:12px;color:#94a3b8;margin-bottom:10px;letter-spacing:.02em;">
            Draw your signature inside the box
          </p>

          <div style="position:relative;display:block;width:100%;max-width:700px;margin:0 auto;">
            <canvas id="signature-pad"
              style="display:block;width:100%;height:210px;
                     border:2px dashed #cbd5e1;border-radius:16px;
                     background:linear-gradient(160deg,#f8fafc,#f1f5f9);
                     touch-action:none;cursor:crosshair;
                     box-shadow:inset 0 2px 6px rgba(0,0,0,.05);">
            </canvas>
            <div id="sig-hint" style="
              position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
              pointer-events:none;font-size:16px;color:#d1d5db;font-style:italic;gap:8px;">
              <svg width="20" height="20" fill="none" stroke="#d1d5db" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
              </svg>
              Sign here
            </div>
          </div>

          <!-- Controls row -->
          <div style="display:flex;align-items:center;gap:16px;max-width:700px;margin:12px auto 0;flex-wrap:wrap;justify-content:space-between;">
            <!-- Thickness slider -->
            <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:140px;">
              <svg width="12" height="12" fill="#94a3b8" viewBox="0 0 12 12"><circle cx="6" cy="6" r="2.5"/></svg>
              <input id="thickness-slider" type="range" min="1" max="12" value="3"
                style="flex:1;height:4px;accent-color:#2563eb;cursor:pointer;">
              <svg width="18" height="18" fill="#64748b" viewBox="0 0 18 18"><circle cx="9" cy="9" r="6"/></svg>
            </div>

            <!-- Color swatches -->
            <div style="display:flex;align-items:center;gap:7px;">
              <div id="color-black" data-color="#0f172a" title="Black"
                style="width:26px;height:26px;border-radius:50%;background:#0f172a;
                       border:3px solid #2563eb;cursor:pointer;transition:transform .15s;"></div>
              <div id="color-navy" data-color="#1e3a8a" title="Navy"
                style="width:26px;height:26px;border-radius:50%;background:#1e3a8a;
                       border:2px solid #e2e8f0;cursor:pointer;transition:transform .15s;"></div>
              <div id="color-blue" data-color="#1d4ed8" title="Blue"
                style="width:26px;height:26px;border-radius:50%;background:#1d4ed8;
                       border:2px solid #e2e8f0;cursor:pointer;transition:transform .15s;"></div>
              <div id="color-green" data-color="#14532d" title="Dark Green"
                style="width:26px;height:26px;border-radius:50%;background:#14532d;
                       border:2px solid #e2e8f0;cursor:pointer;transition:transform .15s;"></div>
            </div>

            <!-- Clear -->
            <button id="clear-signature"
              style="display:flex;align-items:center;gap:6px;padding:7px 16px;
                     background:#fff1f2;color:#e11d48;
                     border:1.5px solid #fecdd3;border-radius:10px;
                     font-weight:700;font-size:13px;cursor:pointer;transition:all .15s;"
              onmouseenter="this.style.background='#fecdd3'"
              onmouseleave="this.style.background='#fff1f2'">
              <svg width="13" height="13" fill="none" stroke="#e11d48" stroke-width="2.2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/>
              </svg>
              Clear
            </button>
          </div>
        </div>

        <!-- ══ UPLOAD PANEL ══ -->
        <div id="upload-wrapper" style="display:none;width:100%;max-width:700px;">
          <label for="signature-upload"
            style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                   border:2px dashed #cbd5e1;border-radius:16px;padding:44px 24px;cursor:pointer;
                   background:#f8fafc;gap:12px;transition:border-color .2s,background .2s;"
            onmouseenter="this.style.borderColor='#2563eb';this.style.background='#eff6ff'"
            onmouseleave="this.style.borderColor='#cbd5e1';this.style.background='#f8fafc'">
            <div style="width:54px;height:54px;border-radius:14px;background:#dbeafe;
                        display:flex;align-items:center;justify-content:center;">
              <svg width="28" height="28" fill="none" stroke="#2563eb" stroke-width="1.6" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.338-2.32 5.75 5.75 0 0 1 .605 11.095"/>
              </svg>
            </div>
            <div style="text-align:center;">
              <p style="font-weight:800;font-size:14px;color:#1e293b;margin:0 0 3px;">Click to upload</p>
              <p style="font-size:12px;color:#94a3b8;margin:0;">PNG or JPG · white background removed automatically</p>
            </div>
            <input type="file" id="signature-upload" accept="image/png,image/jpeg" style="display:none;" />
          </label>
          <img id="upload-preview"
            style="display:none;margin:14px auto 0;max-height:180px;
                   border:1.5px solid #e2e8f0;border-radius:12px;
                   box-shadow:0 2px 8px rgba(0,0,0,.06);" />
        </div>

        <!-- ══ TERMS ══ -->
        <div style="width:100%;max-width:700px;background:#f8fafc;border:1.5px solid #e2e8f0;
                    border-radius:12px;padding:12px 16px;">
          <label style="display:flex;align-items:flex-start;gap:10px;font-size:13.5px;
                         cursor:pointer;color:#475569;line-height:1.5;">
            <input type="checkbox" id="agree-terms"
              style="margin-top:2px;accent-color:#2563eb;width:15px;height:15px;cursor:pointer;" />
            <span>I have read and agree to the
              <span id="open-terms"
                style="color:#2563eb;font-weight:700;text-decoration:underline;cursor:pointer;">
                Electronic Signature Terms & Conditions.
              </span>
            </span>
          </label>
        </div>

      </div>
    `,
    width: 780,
    padding: '2.25rem 2.25rem 2rem',
    showCancelButton: true,
    confirmButtonText: '✅ &nbsp;Save Signature',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#2563eb',
    cancelButtonColor: '#94a3b8',
    focusConfirm: false,
    customClass: { popup: 'sig-swal-web' },

    didOpen: () => {
      const canvas        = document.getElementById('signature-pad');
      const hint          = document.getElementById('sig-hint');
      const thickSlider   = document.getElementById('thickness-slider');
      const uploadInput   = document.getElementById('signature-upload');
      const uploadPreview = document.getElementById('upload-preview');
      const agreeChk      = document.getElementById('agree-terms');
      const openTerms     = document.getElementById('open-terms');
      const drawWrapper   = document.getElementById('draw-wrapper');
      const uploadWrapper = document.getElementById('upload-wrapper');
      const lblDraw       = document.getElementById('lbl-draw');
      const lblUpload     = document.getElementById('lbl-upload');
      const colorBtns     = document.querySelectorAll('[data-color]');

      // ── Resize canvas to its rendered size before SignaturePad init ──
      const rect = canvas.getBoundingClientRect();
      canvas.width  = rect.width;
      canvas.height = rect.height;

      // ── SignaturePad init ────────────────────────────────────
      const signaturePad = new SignaturePad(canvas, {
        penColor: '#0f172a',
        minWidth: 1.5,
        maxWidth: 3,
        backgroundColor: 'rgba(0,0,0,0)',  // transparent so CSS gradient bg shows
      });
      signaturePad.addEventListener('beginStroke', () => { hint.style.display = 'none'; });

      // Hide hint on first stroke
      canvas.addEventListener('mousedown',  () => { hint.style.display = 'none'; }, { once: true });
      canvas.addEventListener('touchstart', () => { hint.style.display = 'none'; }, { once: true });

      // ── Clear ────────────────────────────────────────────────
      document.getElementById('clear-signature').addEventListener('click', () => {
        signaturePad.clear();
        hint.style.display = 'flex';
      });

      // ── Thickness ────────────────────────────────────────────
      thickSlider.addEventListener('input', e => {
        const v = parseInt(e.target.value);
        signaturePad.minWidth = Math.max(0.5, v - 1);
        signaturePad.maxWidth = v;
      });

      // ── Color swatches ───────────────────────────────────────
      colorBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          signaturePad.penColor = btn.dataset.color;
          colorBtns.forEach(b => { b.style.border = '2px solid #e2e8f0'; b.style.transform = 'scale(1)'; });
          btn.style.border    = '3px solid #2563eb';
          btn.style.transform = 'scale(1.15)';
        });
        btn.addEventListener('mouseenter', () => { btn.style.transform = 'scale(1.1)'; });
        btn.addEventListener('mouseleave', () => {
          if (btn.dataset.color !== signaturePad.penColor) btn.style.transform = 'scale(1)';
        });
      });

      // ── Mode toggle ──────────────────────────────────────────
      document.querySelectorAll('input[name="sigType"]').forEach(radio => {
        radio.closest('label').addEventListener('click', () => {
          if (radio.value === 'draw') {
            drawWrapper.style.display   = 'block';
            uploadWrapper.style.display = 'none';
            lblDraw.style.background    = '#2563eb'; lblDraw.style.color    = '#fff';
            lblUpload.style.background  = 'transparent'; lblUpload.style.color = '#64748b';
          } else {
            drawWrapper.style.display   = 'none';
            uploadWrapper.style.display = 'block';
            lblUpload.style.background  = '#2563eb'; lblUpload.style.color  = '#fff';
            lblDraw.style.background    = 'transparent'; lblDraw.style.color = '#64748b';
            signaturePad.clear();
            hint.style.display = 'flex';
          }
        });
      });

      // ── Upload preview ───────────────────────────────────────
      uploadInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => { uploadPreview.src = reader.result; uploadPreview.style.display = 'block'; };
        reader.readAsDataURL(file);
      });

      // ── Terms modal ──────────────────────────────────────────
      const showTermsModal = () => {
        if (document.getElementById('terms-popup')) return;
        document.body.insertAdjacentHTML('beforeend', `
          <div id="terms-popup"
            style="position:fixed;inset:0;background:rgba(15,23,42,.6);
                   display:flex;align-items:center;justify-content:center;
                   z-index:99999;backdrop-filter:blur(3px);">
            <div style="background:#fff;width:90%;max-width:520px;border-radius:20px;
                        padding:28px;box-shadow:0 24px 60px rgba(0,0,0,.2);">
              <h2 style="font-weight:800;font-size:17px;color:#0f172a;margin-bottom:14px;letter-spacing:-.02em;">
                Electronic Signature Terms & Conditions.
              </h2>
              <div style="max-height:260px;overflow-y:auto;border:1.5px solid #e2e8f0;padding:14px;
                          border-radius:10px;font-size:13.5px;line-height:1.7;color:#475569;margin-bottom:18px;">
               By using this system to sign documents, you agree that your electronic signature (drawn or typed) is the <b> legal equivalent of your handwritten </b> signature. You consent to the use of electronic signatures for all documents processed through this system.
          You understand that:
                <ol style="padding-left:1.3rem;display:flex;flex-direction:column;gap:8px;">
                  <li>1. Your electronic signature <b>binds you legally</b> to the document you are signing.</li>
                  <li>2. The system will record your <b>user ID, timestamp, IP address, device information, and signature image</b> to validate authenticity.</li>
                  <li>3. The signed document is <b>stored securely</b> and cannot be altered without detection.</li>
                  <li>4. You may <b>request access, correction, or deletion</b> of your personal data in accordance with the <b>Data Privacy Act of 2012 (RA 10173)</b>.</li>
                  <li>5. You confirm that you are <b>authorized to sign</b> the document and agree to comply with company policies regarding document approvals.</li>
                </ol>
              </div>
              <div style="display:flex;justify-content:flex-end;">
                <button id="close-terms"
                  style="background:#2563eb;color:#fff;padding:10px 24px;border:none;
                         border-radius:10px;font-weight:700;font-size:13.5px;cursor:pointer;">
                  I Understand
                </button>
              </div>
            </div>
          </div>`);
        document.getElementById('close-terms').addEventListener('click', () => {
          document.getElementById('terms-popup')?.remove();
          agreeChk.checked = true;
        });
      };

      agreeChk.addEventListener('change', e => { if (e.target.checked) showTermsModal(); });
      openTerms.addEventListener('click', showTermsModal);

      // Expose for preConfirm
      window.signaturePadInstance = signaturePad;
    },

    preConfirm: () => {
      const signaturePad = window.signaturePadInstance;
      const agree        = document.getElementById('agree-terms');
      const uploadInput  = document.getElementById('signature-upload');
      const sigType      = document.querySelector('input[name="sigType"]:checked')?.value;

      if (!agree.checked) {
        $swal.showValidationMessage('Please agree to the Electronic Signature Terms & Conditions.');
        return false;
      }

      if (sigType === 'draw') {
        if (!signaturePad || signaturePad.isEmpty()) {
          $swal.showValidationMessage('Please draw your signature.');
          return false;
        }
        return { type: 'draw', data: signaturePad.toDataURL('image/png') };
      }

      if (!uploadInput.files.length) {
        $swal.showValidationMessage('Please upload a signature image.');
        return false;
      }

      return { type: 'upload', file: uploadInput.files[0] };
    },
  });

  // ================= SAVE SIGNATURE =================
  if (isConfirmed && result) {
    let blob;

    if (result.type === 'draw') {
      const byteString = atob(result.data.split(',')[1]);
      const mimeString = result.data.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      blob = new Blob([ab], { type: mimeString });
    } else {
      blob = await removeWhiteBackground(result.file);
    }

    const formData = new FormData();
    formData.append('signaturefile', blob, 'signature.png');

    await postusersignature(formData, $swal);
    await confirmApproval(urltransactionId.value, null);

    $swal.fire({
      title: `Form ${text}!`,
      text: `The request has been ${text} successfully`,
      icon: 'success',
      timer: 1200,
      showConfirmButton: false,
    });

    showThankUPage.value = true;
  }
};

const postDisapprove = async () => {
  const { value: remarks } = await $swal.fire({
    title: "Are you sure?",
    text: "Do you really want to disapprove this request?",
    icon: "warning",
    input: "textarea",
    inputPlaceholder: "Enter remarks here...",
    showCancelButton: true,
    confirmButtonText: "Yes, disapprove it!",
    cancelButtonText: "No, cancel",
    inputValidator: (value) => {
      if (!value) {
        return "Remarks are required!";
      }
    },
  });

  if (remarks) {
    await disapproveApproval(urltransactionId.value, remarks);
    $swal.fire({
      title: "Disapproved!",
      text: "The request has been disapproved.",
      icon: "success",
      timer: 1000,
      showConfirmButton: false,
    });
    return navigateTo("/main/dashboard");
  }
};
const moveToTransactions = async () => {
  return navigateTo("/main/dashboard");
};

definePageMeta({
  middleware: "auth", // 👈 Tells Nuxt to run the "auth" middleware
});

onMounted(async () => {
  urltransactionId.value = getUrlTransactionId();
  signatureFile.value = await getusersignature($swal);
  await checkusersignature($swal);
  await getTransaction(urltransactionId.value);
  if (!transactions.value.iscurrentuser) {
    if (
      transactions.value &&
      !transactions.value.hasSignatory &&
      !transactions.value.hasCurrentApprover
    ) {
      const result = await $swal.fire({
        title: "Access Denied",
        text: "You are not allowed to view this transaction.",
        icon: "error",
        confirmButtonText: "Close", // Button at the bottom
        allowOutsideClick: false,
        allowEscapeKey: false,
      });

      // Redirect only if the user clicks the "Close" button
      if (result.isConfirmed) {
        router.push("/main/dashboard");
      }
    }
  }

  readyToRender.value = true; // Set only if access is granted
});
</script>
<style>
@keyframes highlight-pulse {

  0%,
  100% {
    background-color: transparent;
  }

  50% {
    background-color: rgb(254 240 138);
    /* yellow-200 */
  }
}

.highlight-pulse {
  animation: highlight-pulse 0.6s ease-in-out 3;

}
</style>
