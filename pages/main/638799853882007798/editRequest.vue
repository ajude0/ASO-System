<template>
  <BreadCrumbs :nenunames="nenunames" />
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
  <div v-else class="max-w-full m-10 p-6 bg-white shadow-lg rounded-lg">
    <h1 class="text-2xl font-bold text-gray-800 mb-6 border-b pb-2 pt-2">
      {{ transactions.title }}
    </h1>

    <div div v-for="(item, index) in transactions.formObjects" :key="index" class="mb-6">
      <div v-if="item.objecttype !== 'LABEL'" class="flex justify-between">
        <label class="text-gray-700 font-semibold mb-2">
          {{ item.label }}
          <span v-if="item.isRequired === 1" class="text-red-500 text-sm">
            *</span>
        </label>
      </div>

      <div v-if="item.objecttype === 'LABEL'">
        <hr class="my-4 border-gray-400" />
        <h3 class="text-lg font-bold text-gray-800 mb-1">
          {{ item.label }}
        </h3>
      </div>

      <div v-else class="rounded-md w-full text-gray-800">
        <div class="mb-2">
          <!-- LIST -->
          <select v-if="item.objecttype === 'LIST'" :class="[
            'border p-3 rounded-md w-full focus:outline-none focus:ring-2',
            formErrors[index]
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:ring-blue-500',
          ]" v-model="item.value">
            <option hidden>Select {{ item.label }}</option>
            <option v-for="(option, optIndex) in item.options" :key="optIndex" :value="option">
              {{ option }}
            </option>
          </select>

          <div v-else-if="item.objecttype === 'CHECKBOX'">
            <div v-for="(option, optIndex) in item.options" :key="optIndex"
              class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition">
              <input type="radio" :id="'radio-' + optIndex" :value="option" v-model="item.value"
                class="w-6 h-6 text-blue-600 border-gray-300 focus:ring focus:ring-blue-400" />
              <label :for="'radio-' + optIndex"
                class="text-gray-700 font-medium cursor-pointer hover:text-blue-600 transition">
                {{ option }}
              </label>
            </div>
          </div>

          <div v-else-if="item.objecttype === 'CHOICES'">
            <div v-for="(option, optIndex) in item.options" :key="optIndex"
              class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition">
              <input type="checkbox" :id="'chk-' + item.id + '-' + optIndex" :value="option"
                :checked="item.values.map((v) => v.value).includes(option)" @change="toggleChecklist(item, option)"
                class="w-6 h-6 text-blue-600 border-gray-300 rounded focus:ring focus:ring-blue-400" />
              <label :for="'chk-' + item.id + '-' + optIndex"
                class="text-gray-700 font-medium cursor-pointer hover:text-blue-600 transition">
                {{ option }}
              </label>
            </div>
          </div>
          <!-- TEXTAREA -->
          <textarea v-else-if="item.objecttype === 'TEXTAREA'" v-model="item.value" maxlength="250" :class="[
            'border p-3 rounded-md w-full focus:outline-none focus:ring-2',
            formErrors[index]
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:ring-blue-500',
          ]" style="text-transform: uppercase"></textarea>

          <div v-else-if="item.objecttype === 'TEXTFROMSOURCE'">
            <div class="flex justify-between items-center">
              <!-- Flex container -->
              <input disabled type="text" v-model="item.textFromSourceValue.display" maxlength="55" :class="[
                'border p-3 rounded-md w-full focus:outline-none focus:ring-2',
                formErrors[index]
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500',
              ]" style="text-transform: uppercase" />
              <button @click="openModal(index, item.formObjectId)"
                class="ml-2 px-10 py-3 bg-blue-600 hover:bg-blue-900 text-white rounded-lg">
                Search
              </button>
            </div>
          </div>

          <!-- NUMBER -->
          <input v-else-if="item.objecttype === 'NUMBER'" type="number" v-model="item.value" @keypress="
            (e) =>
              (e.charCode >= 48 && e.charCode <= 57) || e.preventDefault()
          " :class="[
            'border p-3 rounded-md w-full focus:outline-none focus:ring-2',
            formErrors[index]
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:ring-blue-500',
          ]" />

          <!-- TEXT -->
          <input v-else v-model="item.value" type="text" maxlength="55" :class="[
            'border p-3 rounded-md w-full focus:outline-none focus:ring-2',
            formErrors[index]
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:ring-blue-500',
          ]" style="text-transform: uppercase" />

          <p v-if="formErrors[index]" class="text-red-500 text-sm">
            {{ item.label }} is {{ formErrors[index] }}
          </p>
        </div>
      </div>
    </div>

    <div v-for="(approverGroup, approverNumber) in transactions.approvers" :key="approverNumber"
      class="mt-2 p-4 bg-gray-50 rounded-lg">
      <div>
        <h2 class="text-md font-semibold text-gray-800 mb-2">
          Approver {{ approverNumber }}
        </h2>

        <div v-for="approver in approverGroup" :key="approver.id" class="p-2 bg-white rounded-md shadow-sm mb-2">
          <h2 class="text-sm font-bold text-gray-800 mb-2">
            {{ approver.mainapprover ? "Main" : "Proxy" }}
          </h2>
          <div class="flex justify-between">
            <div>
              <p class="text-gray-700 text-xs">
                <strong>Name:</strong> {{ approver.approvername }}
              </p>
              <p class="text-gray-700 text-xs">
                <strong>Email:</strong> {{ approver.approveremail }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="flex justify-end">
      <button @click="saveForm" :disabled="isSubmitting"
        class="px-6 py-2 bg-blue-600 hover:bg-blue-900 text-white rounded-lg mt-4 flex items-center">
        <svg v-if="isSubmitting" class="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg"
          fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
        {{ isSubmitting ? "Submitting..." : "Save" }}
      </button>
    </div>
  </div>
  <div v-if="showModal"
    class="fixed inset-0 p-4 flex flex-wrap justify-center items-center w-full h-full z-[1000] before:fixed before:inset-0 before:w-full before:h-full before:bg-[rgba(0,0,0,0.5)] overflow-auto font-[sans-serif]">
    <div class="w-full max-w-4xl bg-white shadow-lg rounded-lg p-6 relative">
      <input type="text" v-model="searchQuery" @input="debouncedSearch(storeId)" placeholder="Search"
        class="w-full p-4 rounded border border-gray-600 focus:outline-none" />

      <div class="max-h-60 overflow-y-auto border border-gray-300 rounded mt-2">
        <div v-if="loading" class="loading">Loading...</div>
        <div v-if="justifications.length > 0" v-for="(justification, index) in justifications" :key="index"
          @click="selectEmployee(storeIndex, justification)" class="p-2 hover:bg-gray-200 cursor-pointer">
          {{ justification.display }}
        </div>
        <div v-else-if="searchQuery && !loading" class="p-2 text-gray-400 text-center">
          No results found.
        </div>
        <div v-else class="p-2 text-gray-400 text-center">
          No results found.
        </div>
      </div>

      <div class="mt-4 flex justify-end gap-2">
        <button @click="showModal = false" class="px-4 py-2 bg-red-500 text-white rounded-lg">
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import {
  getMyTransaction,
  transactions,
  isLoading,
} from "~/js/fetchTransactions";
import { API_BASE_URL } from "~/config";
import { getToken } from "~/js/cryptoToken";
import LoadingModal from "~/components/modal/LoadingModal.vue";
import {
  debouncedSearch,
  justifications,
  searchQuery,
  loading,
} from "~/js/textfromsource";
import { fetchCanAccess, nenunames } from "~/js/fetchMenu";

const formErrors = ref({});
const { $swal } = useNuxtApp();
const router = useRouter();
const isSubmitting = ref(false);
const errorAnchor = ref(null);
const showModal = ref(false);
const storeIndex = ref();
const storeId = ref();
const paramid = ref();

const toggleChecklist = (item, option) => {
  if (!Array.isArray(item.values)) {
    item.values = []; // Ensure it's an array
  }

  // Ensure the option is not null or undefined
  if (option === null || option === undefined) {
    return; // Do nothing if the option is invalid
  }

  const index = item.values.findIndex((v) => v.value === option); // Find the option in the array

  if (index === -1) {
    item.values.push({ value: option }); // Add option if not already present
  } else {
    item.values.splice(index, 1); // Remove option if it's already selected
  }
};

const openModal = (index, id) => {
  console.log(id);
  storeIndex.value = index;
  storeId.value = id;
  showModal.value = true;
};

const selectEmployee = (id, justification) => {
  transactions.value.formObjects[id].value = justification.data;
  transactions.value.formObjects[id].textFromSourceValue.display =  justification.display;
  showModal.value = false; // Close the modal after selection
};

const saveForm = async () => {
  isSubmitting.value = true;
  formErrors.value = {};
  transactions.value.formObjects.forEach((item, index) => {
    const value = item.value?.toString().trim();
    const values = item.values?.toString().trim();

    if (
      item.isRequired === 1 &&
      (!value || value === "") &&
      (!values || values === "")
    ) {
      formErrors.value[index] = "Required field.";
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
  const payload = transactions.value.formObjects.map((item) => ({
    id: item.id ?? 0,
    label: item.label ?? "",
    transactionid: item.transactionid ?? "",
    objecttype: item.objecttype ?? "",
    options: Array.isArray(item.options) ? item.options : [],
    isRequired: item.isRequired ?? 0,
    isDelete: item.isDelete ?? 0,
    value: item.value ?? "",
    values: Array.isArray(item.values)
      ? item.values.map((val) => ({
        id: val.id ?? 0, // Default to 0 if val.id is undefined
        value: val.value ?? "", // Default to empty string if val.value is undefined
      }))
      : [],
  }));
  console.log(payload);
  try {
    await $fetch(`${API_BASE_URL}/api/Transaction/update-transaction`, {
      method: "POST",
      headers: {
        token: token,
      },
      body: payload,
    });

    await $swal.fire({
      title: "Success",
      text: "Form submitted successfully!",
      icon: "success",
      timer: 1000,
      showConfirmButton: false,
    });

    router.push("/main/638799853882007798");
  } catch (error) {
    console.error("Failed to save form:", error);

    await $swal.fire({
      title: "Error",
      text: "Failed to create form. Please try again.",
      icon: "error",
      timer: 1000,
      showConfirmButton: false,
    });
  } finally {
    isSubmitting.value = false; // Stop loading
  }
};

onMounted(async () => {
  await getMyTransaction();
  const hash = window.location.hash;
  const parts = hash.split("/");
  paramid.value = parts[parts.length - 2];
  await fetchCanAccess(paramid.value);
  nenunames.value.push("Edit");
});
</script>

<style lang="scss" scoped></style>
