<template>
  <div class="max-w-full m-10 p-6 bg-white shadow-lg rounded-lg">
    <h1 class="text-2xl font-bold text-gray-800 mb-6 border-b pb-2 pt-10">
      {{ transactions.title }}
    </h1>

    <div
      div
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

      <div v-else class="p-3 rounded-md w-full text-gray-800">
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
            v-model="item.values"
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

          <!-- TEXTAREA -->
          <textarea
            v-else-if="item.objecttype === 'TEXTAREA'"
            v-model="item.values"
            maxlength="250"
            :class="[
              'border p-3 rounded-md w-full focus:outline-none focus:ring-2',
              formErrors[index]
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500',
            ]"
            style="text-transform: uppercase"
          ></textarea>

          <!-- NUMBER -->
          <input
            v-else-if="item.objecttype === 'NUMBER'"
            type="number"
            v-model="item.values"
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

          <!-- TEXT -->
          <input
            v-else
            v-model="item.values"
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

    <!-- Save Button -->
    <div class="mt-6">
      <button
        @click="saveForm"
        class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Save
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { getMyTransaction, transactions } from "~/js/fetchTransactions";
import { API_BASE_URL } from "~/config";
import { getToken } from "~/js/cryptoToken";

const formErrors = ref({});
const { $swal } = useNuxtApp();

onMounted(async () => {
  await getMyTransaction();
});

// Handle Save Button
const saveForm = async () => {
  formErrors.value = {};
  transactions.value.formObjects.forEach((item, index) => {
    const value = item.values?.toString().trim();
    if (item.isRequired === 1 && (!value || value === "")) {
      formErrors.value[index] = "Required field.";
    }
  });
  console.log("Updated form values:", transactions.value.formObjects);

  const token = getToken();
  const payload = transactions.value.formObjects.map((item) => ({
    id: item.id ?? 0,
    label: item.label ?? "",
    objecttype: item.objecttype ?? "",
    options: Array.isArray(item.options) ? item.options : [],
    isRequired: item.isRequired ?? 0,
    isDelete: item.isDelete ?? 0,
    values: item.values ?? "",
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

    router.push("/main/638802127387670470");
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
</script>

<style lang="scss" scoped></style>
