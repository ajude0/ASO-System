<template>
  <div class="flex mb-5 me-4">
    <button
      @click="goToCreateRequest"
      class="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
    >
      ADD
    </button>
  </div>
  <div class="flex flex-col md:flex-row justify-between">
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
        class="absolute inset-y-0 left-72 flex items-center"
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
         @keydown.enter="getMyTransactions"
        class="block w-80 h-11 pr-10 pl-10 py-2.5 text-base font-normal shadow-xs text-gray-900 bg-transparent border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none"
        placeholder="Search"
      />
    </div>
    <div>
      <div class="relative inline-block mr-4 mb-2">
        <select
          id="dropdown"
          class="px-5 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-10"
          v-model="query.Status"
          @change="getMyTransactions"
          @focus="isApprovedOpen = true"
          @blur="isApprovedOpen = false"
          @click="open"
        >
          <option value="" selected hidden>Select Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Disapproved</option>
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
            :class="{ 'rotate-180': isApprovedOpen }"
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
  <div class="bg-white h-full flex flex-col rounded">
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
                   ID
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
                    Status
                  </th>
                  <th
                    scope="col"
                    class="p-5 text-left whitespace-nowrap text-sm leading-6 font-semibold text-gray-900 capitalize"
                  >
                    Current Approver
                  </th>
                
                  <th
                    scope="col"
                    class="p-5 text-left whitespace-nowrap text-sm leading-6 font-semibold text-gray-900 capitalize"
                  >
                    Approver Progress
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
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-300">
                <tr
                  v-for="(transaction, index) in myTransactions"
                  :key="index"
                  class="bg-white transition-all duration-500 hover:bg-gray-50"
                >
                <td
                    class="p-5 whitespace-nowrap text-sm leading-6 font-medium text-gray-900"
                  >
                    {{ transaction.id }}
                  </td>
                  <td
                    class="p-5 whitespace-nowrap text-sm leading-6 font-medium text-gray-900"
                  >
                    {{ transaction.title }}
                  </td>
                 
                  <td
                    class="p-5 whitespace-nowrap text-sm leading-6 font-medium text-gray-900"
                  >
                    <div
                      v-if="transaction.status == 'approved'"
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
                        >Approved</span
                      >
                    </div>
                    <div
                      v-if="transaction.status == 'pending'"
                      class="py-1.5 px-2.5 bg-amber-50 rounded-full flex items-center justify-center w-20 gap-1"
                    >
                      <svg
                        width="5"
                        height="6"
                        viewBox="0 0 5 6"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle cx="2.5" cy="3" r="2.5" fill="#D97706"></circle>
                      </svg>
                      <span class="font-medium text-xs text-amber-600"
                        >Pending</span
                      >
                    </div>
                    <div
                      v-if="transaction.status == 'rejected'"
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
                        >Disapproved</span
                      >
                    </div>
                  </td>
                  <td
                    class="p-5 whitespace-nowrap text-sm leading-6 font-medium text-gray-900"
                  >
                    <div
                      v-if="
                        transaction.currentApprovers &&
                        transaction.currentApprovers.length
                      "
                    >
                      <div
                        v-for="(
                          approver, index
                        ) in transaction.currentApprovers"
                        :key="index"
                        class="flex items-center gap-2 mb-2"
                      >
                        <span
                          :class="
                            approver.mainapprover === 1
                              ? 'bg-green-50 text-green-600'
                              : 'bg-amber-50 text-amber-600'
                          "
                          class="px-2 py-0.5 rounded-full text-xs font-semibold"
                        >
                          {{ approver.mainapprover === 1 ? "Main" : "Proxy" }}
                        </span>
                        <span> - </span>
                        <span class="text-gray-700">
                          {{ approver.approvername }}
                        </span>
                      </div>
                    </div>

                    <!-- Message when there are no approvers -->
                    <div v-else class="text-sm">
                      No current approvers available.
                    </div>
                  </td>
                  
                  <td
                    class="p-5 whitespace-nowrap text-sm leading-6 font-medium text-gray-900"
                  >
                    <span
                      v-if="transaction.currentStatus == 'Disapproved'"
                      class="text-red-600"
                      >{{ transaction.approverProgress }}</span
                    >
                    <span
                      v-else-if="transaction.currentStatus == 'Pending'"
                      class="font-bold"
                      >{{ transaction.approverProgress }}</span
                    >
                    <span v-else class="text-emerald-600">COMPLETED</span>
                  </td>
                  <td
                    class="p-5 whitespace-nowrap text-sm leading-6 font-medium text-gray-900"
                  >
                    <div class="flex items-center gap-3">
                      <div class="data">
                        <p class="font-normal text-sm text-gray-900">
                          {{
                            new Date(transaction.createdAt).toLocaleString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "numeric",
                                minute: "numeric",
                                hour12: true, // optional, for 12-hour format with AM/PM
                              }
                            )
                          }}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td class="flex items-center gap-0.5">
                    <button
                      @click="viewTransaction(transaction.id)"
                      class="p-2 rounded-full bg-white group transition-all duration-500 hover:bg-green-600 flex item-center"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        width="20"
                        height="20"
                      >
                        <path
                          class="fill-green-600 group-hover:fill-white"
                          d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
                        />
                        <path
                          class="fill-green-600 group-hover:fill-white"
                          fill-rule="evenodd"
                          d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 0 1 0-1.113ZM17.25 12a5.25 5.25 0 1 1-10.5 0 5.25 5.25 0 0 1 10.5 0Z"
                          clip-rule="evenodd"
                        />
                      </svg>
                    </button>
                    <button
                      v-if="!transaction.isSomeoneApprovedOrDisapproved && canEdit"
                      @click="editTransaction(transaction.id)"
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
                      @click="softDelete(transaction.id)"
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
                  <div class="h-8 bg-gray-300 rounded w-1/6"></div>
                  <div class="h-8 bg-gray-300 rounded w-1/4"></div>
                  <div class="h-8 bg-gray-300 rounded w-1/6"></div>
                  <div class="h-8 bg-gray-300 rounded w-1/4"></div>
                  <div class="h-8 bg-gray-300 rounded w-1/6"></div>
                </div>
              </div>
            </div>
            <div
              v-if="myTransactions.length === 0 && !loading"
              class="p-5 text-center text-gray-500"
            >
              No Transactions
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
          <a
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
  <div
    v-if="showModal"
    @click.self="closeModal"
    class="fixed inset-0 p-4 flex flex-wrap justify-center items-center w-full h-full z-[1000] before:fixed before:inset-0 before:w-full before:h-full before:bg-[rgba(0,0,0,0.5)] overflow-auto font-[sans-serif]"
  >
    <div
      class="w-full max-w-7xl bg-white shadow-lg rounded-lg p-6 max-h-[90vh] relative"
    >
      <div class="flex items-center pb-3 border-b border-gray-300">
        <h3 class="text-gray-800 text-xl font-bold flex-1">Transaction</h3>
        <svg
          @click="showModal = false"
          xmlns="http://www.w3.org/2000/svg"
          class="w-3 ml-2 cursor-pointer shrink-0 fill-gray-400 hover:fill-red-500"
          viewBox="0 0 320.591 320.591"
        >
          <path
            d="M30.391 318.583a30.37 30.37 0 0 1-21.56-7.288c-11.774-11.844-11.774-30.973 0-42.817L266.643 10.665c12.246-11.459 31.462-10.822 42.921 1.424 10.362 11.074 10.966 28.095 1.414 39.875L51.647 311.295a30.366 30.366 0 0 1-21.256 7.288z"
            data-original="#000000"
          ></path>
          <path
            d="M287.9 318.583a30.37 30.37 0 0 1-21.257-8.806L8.83 51.963C-2.078 39.225-.595 20.055 12.143 9.146c11.369-9.736 28.136-9.736 39.504 0l259.331 257.813c12.243 11.462 12.876 30.679 1.414 42.922-.456.487-.927.958-1.414 1.414a30.368 30.368 0 0 1-23.078 7.288z"
            data-original="#000000"
          ></path>
        </svg>
      </div>
      <div class="overflow-auto max-h-[60vh]">
        <div v-if="isTxLoading" @click.self="closeModal">
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
          <LoadingModal @click.self="closeModal" />
        </div>
        <div v-else>
          <h1 class="text-2xl font-bold text-gray-800 mb-6 border-b pb-2 pt-10">
            {{ transactions.formTitle }}
          </h1>

          <div
            v-for="(item, index) in transactions?.formObjects"
            :key="index"
            class="mb-6"
          >
            <div
              v-if="item.objectType !== 'LABEL'"
              class="flex justify-between"
            >
              <label class="text-gray-700 font-semibold mb-2">
                {{ item.label }}
              </label>
            </div>
            <div v-if="item.objectType === 'LABEL'">
              <hr class="my-4 border-gray-400" />
              <h3 class="text-lg font-bold text-gray-800 mb-1">
                {{ item.label }}
              </h3>
            </div>
            <div v-else class="border p-3 rounded-md w-full text-gray-800">
              <span v-for="(value, index) in item.values" :key="index">
                {{ value
                }}<span v-if="index !== item.values.length - 1"> , </span>
              </span>
            </div>
          </div>
          <div
            v-for="(approverGroup, approverNumber) in transactions.approvers"
            :key="approverNumber"
            class="mt-2 p-4 bg-gray-50 rounded-lg"
          >
            <div
              v-if="
                getGroupVisibilityStatus(
                  transactions.approvers,
                  approverNumber
                ) !== 'hidden'
              "
            >
              <h2 class="text-md font-semibold text-gray-800 mb-2">
                Approver {{ approverNumber }} -
                <span
                  :class="{
                    'text-green-600':
                      getApprovalStatus(approverGroup) === 'approved',
                    'text-red-600':
                      getApprovalStatus(approverGroup) === 'rejected',
                    'text-yellow-600':
                      getApprovalStatus(approverGroup) !== 'approved' &&
                      getApprovalStatus(approverGroup) !== 'rejected' &&
                      getGroupVisibilityStatus(
                        transactions.approvers,
                        approverNumber
                      ) === 'pending',
                    'text-gray-500':
                      getApprovalStatus(approverGroup) !== 'approved' &&
                      getApprovalStatus(approverGroup) !== 'rejected' &&
                      getGroupVisibilityStatus(
                        transactions.approvers,
                        approverNumber
                      ) === 'waiting',
                  }"
                >
                  {{
                    getApprovalStatus(approverGroup) === "approved"
                      ? "Approved"
                      : getApprovalStatus(approverGroup) === "rejected"
                      ? "Rejected"
                      : getGroupVisibilityStatus(
                          transactions.approvers,
                          approverNumber
                        ) === "pending"
                      ? "Pending"
                      : "Waiting"
                  }}
                </span>
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
                  <div
                    v-if="approver.remarks"
                    class="flex text-gray-700 text-md mr-4 items-center"
                  >
                    <div class="text-md font-bold">Remarks:</div>
                    <div
                      class="text-md font-bold ml-1"
                      
                    >
                      {{ approver.remarks }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="border-t border-gray-300 pt-6 flex justify-end gap-4">
        <button
          type="button"
          @click="showModal = false"
          class="px-4 py-2 rounded-lg text-gray-800 text-sm border-none outline-none tracking-wide bg-gray-200 hover:bg-gray-300 active:bg-gray-200"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  getMyTransactions,
  getTransaction,
  transactions,
  myTransactions,
  loading,
  generatePagination,
  changePage,
  totalPages,
  totalEntries,
  query,
  isTxLoading,
  softDeleteTransaction,
} from "~/js/fetchTransactions";
import LoadingModal from "./modal/LoadingModal.vue";
import { encryptData } from "~/js/cryptoToken";
import { canEdit } from "~/js/fetchMenu";

const showModal = ref(false);
const isApprovedOpen = ref(false);
const { $swal } = useNuxtApp();
const router = useRouter();

function goToCreateRequest() {
  router.push("/main/638799853882007798/addRequest");
}

const editTransaction = async (id) => {
  localStorage.setItem("transactionId", encryptData(id));
  router.push("/main/638799853882007798/editRequest");
};

function closeModal() {
  showModal.value = false;
}

function clearSearch() {
  query.value.Search = "";
  getMyTransactions();
}

function clearStatus() {
  query.value.Status = "";
  getMyTransactions();
}

const viewTransaction = async (transactionId) => {
  showModal.value = true;
  getTransaction(transactionId);
};

const softDelete = async (id) => {
  const confirm = await $swal.fire({
    title: "Are you sure?",
    text: "Do you really want to delete this request?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, delete it!",
    cancelButtonText: "No, cancel",
  });
  if (confirm.isConfirmed) {
    await softDeleteTransaction(id);
    $swal.fire({
      title: "Deleted!",
      text: "The request has been deleted.",
      icon: "success",
      timer: 1000, // auto-close after 2 seconds
      showConfirmButton: false,
    });
  }
};

const getApprovalStatus = (approverGroup) => {
  if (!Array.isArray(approverGroup)) return "pending"; // fallback

  const hasRejected = approverGroup.some((a) => a.response === 2);
  const hasApproved = approverGroup.some((a) => a.response === 1);
  const allPending = approverGroup.every(
    (a) => a.response === 0 || a.response == null
  );

  if (hasRejected) return "rejected";
  if (hasApproved) return "approved";
  if (allPending) return "pending";

  return "pending"; // fallback
};
const wasPreviousGroupRejected = (allGroups, currentIndex) => {
  const keys = Object.keys(allGroups)
    .map(Number)
    .sort((a, b) => a - b);
  for (let i = 0; i < keys.length; i++) {
    if (keys[i] >= currentIndex) break;
    if (getApprovalStatus(allGroups[keys[i]]) === "rejected") {
      return true;
    }
  }
  return false;
};

const areAllPreviousGroupsApproved = (allGroups, currentIndex) => {
  const keys = Object.keys(allGroups)
    .map(Number)
    .sort((a, b) => a - b);
  for (let i = 0; i < keys.length; i++) {
    if (keys[i] >= currentIndex) break;
    if (getApprovalStatus(allGroups[keys[i]]) !== "approved") {
      return false;
    }
  }
  return true;
};

const getGroupVisibilityStatus = (allGroups, currentIndex) => {
  if (wasPreviousGroupRejected(allGroups, currentIndex)) {
    return "hidden";
  }
  if (
    Number(currentIndex) === Math.min(...Object.keys(allGroups).map(Number))
  ) {
    return "pending";
  }
  if (areAllPreviousGroupsApproved(allGroups, currentIndex)) {
    return "pending";
  }
  return "waiting";
};

const props = defineProps({
  canDelete: Boolean,
  canEdit:Boolean
});
onMounted(() => {
  getMyTransactions();
});
</script>

<style></style>
