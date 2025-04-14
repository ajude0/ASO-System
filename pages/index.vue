<template>
  <div class="bg-white py-16 sm:py-8 lg:py-60">
    <div class="mx-full max-w-screen-1xl px-4 md:px-8">
      <form
        @submit.prevent="login"
        class="mx-auto max-w-md rounded-lg border animate__animated animate__zoomIn"
      >
        <div class="flex flex-col gap-4 p-4 md:p-8">
          <h2
            class="mb-4 text-center text-2xl font-bold text-gray-800 md:mb-8 lg:text-3xl"
          >
            Sign in to your account
          </h2>

          <div>
            <label
              for="email"
              class="mb-2 inline-block text-sm text-gray-800 sm:text-base"
              >Username</label
            >
            <input
              type="text"
              id="website-admin"
              ref="inputRef"
              v-model="formData.loginname"
              class="w-full rounded border bg-gray-50 px-3 py-2 text-gray-800 outline-none ring-indigo-300 transition duration-100 focus:ring"
            />
          </div>
          <div>
            <label
              for="password"
              class="mb-2 inline-block text-sm text-gray-800 sm:text-base"
              >Password</label
            >
            <div class="relative">
              <input
                @keydown="checkCapsLock"
                @focus="checkCapsLockOnFocus"
                @blur="resetCapsLock"
                :type="passwordType"
                name="password"
                v-model="formData.password"
                class="w-full rounded border bg-gray-50 px-3 py-2 pr-10 text-gray-800 outline-none ring-indigo-300 transition duration-100 focus:ring"
              />
              <button
                type="button"
                @click="togglePasswordVisibility"
                class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500"
              >
                <span v-if="passwordType === 'text'" v-html="eyeIcon"></span>
                <span v-else v-html="eyeOffIcon"></span>
              </button>
            </div>
            <label
              v-if="isCapsLockOn"
              for="password"
              class="mb-2 inline-block text-sm text-gray-500 sm:text-base"
            >
              Warning: Caps Lock detected.
            </label>
          </div>

          <div class="flex items-center mb-4">
            <!-- <input
              id="toggle2"
              type="checkbox"
              v-model="isChecked"
              class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded-xl focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <label for="toggle2" class="ms-2 text-sm font-medium text-gray-900">Show Password</label> -->
          </div>
          <button
            v-if="loginspinnerindicator"
            @click="login()"
            class="flex items-center justify-center gap-2 rounded-lg bg-blue-500 px-8 py-3 text-center text-sm font-semibold text-white outline-none ring-blue-300 transition duration-100 hover:bg-blue-600 focus-visible:ring active:bg-blue-700 md:text-base"
          >
            Login
          </button>
          <button
            v-else
            disabled
            class="flex items-center justify-center gap-2 rounded-lg bg-blue-500 px-8 py-3 text-center text-sm font-semibold text-white outline-none ring-blue-300 transition duration-100 hover:bg-blue-600 focus-visible:ring active:bg-blue-700 md:text-base"
          >
            <svg
              aria-hidden="true"
              role="status"
              class="inline w-4 h-4 mr-1 text-white animate-spin mt-1"
              viewBox="0 0 100 101"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                fill="#E5E7EB"
              />
              <path
                d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                fill="currentColor"
              />
            </svg>
            Processing...
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from "vue";
import { API_BASE_URL } from "~/config";

const { $swal } = useNuxtApp();
import { encryptData } from "~/js/cryptoToken";
const isChecked = ref(false);
const formData = ref({ loginname: "", password: "" });
const showPassword = ref(false);
const router = useRouter();
const inputRef = ref(null);
const isCapsLockOn = ref(false);
const eyeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="2.2em" height="1.5em" viewBox="0 0 24 24">
        <path fill="black" d="M12 9a3 3 0 0 0-3 3a3 3 0 0 0 3 3a3 3 0 0 0 3-3a3 3 0 0 0-3-3m0 8a5 5 0 0 1-5-5a5 5 0 0 1 5-5a5 5 0 0 1 5 5a5 5 0 0 1-5 5m0-12.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5"/>
      </svg>
    `;

const eyeOffIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="2.2em" height="1.5em" viewBox="0 0 24 24">
    <path fill="black" d="M11.83 9L15 12.16V12a3 3 0 0 0-3-3zm-4.3.8l1.55 1.55c-.05.21-.08.42-.08.65a3 3 0 0 0 3 3c.22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53a5 5 0 0 1-5-5c0-.79.2-1.53.53-2.2M2 4.27l2.28 2.28l.45.45C3.08 8.3 1.78 10 1 12c1.73 4.39 6 7.5 11 7.5c1.55 0 3.03-.3 4.38-.84l.43.42L19.73 22L21 20.73L3.27 3M12 7a5 5 0 0 1 5 5c0 .64-.13 1.26-.36 1.82l2.93 2.93c1.5-1.25 2.7-2.89 3.43-4.75c-1.73-4.39-6-7.5-11-7.5c-1.4 0-2.74.25-4 .7l2.17 2.15C10.74 7.13 11.35 7 12 7"/>
  </svg>
`;

const loginspinnerindicator = ref(true);
const passwordType = computed(() => (showPassword.value ? "text" : "password"));
const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value;
};
onMounted(() => {
  if (inputRef.value) {
    inputRef.value.focus();
  }
});

const login = async () => {
  try {
    loginspinnerindicator.value = false;
    const response = await $fetch(`${API_BASE_URL}/api/access/loginuser`, {
      method: "POST",
      body: JSON.stringify(formData.value),
    });
    localStorage.setItem("aso_token", encryptData(response.stringParam1));
    router.push("/main/dashboard");
  } catch (error) {
    console.error("Login Error:", error);
    await $swal.fire({
      title: "Error",
      text: "Something went wrong. Please try again later.",
      icon: "error",
      confirmButtonText: "OK",
    });
  } finally {
    loginspinnerindicator.value = true;
  }
};

function Register() {
  router.push("/register");
}
const checkCapsLock = (event) => {
  isCapsLockOn.value = event.getModifierState("CapsLock");
};

const checkCapsLockOnFocus = () => {
  const isCapsOn = new KeyboardEvent("keydown", { key: "a" }).getModifierState(
    "CapsLock"
  );
  isCapsLockOn.value = isCapsOn;
};

const resetCapsLock = () => {
  checkCapsLock();
};

definePageMeta({
  middleware: "auth", // 👈 Tells Nuxt to run the "auth" middleware
  layout: "empty", // 👈 Uses the "empty" layout (custom or default)
});
</script>

<style></style>
