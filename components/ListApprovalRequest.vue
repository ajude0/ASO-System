<template>
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
          @keydown.enter="getListOfTransactions"
          class="block w-52 md:w-80 h-11 pr-10 pl-10 py-2.5 text-base font-normal shadow-xs text-gray-900 bg-transparent border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none"
          placeholder="Search"
        />
      </div>
      <button
        @click="getListOfTransactions"
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
          @change="getListOfTransactions"
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
                    class="p-5 text-left whitespace-nowrap text-sm leading-6 font-semibold text-gray-900 capitalize min-w-[150px]"
                  >
                    ID
                  </th>

                  <th
                    scope="col"
                    class="p-5 text-left whitespace-nowrap text-sm leading-6 font-semibold text-gray-900 capitalize min-w-[150px]"
                  >
                    Form
                  </th>
                  <th
                    scope="col"
                    class="p-5 text-left whitespace-nowrap text-sm leading-6 font-semibold text-gray-900 capitalize"
                  >
                    Approver Type
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
                    Approved By
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
                
                </tr>
              </thead>

              <tbody class="divide-y divide-gray-300">
                <tr
                  v-for="(transaction, index) in listOfTransactions"
                  :key="index"
                  class="bg-white transition-all duration-500 hover:bg-gray-50"
                >
                  <td
                    class="p-5 whitespace-nowrap text-sm leading-6 font-medium text-gray-900"
                  >
                    {{ transaction.transactionid }}
                  </td>
                  <td
                    class="p-5 whitespace-nowrap text-sm leading-6 font-medium text-gray-900"
                  >
                    {{ transaction.formTitle }}
                  </td>
                  <td
                    class="p-5 whitespace-nowrap text-sm leading-6 font-medium text-gray-900"
                  >
                    <div
                      v-if="transaction.mainapprover == '1'"
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
                        >Main</span
                      >
                    </div>
                    <div
                      v-if="transaction.mainapprover == '0'"
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
                        >Proxy</span
                      >
                    </div>
                    <div
                      v-if="transaction.mainapprover == '3'"
                      class="py-1.5 px-2.5 bg-blue-50 rounded-full flex items-center justify-center w-20 gap-1"
                    >
                      <svg
                        width="5"
                        height="6"
                        viewBox="0 0 5 6"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle cx="2.5" cy="3" r="2.5" fill="#2563EB"></circle>
                      </svg>
                      <span class="font-medium text-xs text-blue-600"
                        >Signatory</span
                      >
                    </div>
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
                      v-else-if="transaction.status == 'rejected'"
                      class="py-1.5 px-2.5 bg-red-50 rounded-full flex items-center justify-center w-28 gap-1"
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
                        >Disaproved</span
                      >
                    </div>
                    <div
                      v-else
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
                  </td>
                  <td
                    class="p-5 whitespace-nowrap text-sm leading-6 font-medium text-gray-900"
                  >
                    <!-- 1) The approver list, if any -->
                    <div
                      v-if="
                        transaction.listofapproved?.length &&
                        transaction.status != 'rejected'
                      "
                      class="space-y-2"
                    >
                      <ul class="space-y-2">
                        <li
                          v-for="(approver, index) in displayedApprovers(
                            transaction
                          )"
                          :key="index"
                          class="flex items-start space-x-2"
                        >
                          <div class="flex-shrink-0">
                            <svg
                              class="w-5 h-5 text-green-500 mt-1"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                              viewBox="0 0 24 24"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                          <div>
                            <p
                              class="font-semibold text-gray-800 flex items-center space-x-1"
                            >
                              <span
                                class="text-gray-600 text-md font-bold flex items-center justify-center"
                              >
                                {{ approver.approverNumber }} -
                              </span>
                              <span>{{ approver.approvername }}</span>
                            </p>
                            <p class="text-xs text-gray-600">
                              {{
                                new Date(approver.responsedate).toLocaleString(
                                  "en-US",
                                  {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    hour: "numeric",
                                    minute: "numeric",
                                    hour12: true,
                                  }
                                )
                              }}
                            </p>
                          </div>
                        </li>
                      </ul>

                      <!-- See more / See less button -->
                      <div v-if="transaction.listofapproved?.length > 1">
                        <button
                          class="text-blue-600 text-sm font-medium hover:underline"
                          @click="toggleApprovers(transaction.id)"
                        >
                          {{
                            showAllApprovers[transaction.id]
                              ? "See less"
                              : "See more"
                          }}
                        </button>
                      </div>
                      <div
                        class="font-semibold h-5 rounded-xl bg-green-600 text-white p-2 flex items-center justify-center"
                      >
                        {{ transaction.totalApproved }} /
                        {{ transaction.totalApprovers }} - Approved
                      </div>
                    </div>

                    <!-- 2) Always show “rejected” if status is rejected -->
                    <div
                      v-if="transaction.status === 'rejected'"
                      class="mt-3 p-3 b text-red-700 rounded-lg text-sm flex items-center space-x-2"
                    >
                      <span
                        >This transaction has been
                        <strong>disapproved</strong>.</span
                      >
                    </div>

                    <!-- 3) If there are no approvers AND it isn’t rejected -->
                    <div
                      v-if="
                        !transaction.listofapproved?.length &&
                        transaction.status !== 'rejected'
                      "
                      class="text-sm text-gray-400 italic mt-2"
                    >
                      No one has approved yet
                    </div>
                  </td>
                  <td
                    class="p-5 whitespace-nowrap text-sm leading-6 font-medium text-gray-900"
                  >
                    {{ transaction.requesterName }}
                  </td>
                  <td
                    class="p-5 whitespace-nowrap text-sm leading-6 font-medium text-gray-900"
                  >
                    <div class="flex items-center gap-3">
                      <div class="data">
                        <p class="font-normal text-sm text-gray-900">
                          {{
                            new Date(transaction.createddate).toLocaleString(
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
                  <td class="flex p-5 items-center gap-0.5">
                    <button
                      @click="
                        viewTransaction(
                          transaction.transactionid,
                          transaction.id,
                          transaction.status
                        )
                      "
                      class="p-2 rounded-full bg-white group transition-all duration-500 hover:bg-green-600 flex item-center"
                      title="View Transaction"
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
              v-if="listOfTransactions.length === 0 && !loading"
              class="p-5 text-center text-gray-500"
            >
              No Approval Requests
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-left mt-10 space-x-2 items-center">
        <span>Showing</span>
        <input
          v-model.number="pageNumberDisplay"
          @keyup.enter="handlePageInput"
          type="number"
          :min="totalPages === 0 ? 0 : 1"
          :max="totalPages"
          class="w-16 px-2 py-1 border border-gray-300 rounded text-center"
        />

        <span>
          out of {{ totalPages }} {{ totalPages <= 1 ? "Page" : "Pages" }} ({{
            totalEntries
          }}
          {{ totalEntries <= 1 ? "Entry" : "Entries" }})
        </span>
        <button
          @click="handlePageInput"
          class="py-1 px-4 bg-blue-500 rounded-md text-white hover:bg-blue-700"
        >
          GO
        </button>
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
    class="fixed inset-0 p-4 flex flex-wrap justify-center items-center w-full h-full z-[1000] before:fixed before:inset-0 before:w-full before:h-full before:bg-[rgba(0,0,0,0.5)] overflow-auto font-[sans-serif]"
  >
    <div
      class="w-full max-w-7xl bg-white shadow-lg rounded-lg p-6 relative max-h-[90vh]"
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
        <div v-if="isTxLoading">
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
            <div
              v-else-if="item.objectType != 'DYNAMICSIGNATORY'"
              class="border p-3 rounded-md w-full text-gray-800"
            >
              <span v-for="(value, index) in item.values" :key="index">
                {{ value
                }}<span v-if="index !== item.values.length - 1"> , </span>
              </span>
            </div>
            <div v-else-if="item.objectType === 'DYNAMICSIGNATORY'">
              <div
                v-for="(group, groupIndex) in item?.dynamicsignatoriesvalues"
                :key="groupIndex"
              >
                <div
                  v-for="(dynamic, index) in group.value"
                  :key="index"
                  class="mb-6"
                >
                  <div
                    class="flex items-center justify-between p-4 border rounded-lg bg-gray-50 shadow-sm mb-4"
                  >
                    <!-- Left: Name / Value -->
                    <div
                      class="text-gray-800 font-medium flex items-center gap-2"
                    >
                      {{ dynamic.value }}
                      <span
                        v-if="dynamic.currentuser"
                        class="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full"
                      >
                        YOU
                      </span>
                    </div>

                    <!-- Right: Status / Button -->
                    <div>
                      <!-- If current user and response is 0, show approve button -->
                      <button
                        v-if="dynamic.currentuser && dynamic.response === 0"
                        class="py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-800"
                        @click="postSigned()"
                      >
                        SIGN
                      </button>

                      <!-- If current user and response is 1, show approved text -->
                      <span
                        v-else-if="
                          dynamic.currentuser && dynamic.response === 1
                        "
                        class="inline-block px-3 py-1 text-sm font-semibold text-green-700 bg-green-100 rounded-full"
                      >
                        SIGNED -
                        {{
                          new Date(dynamic.responsedate).toLocaleString(
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
                      </span>

                      <!-- Other statuses for non-current users -->
                      <span
                        v-else-if="dynamic.response === 1"
                        class="inline-block px-3 py-1 text-sm font-semibold text-green-700 bg-green-100 rounded-full"
                      >
                        SIGNED -
                        {{
                          new Date(dynamic.responsedate).toLocaleString(
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
                      </span>
                      <span
                        v-else-if="dynamic.response === 0"
                        class="inline-block px-3 py-1 text-sm font-semibold text-yellow-800 bg-yellow-100 rounded-full"
                      >
                        PENDING
                      </span>
                      <span
                        v-else
                        class="inline-block px-3 py-1 text-sm font-semibold text-gray-600 bg-gray-200 rounded-full"
                      >
                        UNKNOWN
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Approver Section -->
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
                      ? "Disapproved"
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
                class="p-2 rounded-md shadow-sm mb-2"
                :class="[
                  'rounded-xl p-5 shadow-md border mb-4 transition duration-300',
                  approver.isCurrentApprover
                    ? 'bg-gray-400 border-white-400 text-white'
                    : 'bg-white text-gray-800',
                ]"
              >
                <div class="flex justify-between">
                  <div>
                    <h2 class="text-sm font-bold mb-2">
                      {{ approver.mainapprover ? "Main" : "Proxy" }}
                    </h2>
                  </div>
                  <div v-if="approver.isCurrentApprover">
                    <span
                      class="bg-white text-black text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                    >
                      You</span
                    >
                  </div>
                </div>
                <div class="flex justify-between">
                  <div>
                    <p class="text-xs">
                      <strong>Name:</strong> {{ approver.approvername }}
                    </p>
                    <p class="text-xs">
                      <strong>Email:</strong> {{ approver.approveremail }}
                    </p>
                  </div>
                  <div
                    v-if="approver.remarks"
                    class="flex text-gray-700 text-md mr-4 items-center"
                  >
                    <div class="text-md font-bold">Remarks:</div>
                    <div class="text-md font-bold ml-1">
                      {{ approver.remarks }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        v-if="canEdit && hasPermission"
        class="flex gap-1 items-center justify-end mb-0 mr-4 mt-3"
      >
        <button
          @click="postApprove()"
          v-if="transactions.hasCurrentApprover"
          class="py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-800"
        >
          Approve
        </button>
        <button
          @click="postDisapprove()"
          v-if="transactions.hasCurrentApprover"
          class="py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-800"
        >
          Disapprove
        </button>
      </div>
      <div v-else class="flex gap-1 items-center justify-end mb-0 mr-4 mt-3">
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
const router = useRouter();
import {
  getTransaction,
  transactions,
  isTxLoading,
} from "~/js/fetchTransactions";
import {
  getListOfTransactions,
  listOfTransactions,
  confirmApproval,
  disapproveApproval,
  generatePagination,
  changePage,
  totalPages,
  totalEntries,
  query,
  loading,
} from "~/js/fetchListApprovalRequest";
import LoadingModal from "./modal/LoadingModal.vue";
import SignaturePad from "signature_pad";
import { checkusersignature,hasSignature } from "~/js/checkusersignature";
import { postusersignature } from "~/js/usersignature";

const { $swal } = useNuxtApp();
const showModal = ref(false);
const isApprovedOpen = ref(false);
const hasPermission = ref(false);
const selectedId = ref("");
const showAllApprovers = ref({});

function clearSearch() {
  query.value.Search = "";
  getListOfTransactions();
}

function clearStatus() {
  query.value.Status = "";
  getListOfTransactions();
}

const viewTransaction = async (transactionId, id, status) => {
  showModal.value = true;
  await getTransaction(transactionId);
  hasPermission.value = status === "pending";
  selectedId.value = transactionId;
};

// const displayedApprovers = computed(() =>
//   showAllApprovers.value
//     ? transactions.listofapproved
//     : transactions.listofapproved.slice(0, 2)
// );

const displayedApprovers = (transaction) => {
  if (!transaction?.listofapproved) return [];
  if (showAllApprovers.value[transaction.id]) return transaction.listofapproved;
  return transaction.listofapproved.slice(0, 1);
};

const toggleApprovers = (id) => {
  showAllApprovers.value[id] = !showAllApprovers.value[id];
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
  if (transactions?.value.isinorder === 0) {
    return "pending";
  }
  return "waiting";
};

const postApprove = async () => {
  // ✅ Check if user has a saved signature
  if (hasSignature?.value == false) {
    const { isConfirmed } = await $swal.fire({
      title: "No Signature Found",
      text: "You don’t have a current signature. Do you want to create one?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, create one",
      cancelButtonText: "No",
      reverseButtons: true,
    });

    if (isConfirmed) {
      await createSignature("Approved"); // 🖋️ Create new signature
    }
  } else {
    // ✅ Ask confirmation before approving
    const { isConfirmed } = await $swal.fire({
      title: "Confirm Approval",
      html: `
        <div style="font-size:15px; color:#374151;">
          Are you sure you want to <strong>approve</strong> this form request?<br><br>
          <span style="font-size:13px; color:#6b7280;">
            Once approved, this action cannot be undone.
          </span>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, approve it",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#d1d5db",
      reverseButtons: true,
    });

    if (isConfirmed) {
      await confirmApproval(selectedId.value, null);
      showModal.value= false;
      await $swal.fire({
        icon: "success",
        title: "Form Approved",
        text: "The form request has been approved successfull.",
        timer: 1500,
        showConfirmButton: false,
      });
    }
  }
};

const postSigned = async () => {
  // ✅ Check if user has a saved signature
  if (hasSignature?.value == false) {
    const { isConfirmed } = await $swal.fire({
      title: "No Signature Found",
      text: "You don’t have a current signature. Do you want to create one?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, create one",
      cancelButtonText: "No",
      reverseButtons: true,
    });

    if (isConfirmed) {
      await createSignature("Signed"); // 🖋️ Create new signature
    }
  } else {
    // ✅ Ask confirmation before approving
    const { isConfirmed } = await $swal.fire({
      title: "Confirm Approval",
      html: `
        <div style="font-size:15px; color:#374151;">
          Are you sure you want to <strong>sign</strong> this form request?<br><br>
          <span style="font-size:13px; color:#6b7280;">
            Once signed, this action cannot be undone.
          </span>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, sign it",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#d1d5db",
      reverseButtons: true,
    });

    if (isConfirmed) {
      await confirmApproval(selectedId.value, null);
      showModal.value= false;
      await $swal.fire({
      title: "Form Signed!",
      text: "The request has been signed successfully.",
      icon: "success",
      timer: 1000,
      showConfirmButton: false,
    })
    }
  }
}

const createSignature = async (text) => {
  const { value: signature, isConfirmed } = await $swal.fire({
    title: `Create your own signature`,
    html: `
      <div style="display:flex; flex-direction:column; align-items:center; gap:1rem; width:100%;">
        <label style="font-weight:600; font-size:16px;">Please sign below:</label>
        <canvas id="signature-pad" width="700" height="250" 
          style="border:2px dashed #9ca3af; border-radius:12px; background:#f9fafb; width:100%; max-width:700px; height:250px;"></canvas>
        
        <div style="display:flex; align-items:center; gap:10px; width:100%; max-width:700px; margin-top:12px;">
          <label style="font-size:14px; font-weight:600;">Stroke:</label>
          <input id="thickness-slider" type="range" min="1" max="10" value="4" style="flex:1; cursor:pointer;">
          <span id="thickness-value" style="min-width:25px; text-align:center; font-weight:600;">4</span>
        </div>

        <button id="clear-signature" class="swal2-cancel swal2-styled" 
          style="margin-top:12px; background:#ef4444; border-radius:6px; padding:8px 16px; font-size:14px;">
          Clear Signature
        </button>

        <div style="text-align:left; width:100%; max-width:700px; margin-top:16px;">
          <label style="display:flex; align-items:center; gap:8px; font-size:14px;">
            <input type="checkbox" id="agree-terms">
            <span>I have read and agree to the <span style="color:#3b82f6; text-decoration:underline; cursor:pointer;">Terms and Conditions</span></span>
          </label>
        </div>
      </div>
    `,
    width: 800,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: "Confirm Signature",
    cancelButtonText: "Cancel",
    didOpen: () => {
      const canvas = document.getElementById("signature-pad");
      const thicknessSlider = document.getElementById("thickness-slider");
      const thicknessValue = document.getElementById("thickness-value");
      const agreeCheckbox = document.getElementById("agree-terms");

      const signaturePad = new SignaturePad(canvas, {
        backgroundColor: "rgba(255,255,255,0)",
        penColor: "black",
        minWidth: 2,
        maxWidth: 5,
      });

      // Stroke slider
      thicknessSlider.addEventListener("input", (e) => {
        const value = parseInt(e.target.value);
        thicknessValue.textContent = value;
        signaturePad.minWidth = Math.max(1, value - 1);
        signaturePad.maxWidth = value;
      });

      // Clear signature
      document.getElementById("clear-signature")?.addEventListener("click", () => signaturePad.clear());

      // Show Terms popup automatically when checkbox is checked
      agreeCheckbox.addEventListener("change", (e) => {
        if (e.target.checked) {
          const termsHtml = `
            <div id="terms-popup" 
              style="
                position: fixed; 
                top: 0; left: 0; 
                width: 100vw; height: 100vh; 
                background: rgba(0,0,0,0.5);
                display: flex; align-items: center; justify-content: center;
                z-index: 99999;
              ">
              <div style="
                background: white; 
                width: 90%; max-width: 600px; 
                border-radius: 12px; 
                padding: 20px; 
                box-shadow: 0 10px 20px rgba(0,0,0,0.2);
              ">
                <h2 style="font-weight:600; font-size:18px; margin-bottom:10px;">Terms and Conditions</h2>
                <div style="max-height:300px; overflow-y:auto; border:1px solid #e5e7eb; padding:10px; border-radius:8px; font-size:14px; line-height:1.6; margin-bottom:16px;">
                  <ol style="padding-left:1.2rem;">
                    <li>By signing this form, you confirm that the information provided is true and accurate.</li>
                    <li>You acknowledge that this signature has the same legal validity as your handwritten signature.</li>
                    <li>Any falsification of information may result in disciplinary or legal action.</li>
                    <li>The organization reserves the right to verify your submission for authenticity.</li>
                    <li>All data collected will be processed in accordance with applicable data protection laws.</li>
                  </ol>
                </div>
                <div style="text-align:right;">
                  <button id="close-terms" 
                    style="background:#3b82f6; color:white; padding:8px 16px; border:none; border-radius:6px; cursor:pointer;">
                    I Understand
                  </button>
                </div>
              </div>
            </div>
          `;

          document.body.insertAdjacentHTML("beforeend", termsHtml);

          document.getElementById("close-terms").addEventListener("click", () => {
            document.getElementById("terms-popup")?.remove();
            agreeCheckbox.checked = true; // keep it checked after reading
          });
        }
      });

      window.signaturePadInstance = signaturePad;
    },
    preConfirm: () => {
      const signaturePad = window.signaturePadInstance;
      const agreeCheckbox = document.getElementById("agree-terms");

      if (!signaturePad || signaturePad.isEmpty()) {
        $swal.showValidationMessage("✍️ Please provide a signature before confirming.");
        return false;
      }

      if (!agreeCheckbox.checked) {
        $swal.showValidationMessage("✅ Please read and agree to the Terms and Conditions before proceeding.");
        return false;
      }

      return signaturePad.toDataURL("image/png");
    },
  });

  if (isConfirmed && signature) {
    loading.value = true;
    const byteString = atob(signature.split(",")[1]);
    const mimeString = signature.split(",")[0].split(":")[1].split(";")[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    const blob = new Blob([ab], { type: mimeString });

    const formData = new FormData();
    formData.append("signaturefile", blob, "signature.png");

    await postusersignature(formData, $swal);
    await checkusersignature($swal);
    await confirmApproval(selectedId.value, null);
     $swal.fire({
      title: `Form ${text}!`,
      text: `The request has been ${text} successfully`,
      icon: "success",
      width: 400,
      timer: 1200,
      showConfirmButton: false,
    });
    showModal.value = false;
    loading.value = false;
  }
};

const postDisapprove = async () => {
  const { value: remarks } = await $swal.fire({
    title: "Are you sure?",
    text: "Do you really want to disapprove this request?",
    icon: "warning",
    input: "textarea",
    inputPlaceholder: "Enter remarks here...",
    showCancelButton: true,
    confirmButtonText: "Yes, disapprove it!",
    cancelButtonText: "No, cancel",
    inputValidator: (value) => {
      if (!value) {
        return "Remarks are required!";
      }
    },
  });

  if (remarks) {
    await disapproveApproval(selectedId.value, remarks,$swal);
   
    showModal.value = false;
  }
};

const handlePageInput = () => {
  if (query.value.PageNumber < 1) {
    query.value.PageNumber = 1;
  } else if (query.value.PageNumber > totalPages.value) {
    query.value.PageNumber = totalPages.value;
  }

  getListOfTransactions();
};

const pageNumberDisplay = computed({
  get: () => (totalPages.value === 0 ? 0 : query.value.PageNumber),
  set: (val) => {
    query.value.PageNumber = totalPages.value === 0 ? 0 : Number(val);
  },
});

const props = defineProps({
  canEdit: Boolean,
});
onMounted(async() => {
  await checkusersignature($swal);
  await getListOfTransactions();
});
</script>

<style></style>
