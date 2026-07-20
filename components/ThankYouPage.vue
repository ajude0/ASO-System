<template>
  <div class="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
    <div class="max-w-md w-full">
      <!-- Success Card -->
      <div class="bg-white rounded-2xl shadow-xl p-6 text-center transform transition-all duration-500 hover:scale-105">
        <!-- Check Icon -->
        <div class="mx-auto w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-bounce">
          <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>

        <!-- Heading -->
        <h1 class="text-2xl font-bold text-gray-800 mb-2">
          Thank You!
        </h1>

        <!-- Message -->
        <p class="text-gray-600 mb-1">
          Your approval has been successfully processed.
        </p>
        <p class="text-sm text-gray-500 mb-4">
          We appreciate your prompt response and confirmation.
        </p>

        <!-- Divider -->
        <div class="border-t border-gray-200 my-4"></div>

        <!-- Additional Info -->
        <div class="bg-green-50 rounded-lg p-4 mb-4 text-left">
          <p class="text-sm text-green-800 mb-1.5">
            <span class="font-semibold">Form:</span> {{ transactionName }}
          </p>
          <p class="text-sm text-green-800">
            <span class="font-semibold">{{ typeName }} ID:</span> {{ confirmationId }}
          </p>
          <p v-if="createdBy" class="text-sm text-green-800 mt-1.5">
            <span class="font-semibold">Created By:</span> {{ createdBy }}
          </p>
          <p v-if="createdDate" class="text-sm text-green-800 mt-1.5">
            <span class="font-semibold">Created Date:</span> {{ createdDate }}
          </p>

          <div class="flex items-center gap-2 mt-2 pt-2 border-t border-green-200">
            <svg class="w-3.5 h-3.5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-xs text-green-600">
              <span class="font-semibold">Signed at</span> {{ currentDate }}
            </p>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="space-y-2">
          <button @click="goToDashboard"
            class="w-full bg-green-600 text-white py-2.5 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors duration-200 shadow-md hover:shadow-lg">
            Go to Dashboard
          </button>

          <button @click="$emit('refresh')"
            class="w-full bg-green-600 text-white py-2.5 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors duration-200 shadow-md hover:shadow-lg">
            View
          </button>
        </div>

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
  },
  typeName: {
    type: String,
    default: ''
  },
  createdBy: {
    type: String,
    default: ''
  },
  createdDate: {
    type: String,
    default: ''
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