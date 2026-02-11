<template>
  <div v-if="showThankUPage">
    <ThankYouPage :key="thankYouKey" :transaction-id="urltransactionId" :transaction-name="formTitle"
      type-name="Transaction" @refresh="refreshThankYou" />
  </div>
  <div v-else class="w-full bg-white shadow-lg rounded-lg p-6 relative max-h-[90vh]">
    <div class="flex items-center pb-3 border-b border-gray-300">
      <h3 class="text-gray-800 text-xl font-bold flex-1">Transactions</h3>
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

const createSignature = async (text) => {
  const { value: result, isConfirmed } = await $swal.fire({
    title: "Create your own signature",
    html: `
      <div style="display:flex; flex-direction:column; gap:16px; width:100%; align-items:center;">

        <label style="font-weight:600;">Choose how you want to sign:</label>
        <div style="display:flex; gap:16px;">
          <label><input type="radio" name="sigType" value="draw" checked /> Draw</label>
          <label><input type="radio" name="sigType" value="upload" /> Upload</label>
        </div>

        <!-- DRAW SIGNATURE -->
        <div id="draw-wrapper" style="width:100%; text-align:center;">
          <label style="font-weight:600;">Please sign below:</label>
          <canvas id="signature-pad" width="700" height="250"
            style="border:2px dashed #9ca3af; border-radius:12px; background:#f9fafb; width:100%; max-width:700px;">
          </canvas>

          <div style="display:flex; align-items:center; gap:10px; max-width:700px; margin:12px auto 0;">
            <label>Stroke:</label>
            <input id="thickness-slider" type="range" min="1" max="10" value="4" style="flex:1;">
            <span id="thickness-value">4</span>
          </div>

          <button id="clear-signature" class="swal2-cancel swal2-styled"
            style="margin-top:12px; background:#ef4444;">
            Clear Signature
          </button>
        </div>

        <!-- UPLOAD SIGNATURE -->
        <div id="upload-wrapper"
          style="display:none; width:100%; max-width:700px; text-align:center;">
          <label style="font-weight:600;">Upload signature (PNG/JPG):</label>
          <input type="file" id="signature-upload"
            accept="image/png,image/jpeg"
            style="display:block; margin:8px auto;" />

          <img id="upload-preview"
            style="
              display:none;
              margin:12px auto 0;
              max-height:150px;
              border:1px solid #e5e7eb;
              border-radius:8px;
            " />
        </div>

        <!-- TERMS -->
        <div style="width:100%; max-width:700px; text-align:left;">
          <label style="display:flex; align-items:center; gap:8px; font-size:14px;">
            <input type="checkbox" id="agree-terms" />
            <span>
              I have read and agree to the
              <span id="open-terms"
                style="color:#3b82f6; text-decoration:underline; cursor:pointer;">
                Terms and Conditions
              </span>
            </span>
          </label>
        </div>

      </div>
    `,
    width: 800,
    showCancelButton: true,
    confirmButtonText: "Confirm Signature",
    cancelButtonText: "Cancel",
    focusConfirm: false,

    didOpen: () => {
      const canvas = document.getElementById("signature-pad");
      const thicknessSlider = document.getElementById("thickness-slider");
      const thicknessValue = document.getElementById("thickness-value");
      const uploadInput = document.getElementById("signature-upload");
      const uploadPreview = document.getElementById("upload-preview");
      const agreeCheckbox = document.getElementById("agree-terms");
      const openTerms = document.getElementById("open-terms");

      const drawWrapper = document.getElementById("draw-wrapper");
      const uploadWrapper = document.getElementById("upload-wrapper");

      const radios = document.querySelectorAll('input[name="sigType"]');

      const signaturePad = new SignaturePad(canvas, {
        penColor: "black",
        minWidth: 2,
        maxWidth: 5,
      });

      // ================= TERMS MODAL =================
      const showTermsModal = () => {
        if (document.getElementById("terms-popup")) return;

        const termsHtml = `
          <div id="terms-popup"
            style="
              position:fixed;
              inset:0;
              background:rgba(0,0,0,0.5);
              display:flex;
              align-items:center;
              justify-content:center;
              z-index:99999;
            ">
            <div style="
              background:white;
              width:90%;
              max-width:600px;
              border-radius:12px;
              padding:20px;
              box-shadow:0 10px 20px rgba(0,0,0,0.2);
            ">
              <h2 style="font-weight:600; font-size:18px; margin-bottom:10px;">
                Terms and Conditions
              </h2>

              <div style="
                max-height:300px;
                overflow-y:auto;
                border:1px solid #e5e7eb;
                padding:10px;
                border-radius:8px;
                font-size:14px;
                line-height:1.6;
                margin-bottom:16px;
              ">
                <ol style="padding-left:1.2rem;">
                  <li>The signature provided is legally binding.</li>
                  <li>The signature belongs to the account holder.</li>
                  <li>Falsification may result in disciplinary action.</li>
                  <li>The organization may verify authenticity.</li>
                  <li>Data is handled per data protection policies.</li>
                </ol>
              </div>

              <div style="text-align:right;">
                <button id="close-terms"
                  style="
                    background:#3b82f6;
                    color:white;
                    padding:8px 16px;
                    border:none;
                    border-radius:6px;
                    cursor:pointer;
                  ">
                  I Understand
                </button>
              </div>
            </div>
          </div>
        `;

        document.body.insertAdjacentHTML("beforeend", termsHtml);

        document.getElementById("close-terms").addEventListener("click", () => {
          document.getElementById("terms-popup")?.remove();
          agreeCheckbox.checked = true;
        });
      };

      agreeCheckbox.addEventListener("change", e => {
        if (e.target.checked) showTermsModal();
      });

      openTerms.addEventListener("click", showTermsModal);

      // Toggle draw / upload
      radios.forEach(radio => {
        radio.addEventListener("change", () => {
          if (radio.value === "draw" && radio.checked) {
            drawWrapper.style.display = "block";
            uploadWrapper.style.display = "none";
          } else {
            drawWrapper.style.display = "none";
            uploadWrapper.style.display = "block";
            signaturePad.clear();
          }
        });
      });

      // Stroke thickness
      thicknessSlider.addEventListener("input", e => {
        const value = parseInt(e.target.value);
        thicknessValue.textContent = value;
        signaturePad.minWidth = Math.max(1, value - 1);
        signaturePad.maxWidth = value;
      });

      // Clear canvas
      document
        .getElementById("clear-signature")
        .addEventListener("click", () => signaturePad.clear());

      // Upload preview
      uploadInput.addEventListener("change", e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          uploadPreview.src = reader.result;
          uploadPreview.style.display = "block";
        };
        reader.readAsDataURL(file);
      });

      window.signaturePadInstance = signaturePad;
    },

    preConfirm: () => {
      const signaturePad = window.signaturePadInstance;
      const agree = document.getElementById("agree-terms");
      const uploadInput = document.getElementById("signature-upload");
      const sigType = document.querySelector('input[name="sigType"]:checked')?.value;

      if (!agree.checked) {
        $swal.showValidationMessage("Please agree to the Terms and Conditions.");
        return false;
      }

      if (sigType === "draw") {
        if (!signaturePad || signaturePad.isEmpty()) {
          $swal.showValidationMessage("Please draw your signature.");
          return false;
        }
        return { type: "draw", data: signaturePad.toDataURL("image/png") };
      }

      if (!uploadInput.files.length) {
        $swal.showValidationMessage("Please upload a signature image.");
        return false;
      }

      return { type: "upload", file: uploadInput.files[0] };
    },
  });

  // ================= SAVE SIGNATURE =================
  if (isConfirmed && result) {
    let blob;

    if (result.type === "draw") {
      const byteString = atob(result.data.split(",")[1]);
      const mimeString = result.data.split(",")[0].split(":")[1].split(";")[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      blob = new Blob([ab], { type: mimeString });
    } else {
      blob = await removeWhiteBackground(result.file);
    }

    const formData = new FormData();
    formData.append("signaturefile", blob, "signature.png");

    await postusersignature(formData, $swal);
    await confirmApproval(urltransactionId.value, null);

    $swal.fire({
      title: `Form ${text}!`,
      text: `The request has been ${text} successfully`,
      icon: "success",
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
