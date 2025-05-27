<template>
  <BreadCrumbs :nenunames="nenunames" />
  <div class="flex mb-5 me-4">
    <button
      v-if="canAdd"
      @click="goToCreateRequest"
      class="flex px-3 py-3 bg-green-500 text-white rounded-lg hover:bg-green-700 place-items-center gap-1"
    >
      <svg
        class="w-4 h-4 text-gray-800 dark:text-white"
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
          d="M5 12h14m-7 7V5"
        />
      </svg>
      Add Form
    </button>
  </div>
  <div class="flex flex-col md:flex-row justify-between">
    <div class="flex gap-2">
      <div class="relative text-gray-500 focus-within:text-gray-900 mb-4">
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
          v-if="query.Search"
          class="absolute inset-y-0 md:left-72 left-44 flex items-center"
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
          type="text"
          id="default-search"
          v-model="query.Search"
          @keydown.enter="getListOfForms"
          class="block w-52 md:w-80 h-11 pr-10 pl-10 py-2.5 text-base font-normal shadow-xs text-gray-900 bg-transparent border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none"
          placeholder="Search"
        />
      </div>
      <button
        @click="getListOfForms"
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
    <div>
      <div class="relative inline-block mr-4 mb-2">
        <select
          id="dropdown"
          class="px-5 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-10"
          v-model="query.Status"
          @change="getListOfForms"
          @focus="isStatusOpen = true"
          @blur="isStatusOpen = false"
          @click="open"
        >
          <option value="" selected hidden>Select Status</option>
          <option value="1">Active</option>
          <option value="0">Inactive</option>
        </select>
        <div
          v-if="query.Status"
          class="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700"
        >
          <svg
            @click="clearStatus"
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
        <div
          v-if="!query.Status"
          class="absolute inset-y-0 right-2 flex items-center text-gray-500"
        >
          <svg
            :class="{ 'rotate-180': isStatusOpen }"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="size-6 transition-transform duration-200"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M19.5 9l-7.5 7.5L4.5 9"
            />
          </svg>
        </div>
      </div>
    </div>
  </div>
  <div class="bg-white flex flex-col rounded">
    <div class="flex flex-col">
      <div class="overflow-x-auto pb-4">
        <div class="min-w-full inline-block align-middle">
          <div class="overflow-hidden border rounded-md border-gray-300">
            <table v-if="!loading" class="table-auto min-w-full rounded-xl">
              <thead>
                <tr class="bg-gray-50">
                  <th
                    scope="col"
                    class="p-5 text-left whitespace-nowrap text-sm leading-6 font-semibold text-gray-900 capitalize"
                  >
                    Id
                  </th>
                  <th
                    scope="col"
                    class="p-5 text-left whitespace-nowrap text-sm leading-6 font-semibold text-gray-900 capitalize"
                  >
                    Title
                  </th>
                  <th
                    scope="col"
                    class="p-5 text-left whitespace-nowrap text-sm leading-6 font-semibold text-gray-900 capitalize"
                  >
                    Description
                  </th>
                  <th
                    scope="col"
                    class="p-5 text-left whitespace-nowrap text-sm leading-6 font-semibold text-gray-900 capitalize min-w-[150px]"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    class="p-5 text-left whitespace-nowrap text-sm leading-6 font-semibold text-gray-900 capitalize"
                  >
                    Created By
                  </th>
                  <th
                    scope="col"
                    class="p-5 text-left whitespace-nowrap text-sm leading-6 font-semibold text-gray-900 capitalize"
                  >
                    Created Date
                  </th>

                  <th
                    scope="col"
                    class="p-5 text-left whitespace-nowrap text-sm leading-6 font-semibold text-gray-900 capitalize"
                  >
                    Actions
                  </th>
                  <th
                    scope="col"
                    class="p-5 text-left whitespace-nowrap text-sm leading-6 font-semibold text-gray-900 capitalize"
                  ></th>
                </tr>
              </thead>

              <tbody class="divide-y divide-gray-300">
                <tr
                  v-for="(form, index) in forms"
                  :key="index"
                  class="bg-white transition-all duration-500 hover:bg-gray-50"
                >
                  <td
                    class="p-5 whitespace-nowrap text-sm leading-6 font-medium text-gray-900"
                  >
                    {{ form.id }}
                  </td>
                  <td
                    class="p-5 whitespace-nowrap text-sm leading-6 font-medium text-gray-900"
                  >
                    {{ form.title }}
                  </td>
                  <td
                    class="p-5 text-sm leading-6 font-medium text-gray-900 break"
                    :title="form.description"
                  >
                    <div class="flex flex-col 2xl:flex-row gap-2">
                      <div>
                        {{
                          expandedIndex === index
                            ? form.description
                            : form.description.length > 30
                            ? form.description.slice(0, 30) + "..."
                            : form.description
                        }}
                      </div>
                      <div v-if="form.description.length > 30">
                        <button
                          @click="
                            expandedIndex =
                              expandedIndex === index ? null : index
                          "
                          class="mt-1 text-blue-500 hover:underline text-xs"
                        >
                          {{
                            expandedIndex === index ? "See less" : "See more"
                          }}
                        </button>
                      </div>
                    </div>
                  </td>
                  <td
                    class="p-5 items-center whitespace-nowrap text-sm leading-6 font-medium text-gray-900"
                  >
                    <div
                      v-if="form.status == '1'"
                      class="py-1.5 px-2.5 bg-green-50 rounded-full flex items-center justify-center w-20 gap-1"
                    >
                      <svg
                        width="5"
                        height="6"
                        viewBox="0 0 5 6"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle cx="2.5" cy="3" r="2.5" fill="#16A34A"></circle>
                      </svg>
                      <span class="font-medium text-xs text-green-600"
                        >Active</span
                      >
                    </div>

                    <div
                      v-if="form.status == '0'"
                      class="py-1.5 px-2.5 bg-red-50 rounded-full flex items-center justify-center w-20 gap-1"
                    >
                      <svg
                        width="5"
                        height="6"
                        viewBox="0 0 5 6"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle cx="2.5" cy="3" r="2.5" fill="#DC2626"></circle>
                      </svg>
                      <span class="font-medium text-xs text-red-600"
                        >Inactive</span
                      >
                    </div>
                  </td>
                  <td
                    class="p-5 whitespace-nowrap text-sm leading-6 font-medium text-gray-900"
                  >
                    {{ form.user }}
                  </td>

                  <td
                    class="p-5 whitespace-nowrap text-sm leading-6 font-medium text-gray-900"
                  >
                    {{
                      new Date(form.createddate).toLocaleString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "numeric",
                        minute: "numeric",
                        hour12: true, // optional, for 12-hour format with AM/PM
                      })
                    }}
                  </td>
                  <td class="flex p-5 items-center gap-0.5">
                    <button
                      v-if="canEdit"
                      @click="editForm(form.id)"
                      class="p-2 rounded-full bg-white group transition-all duration-500 hover:bg-yellow-600 flex item-center"
                    >
                      <svg
                        class="w-6 h-6 text-yellow-400"
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke="currentColor"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="m14.304 4.844 2.852 2.852M7 7H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-4.5m2.409-9.91a2.017 2.017 0 0 1 0 2.853l-6.844 6.844L8 14l.713-3.565 6.844-6.844a2.015 2.015 0 0 1 2.852 0Z"
                        />
                      </svg>
                    </button>
                    <button
                      v-if="canDelete"
                      @click="softDeleted(form.id)"
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
            <div v-if="loading">
              <LoadingModal />
            </div>
            <div v-if="loading" class="animate-pulse space-y-2">
              <div class="flex bg-gray-300 rounded h-10 mb-2"></div>
              <div class="space-y-2">
                <div v-for="i in 5" :key="i" class="flex space-x-2">
                  <div class="h-8 bg-gray-300 rounded w-1/4"></div>
                  <div class="h-8 bg-gray-300 rounded w-1/4"></div>
                  <div class="h-8 bg-gray-300 rounded w-1/4"></div>
                  <div class="h-8 bg-gray-300 rounded w-1/4"></div>
                  <div class="h-8 bg-gray-300 rounded w-1/4"></div>
                  <div class="h-8 bg-gray-300 rounded w-1/4"></div>
                </div>
              </div>
            </div>

            <div
              v-if="forms.length === 0 && !loading"
              class="p-5 text-center text-gray-500"
            >
              No Forms
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-left mt-10 space-x-2">
        <span>
          Showing {{ totalEntries === 0 ? 0 : query.PageNumber }} out of
          {{ totalPages }} Pages ({{ totalEntries }} Entries)
        </span>
      </div>

      <div class="flex justify-center mt-10 space-x-2 mb-2">
        <a
          @click="changePage(query.PageNumber - 1)"
          :class="{
            'cursor-not-allowed opacity-50': query.PageNumber === 1,
          }"
          class="cursor-pointer px-2 py-1 sm:px-4 sm:py-2 mt-2 text-gray-600 border rounded-lg hover:bg-gray-100 focus:outline-none"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="1.5em"
            height="1.5em"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="m14 18l-6-6l6-6l1.4 1.4l-4.6 4.6l4.6 4.6z"
            />
          </svg>
        </a>

        <template v-for="page in generatePagination()" :key="page">
          <span
            v-if="typeof page === 'string'"
            class="px-2 py-1 sm:px-4 sm:py-2 ml-1 mt-2 text-gray-400 border rounded-lg cursor-default"
          >
            {{ page }}
          </span>
          <a
            v-else
            @click="changePage(page)"
            :class="{
              'ring ring-primary bg-primary/20': query.PageNumber === page,
            }"
            class="cursor-pointer px-2 py-1 sm:px-4 sm:py-2 ml-1 mt-2 text-gray-600 border rounded-lg hover:bg-gray-100 focus:outline-none"
          >
            {{ page }}
          </a>
        </template>

        <a
          @click="changePage(query.PageNumber + 1)"
          :class="{
            'cursor-not-allowed opacity-50': query.PageNumber === totalPages,
          }"
          class="cursor-pointer px-2 py-1 sm:px-4 sm:py-2 mt-2 text-gray-600 border rounded-lg hover:bg-gray-100 focus:outline-none"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="1.5em"
            height="1.5em"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="M12.6 12L8 7.4L9.4 6l6 6l-6 6L8 16.6z"
            />
          </svg>
        </a>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  getListOfForms,
  generatePagination,
  changePage,
  totalEntries,
  totalPages,
  query,
  loading,
  forms,
  softDeleteForm,
} from "~/js/fetchForm";
import LoadingModal from "~/components/modal/LoadingModal.vue";
import {
  fetchCanAccess,
  nenunames,
  canAdd,
  canDelete,
  canEdit,
} from "~/js/fetchMenu";
import { encryptData } from "~/js/cryptoToken";
const expandedIndex = ref(null);

const paramid = ref();
const { $swal } = useNuxtApp();
const router = useRouter();
const isStatusOpen = ref(false);

function clearSearch() {
  query.value.Search = "";
  getListOfForms();
}

function clearStatus() {
  query.value.Status = "";
  getListOfForms();
}

const editForm = async (id) => {
  localStorage.setItem("formId", encryptData(id));
  router.push("/main/638802127387670470/editForm");
};

const softDeleted = async (id) => {
  const confirm = await $swal.fire({
    title: "Are you sure?",
    text: "Do you really want to delete this form?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, delete it!",
    cancelButtonText: "No, cancel",
  });
  if (confirm.isConfirmed) {
    await softDeleteForm(id);
    $swal.fire({
      title: "Deleted!",
      text: "The form has been deleted.",
      icon: "success",
      timer: 1000, // auto-close after 2 seconds
      showConfirmButton: false,
    });
  }
};

const goToCreateRequest = async () => {
  router.push("/main/638802127387670470/createForm");
};

definePageMeta({
  middleware: ["auth", "check-menu-access"], // Use an array for multiple middlewares
  name: "638802127387670470",
});

onMounted(() => {
  getListOfForms();
  const hash = window.location.hash;
  const parts = hash.split("/");
  paramid.value = parts[parts.length - 1];
  fetchCanAccess(paramid.value);
});
</script>

<style></style>
