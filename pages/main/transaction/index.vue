<template>
   <nav class="flex mb-5 h-13 bg-gray-100 rounded-lg" aria-label="Breadcrumb">
    <ul class="p-4 flex flex-wrap space-x-3 text-sm font-medium">
      <li class="flex items-center space-x-3">
        <a
          @click="dashboard()"
          class="cursor-pointer flex items-center space-x-1 text-gray-800"
        >
          <svg
            class="h-4 w-4 shrink-0 fill-gray-500"
            aria-hidden="true"
            viewBox="0 0 256 256"
          >
            <path
              d="M184 32H72A16 16 0 0056 48V224a8.1 8.1.0 004.1 7 7.6 7.6.0 003.9 1 7.9 7.9.0 004.2-1.2L128 193.4l59.7 37.4a8.3 8.3.0 008.2.2 8.1 8.1.0 004.1-7V48A16 16 0 00184 32z"
            ></path>
          </svg>
          <span>Dashboard</span>
        </a>
      </li>
      <li class="flex items-center space-x-3" aria-current="page">
        <div
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
          <span class="text-gray-400">Transaction</span>
        </span>
      </li>
    </ul>
  </nav>
  <div class="bg-white p-4 w-full shadow-md">
    <div class="grid grid-cols-2 p-4 text-center">
      <button 
        class="p-4 text-lg font-semibold border-b-4" 
        :class="activeTab === 'transactions' ? 'border-blue-500 text-blue-500' : 'border-gray-300 text-gray-500'"
        @click="activeTab = 'transactions'">
        My Transactions
      </button>
      <button 
        class="p-4 text-lg font-semibold border-b-4" 
        :class="activeTab === 'approver' ? 'border-blue-500 text-blue-500' : 'border-gray-300 text-gray-500'"
        @click="activeTab = 'approver'">
        Approval Requests
      </button>
    </div>
  
  
  <div class="p-4">
    <div v-if="activeTab === 'transactions'">
      <TransactionTable/>
    </div>
    <div v-if="activeTab === 'approver'">
      <ListApprovalRequest/>
    </div>
  </div>
</div>
</template>

<script setup>
import { ref } from 'vue';
import TransactionTable from '~/components/TransactionTable.vue';
import ListApprovalRequest from '~/components/ListApprovalRequest.vue';

const router = useRouter();
const activeTab = ref('transactions');

function dashboard() {
  router.push("/main/dashboard");
}
definePageMeta({
  middleware: "auth",
});
</script>
