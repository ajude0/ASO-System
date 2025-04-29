<template>
  <BreadCrumbs :nenunames="nenunames" />

  <form class="max-w-full m-10 p-6 bg-white shadow-lg rounded-lg">
    <div class="grid grid-cols-[auto,1fr] items-center gap-x-4 border-b pb-10">
      <label class="text-gray-700 font-bold text-2xl">Form Title</label>
      <div class="relative w-full">
        <select
          class="border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
          v-model="formId"
          @change="getDetails"
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
    <div ref="errorAnchor" class="mb-7"></div>
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
        <div>
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
            maxlength="55"
            :class="[
              'border p-3 rounded-md w-full focus:outline-none focus:ring-2',
              formErrors[formObject.id]
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500',
            ]"
            style="text-transform: uppercase"
          />

          <input
            v-else-if="formObject.objecttype === 'NUMBER'"
            type="number"
            :value="String(formAnswers[formObject.id] || '')"
            @input="handleNumberInput($event, formObject.id)"
            onkeypress="return event.charCode >= 48 && event.charCode <= 57"
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
            onkeypress="return event.charCode >= 48 && event.charCode <= 57"
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
            maxlength="250"
            :class="[
              'border p-3 rounded-md w-full focus:outline-none focus:ring-2',
              formErrors[formObject.id]
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500',
            ]"
            style="text-transform: uppercase"
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

          <div v-else-if="formObject.objecttype === 'CHOICES'">
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

          <div v-else-if="formObject.objecttype === 'CHECKBOX'">
            <div
              v-for="option in formObject.options"
              :key="option.id"
              class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition"
            >
              <input
                type="radio"
                :id="'radio-' + option.id"
                :value="option.value"
                v-model="formAnswers[formObject.id]"
                class="w-6 h-6 text-blue-600 border-gray-300 focus:ring focus:ring-blue-400"
              />
              <label
                :for="'radio-' + option.id"
                class="text-gray-700 font-medium cursor-pointer hover:text-blue-600 transition"
              >
                {{ option.value }}
              </label>
            </div>
          </div>

          <div v-else-if="formObject.objecttype === 'TEXTFROMSOURCE'">
            <div class="flex justify-between items-center">
              <!-- Flex container -->
              <input
                disabled
                type="text"
                v-model="formAnswers[formObject.id]"
                maxlength="55"
                :class="[
                  'border p-3 rounded-md w-full focus:outline-none focus:ring-2',
                  formErrors[formObject.id]
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500',
                ]"
                style="text-transform: uppercase"
              />
              <button
                @click="openModal(formObject.id)"
                class="ml-2 px-10 py-3 bg-blue-600 hover:bg-blue-900 text-white rounded-lg"
              >
                Search
              </button>
            </div>
          </div>

          <p v-else class="text-red-500 font-medium">
            Unknown type: {{ formObject.objecttype }}
          </p>
          <p v-if="formErrors[formObject.id]" class="text-red-500 text-sm">
            {{ formObject.label }} is {{ formErrors[formObject.id] }}
          </p>
        </div>
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
          @click="submitAnswers"
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

  <div
    v-if="showModal"
    class="fixed inset-0 p-4 flex flex-wrap justify-center items-center w-full h-full z-[1000] before:fixed before:inset-0 before:w-full before:h-full before:bg-[rgba(0,0,0,0.5)] overflow-auto font-[sans-serif]"
  >
    <div class="w-full max-w-4xl bg-white shadow-lg rounded-lg p-6 relative">
      <input
        type="text"
        v-model="searchQuery"
        @input="debouncedSearch(storeId)"
        placeholder="Search"
        class="w-full p-4 rounded border border-gray-600 focus:outline-none"
      />

      <div class="max-h-60 overflow-y-auto border border-gray-300 rounded mt-2">
        <div v-if="loading" class="loading">Loading...</div>
        <div
          v-if="justifications.length > 0"
          v-for="(justification, index) in justifications"
          :key="index"
          @click="selectEmployee(storeId, justification.display)"
          class="p-2 hover:bg-gray-200 cursor-pointer"
        >
          {{ justification.display }}
        </div>
        <div
          v-else-if="searchQuery && !loading"
          class="p-2 text-gray-400 text-center"
        >
          No results found.
        </div>
        <div
          v-else
          class="p-2 text-gray-400 text-center"
        >
        No results found.
        </div>
      </div>

      <div class="mt-4 flex justify-end gap-2">
        <button
          @click="showModal = false"
          class="px-4 py-2 bg-red-500 text-white rounded-lg"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { API_BASE_URL } from "~/config";
import { getToken } from "~/js/cryptoToken";
import {
  getFormTitle,
  formTitles,
  getFormDetails,
  formDetails,
} from "~/js/fetchForm";
import LoadingModal from "~/components/modal/LoadingModal.vue";
import {
  searchQuery,
  debouncedSearch,
  justifications,
  loading,
} from "~/js/textfromsource";
import { fetchCanAccess, nenunames } from "~/js/fetchMenu";

const router = useRouter();
const paramid = ref();
const { $swal } = useNuxtApp();
const formId = ref("");
const formAnswers = ref({});
const formErrors = ref({});
const isLoading = ref(false);
const isSubmitting = ref(false);
const errorAnchor = ref(null);
const showModal = ref(false);
const storeId = ref();
function clearFormId() {
  formAnswers.value = {};
  formId.value = "";
  formDetails.value = null;
}

const selectEmployee = (id, selectedJustification) => {
  console.log(id);
  // Update formAnswers with the selected justification
  formAnswers.value[id] = selectedJustification;

  showModal.value = false; // Close the modal after selection
};

const getTitle = async () => {
  isLoading.value = true;
  await getFormTitle();
  isLoading.value = false;
};

const getDetails = async () => {
  isLoading.value = true;
  await getFormDetails(formId.value);
  isLoading.value = false;
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

const openModal = (id) => {
  storeId.value = id;
  showModal.value = true;
};

const submitAnswers = async () => {
  isSubmitting.value = true;
  formErrors.value = {};

  formDetails.value.formObjects.forEach((formObject) => {
    const answer = formAnswers.value[formObject.id]?.toString().trim(); // Ensure it's a string before trimming
    if (formObject.isrequired === 1 && (!answer || answer === "")) {
      formErrors.value[formObject.id] = "required field.";
    }
  });

  if (Object.keys(formErrors.value).length > 0) {
    isSubmitting.value = false;
    errorAnchor.value?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    // Remove focus from active element (like the button)
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    await $swal.fire({
      title: "Validation Error",
      text: "Please fill in all required fields before submitting.",
      icon: "warning",
      timer: 1000,
      showConfirmButton: false,
      focusConfirm: false,
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
    await $fetch(`${API_BASE_URL}/api/FormObject/submit-answers`, {
      method: "POST",
      headers: {
        token: token,
        "Content-Type": "application/json",
      },
      body: payload,
    });
    await $swal.fire({
      title: "Success",
      text: "Form submitted successfully!",
      icon: "success",
      timer: 1000, // auto-close after 2 seconds
      showConfirmButton: false,
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
      timer: 1000, // auto-close after 2 seconds
      showConfirmButton: false,
    });
  } finally {
    isSubmitting.value = false; // Stop loading indicator
  }
};
nenunames.value = [...nenunames.value, "Add Request"];
onMounted(async () => {
  getTitle();
  getDetails();
  const hash = window.location.hash;
  const parts = hash.split("/");
  paramid.value = parts[parts.length - 2];
  await fetchCanAccess(paramid.value);
  nenunames.value.push("Create");

});
</script>
