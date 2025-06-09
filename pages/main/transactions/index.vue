<template>
  <div class="w-full bg-white shadow-lg rounded-lg p-6 relative max-h-[90vh]">
    <div class="flex items-center pb-3 border-b border-gray-300">
      <h3 class="text-gray-800 text-xl font-bold flex-1">Transaction</h3>
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

        <div
          v-for="(item, index) in transactions?.formObjects"
          :key="index"
          class="mb-6"
        >
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
          <div
            v-else-if="item.objectType != 'DYNAMICSIGNATORY'"
            class="border p-3 rounded-md w-full text-gray-800"
          >
            <span v-for="(value, index) in item.values" :key="index">
              {{ value
              }}<span v-if="index !== item.values.length - 1"> , </span>
            </span>
          </div>
          <div v-else-if="item.objectType === 'DYNAMICSIGNATORY'">
            <div
              v-for="(group, groupIndex) in item?.dynamicsignatoriesvalues"
              :key="groupIndex"
            >
              <div
                v-for="(dynamic, index) in group.value"
                :key="index"
                class="mb-6"
              >
                <div
                  class="flex items-center justify-between p-4 border rounded-lg bg-gray-50 shadow-sm mb-4"
                >
                  <!-- Left: Name / Value -->
                  <div
                    class="text-gray-800 font-medium flex items-center gap-2"
                  >
                    {{ dynamic.value }}
                    <span
                      v-if="dynamic.currentuser"
                      class="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full"
                    >
                      YOU
                    </span>
                  </div>

                  <!-- Right: Status / Button -->
                  <div>
                    <!-- If current user and response is 0, show approve button -->
                    <button
                      v-if="dynamic.currentuser && dynamic.response === 0"
                      class="py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-800"
                      @click="postApprove()"
                    >
                      APPROVED
                    </button>

                    <!-- If current user and response is 1, show approved text -->
                    <span
                      v-else-if="dynamic.currentuser && dynamic.response === 1"
                      class="inline-block px-3 py-1 text-sm font-semibold text-green-700 bg-green-100 rounded-full"
                    >
                      APPROVED
                    </span>

                    <!-- Other statuses for non-current users -->
                    <span
                      v-else-if="dynamic.response === 1"
                      class="inline-block px-3 py-1 text-sm font-semibold text-green-700 bg-green-100 rounded-full"
                    >
                      APPROVED
                    </span>
                    <span
                      v-else-if="dynamic.response === 0"
                      class="inline-block px-3 py-1 text-sm font-semibold text-yellow-800 bg-yellow-100 rounded-full"
                    >
                      PENDING
                    </span>
                    <span
                      v-else
                      class="inline-block px-3 py-1 text-sm font-semibold text-gray-600 bg-gray-200 rounded-full"
                    >
                      UNKNOWN
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Approver Section -->
        <div
          v-for="(approverGroup, approverNumber) in transactions.approvers"
          :key="approverNumber"
          class="mt-2 p-4 bg-gray-50 rounded-lg"
        >
          <div
            v-if="
              getGroupVisibilityStatus(
                transactions.approvers,
                approverNumber
              ) !== 'hidden'
            "
          >
            <h2 class="text-md font-semibold text-gray-800 mb-2">
              Approver {{ approverNumber }} -
              <span
                :class="{
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
                }"
              >
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

            <div
              v-for="approver in approverGroup"
              :key="approver.id"
              class="p-2 rounded-md shadow-sm mb-2"
              :class="[
                'rounded-xl p-5 shadow-md border mb-4 transition duration-300',
                approver.isCurrentApprover
                  ? 'bg-gray-400 border-white-400 text-white'
                  : 'bg-white text-gray-800',
              ]"
            >
              <div class="flex justify-between">
                <div>
                  <h2 class="text-sm font-bold mb-2">
                    {{ approver.mainapprover ? "Main" : "Proxy" }}
                  </h2>
                </div>
                <div v-if="approver.isCurrentApprover">
                  <span
                    class="bg-white text-black text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                  >
                    You</span
                  >
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
                <div
                  v-if="approver.remarks"
                  class="flex text-gray-700 text-md mr-4 items-center"
                >
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
    <div
      v-if="!transactions.hasResponse"
      class="flex gap-1 items-center justify-end mb-0 mr-4 mt-3"
    >
      <button
        @click="postApprove()"
        v-if="transactions.hasCurrentApprover"
        class="py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-800"
      >
        Approve
      </button>
      <button
        @click="postDisapprove()"
        v-if="transactions.hasCurrentApprover"
        class="py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-800"
      >
        Disapprove
      </button>
    </div>
    <div class="flex gap-1 items-center justify-end mb-0 mr-4 mt-3">
      <button
        type="button"
        @click="moveToTransactions"
        class="px-4 py-2 rounded-lg text-gray-800 text-sm border-none outline-none tracking-wide bg-gray-200 hover:bg-gray-300 active:bg-gray-200"
      >
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

const urltransactionId = ref();
const readyToRender = ref(false); // Flag to control rendering
const router = useRouter();
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
  const confirm = await $swal.fire({
    title: "Are you sure?",
    text: "Do you really want to approve this request?",
    icon: "warning",
    input: "textarea",
    inputPlaceholder: "Enter remarks here (optional)...",
    showCancelButton: true,
    confirmButtonText: "Yes, approve it!",
    cancelButtonText: "No, cancel",
  });

  if (confirm.isConfirmed) {
    const remarks = confirm.value; // Get the remarks entered by the user (if any)\

    await confirmApproval(urltransactionId.value, remarks);

    $swal.fire({
      title: "Approved!",
      text: "The request has been approved.",
      icon: "success",
      timer: 1000, // auto-close after 1 second
      showConfirmButton: false,
    });

    return navigateTo("/main/dashboard");
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
  await getTransaction(urltransactionId.value);
  if (!transactions.value.iscurrentuser) {
    if (
      transactions.value &&
      !transactions.value.hasSignatory &&
      !transactions.value.hasCurrentApprover
    ) {
      await $swal.fire({
        title: "Access Denied",
        text: "You are not allowed to view this transaction.",
        icon: "error",
        timer: 1000,
        showConfirmButton: false,
      });

      router.push("/main/dashboard"); // or your dashboard route
    }
  }

  readyToRender.value = true; // Set only if access is granted
});
</script>
