<template>
  <nav class="flex mb-5 h-13 bg-gray-100 rounded-lg" aria-label="Breadcrumb">
    <ul class="p-4 flex flex-wrap space-x-3 text-sm font-medium">
      <li
        v-for="(item, index) in nenunames"
        :key="index"
        class="flex items-center space-x-3"
        :aria-current="index === nenunames.length - 1 ? 'page' : null"
      >
        <!-- Hide divider for the first item -->
        <div
          v-if="index !== 0"
          aria-hidden="true"
          class="h-4 w-px rotate-12 rounded-full bg-gray-300"
        ></div>

        <span class="flex items-center space-x-1">
          <svg
            class="h-4 w-4 shrink-0 fill-gray-400"
            aria-hidden="true"
            viewBox="0 0 256 256"
          >
            <path
              d="M136 88H120V35.3L91.7 63.6A8 8 0 0180.3 52.3l42-42a8.1 8.1.0 0111.4.0l42 42a8 8 0 010 11.3 8 8 0 01-11.4.0L136 35.3zm64 0H136v40a8 8 0 01-16 0V88H56a16 16 0 00-16 16V208a16 16 0 0016 16H2e2a16 16 0 0016-16V104A16 16 0 002e2 88z"
            ></path>
          </svg>

          <!-- Last item text is gray, others are black -->
          <span
            :class="
              index === nenunames.length - 1 ? 'text-gray-400' : 'text-black'
            "
          >
            {{ item }}
          </span>
        </span>
      </li>
    </ul>
  </nav>

  <div class="bg-white p-4 w-full shadow-md">
    <div class="grid grid-cols-2 p-4 text-center">
      <button
        class="p-4 text-lg font-semibold border-b-4"
        :class="
          activeTab === 'transactions'
            ? 'border-blue-500 text-blue-500'
            : 'border-gray-300 text-gray-500'
        "
        @click="activeTab = 'transactions'"
      >
        My Transactions
      </button>
      <button
        class="p-4 text-lg font-semibold border-b-4"
        :class="
          activeTab === 'approver'
            ? 'border-blue-500 text-blue-500'
            : 'border-gray-300 text-gray-500'
        "
        @click="activeTab = 'approver'"
      >
        Approval Requests
      </button>
    </div>

    <div class="p-4">
      <div v-if="activeTab === 'transactions'">
        <TransactionTable :can-delete="canDelete" />
      </div>
      <div v-if="activeTab === 'approver'">
        <ListApprovalRequest :can-edit="canEdit" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import TransactionTable from "~/components/TransactionTable.vue";
import ListApprovalRequest from "~/components/ListApprovalRequest.vue";
import { fetchCanAccess, canEdit, canDelete, nenunames } from "~/js/fetchMenu";

const paramid = ref();
const router = useRouter();
const activeTab = ref("transactions");

onMounted(async () => {
  const hash = window.location.hash;
  const parts = hash.split("/");
  paramid.value = parts[parts.length - 1];
  await fetchCanAccess(paramid.value);
});

definePageMeta({
  middleware: ["auth", "check-menu-access"], // Use an array for multiple middlewares
  name: "My Request",
});
</script>
