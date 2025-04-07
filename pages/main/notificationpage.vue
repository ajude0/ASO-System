<template>
    <nav class="flex mb-5 h-12 bg-gray-100 rounded-lg" aria-label="Breadcrumb">
        <ul class="flex flex-wrap space-x-3 text-sm font-medium">
            <li class="flex items-center space-x-3">
                <a @click="dashboard()" class="cursor-pointer flex items-center space-x-1 text-gray-800">
                    <svg class="h-4 w-4 shrink-0 fill-gray-500" aria-hidden="true" viewBox="0 0 256 256">
                        <path
                            d="M184 32H72A16 16 0 0056 48V224a8.1 8.1.0 004.1 7 7.6 7.6.0 003.9 1 7.9 7.9.0 004.2-1.2L128 193.4l59.7 37.4a8.3 8.3.0 008.2.2 8.1 8.1.0 004.1-7V48A16 16 0 00184 32z">
                        </path>
                    </svg>
                    <span>Dashboard</span>
                </a>
            </li>
            <li class="flex items-center space-x-3" aria-current="page">
                <div aria-hidden="true" class="h-4 w-px rotate-12 rounded-full bg-gray-300"></div>

                <span class="flex items-center space-x-1">
                    <svg class="h-4 w-4 shrink-0 fill-gray-400" aria-hidden="true" viewBox="0 0 256 256">
                        <path
                            d="M136 88H120V35.3L91.7 63.6A8 8 0 0180.3 52.3l42-42a8.1 8.1.0 0111.4.0l42 42a8 8 0 010 11.3 8 8 0 01-11.4.0L136 35.3zm64 0H136v40a8 8 0 01-16 0V88H56a16 16 0 00-16 16V208a16 16 0 0016 16H2e2a16 16 0 0016-16V104A16 16 0 002e2 88z">
                        </path>
                    </svg>
                    <span class="text-gray-400">Alerts</span>
                </span>
            </li>
        </ul>
    </nav>
    <form class="items-center bg-white  h-full flex flex-col rounded">
        <div>
            <button @click="handleButtonClick('success', 'Test')" class="bg-green-500 text-white px-4 py-2 rounded">Show
                Success</button><br><br>
            <button @click="handleButtonClick('error', 'Test')" class="bg-red-500 text-white px-4 py-2 rounded">Show
                Error</button><br><br>
            <button @click="handleButtonClick('warning', 'Test')"
                class="bg-orange-500 text-white px-4 py-2 rounded">Show Warning</button><br><br>
            <button @click="handleButtonClick('info', 'Test')" class="bg-blue-500 text-white px-4 py-2 rounded">Show
                Info</button><br><br>
            <Notification v-if="notificationVisible" :key="notificationKey" :type="notificationType"
                :message="notificationMessage" :locationClass="notificationLocation"
                @notification-end="resetNotification" />
        </div>
    </form>
</template>

<script setup>
import { ref } from 'vue'
import Notification from '../main/components/Notification.vue'

const notificationVisible = ref(false)
const notificationType = ref('')
const notificationMessage = ref('')
const notificationLocation = ref('top-20 right-10')
const notificationKey = ref(0)

function showNotification(type, message, location) {
    notificationType.value = type
    notificationMessage.value = message
    notificationLocation.value = location
    notificationVisible.value = true
    notificationKey.value += 1 // Increment key to force re-render
}

function handleButtonClick(type, message) {
    showNotification(type, message, 'top-20 right-10')
}

function resetNotification() {
    notificationVisible.value = false
}
</script>
