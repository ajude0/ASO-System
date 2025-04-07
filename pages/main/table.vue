<template>
  <form class="max-w-6xl mx-auto p-6 bg-white shadow-lg rounded-lg">  
    <div>
      <h1 class="text-2xl font-bold text-gray-800 mb-6 border-b pb-2 pt-10">
          {{transactions.formTitle}}
      </h1>

      <div v-for="(item, index) in transactions?.formObjects" :key="index" class="mb-6">
        <div v-if="item.objectType !== 'LABEL'" class="flex justify-between">
          <label class="text-gray-700 font-semibold mb-2">
            {{ item.label }}
          </label>
        </div>
        <div v-if="item.objectType === 'LABEL'">
          <hr class="my-4 border-gray-400" />
          <h3 class="text-lg font-bold text-gray-800 mb-1">{{ item.label }}</h3>
        </div>
        <div v-else class="border p-3 rounded-md w-full text-gray-800">
          <span v-for="(value, index) in item.values" :key="index">
            {{ value }}
          </span>
        </div>
      </div>

      <!-- Approver Section -->
      <div v-for="(approverGroup, approverNumber) in transactions.approvers" :key="approverNumber" class="mt-2 p-4 bg-gray-50 rounded-lg">
        <h2 class="text-md font-semibold text-gray-800 mb-2">
          Approver {{ approverNumber }}
        </h2>
        <div v-for="approver in approverGroup" :key="approver.id" class="p-2 bg-white rounded-md shadow-sm mb-2">
          <h2 class="text-sm font-bold text-gray-800 mb-2">
            {{ approver.mainapprover ? 'Main' : 'Proxy' }}
          </h2>
          <p class="text-gray-700 text-xs">
            <strong>Name:</strong> {{ approver.approvername }}
          </p>
          <p class="text-gray-700 text-xs">
            <strong>Email:</strong> {{ approver.approveremail }}
          </p>
          <p class="text-gray-700 text-xs">
            <strong>Remarks:</strong> {{ approver.remarks }}
          </p>
        </div>
      </div>
    </div>
  </form>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getTransaction, transactions } from '~/js/fetchTransactions';



onMounted(() => {
  getTransaction();
});
</script>
