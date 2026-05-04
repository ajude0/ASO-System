<template>
  <BreadCrumbs class="m-4" :nenunames="nenunames" />
  <div class="bg-white p-4 w-full shadow-md">
   

    <div class="p-4">
  
        <SharedDocumentList :can-delete="canDelete" :can-edit="canEdit" />
      
    
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


import SharedDocumentList from "~/components/SharedDocumentList.vue";


const paramid = ref();


onMounted(() => {
    const hash = window.location.hash;
    const parts = hash.split("/");
    paramid.value = parts[parts.length - 1];
    fetchCanAccess(paramid.value);
});

</script>

<style lang="scss" scoped></style>