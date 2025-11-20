<template>
    <div>
        <BreadCrumbs :nenunames="nenunames" />

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

const paramid = ref();

onMounted(() => {
    const hash = window.location.hash;
    const parts = hash.split("/");
    paramid.value = parts[parts.length - 1];
    fetchCanAccess(paramid.value);
});

</script>

<style lang="scss" scoped></style>