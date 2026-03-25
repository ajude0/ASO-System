<template>
    <BreadCrumbs class="m-4" :nenunames="nenunames" />
    <div class="bg-white p-4 w-full shadow-md">
        <div class="p-4">
            <div class="hidden md:block">
                <PendingDocumentList />
            </div>
            <div class="block md:hidden">
                <PendingMobileDocumentList />
            </div>
        </div>
    </div>
</template>

<script setup>
import { fetchCanAccess, nenunames } from "~/js/fetchMenu";
import PendingDocumentList from "~/components/PendingDocumentList.vue";
import PendingMobileDocumentList from "~/components/PendingMobileDocumentList.vue";

const paramid = ref();
onMounted(() => {
    const hash = window.location.hash;
    const parts = hash.split("/");
    paramid.value = parts[parts.length - 1];
    fetchCanAccess(paramid.value);
});
</script>

<style lang="scss" scoped></style>