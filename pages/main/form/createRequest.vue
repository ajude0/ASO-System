<template>
  <nav class="flex mb-5 h-13 bg-gray-100 rounded-lg" aria-label="Breadcrumb">
    <ul class="p-4 flex flex-wrap space-x-3 text-sm font-medium">
      <li class="flex items-center space-x-3">
        <a
          @click="dashboard()"
          class="cursor-pointer flex items-center space-x-1 text-gray-800"
        >
          <svg
            class="h-4 w-4 shrink-0 fill-gray-500"
            aria-hidden="true"
            viewBox="0 0 256 256"
          >
            <path
              d="M184 32H72A16 16 0 0056 48V224a8.1 8.1.0 004.1 7 7.6 7.6.0 003.9 1 7.9 7.9.0 004.2-1.2L128 193.4l59.7 37.4a8.3 8.3.0 008.2.2 8.1 8.1.0 004.1-7V48A16 16 0 00184 32z"
            ></path>
          </svg>
          <span>Dashboard</span>
        </a>
      </li>
      <li class="flex items-center space-x-3" aria-current="page">
        <div
          aria-hidden="true"
          class="h-4 w-px rotate-12 rounded-full bg-gray-300"
        ></div>

        <span class="flex items-center space-x-1">
          <svg
            class="h-4 w-4 shrink-0 fill-gray-400"
            aria-hidden="true"
            viewBox="0 0 256 256"
          >
            <path
              d="M136 88H120V35.3L91.7 63.6A8 8 0 0180.3 52.3l42-42a8.1 8.1.0 0111.4.0l42 42a8 8 0 010 11.3 8 8 0 01-11.4.0L136 35.3zm64 0H136v40a8 8 0 01-16 0V88H56a16 16 0 00-16 16V208a16 16 0 0016 16H2e2a16 16 0 0016-16V104A16 16 0 002e2 88z"
            ></path>
          </svg>
          <span class="text-gray-400">Create Request</span>
        </span>
      </li>
    </ul>
  </nav>
  <form
    @submit.prevent="submitAnswers"
    class="max-w-6xl mx-auto p-6 bg-white shadow-lg rounded-lg"
  >
    <div class="grid grid-cols-[auto,1fr] items-center gap-x-4 border-b pb-10">
      <label class="text-gray-700 font-bold text-2xl">Form Title</label>
      <div class="relative w-full">
        <select
          class="border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
          v-model="formId"
          @change="getFormDetails"
          :disabled="isLoading"
        >
          <option value="" hidden>Select Form Title</option>
          <option
            v-for="formTitle in formTitles"
            :key="formTitle.id"
            :value="formTitle.id"
          >
            {{ formTitle.title }}
          </option>
        </select>

        <!-- Loading Spinner -->
        <div
          v-if="isLoading"
          class="absolute inset-y-0 right-3 flex items-center"
        >
          <svg
            class="animate-spin h-6 w-6 text-blue-500"
            xmlns="http://www.w3.org/2000/svg"
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
              d="M4 12a8 8 0 018-8v8H4z"
            ></path>
          </svg>
        </div>
      </div>
    </div>

    <div v-if="isLoading">
      <!-- Skeleton Loader -->
      <div class="animate-pulse pt-10 mb-6">
        <div class="h-16 bg-gray-300 rounded w-full mb-1"></div>
        <hr class="mb-3" />
        <div class="mt-3">
          <div class="h-10 bg-gray-300 rounded w-1/5 mb-2"></div>
          <div class="h-14 bg-gray-300 rounded w-full"></div>
        </div>
        <div class="mt-4">
          <div class="h-10 bg-gray-300 rounded w-1/5 mb-2"></div>
          <div class="h-14 bg-gray-300 rounded w-full"></div>
        </div>
        <div class="mt-4">
          <div class="h-10 bg-gray-300 rounded w-1/5 mb-2"></div>
          <div class="h-14 bg-gray-300 rounded w-full"></div>
        </div>
      </div>
      <LoadingModal />
    </div>

    <div
      v-if="!isLoading && (!formDetails || !formDetails.formObjects?.length)"
      class="flex flex-col items-center justify-center p-6 rounded-lg mt-6 max-w-full mx-auto animate-fade-in"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        class="size-52"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
        />
      </svg>

      <p class="text-gray-600 text-xl font-medium">
        Please select a form title
      </p>
    </div>

    <div v-if="!isLoading && formDetails">
      <h1 class="text-2xl font-bold text-gray-800 mb-6 border-b pb-2 pt-10">
        {{ formDetails.formTitle }}
      </h1>

      <div
        v-for="(formObject, index) in formDetails.formObjects"
        :key="formObject.id"
        class="mb-6"
      >
        <form @submit.prevent="submitAnswers">
          <div
            v-if="formObject.objecttype !== 'LABEL'"
            class="flex justify-between"
          >
            <label class="text-gray-700 font-semibold mb-2">
              {{ formObject.label }}
              <span
                v-if="formObject.isrequired === 1"
                class="text-red-500 text-sm"
              >
                *
              </span>
            </label>
          </div>
          <div v-if="formObject.objecttype === 'LABEL'">
            <hr class="my-4 border-gray-400" />
            <h3 class="text-lg font-bold text-gray-800 mb-1">
              {{ formObject.label }}
            </h3>
          </div>
          <input
            v-else-if="formObject.objecttype === 'TEXT'"
            type="text"
            v-model="formAnswers[formObject.id]"
            :class="[
              'border p-3 rounded-md w-full focus:outline-none focus:ring-2',
              formErrors[formObject.id]
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500',
            ]"
          />

          <input
            v-else-if="formObject.objecttype === 'NUMBER'"
            type="number"
            :value="String(formAnswers[formObject.id] || '')"
            @input="handleNumberInput($event, formObject.id)"
            :class="[
              'border p-3 rounded-md w-full focus:outline-none focus:ring-2',
              formErrors[formObject.id]
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500',
            ]"
          />

          <input
            v-else-if="formObject.objecttype === 'DECIMAL'"
            type="number"
            step="0.01"
            :value="String(formAnswers[formObject.id] || '')"
            @input="formAnswers[formObject.id] = $event.target.value"
            :class="[
              'border p-3 rounded-md w-full focus:outline-none focus:ring-2',
              formErrors[formObject.id]
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500',
            ]"
          />

          <textarea
            v-else-if="formObject.objecttype === 'TEXTAREA'"
            v-model="formAnswers[formObject.id]"
            :class="[
              'border p-3 rounded-md w-full focus:outline-none focus:ring-2',
              formErrors[formObject.id]
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500',
            ]"
          ></textarea>

          <select
            v-else-if="formObject.objecttype === 'LIST'"
            v-model="formAnswers[formObject.id]"
            :class="[
              'border p-3 rounded-md w-full focus:outline-none focus:ring-2',
              formErrors[formObject.id]
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500',
            ]"
          >
            <option hidden>Select {{ formObject.label }}</option>
            <option
              v-for="option in formObject.options"
              :key="option.id"
              :value="option.value"
            >
              {{ option.value }}
            </option>
          </select>

          <input
            v-else-if="formObject.objecttype === 'DATETIME'"
            type="date"
            :value="formAnswers[formObject.id] || ''"
            @input="formAnswers[formObject.id] = $event.target.value.toString()"
            :class="[
              'border p-3 rounded-md w-full focus:outline-none focus:ring-2',
              formErrors[formObject.id]
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500',
            ]"
          />

          <div v-else-if="formObject.objecttype === 'CHECKBOX'">
            <div
              v-for="option in formObject.options"
              :key="option.id"
              class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition"
            >
              <input
                type="checkbox"
                :id="'chk-' + option.id"
                :value="option.value"
                :checked="formAnswers[formObject.id]?.includes(option.value)"
                @change="toggleChecklist(formObject.id, option.value)"
                class="w-6 h-6 text-blue-600 border-gray-300 rounded focus:ring focus:ring-blue-400"
              />
              <label
                :for="'chk-' + option.id"
                class="text-gray-700 font-medium cursor-pointer hover:text-blue-600 transition"
              >
                {{ option.value }}
              </label>
            </div>
          </div>

          <p v-else class="text-red-500 font-medium">
            Unknown type: {{ formObject.objecttype }}
          </p>
          <p v-if="formErrors[formObject.id]" class="text-red-500 text-sm">
            {{ formObject.label }} is {{ formErrors[formObject.id] }}
          </p>
        </form>
      </div>

      <!-- Approver Section -->
      <div
        v-for="(approverGroup, approverNumber) in formDetails.approvers"
        :key="approverNumber"
        class="mt-2 p-4 bg-gray-50 rounded-lg"
      >
        <h2 class="text-md font-semibold text-gray-800 mb-2">
          Approver {{ approverNumber }}
        </h2>
        <div
          v-for="approver in approverGroup"
          :key="approver.id"
          class="p-2 bg-white rounded-md shadow-sm mb-2"
        >
          <h2 class="text-sm font-bold text-gray-800 mb-2">
            {{ approver.mainApprover == 1 ? "Main" : "Proxy" }}
          </h2>
          <p class="text-gray-700 text-xs">
            <strong>Name:</strong> {{ approver.name }}
          </p>
          <p class="text-gray-700 text-xs">
            <strong>Email:</strong> {{ approver.email }}
          </p>
        </div>
      </div>

      <div class="flex justify-end">
        <button
          type="submit"
          :disabled="isSubmitting"
          class="px-6 py-2 bg-blue-600 hover:bg-blue-900 text-white rounded-lg mt-4 flex items-center"
        >
          <svg
            v-if="isSubmitting"
            class="animate-spin h-5 w-5 mr-2 text-white"
            xmlns="http://www.w3.org/2000/svg"
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
              d="M4 12a8 8 0 018-8v8H4z"
            ></path>
          </svg>
          {{ isSubmitting ? "Submitting..." : "Save" }}
        </button>
      </div>
    </div>
  </form>
</template>
<script setup>
import { ref, onMounted } from "vue";
import { API_BASE_URL } from "~/config";
import { getToken } from "~/js/cryptoToken";
import LoadingModal from "~/components/modal/LoadingModal.vue";

const router = useRouter();
const { $swal } = useNuxtApp();
const formDetails = ref(null);
const formId = ref(""); // Change this dynamically as needed
const formTitles = ref([]);
const formAnswers = ref({});
const formErrors = ref({});
const isLoading = ref(false);
const isSubmitting = ref(false); // New state for loading

function dashboard() {
  router.push("/main/dashboard");
}
function clearFormId() {
  formAnswers.value = {};
  formId.value = "";
  formDetails.value = null;
}

const getFormTitle = async () => {
  const token = getToken();
  isLoading.value = true;

  try {
    const response = await $fetch(`${API_BASE_URL}/api/FormObject`, {
      headers: {
        token: token,
      },
    });
    formTitles.value = response;
  } catch (error) {
    console.error("Error fetching menus:", error);
  } finally {
    isLoading.value = false;
  }
};

const getFormDetails = async () => {
  isLoading.value = true;
  try {
    const token = getToken();
    const response = await $fetch(
      `${API_BASE_URL}/api/FormObject/${formId.value}`,
      {
        headers: {
          token: token,
        },
      }
    );
    formDetails.value = response.data;
  } catch (error) {
    console.error("Error fetching form details:", error);
  } finally {
    isLoading.value = false;
  }
};

const toggleChecklist = (formObjectId, value) => {
  if (!Array.isArray(formAnswers.value[formObjectId])) {
    formAnswers.value[formObjectId] = []; // Ensure it's an array
  }
  const index = formAnswers.value[formObjectId].indexOf(value);
  if (index === -1) {
    formAnswers.value[formObjectId].push(value); // Add value
  } else {
    formAnswers.value[formObjectId].splice(index, 1); // Remove value
  }
};

const handleNumberInput = (event, id) => {
  let value = event.target.value.replace(/[^0-9]/g, ""); // Remove everything except digits (0-9)
  if (value.length > 11) {
    value = value.slice(0, 11); // Limit to 11 digits
  }
  formAnswers.value[id] = value; // Keep as string to allow leading zeros
};

const submitAnswers = async () => {
  isSubmitting.value = true;
  formErrors.value = {};

  formDetails.value.formObjects.forEach((formObject) => {
    const answer = formAnswers.value[formObject.id]?.toString().trim(); // Ensure it's a string before trimming
    if (formObject.isrequired === 1 && (!answer || answer === "")) {
      formErrors.value[formObject.id] = "Required field.";
    }
  });

  if (Object.keys(formErrors.value).length > 0) {
    isSubmitting.value = false;
    await $swal.fire({
      title: "Validation Error",
      text: "Please fill in all required fields before submitting.",
      icon: "warning",
      confirmButtonText: "OK",
    });
    return;
  }

  const token = getToken();
  const payload = {
    formId: formId.value,
    approverDtos: formDetails.value.approvers
      ? Object.values(formDetails.value.approvers || {})
          .flat()
          .map((approver) => ({
            approverId: approver.id,
            approverNumber: Number(approver.approverNumber),
            mainApprover: Number(approver.mainApprover),
          }))
      : [],
    formObjectAnswerDtos: Object.entries(formAnswers.value).flatMap(
      ([id, value]) =>
        Array.isArray(value)
          ? value.map((v) => ({ formObjectId: parseInt(id), value: v })) // Separate each item
          : [
              {
                formObjectId: parseInt(id),
                value: value?.toString().trim() || "",
              },
            ]
    ),
  };

  try {
       await $fetch(
      `${API_BASE_URL}/api/FormObject/submit-answers`,
      {
        method: "POST",
        headers: {
          token: token,
          "Content-Type": "application/json",
        },
        body: payload,
      }
    );
    await $swal.fire({
      title: "Success",
      text: "Form submitted successfully!",
      icon: "success",
      confirmButtonText: "OK",
    });

    clearFormId();
  } catch (error) {
    console.error("Error submitting form:", error);

    let errorMessage = "Please try again later.";
    if (error?.response?._data?.message) {
      errorMessage = error.response._data.message; 
    } else if (error?.message) {
      errorMessage = error.message;
    }

    await $swal.fire({
      title: "Error",
      text: `Error submitting form: ${errorMessage}`,
      icon: "error",
      confirmButtonText: "OK",
    });
  } finally {
    isSubmitting.value = false; // Stop loading indicator
  }
};

onMounted(async () => {
  getFormTitle();
});
definePageMeta({
  middleware: "auth",
});
</script>
