<template>
  <BreadCrumbs :nenunames="nenunames" />

  <div class="max-w-full m-10 p-6 bg-white shadow-lg rounded-lg">
    <div class="grid grid-cols-[auto,1fr] items-center gap-x-4 border-b pb-10">
      <label class="text-gray-700 font-bold text-2xl">Form </label>
      <div ref="dropdownRef" class="relative">
        <button
          @click="toggleDropdown"
          class="border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-left"
        >
          {{ selectedTitle || "Select Form Title" }}
        </button>
        <div
          v-if="isOpen"
          @keydown="handleKeyDown"
          tabindex="0"
          class="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-gray-300 rounded-md shadow-md"
        >
          <!-- 🔍 Search Input Inside Dropdown -->
          <div class="flex gap-2 sticky top-0 bg-white z-10">
            <div
              class="relative text-gray-500 focus-within:text-gray-900 mb-4 w-full"
            >
              <!-- Left Icon -->
              <div
                class="absolute inset-y-0 left-3 flex items-center pointer-events-none"
              >
                <svg
                  class="w-5 h-5"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M17.5 17.5L15.4167 15.4167M15.8333 9.16667C15.8333 5.48477 12.8486 2.5 9.16667 2.5C5.48477 2.5 2.5 5.48477 2.5 9.16667C2.5 12.8486 5.48477 15.8333 9.16667 15.8333C11.0005 15.8333 12.6614 15.0929 13.8667 13.8947C15.0814 12.6872 15.8333 11.0147 15.8333 9.16667Z"
                    stroke="#9CA3AF"
                    stroke-width="1.6"
                    stroke-linecap="round"
                  />
                </svg>
              </div>

              <!-- Right Icon -->
              <div
                v-if="searchTitle"
                class="absolute inset-y-0 right-1 flex items-center"
              >
                <svg
                  @click="clearSearch"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  class="size-6 cursor-pointer text-red-700"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
              </div>

              <!-- Input Field -->
              <input
                ref="searchInputRef"
                type="text"
                v-model="searchTitle"
                autocomplete="off"
                @keydown.enter.prevent="handleEnterKey"
                @keydown.down.prevent="moveDown"
                @keydown.up.prevent="moveUp"
                class="block w-full h-11 pr-10 pl-10 py-2.5 text-base font-normal shadow-xs text-gray-900 bg-transparent border border-gray-950 rounded-md placeholder-gray-400 focus:outline-none mx-1"
                placeholder="Search"
              />
            </div>
            <button
              @click="getFormTitle"
              class="py-3 px-4 bg-blue-500 h-11 text-white rounded-md hover:bg-blue-700"
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
          <div ref="scrollContainer">
            <div v-if="formTitles && formTitles.length > 0">
              <div
                v-for="(formTitle, index) in formTitles"
                :key="formTitle.id"
                :style="{ scrollMarginTop: '5.5rem' }"
                @click="selectForm(formTitle)"
                class="px-4 py-2 hover:bg-gray-200 cursor-pointer"
                :class="{ 'bg-gray-200 font-bold': index === highlightedIndex }"
              >
                {{ formTitle.title }}
              </div>
            </div>
            <div v-else class="px-4 py-2 text-gray-500 mb-3 text-center">
              No form title found
            </div>
          </div>
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
      <div class="rounded-t-lg">
        <h1
          class="text-lg font-semibold text-gray-700 mb-10 border-b break-all line-clamp-2"
        >
          {{ formDetails.formDescription }}
        </h1>
      </div>

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
            <label class="text-gray-700 font-semibold mb-2 break-all block">
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

          <div v-else-if="formObject.objecttype === 'TIME'">
            <div>
              <DateTimeInput v-model="formAnswers[formObject.id]" />
              
            </div>
          </div>

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
            v-else-if="formObject.objecttype === 'DATE'"
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

          <div v-else-if="formObject.objecttype === 'OPTION'">
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
                @focus="openModal(formObject.id, 'textfromsource')"
                readonly
                type="text"
                v-model="formDisplays[formObject.id]"
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
                @click="openModal(formObject.id, 'textfromsource')"
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

          <div v-else-if="formObject.objecttype === 'DYNAMICSIGNATORY'">
            <!-- Render each name as its own input -->
            <div
              v-for="(name, index) in formAnswers[formObject.id] || []"
              :key="index"
              class="mb-2 flex items-center gap-2"
            >
              <input
                readonly
                type="text"
                v-model="getDisplayBinding(formObject.id, index).value"
                maxlength="55"
                :class="[
                  'border p-3 rounded-md w-full focus:outline-none focus:ring-2',
                  formErrors[formObject.id]
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500',
                ]"
                style="text-transform: uppercase"
              />

              <!-- Remove Button -->
              <button
                type="button"
                @click="removeAnswer(formObject.id, index)"
                class="text-red-600 hover:text-red-800"
                title="Remove"
              >
                ✕
              </button>
            </div>

            <!-- Button to add new name (via modal) -->
            <div class="flex justify-center mt-2">
              <button
                @click="openModal(formObject.id, 'dynamicsignatory')"
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
            v-else-if="formObject.objecttype === 'LINKTOOBJECT'"
            disabled
            type="text"
            v-model="formAnswers[formObject.id]"
            :class="[
              'border p-3 rounded-md w-full focus:outline-none focus:ring-2',
              formErrors[formObject.id]
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500',
            ]"
            style="text-transform: uppercase"
          />

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
  </div>

  <div
    v-if="showModal"
    class="fixed inset-0 p-4 flex flex-wrap justify-center items-center w-full h-full z-[1000] before:fixed before:inset-0 before:w-full before:h-full before:bg-[rgba(0,0,0,0.5)] overflow-auto font-[sans-serif]"
  >
    <div class="w-full max-w-6xl bg-white shadow-lg rounded-lg p-6 relative">
      <!-- Search Input -->
      <div class="flex gap-1 mb-1">
        <input
          type="text"
          v-model="searchQuery"
          @keydown.enter="debouncedSearch(storeId)"
          placeholder="Search"
          class="w-full p-4 h-11 rounded border border-gray-600 focus:outline-none"
        />
        <button
          @click="debouncedSearch(storeId)"
          class="py-3 px-4 h-11 bg-blue-500 text-white rounded-md hover:bg-blue-700"
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
      <!-- Dynamic Table -->
      <div class="bg-white max-h-96 overflow-auto flex flex-col rounded">
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
                      @click="selectEmployee(storeId, justification)"
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
                  No results found
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- Buttons -->
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
  searchTitle,
  lastSearched,
  highlightedIndex,
} from "~/js/fetchForm";
import LoadingModal from "~/components/modal/LoadingModal.vue";
import {
  searchQuery,
  debouncedSearch,
  justifications,
  loading,
} from "~/js/textfromsource";
import { fetchCanAccess, nenunames } from "~/js/fetchMenu";
import DateTimeInput from "~/components/DateTimeInput.vue";


const router = useRouter();
const paramid = ref();
const isOpen = ref(false);
const { $swal } = useNuxtApp();
const formId = ref("");
const formAnswers = ref({});
const formErrors = ref({});
const isLoading = ref(false);
const isSubmitting = ref(false);
const errorAnchor = ref(null);
const showModal = ref(false);
const storeId = ref();
const formDisplays = ref({});
const selectedTitle = ref(null);
const searchInputRef = ref(null);
const dropdownRef = ref(null);
const scrollContainer = ref(null);
const objecttype = ref();
const index = ref();
const toggleDropdown = () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    nextTick(() => {
      searchInputRef.value?.focus();
    });
  }
};

const moveUp = () => {
  if (highlightedIndex.value > 0) highlightedIndex.value--;
};
const moveDown = () => {
  if (
    Array.isArray(formTitles.value) &&
    highlightedIndex.value < formTitles.value.length - 1
  ) {
    highlightedIndex.value++;
  }
};
const handleEnterKey = async () => {
  const approvers = formTitles.value || [];
  const shouldRefetch = searchTitle.value !== lastSearched.value;

  if (approvers.length === 0 || shouldRefetch) {
    await getFormTitle(); // just fetch
    return; // stop here — don't select
  }

  const appr = approvers[highlightedIndex.value];
  if (appr) {
    selectForm(appr);
  }
};

watch(highlightedIndex, async (newIndex) => {
  await nextTick();
  const items = scrollContainer.value?.querySelectorAll(".cursor-pointer");
  if (items && items[newIndex]) {
    items[newIndex].scrollIntoView({ block: "center", behavior: "smooth" });
  }
});

const handleClickOutside = (event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    isOpen.value = false;
  }
};

const selectForm = (formTitle) => {
  selectedTitle.value = formTitle.title;
  formId.value = formTitle.id;
  searchTitle.value = "";
  getFormTitle();
  getDetails();
  isOpen.value = false;
  // do your @change logic here (like getDetails)
};

function clearSearch() {
  searchTitle.value = "";
  getFormTitle();
}

function clearFormId() {
  formAnswers.value = {};
  formId.value = "";
  formDetails.value = null;
  searchTitle.value = "";
  selectedTitle.value = "";
}

const selectEmployee = (id, justification) => {
  // Save hidden and visible data
  if (objecttype.value == "textfromsource") {
    formAnswers.value[id] = justification.data;
    formDisplays.value[id] = justification.display;

    // Filter formObjects where formobjectsourceid matches selected ID
    const matchedFormObjects = formDetails.value?.formObjects?.filter(
      (formObject) => formObject?.linkobjets?.formobjectsourceid === id
    );

    matchedFormObjects?.forEach((formObject) => {
      const key = formObject?.linkobjets?.columnvalue;
      const labelId = formObject?.id;

      if (key && labelId && justification.all?.hasOwnProperty(key)) {
        const value = justification.all[key];
        formAnswers.value[labelId] = value;
      }
    });
  } else {
    if (!Array.isArray(formAnswers.value[id])) {
      formAnswers.value[id] = [];
    }

    if (justification.display) {
      if (typeof index.value === "number" && index.value >= 0) {
        // ✅ Edit existing value
        formAnswers.value[id][index.value] = justification.data;
      } else if (
        !formAnswers.value[id].some(
          (item) =>
            typeof item === "object" &&
            item.type === "dynammicsignatory" &&
            item.value === justification.display
        )
      ) {
        // ✅ Push new value with type = "dynammicsignatory" (if not duplicate)
        formAnswers.value[id].push({
          type: "dynammicsignatory",
          value: justification.data, // 🔒 save this as actual value
          display: justification.display, // 👁️ used only for displaying in input
        });
      }
    }
  }
  index.value = "";
  showModal.value = false;
};
const getDisplayBinding = (formId, index) =>
  computed({
    get: () => {
      const item = formAnswers.value[formId][index];
      return typeof item === "object" ? item.value : item;
    },
    set: (newDisplay) => {
      const item = formAnswers.value[formId][index];
      if (typeof item === "object") {
        item.value = newDisplay;
        // optional: update item.value based on new display, if needed
        // item.value = transformDisplayToValue(newDisplay);
      } else {
        formAnswers.value[formId][index] = newDisplay;
      }
    },
  });

function removeAnswer(formId, index) {
  if (formAnswers.value[formId]) {
    formAnswers.value[formId].splice(index, 1);
  }
}

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

const openModal = (id, type, inx) => {
  searchQuery.value = "";
  justifications.value = "";
  storeId.value = id;
  showModal.value = true;
  objecttype.value = type;
  index.value = inx;
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
          ? value.map((v) =>
              typeof v === "object" && v !== null && "value" in v
                ? {
                    formObjectId: parseInt(id),
                    value: v.value,
                    type: v.type,
                    display: v.display, // add display if present
                  }
                : {
                    formObjectId: parseInt(id),
                    value: v,
                  }
            )
          : [
              typeof value === "object" && value !== null && "value" in value
                ? {
                    formObjectId: parseInt(id),
                    value: value.value,
                    type: value.type,
                    display: value.display, // add display if present
                  }
                : {
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
    searchTitle.value = "";
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

onMounted(async () => {
  getTitle();
  getDetails();
  const hash = window.location.hash;
  const parts = hash.split("/");
  paramid.value = parts[parts.length - 2];
  await fetchCanAccess(paramid.value);
  nenunames.value.push("Create");

  document.addEventListener("click", handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>
