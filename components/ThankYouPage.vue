<template>
  <div class="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
    <div class="max-w-md w-full">
      <!-- Success Card -->
      <div class="bg-white rounded-2xl shadow-xl p-8 text-center transform transition-all duration-500 hover:scale-105">
        <!-- Check Icon -->
        <div class="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
          <svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>

        <!-- Heading -->
        <h1 class="text-3xl font-bold text-gray-800 mb-3">
          Thank You!
        </h1>

        <!-- Message -->
        <p class="text-gray-600 mb-2">
          Your approval has been successfully processed.
        </p>
        <p class="text-sm text-gray-500 mb-8">
          We appreciate your prompt response and confirmation.
        </p>

        <!-- Divider -->
        <div class="border-t border-gray-200 my-6"></div>

        <!-- Additional Info -->
        <div class="bg-green-50 rounded-lg p-4 mb-6">
          <p class="text-sm text-green-800 mb-2">
            <span class="font-semibold">Form:</span> {{ transactionName }}
          </p>
          <p class="text-sm text-green-800">
            <span class="font-semibold">Transaction ID:</span> #{{ confirmationId }}
          </p>
          <p class="text-xs text-green-600 mt-2">
            {{ currentDate }}
          </p>
        </div>

        <!-- Action Buttons -->
        <div class="space-y-3">
          <button @click="goToDashboard"
            class="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors duration-200 shadow-md hover:shadow-lg">
            Go to Dashboard
          </button>


        </div>

        <div class="space-y-3 mt-2">
          <button @click="$emit('refresh')"
            class="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors duration-200 shadow-md hover:shadow-lg">
            View
          </button>


        </div>

        <!-- Footer Note -->

      </div>


    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

// Define props
const props = defineProps({
  transactionId: {
    type: String,
    default: ''
  },
  transactionName: {
    type: String,
    default: 'Transaction'
  }
})

const emit = defineEmits(['refresh'])

// Use prop or generate random confirmation ID
const confirmationId = computed(() => {
  return props.transactionId || Math.random().toString(36).substring(2, 10).toUpperCase()
})

// Get current date
const currentDate = computed(() => {
  return new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
})

// Methods
const goToDashboard = () => {
  // Navigate to dashboard
  navigateTo("/main/dashboard")
  // In a real app: navigateTo('/dashboard')
}

const refresh = () => {
  navigateTo(useRoute().path)

}
</script>

<style scoped>
@keyframes bounce {

  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-10px);
  }
}

.animate-bounce {
  animation: bounce 2s ease-in-out infinite;
}
</style>