<template>
  <BreadCrumbs :nenunames="nenunames" />
  <button
    @click="backButton"
    type="button"
    class="flex items-center ms-6 mt-8 text-gray-700 hover:text-blue-600 transition-colors duration-200"
  >
    <svg
      class="w-9 h-9"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M5 12h14M5 12l4-4m-4 4 4 4"
      />
    </svg>
    <span class="text-lg font-bold">Back</span>
  </button>
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
    <div class="bg-gray-400 rounded-t-lg text-center">
      <h1 class="text-2xl font-bold text-white border-b p-8">
        {{ transactions.title }} #{{ transactions.id }}
      </h1>
    </div>
    <div class="rounded-t-lg">
      <h1 class="text-lg font-semibold text-gray-700 mb-6 border-b p-5">
        {{ transactions.description }}
      </h1>
    </div>
    <div
      v-for="(item, index) in transactions.formObjects"
      :key="index"
      class="mb-6"
    >
      <div v-if="item.objecttype !== 'LABEL'" class="flex justify-between">
        <label class="text-gray-700 font-semibold mb-2">
          {{ item.label }}
          <span v-if="item.isRequired === 1" class="text-red-500 text-sm">
            *</span
          >
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
          <select
            v-if="item.objecttype === 'LIST'"
            :class="[
              'border p-3 rounded-md w-full focus:outline-none focus:ring-2',
              formErrors[index]
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500',
            ]"
            v-model="item.value"
          >
            <option hidden>Select {{ item.label }}</option>
            <option
              v-for="(option, optIndex) in item.options"
              :key="optIndex"
              :value="option"
            >
              {{ option }}
            </option>
          </select>

          <div v-else-if="item.objecttype === 'OPTION'">
            <div
              v-for="(option, optIndex) in item.options"
              :key="optIndex"
              class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition"
            >
              <input
                type="radio"
                :id="'radio-' + optIndex"
                :value="option"
                v-model="item.value"
                class="w-6 h-6 text-blue-600 border-gray-300 focus:ring focus:ring-blue-400"
              />
              <label
                :for="'radio-' + optIndex"
                class="text-gray-700 font-medium cursor-pointer hover:text-blue-600 transition"
              >
                {{ option }}
              </label>
            </div>
          </div>
          <input
            v-else-if="item.objecttype === 'DATE'"
            type="date"
            :value="item.value || ''"
            @input="item.value = $event.target.value.toString()"
            :class="[
              'border p-3 rounded-md w-full focus:outline-none focus:ring-2',
              formErrors[index]
                ? 'border-red-500 w-full focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500',
            ]"
          />

          <div v-else-if="item.objecttype === 'CHOICES'">
            <div
              v-for="(option, optIndex) in item.options"
              :key="optIndex"

              :class="[
              'flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition',
              formErrors[index]
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500',
            ]"
            >
              <input
                type="checkbox"
                :id="'chk-' + item.id + '-' + optIndex"
                :value="option"
                :checked="item.values.map((v) => v.value).includes(option)"
                @change="toggleChecklist(item, option)"
                class="w-6 h-6 text-blue-600 border-gray-300 rounded focus:ring focus:ring-blue-400"
              />
              <label
                :for="'chk-' + item.id + '-' + optIndex"
                class="text-gray-700 font-medium cursor-pointer hover:text-blue-600 transition"
              >
                {{ option }}
              </label>
            </div>
          </div>
          <!-- TEXTAREA -->
          <textarea
            v-else-if="item.objecttype === 'TEXTAREA'"
            v-model="item.value"
            maxlength="250"
            :class="[
              'border p-3 rounded-md w-full focus:outline-none focus:ring-2',
              formErrors[index]
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500',
            ]"
            style="text-transform: uppercase"
          ></textarea>

          <div
            v-else-if="item.objecttype === 'TIME'">
            <div>
              <DateTimeInput v-model="item.value" />
            </div>
          </div>

          <div v-else-if="item.objecttype === 'TEXTFROMSOURCE'">
            <div class="flex justify-between items-center">
              <!-- Flex container -->
              <input
                @focus="item.autofilluser == 0 ? openModal(index, item.formObjectId, 'textfromsource') : null"
                readonly
                type="text"
                v-model="item.textFromSourceValue.display"
                maxlength="55"
                :class="[
                  'border p-3 rounded-md w-full focus:outline-none focus:ring-2',
                  formErrors[index]
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500',
                ]"
                style="text-transform: uppercase"
              />
              <button
                v-if="item.autofilluser == 0"
                @click="openModal(index, item.formObjectId, 'textfromsource')"
                class="ml-2 px-4 py-3 bg-blue-600 hover:bg-blue-900 text-white rounded-lg"
              >
                <svg
                  class="w-6 h-6 text-gray-800 dark:text-white"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-width="2"
                    d="m21 21-3.5-3.5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
                  />
                </svg>
              </button>
            </div>
          </div>

          <!-- NUMBER -->
          <input
            v-else-if="item.objecttype === 'NUMBER'"
            type="number"
            v-model="item.value"
            @keypress="
              (e) =>
                (e.charCode >= 48 && e.charCode <= 57) || e.preventDefault()
            "
            :class="[
              'border p-3 rounded-md w-full focus:outline-none focus:ring-2',
              formErrors[index]
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500',
            ]"
          />

          <div v-else-if="item.objecttype === 'DYNAMICSIGNATORY'">
            <div
              v-for="(dynamicValue, valueIndex) in item?.values"
              :key="dynamicValue.id ?? valueIndex"
         
              :class="[
              'mb-2 flex items-center gap-2',
              formErrors[index]
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500',
            ]"
            >
              <div
                v-if="dynamicValue.formobjecttype === 'DYNAMICSIGNATORY'"
                class="flex justify-between w-full"
              >
                <input
                  readonly
                  type="text"
                  class="border p-3 rounded-md w-full focus:outline-none focus:ring-2"
                  v-model="dynamicValue.value"
                  style="text-transform: uppercase"
                />
                <button
                  type="button"
                    @click="removeAnswer(index, valueIndex)"
                  class="text-red-600 hover:text-red-800 ml-4"
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            </div>

            <!-- Add button placed outside loop, using last index -->
            <div class="flex justify-center mt-2">
              <button
                @click="
                  openModal(
                    item?.values?.length ?? 0,
                    item.formObjectId,
                    'dynamicsignatory'
                  )
                "
                class="w-full flex items-center justify-center px-4 py-3 bg-gray-400 hover:bg-gray-500 text-white rounded-lg"
              >
                <svg
                  class="w-6 h-6 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 12h14m-7 7V5"
                  />
                </svg>
              </button>
            </div>
          </div>

          <input
            v-else-if="item.objecttype === 'LINKTOOBJECT'"
            v-model="item.value"
            type="text"
            disabled
            :class="[
              'border p-3 rounded-md w-full focus:outline-none focus:ring-2',
              formErrors[index]
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500',
            ]"
            style="text-transform: uppercase"
          />

          <input
            v-else
            v-model="item.value"
            type="text"
            maxlength="55"
            :class="[
              'border p-3 rounded-md w-full focus:outline-none focus:ring-2',
              formErrors[index]
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500',
            ]"
            style="text-transform: uppercase"
          />

          <p v-if="formErrors[index]" class="text-red-500 text-sm">
            {{ item.label }} is {{ formErrors[index] }}
          </p>
        </div>
      </div>
    </div>

    <div
      v-for="(approverGroup, approverNumber) in transactions.approvers"
      :key="approverNumber"
      class="mt-2 p-4 bg-gray-50 rounded-lg"
    >
      <div>
        <h2 class="text-md font-semibold text-gray-800 mb-2">
          Approver {{ approverNumber }}
        </h2>

        <div
          v-for="approver in approverGroup"
          :key="approver.id"
          class="p-2 bg-white rounded-md shadow-sm mb-2"
        >
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
      <button
        @click="saveForm"
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
  <div
    v-if="showModal"
    @click.self="showModal = false"
    @keydown.esc="showModal = false"     
    class="fixed inset-0 p-4 flex flex-wrap justify-center items-center w-full h-full z-[1000] before:fixed before:inset-0 before:w-full before:h-full before:bg-[rgba(0,0,0,0.5)] overflow-auto font-[sans-serif]"
  >
    <div class="w-full max-w-6xl bg-white shadow-lg rounded-lg p-6 relative">
      <input
        type="text"
        v-model="searchQuery"
        @keydown.enter="debouncedSearch(storeId)"
        placeholder="Enter to search"
        class="w-full p-4 rounded border border-gray-600 focus:outline-none"
      />

      <div class="bg-white max-h-96 overflow-x-auto flex flex-col rounded">
        <div class="flex flex-col">
          <div class="pb-4">
            <div class="min-w-full inline-block align-middle">
              <div class="border rounded-md border-gray-300">
                <!-- Table for Dynamic Columns -->
                <table
                  v-if="!loading && justifications.length"
                  class="table-auto min-w-full rounded-xl"
                >
                  <thead>
                    <tr class="bg-gray-50 sticky top-0">
                      <!-- Dynamically generate headers based on data -->
                      <th
                        v-for="header in Object.keys(
                          justifications[0]?.all || {}
                        )"
                        :key="header"
                        scope="col"
                        class="p-5 text-left whitespace-nowrap text-sm leading-6 font-semibold text-gray-900 capitalize"
                      >
                        {{ header }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(justification, index) in justifications"
                      :key="index"
                      @click="selectEmployee(storeIndex, justification)"
                      class="hover:bg-gray-200 cursor-pointer"
                    >
                      <!-- Dynamically populate rows -->
                      <td
                        v-for="header in Object.keys(justification.all)"
                        :key="header"
                        class="p-5 whitespace-nowrap text-sm leading-6 font-medium text-gray-900"
                      >
                        {{ justification.all[header] }}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <!-- No Results Found -->
                <div
                  v-else-if="searchQuery && !loading"
                  class="p-2 text-gray-400 text-center"
                >
                  No results found.
                </div>
                <div v-else-if="loading" class="p-2 text-gray-400 text-center">
                  Loading...
                </div>
                <div v-else class="p-2 text-gray-400 text-center">
                  No results found.
                </div>
              </div>
            </div>
          </div>
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
import DateTimeInput from "~/components/DateTimeInput.vue";

const formErrors = ref({});
const { $swal } = useNuxtApp();
const router = useRouter();
const isSubmitting = ref(false);
const errorAnchor = ref(null);
const showModal = ref(false);
const storeIndex = ref();
const storeId = ref();
const paramid = ref();
const objecttype = ref();

const backButton = () => {
  router.push("/main/638799853882007798");
};

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

const openModal = (index, id, type) => {  
  storeIndex.value = index;
  storeId.value = id;
  showModal.value = true;
  searchQuery.value = "";
  justifications.value = "";
  objecttype.value = type;
};

const selectEmployee = (id, justification) => {
  // Set initial value and display for selected formObject
  if (objecttype.value == "textfromsource") {
    transactions.value.formObjects[id].value = justification.data;
    transactions.value.formObjects[id].textFromSourceValue.display =
      justification.display;
    showModal.value = false;

    // Filter related formObjects where formobjectsourceid matches storeId
    const matchedFormObjects = transactions.value.formObjects.filter(
      (formObject) =>
        formObject?.linkobject?.formobjectsourceid === storeId.value
    );

    matchedFormObjects.forEach((formObject) => {
      const key = formObject?.linkobject?.columnvalue;
      const labelId = formObject?.id;

      // ✅ Get the index in transactions.value.formObjects
      const originalIndex = transactions.value.formObjects.findIndex(
        (f) => f?.id === formObject?.id
      );

      if (key && labelId && justification.all?.hasOwnProperty(key)) {
        const value = justification.all[key];
        transactions.value.formObjects[originalIndex].value = value;
      }
    });
  } else {

    const formObject = transactions.value.formObjects.find((f) => f.formObjectId === storeId.value);

    if (!formObject) {
      console.warn("Form object not found");
      return;
    }

    // Ensure `values` array exists
    if (!Array.isArray(formObject.values)) {
      formObject.values = [];
    }

    // Construct new value entry
    const newEntry = {
      id: 0, // Temp unique ID until saved
      formobjectId: formObject.formObjectId,
      formobjecttype: "DYNAMICSIGNATORY",
      value: justification.display,
      display: justification.data, 
    };

    const isDuplicate = formObject.values.some(
  (v) =>
    v.formobjecttype === "DYNAMICSIGNATORY" &&
    v.value?.toLowerCase() === newEntry.value.toLowerCase()
);

if (!isDuplicate) {
  formObject.values.push(newEntry);
} else {
  console.warn("Duplicate entry prevented");
}
  }
  showModal.value = false;
};

function removeAnswer(itemIndex, valueIndex) {
  const formObject = transactions.value.formObjects?.[itemIndex];
  if (formObject?.values?.length > valueIndex) {
    formObject.values.splice(valueIndex, 1);
  }
}

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
          display: val.display ?? "",
        }))
      : [],
  }));

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
