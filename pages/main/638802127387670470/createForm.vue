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

  <div class="max-w-full m-2 mx-auto p-6 bg-white shadow-lg rounded-lg">
    <h1 class="text-2xl font-bold mb-4">Create Form</h1>
    <div ref="errorAnchor" class="mb-7"></div>

    <!-- Form Title & Description -->
    <div class="mb-4">
      <label class="block font-medium" :class="{ 'text-red-500': errors.title }"
        >Title <span class="text-red-500 text-sm"> * </span></label
      >
      <input
        v-model="form.title"
        type="text"
        maxlength="40"
        class="border p-2 w-full rounded"
        :class="{ 'border-red-500': errors.title }"
      />
      <p v-if="errors.title" class="text-red-500 text-sm mt-1">
        {{ errors.title }}
      </p>
    </div>

    <div class="mb-4">
      <label
        class="block font-medium"
        :class="{ 'text-red-500': errors.description }"
        >Description <span class="text-red-500 text-sm"> * </span></label
      >
      <textarea
        v-model="form.description"
        class="border p-2 w-full rounded"
        maxlength="240"
        :class="{ 'border-red-500': errors.description }"
      ></textarea>
      <p v-if="errors.description" class="text-red-500 text-sm mt-1">
        {{ errors.description }}
      </p>
    </div>

    <div class="w-full space-y-4 mb-2">
      <!-- File Input -->
      <div class="space-y-2">
        <label class="block font-medium">
          Choose Template File <span class="text-red-500 text-sm"> * </span>
        </label>
        <input
          ref="fileInput"
          type="file"
          @change="handleFileChange"
          class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border"
        />
      </div>

      <!-- Selected File Info -->
      <div v-if="form.templatefile" class="p-3 bg-gray-50 rounded-lg">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-700">
              <span class="font-medium">File:</span> {{ form.templatefile.name }}
            </p>
            <p class="text-sm text-gray-500">
              <span class="font-medium">Size:</span>
              {{ formatFileSize(form.templatefile.size) }}
            </p>
          </div>
          <button
            @click="removeFile"
            class="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors"
            title="Remove file"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- <div>
      <label for="templateFile" :class="{ 'text-red-500': errors.templatefile }">Template File:</label>
      <input
        @change="handleFileChange"
        id="templateFile"
        type="file"
        required
         :class="{ 'text-red-500': errors.templatefile }"
      />
      <p v-if="errors.templatefile" class="text-red-500 text-sm mt-1">
        {{ errors.templatefile }}
      </p>
    </div> -->

    <!-- Form Objects -->
    <div>
      <draggable
        v-model="form.formObjects"
        item-key="id"
        handle=".drag-handle"
        ghost-class="drag-ghost"
        chosen-class="drag-chosen"
        class="space-y-6"
      >
        <template #item="{ element: formObject, index }">
          <div class="mb-6 p-4 border rounded bg-gray-50">
            <div class="flex justify-between items-center mb-4">
              <span
                class="cursor-move drag-handle text-gray-500 hover:text-gray-700"
              >
                ⇅ Drag
              </span>
            </div>

            <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <!-- Label -->
              <div class="col-span-1 mt-1">
                <label
                  class="block font-medium"
                  :class="{ 'text-red-500': errors[index]?.label }"
                >
                  Label <span class="text-red-500 text-sm"> * </span>
                </label>

                <textarea
                  v-if="
                    formObject.objectType && formObject.objectType === 'LABEL'
                  "
                  v-model="formObject.label"
                  type="text"
                  maxlength="255"
                  class="border p-2 w-full rounded"
                  :class="{ 'border-red-500': errors[index]?.label }"
                >
                </textarea>
                <input
                  v-else
                  v-model="formObject.label"
                  type="text"
                  maxlength="255"
                  class="border p-2 w-full rounded"
                  :class="{ 'border-red-500': errors[index]?.label }"
                />
                <p
                  v-if="errors[index]?.label"
                  class="text-red-500 text-sm mt-1"
                >
                  {{ errors[index]?.label }}
                </p>
              </div>

              <!-- Select Field -->
              <div class="col-span-1 mt-1">
                <label
                  class="block font-medium"
                  :class="{ 'text-red-500': errors[index]?.objectType }"
                >
                  Select Field <span class="text-red-500 text-sm"> * </span>
                </label>
                <select
                  v-model="formObject.objectType"
                  class="border p-2 w-full rounded"
                  :class="{ 'border-red-500': errors[index]?.objectType }"
                >
                  <option value="" disabled>Select Field</option>
                  <option
                    v-for="(dropdown, index) in dropdowns"
                    :key="index"
                    :value="dropdown"
                  >
                    {{ dropdown }}
                  </option>
                </select>
                <p
                  v-if="errors[index]?.objectType"
                  class="text-red-500 text-sm mt-1"
                >
                  {{ errors[index]?.objectType }}
                </p>
              </div>

              <!-- Options -->
              <div
                v-if="
                  formObject.objectType === 'LIST' ||
                  formObject.objectType === 'OPTION' ||
                  formObject.objectType == 'CHOICES'
                "
                class="col-span-1"
              >
                <h3 class="font-semibold mb-2">Options</h3>
                <div
                  v-for="(value, vIndex) in formObject.formObjectLists[0]
                    .values"
                  :key="vIndex"
                  class="flex items-center gap-2 mb-2"
                >
                  <input
                    v-model="formObject.formObjectLists[0].values[vIndex]"
                    type="text"
                    maxlength="80"
                    class="border p-2 w-full rounded"
                    style="text-transform: uppercase"
                  />
                  <button
                    @click="
                      formObject.formObjectLists[0].values.splice(vIndex, 1)
                    "
                    class="text-red-500 hover:text-red-800"
                  >
                    X
                  </button>
                </div>
                <div class="flex justify-start">
                  <button
                    @click="addFormObjectListValue(index)"
                    class="px-4 py-2 bg-blue-600 hover:bg-blue-800 text-white rounded-lg"
                  >
                    +
                  </button>
                </div>
              </div>

              <!-- Data -->
              <div
                v-if="
                  formObject.objectType === 'TEXTFROMSOURCE' ||
                  formObject.objectType == 'DYNAMICSIGNATORY'
                "
                class="col-span-1 mt-1"
              >
                <label
                  class="block font-medium"
                  :class="{ 'text-red-500': errors[index]?.data }"
                >
                  Data <span class="text-red-500 text-sm"> * </span>
                </label>
                <input
                  v-model="formObject.data"
                  type="text"
                  maxlength="255"
                  class="border p-2 w-full rounded"
                  @keydown.space.prevent
                  @input="
                    () =>
                      (formObject.data = formObject.data.replace(/\s+/g, ''))
                  "
                  :class="{ 'border-red-500': errors[index]?.data }"
                />
                <p v-if="errors[index]?.data" class="text-red-500 text-sm mt-1">
                  {{ errors[index]?.data }}
                </p>
              </div>

              <!-- Display -->
              <div
                v-if="
                  formObject.objectType === 'TEXTFROMSOURCE' ||
                  formObject.objectType == 'DYNAMICSIGNATORY'
                "
                class="col-span-1 mt-1"
              >
                <label
                  class="block font-medium"
                  :class="{ 'text-red-500': errors[index]?.display }"
                >
                  Display <span class="text-red-500 text-sm"> * </span>
                </label>
                <input
                  v-model="formObject.display"
                  type="text"
                  maxlength="255"
                  class="border p-2 w-full rounded"
                  @keydown.space.prevent
                  @input="
                    () =>
                      (formObject.display = formObject.display.replace(
                        /\s+/g,
                        ''
                      ))
                  "
                  :class="{ 'border-red-500': errors[index]?.display }"
                />
                <p
                  v-if="errors[index]?.display"
                  class="text-red-500 text-sm mt-1"
                >
                  {{ errors[index]?.display }}
                </p>
              </div>

              <!-- Is Required -->
              <div
                v-if="
                  formObject.objectType !== 'LABEL' &&
                  formObject.objectType !== 'LINKTOOBJECT'
                "
              >
                <label class="block font-medium">Is Required</label>
                <select
                  v-model="formObject.isRequired"
                  class="border p-2 w-full rounded"
                >
                  <option :value="0">No</option>
                  <option :value="1">Yes</option>
                </select>
              </div>


               <!-- Variable -->

               <div v-if="formObject.objectType != 'LABEL'" class="col-span-1">
                <label
                  class="block font-medium"
                  :class="{ 'text-red-500': errors[index]?.variable }"
                >
                  Variable <span class="text-red-500 text-sm"> * </span>
                </label>

                <input
                  v-if="formObject.objectType != LABEL"
                  v-model="formObject.variable"
                  type="text"
                  maxlength="50"
                  class="border p-2 w-full rounded"
                  :class="{ 'border-red-500': errors[index]?.variable }"
                />
                <p
                  v-if="errors[index]?.variable"
                  class="text-red-500 text-sm mt-1"
                >
                  {{ errors[index]?.variable }}
                </p>
              </div>
              <!-- Datasourcescript -->
              <div
                v-if="
                  formObject.objectType === 'TEXTFROMSOURCE' ||
                  formObject.objectType == 'DYNAMICSIGNATORY'
                "
                class="col-span-2 mt-1"
              >
                <label
                  class="block font-medium"
                  :class="{ 'text-red-500': errors[index]?.datasourcescript }"
                >
                  Datasourcescript <span class="text-red-500 text-sm"> * </span>
                </label>
                <textarea
                  v-model="formObject.datasourcescript"
                  type="text"
                  maxlength="255"
                  class="border p-2 w-full rounded"
                  :class="{ 'border-red-500': errors[index]?.datasourcescript }"
                >
                </textarea>
                <p
                  v-if="errors[index]?.datasourcescript"
                  class="text-red-500 text-sm mt-1"
                >
                  {{ errors[index]?.datasourcescript }}
                </p>
              </div>

              

              <!-- Label From TEXTFROMSOURCE -->
              <div
                v-if="formObject.objectType === 'LINKTOOBJECT'"
                class="col-span-1 mt-1"
              >
                <label
                  class="block font-medium"
                  :class="{
                    'text-red-500': errors[index]?.textfromsourcelabel,
                  }"
                >
                  Label (textfromsource)
                  <span class="text-red-500 text-sm"> * </span>
                </label>
                <select
                  v-model="formObject.textfromsourcelabel"
                  class="border p-2 w-full rounded"
                  :class="{
                    'border-red-500': errors[index]?.textfromsourcelabel,
                  }"
                >
                  <option value="" disabled>Select Label</option>
                  <option
                    v-for="(label, index) in textFromSourceLabels"
                    :key="index"
                    :value="label"
                  >
                    {{ label }}
                  </option>
                </select>
                <p
                  v-if="errors[index]?.textfromsourcelabel"
                  class="text-red-500 text-sm mt-1"
                >
                  {{ errors[index]?.textfromsourcelabel }}
                </p>
              </div>

              <!-- Columnvalue -->
              <div
                v-if="formObject.objectType === 'LINKTOOBJECT'"
                class="col-span-1 mt-1"
              >
                <label
                  class="block font-medium"
                  :class="{ 'text-red-500': errors[index]?.columnvalue }"
                >
                  Columnvalue
                </label>
                <input
                  v-model="formObject.columnvalue"
                  type="text"
                  maxlength="255"
                  class="border p-2 w-full rounded"
                  @keydown.space.prevent
                  @input="
                    () =>
                      (formObject.columnvalue = formObject.columnvalue.replace(
                        /\s+/g,
                        ''
                      ))
                  "
                  :class="{ 'border-red-500': errors[index]?.columnvalue }"
                />
                <p
                  v-if="errors[index]?.columnvalue"
                  class="text-red-500 text-sm mt-1"
                >
                  {{ errors[index]?.columnvalue }}
                </p>
              </div>

             
            </div>

            <!-- Remove Form Button -->
            <div
              v-if="form.formObjects.length > 1"
              class="flex justify-end mt-4"
            >
              <button
                @click="removeFormObject(index)"
                class="px-4 py-2 bg-red-600 text-white rounded"
              >
                Remove Section
              </button>
            </div>
          </div>
        </template>
      </draggable>
    </div>
    <div ref="scrollAnchor"></div>
    <div class="mt-1 mb-10">
      <button @click="addFormObject" class="text-green-500">
        + Add Section
      </button>
    </div>
    <div class="mb-6 p-4 border rounded bg-gray-50">
      <div class="flex items-center mb-4 space-x-4">
        <h2 class="font-semibold">
          Approvers <span class="text-red-500 text-sm"> * </span>
        </h2>
        <div class="flex items-center space-x-2">
          <input
            type="checkbox"
            id="approvers-checkbox"
            class="scale-150 accent-blue-600"
            v-model="form.isinorder"
          />
          <label for="approvers-checkbox" class="text-md text-gray-700"
            >In Order</label
          >
        </div>
      </div>
      <div class="flex justify-end mb-2 gap-4 mt-4">
        <button
          v-if="!immediateHeadAdded"
          @click="addImmediateHead"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          + Immediate Head
        </button>
        <button
          @click="addApprover"
          class="px-4 py-2 bg-green-600 text-white rounded-lg"
        >
          + Add Approver
        </button>
      </div>
      <div class="overflow-hidden border rounded-md border-gray-300">
        <table class="table-auto min-w-full rounded-xl">
          <thead>
            <tr class="bg-gray-50">
              <th
                scope="col"
                class="p-5 text-left whitespace-nowrap text-sm leading-6 font-semibold text-gray-900 capitalize"
              >
                Name
              </th>
              <th
                scope="col"
                class="p-5 text-left whitespace-nowrap text-sm leading-6 font-semibold text-gray-900 capitalize min-w-[150px]"
              >
                Email
              </th>
              <th
                scope="col"
                class="p-5 text-left whitespace-nowrap text-sm leading-6 font-semibold text-gray-900 capitalize"
              >
                Sequence
              </th>
              <th
                scope="col"
                class="p-5 text-left whitespace-nowrap text-sm leading-6 font-semibold text-gray-900 capitalize"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-300">
            <tr
              v-for="(approver, index) in form.approvers"
              :key="index"
              class="bg-white transition-all duration-500 hover:bg-gray-50"
            >
              <td
                class="p-5 whitespace-nowrap text-sm leading-6 font-medium text-gray-900"
              >
                {{ approver.approverName }}
              </td>

              <td class="p-5">
                <div class="flex items-center gap-3">
                  <div class="data">
                    <p class="font-normal text-sm text-gray-900">
                      {{ approver.approverEmail }}
                    </p>
                  </div>
                </div>
              </td>
              <td
                class="p-5 whitespace-nowrap text-sm leading-6 font-medium text-gray-900"
              >
                {{ approver.approverNumber }}
              </td>
              <td class="flex p-5 items-center gap-0.5">
                <!-- <button
                     class="p-2 rounded-full bg-white group transition-all duration-500 hover:bg-gray-100 flex item-center"
                     @click="openApproverModal(index)"
                   >
                     <svg
                       xmlns="http://www.w3.org/2000/svg"
                       width="1.2em"
                       height="1.2em"
                       viewBox="0 0 24 24"
                     >
                       <path
                         fill="#50b1fb"
                         d="M12 22H5a2 2 0 0 1-2-2l.01-14c0-1.1.88-2 1.99-2h1V2h2v2h8V2h2v2h1c1.1 0 2 .9 2 2v6h-2v-2H5v10h7zm10.13-5.01l.71-.71a.996.996 0 0 0 0-1.41l-.71-.71a.996.996 0 0 0-1.41 0l-.71.71zm-.71.71l-5.3 5.3H14v-2.12l5.3-5.3z"
                       />
                     </svg>
                   </button> -->
                <button
                  class="p-2 rounded-full bg-white group transition-all duration-500 hover:bg-red-100 flex item-center"
                  @click="removeApprover(index)"
                >
                  <svg
                    class=""
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      class="fill-red-600"
                      d="M4.00031 5.49999V4.69999H3.20031V5.49999H4.00031ZM16.0003 5.49999H16.8003V4.69999H16.0003V5.49999ZM17.5003 5.49999L17.5003 6.29999C17.9421 6.29999 18.3003 5.94183 18.3003 5.5C18.3003 5.05817 17.9421 4.7 17.5003 4.69999L17.5003 5.49999ZM9.30029 9.24997C9.30029 8.80814 8.94212 8.44997 8.50029 8.44997C8.05847 8.44997 7.70029 8.80814 7.70029 9.24997H9.30029ZM7.70029 13.75C7.70029 14.1918 8.05847 14.55 8.50029 14.55C8.94212 14.55 9.30029 14.1918 9.30029 13.75H7.70029ZM12.3004 9.24997C12.3004 8.80814 11.9422 8.44997 11.5004 8.44997C11.0585 8.44997 10.7004 8.80814 10.7004 9.24997H12.3004ZM10.7004 13.75C10.7004 14.1918 11.0585 14.55 11.5004 14.55C11.9422 14.55 12.3004 14.1918 12.3004 13.75H10.7004ZM4.00031 6.29999H16.0003V4.69999H4.00031V6.29999ZM15.2003 5.49999V12.5H16.8003V5.49999H15.2003ZM11.0003 16.7H9.00031V18.3H11.0003V16.7ZM4.80031 12.5V5.49999H3.20031V12.5H4.80031ZM9.00031 16.7C7.79918 16.7 6.97882 16.6983 6.36373 16.6156C5.77165 16.536 5.49093 16.3948 5.29823 16.2021L4.16686 17.3334C4.70639 17.873 5.38104 18.0979 6.15053 18.2013C6.89702 18.3017 7.84442 18.3 9.00031 18.3V16.7ZM3.20031 12.5C3.20031 13.6559 3.19861 14.6033 3.29897 15.3498C3.40243 16.1193 3.62733 16.7939 4.16686 17.3334L5.29823 16.2021C5.10553 16.0094 4.96431 15.7286 4.88471 15.1366C4.80201 14.5215 4.80031 13.7011 4.80031 12.5H3.20031ZM15.2003 12.5C15.2003 13.7011 15.1986 14.5215 15.1159 15.1366C15.0363 15.7286 14.8951 16.0094 14.7024 16.2021L15.8338 17.3334C16.3733 16.7939 16.5982 16.1193 16.7016 15.3498C16.802 14.6033 16.8003 13.6559 16.8003 12.5H15.2003ZM11.0003 18.3C12.1562 18.3 13.1036 18.3017 13.8501 18.2013C14.6196 18.0979 15.2942 17.873 15.8338 17.3334L14.7024 16.2021C14.5097 16.3948 14.229 16.536 13.6369 16.6156C13.0218 16.6983 12.2014 16.7 11.0003 16.7V18.3ZM2.50031 4.69999C2.22572 4.7 2.04405 4.7 1.94475 4.7C1.89511 4.7 1.86604 4.7 1.85624 4.7C1.85471 4.7 1.85206 4.7 1.851 4.7C1.05253 5.50059 1.85233 6.3 1.85256 6.3C1.85273 6.3 1.85297 6.3 1.85327 6.3C1.85385 6.3 1.85472 6.3 1.85587 6.3C1.86047 6.3 1.86972 6.3 1.88345 6.3C1.99328 6.3 2.39045 6.3 2.9906 6.3C4.19091 6.3 6.2032 6.3 8.35279 6.3C10.5024 6.3 12.7893 6.3 14.5387 6.3C15.4135 6.3 16.1539 6.3 16.6756 6.3C16.9364 6.3 17.1426 6.29999 17.2836 6.29999C17.3541 6.29999 17.4083 6.29999 17.4448 6.29999C17.4631 6.29999 17.477 6.29999 17.4863 6.29999C17.4909 6.29999 17.4944 6.29999 17.4968 6.29999C17.498 6.29999 17.4988 6.29999 17.4994 6.29999C17.4997 6.29999 17.4999 6.29999 17.5001 6.29999C17.5002 6.29999 17.5003 6.29999 17.5003 5.49999C17.5003 4.69999 17.5002 4.69999 17.5001 4.69999C17.4999 4.69999 17.4997 4.69999 17.4994 4.69999C17.4988 4.69999 17.498 4.69999 17.4968 4.69999C17.4944 4.69999 17.4909 4.69999 17.4863 4.69999C17.477 4.69999 17.4631 4.69999 17.4448 4.69999C17.4083 4.69999 17.3541 4.69999 17.2836 4.69999C17.1426 4.7 16.9364 4.7 16.6756 4.7C16.1539 4.7 15.4135 4.7 14.5387 4.7C12.7893 4.7 10.5024 4.7 8.35279 4.7C6.2032 4.7 4.19091 4.7 2.9906 4.7C2.39044 4.7 1.99329 4.7 1.88347 4.7C1.86974 4.7 1.86051 4.7 1.85594 4.7C1.8548 4.7 1.85396 4.7 1.85342 4.7C1.85315 4.7 1.85298 4.7 1.85288 4.7C1.85284 4.7 2.65253 5.49941 1.85408 6.3C1.85314 6.3 1.85296 6.3 1.85632 6.3C1.86608 6.3 1.89511 6.3 1.94477 6.3C2.04406 6.3 2.22573 6.3 2.50031 6.29999L2.50031 4.69999ZM7.05028 5.49994V4.16661H5.45028V5.49994H7.05028ZM7.91695 3.29994H12.0836V1.69994H7.91695V3.29994ZM12.9503 4.16661V5.49994H14.5503V4.16661H12.9503ZM12.0836 3.29994C12.5623 3.29994 12.9503 3.68796 12.9503 4.16661H14.5503C14.5503 2.8043 13.4459 1.69994 12.0836 1.69994V3.29994ZM7.05028 4.16661C7.05028 3.68796 7.4383 3.29994 7.91695 3.29994V1.69994C6.55465 1.69994 5.45028 2.8043 5.45028 4.16661H7.05028ZM2.50031 6.29999C4.70481 6.29998 6.40335 6.29998 8.1253 6.29997C9.84725 6.29996 11.5458 6.29995 13.7503 6.29994L13.7503 4.69994C11.5458 4.69995 9.84724 4.69996 8.12529 4.69997C6.40335 4.69998 4.7048 4.69998 2.50031 4.69999L2.50031 6.29999ZM13.7503 6.29994L17.5003 6.29999L17.5003 4.69999L13.7503 4.69994L13.7503 6.29994ZM7.70029 9.24997V13.75H9.30029V9.24997H7.70029ZM10.7004 9.24997V13.75H12.3004V9.24997H10.7004Z"
                      fill="#F87171"
                    ></path>
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <p
          v-if="errors.approver"
          class="flex justify-center text-red-500 text-md mt-2 mb-2"
        >
          {{ errors.approver }}
        </p>
      </div>
    </div>

    <div
      v-if="form.approvers.length > 0"
      class="mb-6 p-4 border rounded bg-gray-50"
    >
      <h2 class="font-semibold mb-4">Proxy</h2>
      <div class="flex justify-end mb-2 gap-4 mt-4">
        <button
          @click="addProxy"
          class="px-4 py-2 bg-purple-600 text-white rounded-lg"
        >
          + Add Proxy
        </button>
      </div>
      <div class="overflow-hidden border rounded-md border-gray-300">
        <table class="table-auto min-w-full rounded-xl">
          <thead>
            <tr class="bg-gray-50">
              <th
                scope="col"
                class="p-5 text-left whitespace-nowrap text-sm leading-6 font-semibold text-gray-900 capitalize"
              >
                Name/Email
              </th>
              <th
                scope="col"
                class="p-5 text-left whitespace-nowrap text-sm leading-6 font-semibold text-gray-900 capitalize min-w-[150px]"
              >
                Proxy Name/Email
              </th>
              <th
                scope="col"
                class="p-5 text-left whitespace-nowrap text-sm leading-6 font-semibold text-gray-900 capitalize"
              >
                Sequence
              </th>
              <th
                scope="col"
                class="p-5 text-left whitespace-nowrap text-sm leading-6 font-semibold text-gray-900 capitalize"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-300">
            <tr
              v-for="(proxy, index) in form.proxies"
              :key="index"
              class="bg-white transition-all duration-500 hover:bg-gray-50"
            >
              <td
                class="p-5 whitespace-nowrap text-sm leading-6 font-medium text-gray-900"
              >
                Name:{{ proxy.existingapprovername }} <br />
                Email: {{ proxy.existingapproveremail }}
              </td>
              <td
                class="p-5 whitespace-nowrap text-sm leading-6 font-medium text-gray-900"
              >
                Name:{{ proxy.approverName }} <br />
                Email: {{ proxy.approverEmail }}
              </td>
              <td
                class="p-5 whitespace-nowrap text-sm leading-6 font-medium text-gray-900"
              >
                {{ proxy.approverNumber }}
              </td>

              <td class="flex p-5 items-center gap-0.5">
                <button
                  @click="openProxyModal(index)"
                  class="p-2 rounded-full bg-white group transition-all duration-500 hover:bg-gray-100 flex item-center"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="1.2em"
                    height="1.2em"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill="#50b1fb"
                      d="M12 22H5a2 2 0 0 1-2-2l.01-14c0-1.1.88-2 1.99-2h1V2h2v2h8V2h2v2h1c1.1 0 2 .9 2 2v6h-2v-2H5v10h7zm10.13-5.01l.71-.71a.996.996 0 0 0 0-1.41l-.71-.71a.996.996 0 0 0-1.41 0l-.71.71zm-.71.71l-5.3 5.3H14v-2.12l5.3-5.3z"
                    />
                  </svg>
                </button>
                <button
                  @click="removeProxy"
                  class="p-2 rounded-full bg-white group transition-all duration-500 hover:bg-red-100 flex item-center"
                >
                  <svg
                    class=""
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      class="fill-red-600"
                      d="M4.00031 5.49999V4.69999H3.20031V5.49999H4.00031ZM16.0003 5.49999H16.8003V4.69999H16.0003V5.49999ZM17.5003 5.49999L17.5003 6.29999C17.9421 6.29999 18.3003 5.94183 18.3003 5.5C18.3003 5.05817 17.9421 4.7 17.5003 4.69999L17.5003 5.49999ZM9.30029 9.24997C9.30029 8.80814 8.94212 8.44997 8.50029 8.44997C8.05847 8.44997 7.70029 8.80814 7.70029 9.24997H9.30029ZM7.70029 13.75C7.70029 14.1918 8.05847 14.55 8.50029 14.55C8.94212 14.55 9.30029 14.1918 9.30029 13.75H7.70029ZM12.3004 9.24997C12.3004 8.80814 11.9422 8.44997 11.5004 8.44997C11.0585 8.44997 10.7004 8.80814 10.7004 9.24997H12.3004ZM10.7004 13.75C10.7004 14.1918 11.0585 14.55 11.5004 14.55C11.9422 14.55 12.3004 14.1918 12.3004 13.75H10.7004ZM4.00031 6.29999H16.0003V4.69999H4.00031V6.29999ZM15.2003 5.49999V12.5H16.8003V5.49999H15.2003ZM11.0003 16.7H9.00031V18.3H11.0003V16.7ZM4.80031 12.5V5.49999H3.20031V12.5H4.80031ZM9.00031 16.7C7.79918 16.7 6.97882 16.6983 6.36373 16.6156C5.77165 16.536 5.49093 16.3948 5.29823 16.2021L4.16686 17.3334C4.70639 17.873 5.38104 18.0979 6.15053 18.2013C6.89702 18.3017 7.84442 18.3 9.00031 18.3V16.7ZM3.20031 12.5C3.20031 13.6559 3.19861 14.6033 3.29897 15.3498C3.40243 16.1193 3.62733 16.7939 4.16686 17.3334L5.29823 16.2021C5.10553 16.0094 4.96431 15.7286 4.88471 15.1366C4.80201 14.5215 4.80031 13.7011 4.80031 12.5H3.20031ZM15.2003 12.5C15.2003 13.7011 15.1986 14.5215 15.1159 15.1366C15.0363 15.7286 14.8951 16.0094 14.7024 16.2021L15.8338 17.3334C16.3733 16.7939 16.5982 16.1193 16.7016 15.3498C16.802 14.6033 16.8003 13.6559 16.8003 12.5H15.2003ZM11.0003 18.3C12.1562 18.3 13.1036 18.3017 13.8501 18.2013C14.6196 18.0979 15.2942 17.873 15.8338 17.3334L14.7024 16.2021C14.5097 16.3948 14.229 16.536 13.6369 16.6156C13.0218 16.6983 12.2014 16.7 11.0003 16.7V18.3ZM2.50031 4.69999C2.22572 4.7 2.04405 4.7 1.94475 4.7C1.89511 4.7 1.86604 4.7 1.85624 4.7C1.85471 4.7 1.85206 4.7 1.851 4.7C1.05253 5.50059 1.85233 6.3 1.85256 6.3C1.85273 6.3 1.85297 6.3 1.85327 6.3C1.85385 6.3 1.85472 6.3 1.85587 6.3C1.86047 6.3 1.86972 6.3 1.88345 6.3C1.99328 6.3 2.39045 6.3 2.9906 6.3C4.19091 6.3 6.2032 6.3 8.35279 6.3C10.5024 6.3 12.7893 6.3 14.5387 6.3C15.4135 6.3 16.1539 6.3 16.6756 6.3C16.9364 6.3 17.1426 6.29999 17.2836 6.29999C17.3541 6.29999 17.4083 6.29999 17.4448 6.29999C17.4631 6.29999 17.477 6.29999 17.4863 6.29999C17.4909 6.29999 17.4944 6.29999 17.4968 6.29999C17.498 6.29999 17.4988 6.29999 17.4994 6.29999C17.4997 6.29999 17.4999 6.29999 17.5001 6.29999C17.5002 6.29999 17.5003 6.29999 17.5003 5.49999C17.5003 4.69999 17.5002 4.69999 17.5001 4.69999C17.4999 4.69999 17.4997 4.69999 17.4994 4.69999C17.4988 4.69999 17.498 4.69999 17.4968 4.69999C17.4944 4.69999 17.4909 4.69999 17.4863 4.69999C17.477 4.69999 17.4631 4.69999 17.4448 4.69999C17.4083 4.69999 17.3541 4.69999 17.2836 4.69999C17.1426 4.7 16.9364 4.7 16.6756 4.7C16.1539 4.7 15.4135 4.7 14.5387 4.7C12.7893 4.7 10.5024 4.7 8.35279 4.7C6.2032 4.7 4.19091 4.7 2.9906 4.7C2.39044 4.7 1.99329 4.7 1.88347 4.7C1.86974 4.7 1.86051 4.7 1.85594 4.7C1.8548 4.7 1.85396 4.7 1.85342 4.7C1.85315 4.7 1.85298 4.7 1.85288 4.7C1.85284 4.7 2.65253 5.49941 1.85408 6.3C1.85314 6.3 1.85296 6.3 1.85632 6.3C1.86608 6.3 1.89511 6.3 1.94477 6.3C2.04406 6.3 2.22573 6.3 2.50031 6.29999L2.50031 4.69999ZM7.05028 5.49994V4.16661H5.45028V5.49994H7.05028ZM7.91695 3.29994H12.0836V1.69994H7.91695V3.29994ZM12.9503 4.16661V5.49994H14.5503V4.16661H12.9503ZM12.0836 3.29994C12.5623 3.29994 12.9503 3.68796 12.9503 4.16661H14.5503C14.5503 2.8043 13.4459 1.69994 12.0836 1.69994V3.29994ZM7.05028 4.16661C7.05028 3.68796 7.4383 3.29994 7.91695 3.29994V1.69994C6.55465 1.69994 5.45028 2.8043 5.45028 4.16661H7.05028ZM2.50031 6.29999C4.70481 6.29998 6.40335 6.29998 8.1253 6.29997C9.84725 6.29996 11.5458 6.29995 13.7503 6.29994L13.7503 4.69994C11.5458 4.69995 9.84724 4.69996 8.12529 4.69997C6.40335 4.69998 4.7048 4.69998 2.50031 4.69999L2.50031 6.29999ZM13.7503 6.29994L17.5003 6.29999L17.5003 4.69999L13.7503 4.69994L13.7503 6.29994ZM7.70029 9.24997V13.75H9.30029V9.24997H7.70029ZM10.7004 9.24997V13.75H12.3004V9.24997H10.7004Z"
                      fill="#F87171"
                    ></path>
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="flex justify-end">
      <button
        @click="submitForm"
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
    v-if="showApproverModal"
    class="fixed inset-0 p-4 flex flex-wrap justify-center items-center w-full h-full z-[1000] before:fixed before:inset-0 before:w-full before:h-full before:bg-[rgba(0,0,0,0.5)] overflow-auto font-[sans-serif]"
  >
    <div class="w-full max-w-4xl bg-white shadow-lg rounded-lg p-6 relative">
      <div class="flex gap-2">
        <input
          type="text"
          v-model="query.search"
          @keydown.enter.prevent="handleEnterKey"
          @keydown.down.prevent="moveDown"
          @keydown.up.prevent="moveUp"
          placeholder="Search Approvers..."
          class="w-full h-11 p-4 rounded border border-gray-600 focus:outline-none"
        />
        <button
          @click="getEmployees"
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
      <div
        class="max-h-60 overflow-y-auto border border-gray-300 rounded mt-2"
        ref="scrollContainer"
      >
        <div tabindex="0">
          <div
            v-for="(appr, index) in availableApprovers"
            :key="index"
            @click="selectApprover(appr)"
            class="px-4 py-2 hover:bg-gray-200 cursor-pointer"
            :class="{ 'bg-gray-200 font-bold': index === approverIndex }"
          >
            {{ appr.employeename2 }}
          </div>
          <div v-if="loading" class="p-2 text-gray-400 text-center">
            Loading users...
          </div>
          <div
            v-else-if="availableApprovers.length === 0"
            class="p-2 text-gray-400 text-center"
          >
            No users found.
          </div>
        </div>
      </div>
      <div class="mt-4 flex justify-end gap-2">
        <button
          @click="cancelButton"
          class="px-4 py-2 bg-red-500 text-white rounded-lg"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
  <div
    v-if="showProxyModal"
    class="fixed inset-0 p-4 flex justify-center items-center w-full h-full z-[1000] before:fixed before:inset-0 before:w-full before:h-full before:bg-[rgba(0,0,0,0.5)] overflow-auto"
  >
    <div class="w-full max-w-4xl bg-white shadow-lg rounded-lg p-6 relative">
      <h2 class="text-xl font-semibold mb-4">Select Proxy</h2>
      <div class="flex gap-2">
        <input
          type="text"
          v-model="query.search"
          @keydown.enter.prevent="handleProxyEnterKey"
          @keydown.down.prevent="moveProxyDown"
          @keydown.up.prevent="moveProxyUp"
          placeholder="Search Approver..."
          class="w-full h-11 p-4 rounded border border-gray-600 focus:outline-none"
        />
        <button
          @click="getEmployees"
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
      <div
        class="max-h-60 overflow-y-auto border border-gray-300 rounded mt-2"
        ref="proxyScrollContainer"
      >
        <div
          v-for="(appr, index) in availableApprovers"
          :key="appr.emplId"
          @click="setSelectedProxy(appr)"
          class="p-2 hover:bg-gray-200 cursor-pointer"
          :class="{ 'bg-gray-200 font-bold': index === proxyIndex }"
        >
          {{ appr.employeename2 }}
        </div>
        <div v-if="loading" class="p-2 text-gray-400 text-center">
          Loading users...
        </div>
        <div
          v-else-if="availableApprovers.length === 0"
          class="p-2 text-gray-400 text-center"
        >
          No users found.
        </div>
      </div>

      <h2 class="text-xl font-semibold mb-4">Select Proxy To</h2>

      <select
        v-model="selectedProxyTo"
        class="border rounded p-2 w-full"
        @change="setSelectedProxyTo(selectedProxyTo)"
      >
        <option
          v-for="proxyTo in form.approvers"
          :key="proxyTo.approverId"
          :value="proxyTo"
        >
          {{ proxyTo.approverName }}
        </option>
      </select>

      <div class="mt-4 flex justify-end gap-2">
        <button
          @click="cancelButton"
          class="px-4 py-2 bg-red-500 text-white rounded-lg"
        >
          Cancel
        </button>
        <button
          @click="submitProxySelection"
          class="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
        >
          Confirm
        </button>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { getToken } from "~/js/cryptoToken";
import {
  getEmployees,
  availableApprovers,
  query,
  lastSearched,
  approverIndex,
  proxyIndex,
  loading,
} from "~/js/fetchEmployees";
import { fetchCanAccess, nenunames } from "~/js/fetchMenu";
import { getDropdowns, dropdowns } from "~/js/fetchDrowdown";
import draggable from "vuedraggable";
import { API_BASE_URL } from "~/config";

const router = useRouter();
const { $swal } = useNuxtApp();
const errors = ref([]);
const scrollContainer = ref(null);
const proxyScrollContainer = ref(null);
const showApproverModal = ref(false);
const errorAnchor = ref(null);
const scrollAnchor = ref(null);
const showProxyModal = ref(false);
const selectedApproverIndex = ref(null);
const selectedProxyIndex = ref(null);
const selectedProxy = ref(null);
const selectedProxyTo = ref(null);
const immediateHeadAdded = ref(false);
const isSubmitting = ref(false);
const paramid = ref();
const form = ref({
  title: "",
  description: "",
  isinorder: false,
  templatefile: "",
  formObjects: [
    {
      label: "",
      objectType: "",
      isRequired: 0,
      datasourcescript: "",
      data: "",
      display: "",
      textfromsourcelabel: "",
      columnvalue: "",
      variable: "",
      formObjectLists: [{ values: [""] }],
    },
  ],
  approvers: [],
  proxies: [],
});

const handleFileChange = (event) => {
  const file = event.target.files[0];
  if (file) {
    if (!file.name.endsWith('.html')) {
      // alert('Only .html files are allowed.');
      $swal.fire({
      title: "Error",
      text: "Only html files are allowed",
      icon: "error",
      timer: 2000, // auto-close after 2 seconds
      showConfirmButton: false,
    });
      event.target.value = ''; // Clear the input
      form.value.templatefile = null;
      return;
    }
    form.value.templatefile = file;
  }
};
const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};
const removeFile = () => {
  form.value.templatefile = null
  // Reset file input
  if (process.client) {
    const fileInput = document.querySelector('input[type="file"]')
    if (fileInput) fileInput.value = ''
  }
}

const backButton = () => {
  router.push("/main/638802127387670470");
};

const validateForm = () => {
  console.log("Before Validation:", form.value);
  errors.value = {}; // Reset errors

  if (!form.value.title.trim()) {
    errors.value.title = "Title is required.";
  }

  if (!form.value.description.trim()) {
    errors.value.description = "Description is required.";
  }

  if (!form.value.templatefile) {
    errors.value.templatefile = "TemplateFile is required.";
  }

  form.value.formObjects.forEach((formObject, index) => {
    let hasError = false;
    errors.value[index] = {}; // Initialize error object

    if (!formObject.label || !formObject.label.trim()) {
      errors.value[index].label = "Label is required.";
      hasError = true;
    }

    if (!formObject.objectType || !formObject.objectType.trim()) {
      errors.value[index].objectType = "Object type is required.";
      hasError = true;
    }

    if (
      formObject.objectType != "LABEL" &&
      (!formObject.variable || !formObject.variable.trim())
    ) {
      errors.value[index].variable = "Variable is required.";
      hasError = true;
    }
    if (
      (formObject.objectType === "TEXTFROMSOURCE" ||
        formObject.objectType == "DYNAMICSIGNATORY") &&
      (!formObject.datasourcescript || !formObject.datasourcescript.trim())
    ) {
      errors.value[index].datasourcescript = "Datasourcescript is required.";
      hasError = true;
    }
    if (
      (formObject.objectType === "TEXTFROMSOURCE" ||
        formObject.objectType == "DYNAMICSIGNATORY") &&
      (!formObject.data || !formObject.data.trim())
    ) {
      errors.value[index].data = "Data is required.";
      hasError = true;
    }
    if (
      (formObject.objectType === "TEXTFROMSOURCE" ||
        formObject.objectType == "DYNAMICSIGNATORY") &&
      (!formObject.display || !formObject.display.trim())
    ) {
      errors.value[index].display = "Display is required.";
      hasError = true;
    }

    if (
      formObject.objectType === "LINKTOOBJECT" &&
      (!formObject.columnvalue || !formObject.columnvalue.trim())
    ) {
      errors.value[index].columnvalue = "Columnvalue is required.";
      hasError = true;
    }

    if (
      formObject.objectType === "LINKTOOBJECT" &&
      (!formObject.textfromsourcelabel ||
        !formObject.textfromsourcelabel.trim())
    ) {
      errors.value[index].textfromsourcelabel =
        "Textfromsource Label is required.";
      hasError = true;
    }

    if (
      ["LIST", "OPTION", "CHOICES"].includes(formObject.objectType) &&
      (!Array.isArray(formObject.formObjectLists) ||
        formObject.formObjectLists.length === 0 ||
        !Array.isArray(formObject.formObjectLists[0].values) ||
        formObject.formObjectLists[0].values.filter(
          (v) => v && v.toString().trim() !== ""
        ).length < 2)
    ) {
      errors.value[index].objectType = "At least two options are required.";
      hasError = true;
    }

    // Remove empty objects
    if (!hasError) {
      delete errors.value[index];
    }
  });
  watch(
    form,
    (newForm) => {
      // Clear general title error
      if (errors.value.title && newForm.title.trim()) {
        delete errors.value.title;
      }

      // Clear general description error
      if (errors.value.description && newForm.description.trim()) {
        delete errors.value.description;
      }

      if (errors.value.templatefile && newForm.templatefile.trim()) {
        delete errors.value.templatefile;
      }

      // Loop through formObjects
      newForm.formObjects.forEach((formObject, index) => {
        const fieldErrors = errors.value[index];
        if (!fieldErrors) return;

        // Clear label error
        if (fieldErrors.label && formObject.label?.trim()) {
          delete errors.value[index].label;
        }

        // Clear objectType error
        if (fieldErrors.objectType && formObject.objectType?.trim()) {
          delete errors.value[index].objectType;
        }

        // Clear datasourcescript, data, display
        if (
          formObject.objectType === "TEXTFROMSOURCE" &&
          fieldErrors.datasourcescript &&
          formObject.datasourcescript?.trim()
        ) {
          delete errors.value[index].datasourcescript;
        }
        if (
          formObject.objectType === "TEXTFROMSOURCE" &&
          fieldErrors.data &&
          formObject.data?.trim()
        ) {
          delete errors.value[index].data;
        }
        if (
          formObject.objectType === "TEXTFROMSOURCE" &&
          fieldErrors.display &&
          formObject.display?.trim()
        ) {
          delete errors.value[index].display;
        }

        if (
          formObject.objectType === "LINKTOOBJECT" &&
          fieldErrors.columnvalue &&
          formObject.columnvalue?.trim()
        ) {
          delete errors.value[index].columnvalue;
        }

        if (
          formObject.objectType === "LINKTOOBJECT" &&
          fieldErrors.textfromsourcelabel &&
          formObject.textfromsourcelabel?.trim()
        ) {
          delete errors.value[index].textfromsourcelabel;
        }

        // Clear objectType error for LIST/OPTION/CHOICES if at least two values exist
        if (
          ["LIST", "OPTION", "CHOICES"].includes(formObject.objectType) &&
          fieldErrors.objectType &&
          formObject.formObjectLists?.[0]?.values?.length >= 2
        ) {
          delete errors.value[index].objectType;
        }

        // If no errors left in that index, remove the object
        if (Object.keys(errors.value[index]).length === 0) {
          delete errors.value[index];
        }
      });
    },
    { deep: true }
  );

  console.log("After Validation:", JSON.stringify(errors.value, null, 2));
  console.log("Errors Length:", Object.keys(errors.value).length);

  return Object.keys(errors.value).length === 0;
};

const addFormObject = () => {
  form.value.formObjects.push({
    label: "",
    objectType: "",
    isRequired: 0,
    formObjectLists: [{ values: [""] }],
  });

  scrollAnchor.value?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
};

const addFormObjectListValue = (index) => {
  form.value.formObjects[index].formObjectLists[0].values.push("");
};

const removeFormObject = (index) => {
  form.value.formObjects.splice(index, 1);
  errors.value.splice(index, 1);
};

const addImmediateHead = () => {
  const existingImmediateHeadIndex = form.value.approvers.findIndex(
    (a) => a.type === "Immediate Head"
  );
  if (existingImmediateHeadIndex === -1) {
    form.value.approvers.unshift({
      type: "Immediate Head",
      approverName: "Immediate Head",
      approverEmail: "",
      approverContact: "",
      approverId: null,
      approverNumber: 1,
    });
  }
  updateSequences();
  immediateHeadAdded.value = true;
};

const selectApprover = (approver) => {
  if (selectedApproverIndex.value !== null) {
    form.value.approvers[selectedApproverIndex.value] = {
      type: "Additional Approver",
      approverId: approver.emplId,
      approverName: approver.employeename2,
      approverEmail: approver.emailaddress,
      approverContact: String((approver.mobileno || "").split("/")[0]),
    };
  } else {
    const exists = form.value.approvers.some((a) => {
      const aEmail = (a?.approverEmail || "").trim().toLowerCase();
      const bEmail = (approver?.emailaddress || "").trim().toLowerCase();

      console.log("Comparing:", aEmail, bEmail);
      return aEmail === bEmail;
    });
    if (exists) {
      $swal.fire({
        title: "Validation Error",
        text: "This approver has already been added.",
        icon: "warning",
        timer: 2000,
        showConfirmButton: false,
        focusConfirm: false,
      });
    } else {
      form.value.approvers.push({
        type: "Additional Approver",
        approverId: approver.emplId,
        approverName: approver.employeename2,
        approverEmail: approver.emailaddress,
        approverContact: String((approver?.mobileno || "").split("/")[0]),
      });
    }
  }

  updateSequences();
  showApproverModal.value = false;
  query.value.search = null;
  availableApprovers.value = "";
};

const addApprover = () => {
  selectedApproverIndex.value = null;
  showApproverModal.value = true;
};

const cancelButton = () => {
  showApproverModal.value = false;
  availableApprovers.value = "";
  selectedApproverIndex.value = null;
  selectedProxyIndex.value = null;
  selectedProxy.value = null;
  selectedProxyTo.value = null;
  showProxyModal.value = false;
  query.value.search = null;
};

const removeApprover = (index) => {
  const removedApprover = form.value.approvers[index];

  if (!removedApprover) return;

  // Remove linked proxies
  form.value.proxies = form.value.proxies.filter(
    (proxy) => proxy.existingapproveremail !== removedApprover.approverEmail
  );

  // Remove the approver
  form.value.approvers.splice(index, 1);

  // If the removed approver is "Immediate Head," reset flag
  if (removedApprover.approverName === "Immediate Head") {
    immediateHeadAdded.value = false;
  }

  // Update the sequences
  updateSequences();
};

const updateSequences = () => {
  let approverNumber = 1;

  // Check if "Immediate Head" exists
  const hasImmediateHead = form.value.approvers.some(
    (a) => a.type === "Immediate Head"
  );

  if (hasImmediateHead) {
    // If "Immediate Head" exists, shift all other numbers up by 1
    form.value.approvers.forEach((approver) => {
      if (approver.type === "Immediate Head") {
        approver.approverNumber = 1;
      } else {
        approver.approverNumber = ++approverNumber;
      }
    });
  } else {
    // If no Immediate Head, assign numbers sequentially
    form.value.approvers.forEach((approver) => {
      approver.approverNumber = approverNumber++;
    });
  }

  // Update proxy approver numbers
  form.value.proxies.forEach((proxy) => {
    const linkedApprover = form.value.approvers.find(
      (approver) => approver.approverEmail === proxy.existingapproveremail
    );

    if (linkedApprover) {
      proxy.approverNumber = linkedApprover.approverNumber;
    }
  });
};

const openProxyModal = (index) => {
  selectedProxyIndex.value = index;
  selectedProxy.value = form.value.proxies[index]; // Set selected proxy for editing
  showProxyModal.value = true;
};

const setSelectedProxy = (proxy) => {
  selectedProxy.value = proxy;
  query.value.search = proxy.employeename2;
  availableApprovers.value = "";
};

const setSelectedProxyTo = (proxyTo) => {
  console.log(proxyTo);
  selectedProxyTo.value = proxyTo;
};

const submitProxySelection = () => {
  if (!selectedProxy.value || !selectedProxyTo.value) {
    $swal.fire({
      title: "Validation Error",
      text: "Please select both a Proxy and a Proxy To before submitting.",
      icon: "warning",
      timer: 2000,
      showConfirmButton: false,
      focusConfirm: false,
    });
    return;
  }
  if (
    selectedProxyTo.value.approverEmail === selectedProxy.value.emailaddress
  ) {
    $swal.fire({
      title: "Validation Error",
      text: "Proxy and Proxy To cannot be the same person.",
      icon: "warning",
      timer: 2000,
      showConfirmButton: false,
      focusConfirm: false,
    });
    return;
  }
  const proxyData = {
    existingapprovername: selectedProxyTo.value.approverName,
    existingapproveremail: selectedProxyTo.value.approverEmail,
    approverName: selectedProxy.value.employeename2,
    approverEmail: selectedProxy.value.emailaddress,
    approverNumber: selectedProxyTo.value.approverNumber,
    approverId: selectedProxy.value.emplId,
    approverContact: String(
      (selectedProxy.value?.mobileno || "").split("/")[0]
    ),
  };

  const exists = form.value.proxies.some((a) => {
    const existingEmail_1 = (a?.existingapproveremail || "")
      .trim()
      .toLowerCase();
    const existingEmail_2 = (proxyData?.existingapproveremail || "")
      .trim()
      .toLowerCase();
    const email_2 = (a?.approverEmail || "").trim().toLowerCase();
    const email_1 = (proxyData?.approverEmail || "").trim().toLowerCase();

    return existingEmail_1 === existingEmail_2 && email_1 === email_2;
  });
  if (exists) {
    $swal.fire({
      title: "Validation Error",
      text: "This approver has already been added.",
      icon: "warning",
      timer: 2000,
      showConfirmButton: false,
      focusConfirm: false,
    });
  } else {
    if (selectedProxyIndex.value !== null) {
      form.value.proxies[selectedProxyIndex.value] = proxyData;
    } else {
      form.value.proxies.push(proxyData);
    }
  }
  selectedProxyIndex.value = null;
  selectedProxy.value = null;
  selectedProxyTo.value = null;
  showProxyModal.value = false;
  query.value.search = null;
};

const addProxy = () => {
  selectedProxyIndex.value = null;
  showProxyModal.value = true;
};

const removeProxy = (index) => {
  form.value.proxies.splice(index, 1);
};

const moveUp = () => {
  if (approverIndex.value > 0) approverIndex.value--;
};
const moveDown = () => {
  if (approverIndex.value < availableApprovers.value.length - 1)
    approverIndex.value++;
};

const handleEnterKey = async () => {
  const shouldRefetch = query.value.search !== lastSearched.value;

  if (availableApprovers.value.length === 0 || shouldRefetch) {
    await getEmployees(); // just fetch
    return; // stop here — don't select
  }

  // else: list is fresh and not changed → select current item
  const appr = availableApprovers.value[approverIndex.value];
  if (appr) {
    selectApprover(appr);
  }
};

watch(approverIndex, async (newIndex) => {
  await nextTick();
  const items = scrollContainer.value?.querySelectorAll(".cursor-pointer");
  if (items && items[newIndex]) {
    items[newIndex].scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
});

// Keyboard logic
const handleProxyEnterKey = async () => {
  const shouldRefetch = query.value.search !== lastSearched.value;
  if (availableApprovers.value.length === 0 || shouldRefetch) {
    await getEmployees();
    return;
  }

  const selected = availableApprovers.value[proxyIndex.value];
  if (selected) {
    setSelectedProxy(selected);
  }
};

const moveProxyUp = () => {
  if (proxyIndex.value > 0) proxyIndex.value--;
};

const moveProxyDown = () => {
  if (proxyIndex.value < availableApprovers.value.length - 1)
    proxyIndex.value++;
};

// Scroll into view on index change
watch(proxyIndex, async (newIndex) => {
  await nextTick();
  const items = proxyScrollContainer.value?.querySelectorAll(".cursor-pointer");
  if (items && items[newIndex]) {
    items[newIndex].scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
});

const textFromSourceLabels = computed(() => {
  return form.value.formObjects
    .filter((obj) => obj.objectType === "TEXTFROMSOURCE")
    .map((obj) => obj.label);
});

const submitForm = async () => {
  if (!validateForm()) {
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

  const formData = new FormData();

  // Append simple fields
  formData.append("title", form.value.title);
  formData.append("description", form.value.description);
  formData.append("isinorder", form.value.isinorder ? "1" : "0");

  // Append file if any
  if (form.value.templatefile) {
    formData.append("templatefile", form.value.templatefile);
  }

  // Append formObjects
  form.value.formObjects.forEach((obj, i) => {
    formData.append(`formObjects[${i}].label`, obj.label);
    formData.append(`formObjects[${i}].objectType`, obj.objectType);
    formData.append(`formObjects[${i}].isRequired`, obj.isRequired);
    formData.append(`formObjects[${i}].datasourcescript`, obj.datasourcescript);
    formData.append(`formObjects[${i}].data`, obj.data);
    formData.append(`formObjects[${i}].display`, obj.display);
    formData.append(`formObjects[${i}].variable`, obj.variable);
    formData.append(
      `formObjects[${i}].textfromsourcelabel`,
      obj.textfromsourcelabel
    );
    formData.append(`formObjects[${i}].columnvalue`, obj.columnvalue);

    obj.formObjectLists.forEach((listItem, j) => {
      listItem.values.forEach((val, k) => {
        formData.append(
          `formObjects[${i}].formObjectLists[${j}].values[${k}]`,
          val
        );
      });
    });
  });

  // Append approvers
  form.value.approvers.forEach((approver, i) => {
    formData.append(`approvers[${i}].id`, approver.id ?? "");
    formData.append(`approvers[${i}].approverId`, approver.approverId ?? "");
    formData.append(
      `approvers[${i}].approverName`,
      approver.approverName ?? ""
    );
    formData.append(
      `approvers[${i}].approverEmail`,
      approver.approverEmail ?? ""
    );
    formData.append(
      `approvers[${i}].approverContact`,
      approver.approverContact ?? ""
    );
    formData.append(
      `approvers[${i}].approverNumber`,
      approver.approverNumber.toString()
    );
  });

  // Append proxies
  form.value.proxies.forEach((proxy, i) => {
    formData.append(`proxies[${i}].id`, proxy.id ?? "");
    formData.append(`proxies[${i}].approverId`, proxy.approverId ?? "");
    formData.append(`proxies[${i}].approverName`, proxy.approverName ?? "");
    formData.append(`proxies[${i}].approverEmail`, proxy.approverEmail ?? "");
    formData.append(
      `proxies[${i}].approverContact`,
      proxy.approverContact ?? ""
    );
    formData.append(
      `proxies[${i}].approverNumber`,
      proxy.approverNumber.toString()
    );
  });

  const token = getToken();
  isSubmitting.value = true; // Start loading

  try {
    await $fetch(`${API_BASE_URL}/api/form`, {
      method: "POST",
      headers: {
        token: token,
      },
      body: formData,
    });

    await $swal.fire({
      title: "Success",
      text: "Form submitted successfully!",
      icon: "success",
      timer: 1000, // auto-close after 2 seconds
      showConfirmButton: false,
    });
    window.location.reload();
  } catch (error) {
    console.error("Error creating form:", error);

    await $swal.fire({
      title: "Error",
      text: "Failed to create form. Please try again.",
      icon: "error",
      timer: 1000, // auto-close after 2 seconds
      showConfirmButton: false,
    });
  } finally {
    isSubmitting.value = false; // Stop loading
  }
};

onMounted(async () => {
  await getEmployees();
  const hash = window.location.hash;
  const parts = hash.split("/");
  paramid.value = parts[parts.length - 2];
  await fetchCanAccess(paramid.value);
  nenunames.value.push("Create");
  await getDropdowns();
});

definePageMeta({
  middleware: "auth",
});
</script>

<style scoped>
.drag-ghost {
  background-color: #dbeafe !important; /* Tailwind's blue-100 */
  opacity: 0.8;
}

.drag-chosen {
  border: 2px dashed #3b82f6; /* Tailwind's blue-500 */
  background-color: #eff6ff; /* Optional: blue-50 */
}
</style>
