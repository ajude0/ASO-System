<template>
  <div v-if="showThankUPage">
    <ThankYouPage :key="thankYouKey" :transaction-id="urltransactionId" :transaction-name="formTitle"
      @refresh="refreshThankYou" />
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
          <div v-if="item.objectType !== 'LABEL'" class="flex justify-between">
            <label class="text-gray-700 font-semibold mb-2">
              {{ item.label }}
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
            <div v-for="(group, groupIndex) in item?.dynamicsignatoriesvalues" :key="groupIndex">
              <div v-for="(dynamic, index) in group.value" :key="index" class="mb-6">
                <div class="flex items-center justify-between p-4 border rounded-lg bg-gray-50 shadow-sm mb-4">
                  <!-- Left: Name / Value -->
                  <div class="text-gray-800 font-medium flex items-center gap-2">
                    {{ dynamic.value }}
                    <span v-if="dynamic.currentuser"
                      class="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                      YOU
                    </span>
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
                <div v-if="approver.isCurrentApprover">
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


const refreshThankYou = async() => {
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
const createSignature = async (text) => {
  const { value: signature, isConfirmed } = await $swal.fire({
    title: `Create your own signature`,
    html: `
      <div style="display:flex; flex-direction:column; align-items:center; gap:1rem; width:100%;">
        <label style="font-weight:600; font-size:16px;">Please sign below:</label>
        <canvas id="signature-pad" width="700" height="250" 
          style="border:2px dashed #9ca3af; border-radius:12px; background:#f9fafb; width:100%; max-width:700px; height:250px;"></canvas>
        
        <div style="display:flex; align-items:center; gap:10px; width:100%; max-width:700px; margin-top:12px;">
          <label style="font-size:14px; font-weight:600;">Stroke:</label>
          <input id="thickness-slider" type="range" min="1" max="10" value="4" style="flex:1; cursor:pointer;">
          <span id="thickness-value" style="min-width:25px; text-align:center; font-weight:600;">4</span>
        </div>

        <button id="clear-signature" class="swal2-cancel swal2-styled" 
          style="margin-top:12px; background:#ef4444; border-radius:6px; padding:8px 16px; font-size:14px;">
          Clear Signature
        </button>

        <div style="text-align:left; width:100%; max-width:700px; margin-top:16px;">
          <label style="display:flex; align-items:center; gap:8px; font-size:14px;">
            <input type="checkbox" id="agree-terms">
            <span>I have read and agree to the <span style="color:#3b82f6; text-decoration:underline; cursor:pointer;">Terms and Conditions</span></span>
          </label>
        </div>
      </div>
    `,
    width: 800,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: "Confirm Signature",
    cancelButtonText: "Cancel",
    didOpen: () => {
      const canvas = document.getElementById("signature-pad");
      const thicknessSlider = document.getElementById("thickness-slider");
      const thicknessValue = document.getElementById("thickness-value");
      const agreeCheckbox = document.getElementById("agree-terms");

      const signaturePad = new SignaturePad(canvas, {
        backgroundColor: "rgba(255,255,255,0)",
        penColor: "black",
        minWidth: 2,
        maxWidth: 5,
      });

      // Stroke slider
      thicknessSlider.addEventListener("input", (e) => {
        const value = parseInt(e.target.value);
        thicknessValue.textContent = value;
        signaturePad.minWidth = Math.max(1, value - 1);
        signaturePad.maxWidth = value;
      });

      // Clear signature
      document.getElementById("clear-signature")?.addEventListener("click", () => signaturePad.clear());

      // Show Terms popup automatically when checkbox is checked
      agreeCheckbox.addEventListener("change", (e) => {
        if (e.target.checked) {
          const termsHtml = `
            <div id="terms-popup" 
              style="
                position: fixed; 
                top: 0; left: 0; 
                width: 100vw; height: 100vh; 
                background: rgba(0,0,0,0.5);
                display: flex; align-items: center; justify-content: center;
                z-index: 99999;
              ">
              <div style="
                background: white; 
                width: 90%; max-width: 600px; 
                border-radius: 12px; 
                padding: 20px; 
                box-shadow: 0 10px 20px rgba(0,0,0,0.2);
              ">
                <h2 style="font-weight:600; font-size:18px; margin-bottom:10px;">Terms and Conditions</h2>
                <div style="max-height:300px; overflow-y:auto; border:1px solid #e5e7eb; padding:10px; border-radius:8px; font-size:14px; line-height:1.6; margin-bottom:16px;">
                  <ol style="padding-left:1.2rem;">
                    <li>By signing this form, you confirm that the information provided is true and accurate.</li>
                    <li>You acknowledge that this signature has the same legal validity as your handwritten signature.</li>
                    <li>Any falsification of information may result in disciplinary or legal action.</li>
                    <li>The organization reserves the right to verify your submission for authenticity.</li>
                    <li>All data collected will be processed in accordance with applicable data protection laws.</li>
                  </ol>
                </div>
                <div style="text-align:right;">
                  <button id="close-terms" 
                    style="background:#3b82f6; color:white; padding:8px 16px; border:none; border-radius:6px; cursor:pointer;">
                    I Understand
                  </button>
                </div>
              </div>
            </div>
          `;

          document.body.insertAdjacentHTML("beforeend", termsHtml);

          document.getElementById("close-terms").addEventListener("click", () => {
            document.getElementById("terms-popup")?.remove();
            agreeCheckbox.checked = true; // keep it checked after reading
          });
        }
      });

      window.signaturePadInstance = signaturePad;
    },
    preConfirm: () => {
      const signaturePad = window.signaturePadInstance;
      const agreeCheckbox = document.getElementById("agree-terms");

      if (!signaturePad || signaturePad.isEmpty()) {
        $swal.showValidationMessage("✍️ Please provide a signature before confirming.");
        return false;
      }

      if (!agreeCheckbox.checked) {
        $swal.showValidationMessage("✅ Please read and agree to the Terms and Conditions before proceeding.");
        return false;
      }

      return signaturePad.toDataURL("image/png");
    },
  });

  if (isConfirmed && signature) {
    const byteString = atob(signature.split(",")[1]);
    const mimeString = signature.split(",")[0].split(":")[1].split(";")[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    const blob = new Blob([ab], { type: mimeString });

    const formData = new FormData();
    formData.append("signaturefile", blob, "signature.png");

    await postusersignature(formData, $swal);
    await confirmApproval(urltransactionId.value, null);
    $swal.fire({
      title: `Form ${text}!`,
      text: `The request has been ${text} successfully`,
      icon: "success",
      width: 400,
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
