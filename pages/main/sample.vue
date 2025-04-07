<template>
  <div>
    <!-- Trigger Button -->
    <button @click="startLoading" class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
      Start Loading
    </button>

    <!-- Loading Modal -->
    <LoadingModal ref="loadingModal" />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import LoadingModal from '~/components/modal/LoadingModal.vue';

const loadingModal = ref(null);

// Start loading, show the modal
const startLoading = () => {
  loadingModal.value.showLoading();

  // Simulate a network request or task
  setTimeout(() => {
    loadingModal.value.hideLoading();  // Hide modal after 3 seconds
  }, 3000);
};
</script>
