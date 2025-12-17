<template>
  <div
    class="min-h-screen bg-white flex items-center justify-center p-4 overflow-hidden relative"
  >
    <!-- Animated background particles -->
    <div class="absolute inset-0 overflow-hidden">
      <div
        v-for="i in 50"
        :key="i"
        class="absolute animate-float"
        :style="{
          left: Math.random() * 100 + '%',
          top: Math.random() * 100 + '%',
          animationDelay: Math.random() * 20 + 's',
          animationDuration: Math.random() * 10 + 10 + 's',
        }"
      >
        <div class="w-2 h-2 bg-white/10 rounded-full blur-sm"></div>
      </div>
    </div>

    <!-- Login Card -->
    <div class="w-full max-w-md relative">
      <!-- Glassmorphism backdrop -->
      <div
        class="absolute inset-0 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl"
      ></div>

      <div class="relative p-8 z-10">
        <!-- Logo/Brand -->
        <div class="text-center">
          <div class="mx-auto mb-4 flex items-center justify-center">
            <img
              src="/static/images/logo.png"
              class="h-32 w-auto"
              alt="DatabridgeLogo"
            />
          </div>
          <h1 class="text-2xl font-bold text-gray-800 mb-2">
            Sign in to your account
          </h1>
        </div>

        <!-- Login Form -->
        <form @submit.prevent="handleLogin" class="space-y-4">
          <!-- Email Field -->
          <div class="relative">
            <label class="block text-sm font-medium text-gray-800 mb-2"
              >Email or Nickname</label
            >
            <div class="relative">
              <input
                v-model="formData.loginname"
                type="text"
                required
                class="w-full px-4 py-3 pl-12 bg-white/10 border border-black/20 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                :class="{ 'border-red-500 focus:ring-red-500': emailError }"
                placeholder="Enter your Email or Nickname"
                @blur="validateEmail"
                @input="emailError = ''"
              />
              <div
                class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
              >
                <svg
                  class="w-5 h-5 text-gray-800"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke="currentColor"
                    stroke-width="2"
                    d="M7 17v1a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1a3 3 0 0 0-3-3h-4a3 3 0 0 0-3 3Zm8-9a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                  />
                </svg>
              </div>
            </div>
            <p
              v-if="emailError"
              class="mt-1 text-sm text-red-400 animate-shake"
            >
              {{ emailError }}
            </p>
          </div>

          <!-- Password Field -->
          <div class="relative">
            <label class="block text-sm font-medium text-gray-700 mb-2"
              >Password</label
            >
            <div class="relative">
              <input
                v-model="formData.password"
                :type="showPassword ? 'text' : 'password'"
                required
                class="w-full px-4 py-3 pl-12 pr-12 bg-white/10 border border-black/20 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                :class="{ 'border-red-500 focus:ring-red-500': passwordError }"
                placeholder="Enter your password"
                @blur="validatePassword"
                @input="passwordError = ''"
              />
              <div
                class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
              >
                <svg
                  class="w-5 h-5 text-gray-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500 transition-colors duration-200"
              >
                <svg
                  v-if="!showPassword"
                  class="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                <svg
                  v-else
                  class="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                  />
                </svg>
              </button>
            </div>
            <p
              v-if="passwordError"
              class="mt-1 text-sm text-red-400 animate-shake"
            >
              {{ passwordError }}
            </p>
          </div>
          
          <div class="flex items-center justify-end">
              
              <a
                @click="forgot"
                class="text-sm text-blue-600 hover:text-blue-500 cursor-pointer"
                >Forgot password?</a
              >
            </div>


          <!-- Remember Me & Forgot Password -->
          <!-- <div class="flex items-center justify-between">
            <label class="flex items-center">
              <input
                v-model="rememberMe"
                type="checkbox"
                class="w-4 h-4 text-purple-600 bg-white/10 border-white/20 rounded focus:ring-purple-500 focus:ring-2"
              />
              <span class="ml-2 text-sm text-gray-300">Remember me</span>
            </label>
            <a href="#" class="text-sm text-purple-400 hover:text-purple-300 transition-colors duration-200">
              Forgot password?
            </a>
          </div> -->

          <!-- Login Button -->
          <button
            type="submit"
            :disabled="isLoading"
            class="w-full py-3 px-4 bg-gradient-to-r from-blue-700 to-blue-600 text-white font-medium rounded-lg shadow-lg hover:from-blue-500 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200 relative overflow-hidden"
          >
            <span v-if="!isLoading" class="relative z-10">Sign In</span>
            <span v-else class="relative z-10 flex items-center justify-center">
              <svg
                class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Signing in...
            </span>
            <div
              class="absolute inset-0 bg-gradient-to-r from-purple-700 to-pink-700 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"
            ></div>
          </button>
        </form>

        <!-- Divider -->

        <!-- Sign Up Link -->
      </div>
    </div>

    <!-- Success Toast -->
    <Transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-if="showSuccessToast"
        class="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50"
      >
        <div class="flex items-center">
          <svg
            class="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
          Login successful!
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { API_BASE_URL } from "~/config";
import { encryptData } from "~/js/cryptoToken";
import { fetchSysDescription, sysdescription } from "~/js/fetchMenu";

const { $swal } = useNuxtApp();
const formData = ref({ loginname: "", password: "" });
const showPassword = ref(false);
const isLoading = ref(false);
const emailError = ref("");
const passwordError = ref("");
const showSuccessToast = ref(false);
const router = useRouter();

// Validation functions
const validateEmail = () => {
  if (!formData.value.loginname) {
    emailError.value = "Email or Nickname is required";
  } else {
    emailError.value = "";
  }
};

const validatePassword = () => {
  if (!formData.value.password) {
    passwordError.value = "Password is required";
  } else {
    passwordError.value = "";
  }
};

// Form submission
const handleLogin = async () => {
  validateEmail();
  validatePassword();

  if (emailError.value || passwordError.value) {
    return;
  }

  isLoading.value = true;

  try {
    const response = await $fetch(`${API_BASE_URL}/api/access/loginuser`, {
      method: "POST",
      body: JSON.stringify(formData.value),
    });

    localStorage.setItem("user_token_aso", encryptData(response.stringParam1));
    const transactionId = localStorage.getItem("aso_urltransactionId");
    const documentUrlId = localStorage.getItem("documenturlid");

    if (transactionId) {
      router.push(`main/transactions`);
    }else if (documentUrlId)
    {
      router.push(`main/document`);
    } 
    else {
      router.push("main/dashboard");
    }
  } catch (error) {
    let errorMessage = "Something went wrong. Please try again later.";

    // Check if the error response has a readable message
    if (error?.data?.message) {
      errorMessage = error.data.message;
    }

    await $swal.fire({
      title: "Login Failed",
      text: errorMessage,
      icon: "error",
      timer: 1000, // auto-close after 2 seconds
      showConfirmButton: false,
    });
  } finally {
    isLoading.value = false;
  }
};

// SEO and meta tags
watch(sysdescription, (newTitle) => {
  if (newTitle) {
    useHead({
      title: newTitle,
      meta: [{ name: "ASO", content: newTitle }],
      link: [
        {
          rel: "icon",
          type: "image/png",
          href: "data:image/png;base64,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",
        },
      ],
    });
  }
});

function forgot() {
  // Set the localStorage item first
  localStorage.setItem(
    "sourceapplication",
    "https://apps.fastlogistics.com.ph/aso/#/"
  );
  // Use a short timeout to ensure the localStorage is set before navigating
  window.location.href = "https://apps.fastlogistics.com.ph/utility/";
}

definePageMeta({
  middleware: "auth", // 👈 Tells Nuxt to run the "auth" middleware
  layout: "empty", // 👈 Uses the "empty" layout (custom or default)
});
onMounted(async () => {
  await fetchSysDescription();
});
</script>

<style scoped>
@keyframes float {
  0%,
  100% {
    transform: translateY(0px) rotate(0deg);
  }
  50% {
    transform: translateY(-20px) rotate(180deg);
  }
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  10%,
  30%,
  50%,
  70%,
  90% {
    transform: translateX(-5px);
  }
  20%,
  40%,
  60%,
  80% {
    transform: translateX(5px);
  }
}

.animate-float {
  animation: float linear infinite;
}

.animate-shake {
  animation: shake 0.5s ease-in-out;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}
</style>
