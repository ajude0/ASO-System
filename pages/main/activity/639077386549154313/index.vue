<template>
     <BreadCrumbs class="m-4" :nenunames="nenunames" />
    <div class="p-4 mt-4">
        <PendingMobileDocumentList/>
    </div>
</template>

<script setup>
import PendingDocumentList from '~/components/PendingDocumentList.vue';
import PendingMobileDocumentList from '~/components/PendingMobileDocumentList.vue';
import {
  fetchCanAccess,
  nenunames,
} from "~/js/fetchMenu";

definePageMeta({
  middleware: ["auth", "check-menu-access"], // Use an array for multiple middlewares
  name: "639077386549154313",
});
onMounted(async() => {

    const hash = window.location.hash;
    const parts = hash.split("/");
    paramid.value = parts[parts.length - 1];
    await fetchCanAccess(paramid.value);
    console.log(nenunames.value);
});
</script>

<style lang="scss" scoped>

</style>