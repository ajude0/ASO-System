<template>
  <BreadCrumbs :nenunames="nenunames"/>

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
import BreadCrumbs from "~/components/BreadCrumbs.vue";
import { fetchCanAccess, canEdit, canDelete, nenunames } from "~/js/fetchMenu";

const paramid = ref();
const router = useRouter();
const activeTab = ref("transactions");

definePageMeta({
  middleware: ["auth", "check-menu-access"], // Use an array for multiple middlewares
  name: "My Request",
});

onMounted(async () => {
  const hash = window.location.hash;
  const parts = hash.split("/");
  paramid.value = parts[parts.length - 1];
  await fetchCanAccess(paramid.value);
});

</script>
