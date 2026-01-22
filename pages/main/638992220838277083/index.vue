<template>
  <BreadCrumbs :nenunames="nenunames" />
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
        My Documents
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
       Pending for Signing
      </button>
    </div>

    <div class="p-4">
      <div v-if="activeTab === 'transactions'">
        <DocumentList :can-delete="canDelete" :can-edit="canEdit" />
      </div>
      <div v-if="activeTab === 'approver'">
        <PendingDocumentList/>
      </div>
    </div>
  </div>
</template>


<script setup>
import {
    fetchCanAccess,
    nenunames,
    canAdd,
    canDelete,
    canEdit,
} from "~/js/fetchMenu";


import DocumentList from "~/components/DocumentList.vue";
import PendingDocumentList from "~/components/PendingDocumentList.vue";

const paramid = ref();
const activeTab = ref("transactions");

onMounted(() => {
    const hash = window.location.hash;
    const parts = hash.split("/");
    paramid.value = parts[parts.length - 1];
    fetchCanAccess(paramid.value);
});

</script>

<style lang="scss" scoped></style>