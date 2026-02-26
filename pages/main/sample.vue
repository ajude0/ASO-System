<script setup>
import { API_BASE_URL } from '~/config'
import { ref, onMounted } from 'vue'

const isSubscribed = ref(false)
const registrationRef = ref(null)
const subscriptionRef = ref(null)
const isLoading = ref(false)
const sendStatus = ref(null)
const initDone = ref(false)

const initPush = async () => {
  if (!("serviceWorker" in navigator)) {
    initDone.value = true
    return
  }

  try {
    const registration = await navigator.serviceWorker.register("/aso/sw.js", {
      scope: "/aso/"
    })
    registrationRef.value = registration

    const existingSubscription = await registration.pushManager.getSubscription()
    if (existingSubscription) {
      isSubscribed.value = true
      subscriptionRef.value = existingSubscription
    }
  } catch (err) {
    console.error("SW registration failed:", err)
  } finally {
    initDone.value = true
  }
}

const toggleSubscription = async () => {
  if (!registrationRef.value || isLoading.value) return
  isLoading.value = true
  try {
    if (!isSubscribed.value) {
      await subscribe()
    } else {
      await unsubscribe()
    }
  } finally {
    isLoading.value = false
  }
}

const subscribe = async () => {
  try {
    console.log("Starting subscription...")

    // Request permission once lang
    if (Notification.permission !== "granted") {
      const permission = await Notification.requestPermission()
      console.log("Notification permission:", permission)

      if (permission !== "granted") {
        alert("Please allow notifications!")
        return
      }
    }

    // Clean up existing subscription para hindi mag-stuck
    const existing = await registrationRef.value.pushManager.getSubscription()
    if (existing) {
      console.log("Found existing subscription, unsubscribing first...")
      await existing.unsubscribe()
    }

    const publicKey = await $fetch(`${API_BASE_URL}/api/push/publicKey`)
    console.log("Public key:", publicKey)
    console.log("Public key length:", publicKey.length)
    console.log("RAW publicKey:", JSON.stringify(publicKey))
console.log("Type:", typeof publicKey)
console.log("Length:", publicKey.length)

    const convertedKey = urlBase64ToUint8Array(publicKey)
    console.log("Converted key:", convertedKey)
    console.log("Converted key length:", convertedKey.length) // dapat 65
const testSub = registrationRef.value.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: convertedKey
})

console.log("Promise created:", testSub)

testSub.then(s => console.log("SUCCESS:", s))
       .catch(e => console.error("FAILED:", e))
    const subscription = await registrationRef.value.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedKey
    })

    console.log("Subscription object:", subscription)

    await $fetch(`${API_BASE_URL}/api/push/subscribe`, {
      method: "POST",
      body: {
        endpoint: subscription.endpoint,
        p256dh: arrayBufferToBase64(subscription.getKey("p256dh")),
        auth: arrayBufferToBase64(subscription.getKey("auth"))
      }
    })

    subscriptionRef.value = subscription
    isSubscribed.value = true

  } catch (err) {
    console.error("Subscribe failed:", err)
  }
}

const unsubscribe = async () => {
  try {
    if (!subscriptionRef.value) return
    await subscriptionRef.value.unsubscribe()
    subscriptionRef.value = null
    isSubscribed.value = false
  } catch (err) {
    console.error("Unsubscribe failed:", err)
  }
  // Unregister service worker
    if (registrationRef.value) {
      await registrationRef.value.unregister()
      registrationRef.value = null
      console.log("Service worker unregistered")
    }
}

const sendNotification = async () => {
  if (sendStatus.value === 'sending') return
  sendStatus.value = 'sending'
  try {
    await $fetch(`${API_BASE_URL}/api/push/send`, {
      method: "POST",
      body: {
        message: "Hello from Nuxt!"
      }
    })
    sendStatus.value = 'sent'
  } catch {
    sendStatus.value = 'error'
  }
  setTimeout(() => { sendStatus.value = null }, 2500)
}

// Helpers
const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

const arrayBufferToBase64 = (buffer) => {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
}

onMounted(initPush)
</script>

<template>
  <div class="push-panel">
    <h2>Push Notifications</h2>

    <p>Status: {{ isSubscribed ? 'Subscribed ✅' : 'Not Subscribed ❌' }}</p>

    <button
      @click="toggleSubscription"
      :disabled="isLoading || !initDone"
    >
      {{ isLoading ? 'Loading...' : isSubscribed ? 'Unsubscribe' : 'Subscribe' }}
    </button>

    <button
      @click="sendNotification"
      :disabled="!isSubscribed || sendStatus === 'sending'"
    >
      {{
        sendStatus === 'sending' ? 'Sending...' :
        sendStatus === 'sent' ? 'Sent ✅' :
        sendStatus === 'error' ? 'Failed ❌' :
        'Send Notification'
      }}
    </button>

    <p v-if="!initDone">Initializing service worker…</p>
    <p v-else-if="!isSubscribed">Click Subscribe to enable browser push notifications.</p>
    <p v-else>Send a test notification to confirm everything works.</p>
  </div>
</template>