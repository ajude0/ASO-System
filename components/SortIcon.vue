<!-- components/SortIcon.vue -->
<template>
  <!-- neutral -->
  <svg
    v-if="!active"
    xmlns="http://www.w3.org/2000/svg"
    class="w-4 h-4 text-gray-400"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    stroke-width="2"
  >
    <path stroke-linecap="round" stroke-linejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
  </svg>
  

  <!-- ascending -->
  <svg
    v-else-if="!descending"
    xmlns="http://www.w3.org/2000/svg"
    class="w-3 h-3 text-gray-600"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    stroke-width="2"
  >
    <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" />
  </svg>

  <!-- descending -->
  <svg
    v-else
    xmlns="http://www.w3.org/2000/svg"
    class="w-3 h-3 text-gray-600"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    stroke-width="2"
  >
    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
</template>

<script setup>
defineProps({
  active: Boolean,
  descending: Boolean
})
</script>

