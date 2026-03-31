<template>
  <div class="flex flex-col md:flex-row justify-between">
    <div class="flex gap-2">
      <div class="relative text-gray-500 focus-within:text-gray-900 mb-4">
        <!-- Left Icon -->
        <div class="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <svg class="w-5 h-5" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M17.5 17.5L15.4167 15.4167M15.8333 9.16667C15.8333 5.48477 12.8486 2.5 9.16667 2.5C5.48477 2.5 2.5 5.48477 2.5 9.16667C2.5 12.8486 5.48477 15.8333 9.16667 15.8333C11.0005 15.8333 12.6614 15.0929 13.8667 13.8947C15.0814 12.6872 15.8333 11.0147 15.8333 9.16667Z"
              stroke="#9CA3AF" stroke-width="1.6" stroke-linecap="round" />
          </svg>
        </div>

        <!-- Right Icon -->
        <div v-if="query.Search" class="absolute inset-y-0 md:left-72 left-44 flex items-center">
          <svg @click="clearSearch" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
            stroke-width="1.5" stroke="currentColor" class="size-6 cursor-pointer text-red-700">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>

        <!-- Input Field -->
        <input type="text" id="default-search" v-model="query.Search" @keydown.enter="getListOfTransactions"
          class="block w-52 md:w-80 h-11 pr-10 pl-10 py-2.5 text-base font-normal shadow-xs text-gray-900 bg-transparent border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none"
          placeholder="Search" />
      </div>
      <button @click="getListOfTransactions" class="py-3 px-4 bg-blue-500 h-11 text-white rounded-md hover:bg-blue-700">
        <svg class="w-6 h-6 text-gray-50 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
          width="24" height="24" fill="none" viewBox="0 0 24 24">
          <path stroke="currentColor" stroke-linecap="round" stroke-width="2"
            d="m21 21-3.5-3.5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
        </svg>
      </button>
    </div>
    <div>
      <div class="relative inline-block mr-4 mb-2">
        <select id="dropdown"
          class="px-5 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-10"
          v-model="query.Status" @change="getListOfTransactions" @focus="isApprovedOpen = true"
          @blur="isApprovedOpen = false" @click="open">
          <option value="" selected hidden>Select Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Disapproved</option>
        </select>
        <div v-if="query.Status" class="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700">
          <svg @click="clearStatus" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
            stroke-width="1.5" stroke="currentColor" class="size-6 cursor-pointer text-red-700">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <div v-if="!query.Status" class="absolute inset-y-0 right-2 flex items-center text-gray-500">
          <svg :class="{ 'rotate-180': isApprovedOpen }" xmlns="http://www.w3.org/2000/svg" fill="none"
            viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
            class="size-6 transition-transform duration-200">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 9l-7.5 7.5L4.5 9" />
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
                  <th @click="sortBy('Id')"
                    class="p-5 text-left text-sm font-semibold text-gray-900 capitalize cursor-pointer select-none">
                    <div class="flex items-center gap-1">
                      <span>ID</span>
                      <SortIcon :active="query.SortBy === 'Id'" :descending="query.IsDescending" />
                    </div>
                  </th>

                  <th @click="sortBy('Title')"
                    class="p-5 text-left text-sm font-semibold text-gray-900 capitalize cursor-pointer select-none">
                    <div class="flex items-center gap-1">
                      <span>Form</span>
                      <SortIcon :active="query.SortBy === 'Title'" :descending="query.IsDescending" />
                    </div>
                  </th>
                  <th scope="col"
                    class="p-5 text-left whitespace-nowrap text-sm leading-6 font-semibold text-gray-900 capitalize">
                    Approver Type
                  </th>
                  <th @click="sortBy('Status')"
                    class="p-5 text-left text-sm font-semibold text-gray-900 capitalize cursor-pointer select-none">
                    <div class="flex items-center gap-1">
                      <span>Status</span>
                      <SortIcon :active="query.SortBy === 'Status'" :descending="query.IsDescending" />
                    </div>
                  </th>
                  <th scope="col"
                    class="p-5 text-left whitespace-nowrap text-sm leading-6 font-semibold text-gray-900 capitalize">
                    Approved By
                  </th>

                  <th @click="sortBy('Requestername')"
                    class="p-5 text-left text-sm font-semibold text-gray-900 capitalize cursor-pointer select-none">
                    <div class="flex items-center gap-1">
                      <span>Created By</span>
                      <SortIcon :active="query.SortBy === 'Requestername'" :descending="query.IsDescending" />
                    </div>
                  </th>
                  <th @click="sortBy('Createddate')"
                    class="p-5 text-left text-sm font-semibold text-gray-900 capitalize cursor-pointer select-none">
                    <div class="flex items-center gap-1">
                      <span>Created Date</span>
                      <SortIcon :active="query.SortBy === 'Createddate'" :descending="query.IsDescending" />
                    </div>
                  </th>
                  <th scope="col"
                    class="p-5 text-left whitespace-nowrap text-sm leading-6 font-semibold text-gray-900 capitalize">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody class="divide-y divide-gray-300">
                <tr v-for="(transaction, index) in listOfTransactions" :key="index"
                  class="bg-white transition-all duration-500 hover:bg-gray-50">
                  <td class="p-5 whitespace-nowrap text-sm leading-6 font-medium text-gray-900">
                    {{ transaction.transactionid }}
                  </td>
                  <td class="p-5 whitespace-nowrap text-sm leading-6 font-medium text-gray-900">
                    {{ transaction.formTitle }}
                  </td>
                  <td class="p-5 whitespace-nowrap text-sm leading-6 font-medium text-gray-900">
                    <div v-if="transaction.mainapprover == '1'"
                      class="py-1.5 px-2.5 bg-green-50 rounded-full flex items-center justify-center w-20 gap-1">
                      <svg width="5" height="6" viewBox="0 0 5 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="2.5" cy="3" r="2.5" fill="#16A34A"></circle>
                      </svg>
                      <span class="font-medium text-xs text-green-600">Main</span>
                    </div>
                    <div v-if="transaction.mainapprover == '0'"
                      class="py-1.5 px-2.5 bg-amber-50 rounded-full flex items-center justify-center w-20 gap-1">
                      <svg width="5" height="6" viewBox="0 0 5 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="2.5" cy="3" r="2.5" fill="#D97706"></circle>
                      </svg>
                      <span class="font-medium text-xs text-amber-600">Proxy</span>
                    </div>
                    <div v-if="transaction.mainapprover == '3'"
                      class="py-1.5 px-2.5 bg-blue-50 rounded-full flex items-center justify-center w-20 gap-1">
                      <svg width="5" height="6" viewBox="0 0 5 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="2.5" cy="3" r="2.5" fill="#2563EB"></circle>
                      </svg>
                      <span class="font-medium text-xs text-blue-600">Signatory</span>
                    </div>
                  </td>

                  <td class="p-5 whitespace-nowrap text-sm leading-6 font-medium text-gray-900">
                    <div v-if="transaction.status == 'approved'"
                      class="py-1.5 px-2.5 bg-green-50 rounded-full flex items-center justify-center w-20 gap-1">
                      <svg width="5" height="6" viewBox="0 0 5 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="2.5" cy="3" r="2.5" fill="#16A34A"></circle>
                      </svg>
                      <span class="font-medium text-xs text-green-600">Approved</span>
                    </div>
                    <div v-else-if="transaction.status == 'rejected'"
                      class="py-1.5 px-2.5 bg-red-50 rounded-full flex items-center justify-center w-28 gap-1">
                      <svg width="5" height="6" viewBox="0 0 5 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="2.5" cy="3" r="2.5" fill="#DC2626"></circle>
                      </svg>
                      <span class="font-medium text-xs text-red-600">Disaproved</span>
                    </div>
                    <div v-else
                      class="py-1.5 px-2.5 bg-amber-50 rounded-full flex items-center justify-center w-20 gap-1">
                      <svg width="5" height="6" viewBox="0 0 5 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="2.5" cy="3" r="2.5" fill="#D97706"></circle>
                      </svg>
                      <span class="font-medium text-xs text-amber-600">Pending</span>
                    </div>
                  </td>
                  <td class="p-5 whitespace-nowrap text-sm leading-6 font-medium text-gray-900">
                    <!-- 1) The approver list, if any -->
                    <div v-if="
                      transaction.listofapproved?.length &&
                      transaction.status != 'rejected'
                    " class="space-y-2">
                      <ul class="space-y-2">
                        <li v-for="(approver, index) in displayedApprovers(
                          transaction
                        )" :key="index" class="flex items-start space-x-2">
                          <div class="flex-shrink-0">
                            <svg class="w-5 h-5 text-green-500 mt-1" fill="none" stroke="currentColor" stroke-width="2"
                              viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div>
                            <p class="font-semibold text-gray-800 flex items-center space-x-1">
                              <span class="text-gray-600 text-md font-bold flex items-center justify-center">
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
                        <button class="text-blue-600 text-sm font-medium hover:underline"
                          @click="toggleApprovers(transaction.id)">
                          {{
                            showAllApprovers[transaction.id]
                              ? "See less"
                              : "See more"
                          }}
                        </button>
                      </div>
                      <div
                        class="font-semibold h-5 rounded-xl bg-green-600 text-white p-2 flex items-center justify-center">
                        {{ transaction.totalApproved }} /
                        {{ transaction.totalApprovers }} - Approved
                      </div>
                    </div>

                    <!-- 2) Always show “rejected” if status is rejected -->
                    <div v-if="transaction.status === 'rejected'"
                      class="mt-3 p-3 b text-red-700 rounded-lg text-sm flex items-center space-x-2">
                      <span>This transaction has been
                        <strong>disapproved</strong>.</span>
                    </div>

                    <!-- 3) If there are no approvers AND it isn’t rejected -->
                    <div v-if="
                      !transaction.listofapproved?.length &&
                      transaction.status !== 'rejected'
                    " class="text-sm text-gray-400 italic mt-2">
                      No one has approved yet
                    </div>
                  </td>
                  <td class="p-5 whitespace-nowrap text-sm leading-6 font-medium text-gray-900">
                    {{ transaction.requesterName }}
                  </td>
                  <td class="p-5 whitespace-nowrap text-sm leading-6 font-medium text-gray-900">
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
                  <td class="p-5 text-center">
                    <button @click="
                      viewTransaction(
                        transaction.transactionid,
                        transaction.id,
                        transaction.status
                      )
                      " class="p-2 rounded-full bg-white group transition-all duration-500 hover:bg-green-600 inline-flex items-center justify-center"
                      title="View Transaction">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20"
                        height="20">
                        <path class="fill-green-600 group-hover:fill-white" d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                        <path class="fill-green-600 group-hover:fill-white" fill-rule="evenodd"
                          d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 0 1 0-1.113ZM17.25 12a5.25 5.25 0 1 1-10.5 0 5.25 5.25 0 0 1 10.5 0Z"
                          clip-rule="evenodd" />
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

            <div v-if="listOfTransactions.length === 0 && !loading" class="p-5 text-center text-gray-500">
              No Approval Requests
            </div>
          </div>
        </div>
      </div>

      <div
        class="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-2 space-y-4 sm:space-y-0 sm:space-x-2">
        <!-- Left side: Page info + input -->
        <div class="flex flex-wrap items-center justify-center sm:justify-start space-x-2">
          <span>Showing</span>
          <input v-model.number="pageNumberDisplay" @keyup.enter="handlePageInput" type="number"
            :min="totalPages === 0 ? 0 : 1" :max="totalPages"
            class="w-16 px-2 py-1 border border-gray-300 rounded text-center" />
          <span>
            out of {{ totalPages }} {{ totalPages <= 1 ? "Page" : "Pages" }} ({{ totalEntries }} {{ totalEntries <= 1
              ? "Entry" : "Entries" }}) </span>
              <button @click="handlePageInput" class="py-1 px-4 bg-blue-500 hover:bg-blue-700 rounded-md text-white">
                GO
              </button>
        </div>

        <!-- Pagination section -->
        <div class="flex flex-wrap justify-center sm:justify-center space-x-2 order-last sm:order-none">
          <a @click="changePage(query.PageNumber - 1)" :class="{
            'cursor-not-allowed opacity-50': query.PageNumber === 1,
          }"
            class="cursor-pointer px-2 py-1 sm:px-4 sm:py-2 mt-2 text-gray-600 border rounded-lg hover:bg-gray-100 focus:outline-none">
            <svg xmlns="http://www.w3.org/2000/svg" width="1.5em" height="1.5em" viewBox="0 0 24 24">
              <path fill="currentColor" d="m14 18l-6-6l6-6l1.4 1.4l-4.6 4.6l4.6 4.6z" />
            </svg>
          </a>

          <template v-for="page in generatePagination()" :key="page">
            <span v-if="typeof page === 'string'"
              class="px-2 py-1 sm:px-4 sm:py-2 ml-1 mt-2 text-gray-400 border rounded-lg cursor-default">
              {{ page }}
            </span>
            <a v-else @click="changePage(page)" :class="{
              'ring ring-primary bg-primary/20': query.PageNumber === page,
            }"
              class="cursor-pointer px-2 py-1 sm:px-4 sm:py-2 ml-1 mt-2 text-gray-600 border rounded-lg hover:bg-gray-100 focus:outline-none">
              {{ page }}
            </a>
          </template>

          <a @click="changePage(query.PageNumber + 1)" :class="{
            'cursor-not-allowed opacity-50': query.PageNumber === totalPages,
          }"
            class="cursor-pointer px-2 py-1 sm:px-4 sm:py-2 mt-2 text-gray-600 border rounded-lg hover:bg-gray-100 focus:outline-none">
            <svg xmlns="http://www.w3.org/2000/svg" width="1.5em" height="1.5em" viewBox="0 0 24 24">
              <path fill="currentColor" d="M12.6 12L8 7.4L9.4 6l6 6l-6 6L8 16.6z" />
            </svg>
          </a>
        </div>

        <!-- Right side: Rows per page -->
        <div class="flex items-center justify-center sm:justify-end gap-2">
          <label for="pageSize" class="text-sm text-gray-700">Rows per page:</label>
          <select id="pageSize" v-model.number="query.PageSize" @change="changePageSize"
            class="border border-gray-300 rounded px-2 py-1 text-sm">
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="100">100</option>
          </select>
        </div>
      </div>
    </div>
  </div>
  <div v-if="showModal"
    class="fixed inset-0 p-4 flex flex-wrap justify-center items-center w-full h-full z-[1000] before:fixed before:inset-0 before:w-full before:h-full before:bg-[rgba(0,0,0,0.5)] overflow-auto font-[sans-serif]">
    <div class="w-full max-w-7xl bg-white shadow-lg rounded-lg p-6 relative max-h-[90vh]">
      <div class="flex items-center pb-3 border-b border-gray-300">
        <h3 class="text-gray-800 text-xl font-bold flex-1">Transaction</h3>
        <svg @click="showModal = false" xmlns="http://www.w3.org/2000/svg"
          class="w-3 ml-2 cursor-pointer shrink-0 fill-gray-400 hover:fill-red-500" viewBox="0 0 320.591 320.591">
          <path
            d="M30.391 318.583a30.37 30.37 0 0 1-21.56-7.288c-11.774-11.844-11.774-30.973 0-42.817L266.643 10.665c12.246-11.459 31.462-10.822 42.921 1.424 10.362 11.074 10.966 28.095 1.414 39.875L51.647 311.295a30.366 30.366 0 0 1-21.256 7.288z"
            data-original="#000000"></path>
          <path
            d="M287.9 318.583a30.37 30.37 0 0 1-21.257-8.806L8.83 51.963C-2.078 39.225-.595 20.055 12.143 9.146c11.369-9.736 28.136-9.736 39.504 0l259.331 257.813c12.243 11.462 12.876 30.679 1.414 42.922-.456.487-.927.958-1.414 1.414a30.368 30.368 0 0 1-23.078 7.288z"
            data-original="#000000"></path>
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

          <div v-for="(item, index) in transactions?.formObjects" :key="index" class="mb-6">
            <div v-if="item.objectType !== 'LABEL' && item.objectType !== 'DYNAMICSIGNATORY'" class="flex justify-between">
              <label class="text-gray-700 font-semibold mb-2">
                {{ item.label }}
              </label>
            </div>
               <div v-if="item.objectType == 'DYNAMICSIGNATORY'" class="flex justify-between">
            <label class="text-gray-700 font-semibold mb-2 break-all block flex items-center gap-2">
              {{ item.label }}

              <!-- Count Badge -->
              <span class="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {{ item.dynamicsignatoriesvalues.length }}
              </span>
            </label>
          </div>
            <div v-if="item.objectType === 'LABEL'">
              <hr class="my-4 border-gray-400" />
              <h3 class="text-lg font-bold text-gray-800 mb-1">
                {{ item.label }}
              </h3>
            </div>
            <div v-else-if="item.objectType != 'DYNAMICSIGNATORY'" class="border p-3 rounded-md w-full text-gray-800">
              <span v-for="(value, index) in item.values" :key="index">
                {{ value
                }}<span v-if="index !== item.values.length - 1"> , </span>
              </span>
            </div>
            <div v-else-if="item.objectType === 'DYNAMICSIGNATORY'">
                <div v-for="(dynamic, index) in sortAllSignatories(item.dynamicsignatoriesvalues)" :key="index"
              class="mb-4">

              <div
                class="flex items-center justify-between p-4 border rounded-lg bg-gray-50 shadow-sm mb-4 transition-all duration-300"
                :class="{ 'highlight-pulse': isHighlighted && dynamic.currentuser }">
                <!-- Left: Name / Value -->
                <div class="group flex items-center gap-4">
                  <!-- Colored Bar Indicator -->
                  <div class="w-1 h-12 rounded-full bg-gradient-to-b"
                    :class="dynamic.currentuser ? 'from-blue-500 to-blue-600' : 'from-gray-300 to-gray-400'">
                  </div>

                  <!-- Content -->
                  <div class="flex-1">
                    <!-- Name Row -->
                    <div class="flex items-baseline gap-2 mb-0.5">
                      <span class="text-gray-900 font-medium text-md">
                        {{ dynamic.value }}
                      </span>

                      <span v-if="dynamic.currentuser" :id="dynamic.currentuser ? 'currentUserCard' : null"
                        class="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-extrabold text-blue-600 bg-blue-50 border border-blue-300 rounded uppercase tracking-wider">
                        <span class="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping absolute"></span>
                        <span class="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                        You
                      </span>
                    </div>

                    <!-- Meta Info -->
                    <div class="flex items-center gap-2 text-xs text-gray-500 ">
                      <span v-if="dynamic.position" class="hover:text-gray-700 transition-colors">
                        {{ dynamic.position }}
                      </span>
                      <span v-if="dynamic.position && dynamic.branch" class="w-1 h-1 rounded-full bg-gray-300"></span>
                      <span v-if="dynamic.branch" class="hover:text-gray-700 transition-colors">
                        {{ dynamic.branch }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Right: Status / Button -->
                <div>
                  <!-- If current user and response is 0, show approve button -->
                  <button v-if="dynamic.currentuser && dynamic.response === 0"
                    class="py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-800" @click="postSigned()">
                    SIGN
                  </button>

                  <!-- If current user and response is 1, show approved text -->
                  <span v-else-if="dynamic.currentuser && dynamic.response === 1"
                    class="inline-block px-3 py-1 text-sm font-semibold text-green-700 bg-green-100 rounded-full">
                    SIGNED -
                    {{
                      new Date(dynamic.responsedate).toLocaleString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "numeric",
                        minute: "numeric",
                        hour12: true, // optional, for 12-hour format with AM/PM
                      })
                    }}
                  </span>

                  <!-- Other statuses for non-current users -->
                  <span v-else-if="dynamic.response === 1"
                    class="inline-block px-3 py-1 text-sm font-semibold text-green-700 bg-green-100 rounded-full">
                    SIGNED -
                    {{
                      new Date(dynamic.responsedate).toLocaleString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "numeric",
                        minute: "numeric",
                        hour12: true, // optional, for 12-hour format with AM/PM
                      })
                    }}
                  </span>
                  <span v-else-if="dynamic.response === 0"
                    class="inline-block px-3 py-1 text-sm font-semibold text-yellow-800 bg-yellow-100 rounded-full">
                    PENDING
                  </span>
                  <span v-else
                    class="inline-block px-3 py-1 text-sm font-semibold text-gray-600 bg-gray-200 rounded-full">
                    UNKNOWN
                  </span>
                </div>
              </div>

            </div>
            </div>
          </div>

          <!-- Approver Section -->
          <div v-for="(approverGroup, approverNumber) in transactions.approvers" :key="approverNumber"
            class="mt-2 p-4 bg-gray-50 rounded-lg">
            <div v-if="
              getGroupVisibilityStatus(
                transactions.approvers,
                approverNumber
              ) !== 'hidden'
            ">
              <h2 class="text-md font-semibold text-gray-800 mb-2">
                Approver {{ approverNumber }} -
                <span :class="{
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
                }">
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

              <div v-for="approver in approverGroup" :key="approver.id" class="p-2 rounded-md shadow-sm mb-2" :class="[
                'rounded-xl p-5 shadow-md border mb-4 transition duration-300',
                approver.isCurrentApprover
                  ? 'bg-gray-400 border-white-400 text-white'
                  : 'bg-white text-gray-800',
              ]">
                <div class="flex justify-between">
                  <div>
                    <h2 class="text-sm font-bold mb-2">
                      {{ approver.mainapprover ? "Main" : "Proxy" }}
                    </h2>
                  </div>
                  <div v-if="approver.isCurrentApprover"
                    :id="approver.isCurrentApprover ? 'currentApproverCard' : null">
                    <span class="bg-white text-black text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                      You</span>
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
                  <div v-if="approver.remarks" class="flex text-gray-700 text-md mr-4 items-center">
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
      <div v-if="canEdit && hasPermission" class="flex gap-1 items-center justify-end mb-0 mr-4 mt-3">
        <button type="button" @click="scrollToCurrentUser"
          class="px-4 py-2 rounded-lg text-white text-sm font-semibold tracking-wide bg-blue-500 hover:bg-blue-600 active:bg-blue-700 shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors duration-200">
          Find My Name
        </button>
        <button @click="postApprove()" v-if="transactions.hasCurrentApprover"
          class="py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-800">
          Approve
        </button>
        <button @click="postDisapprove()" v-if="transactions.hasCurrentApprover"
          class="py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-800">
          Disapprove
        </button>
      </div>
      <div v-else class="flex gap-1 items-center justify-end mb-0 mr-4 mt-3">
        <button type="button" @click="scrollToCurrentUser"
          class="px-4 py-2 rounded-lg text-white text-sm font-semibold tracking-wide bg-blue-500 hover:bg-blue-600 active:bg-blue-700 shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors duration-200">
          Find My Name
        </button>
        <button type="button" @click="showModal = false"
          class="px-4 py-2 rounded-lg text-gray-800 text-sm border-none outline-none tracking-wide bg-gray-200 hover:bg-gray-300 active:bg-gray-200">
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
  changePageSize,
  sortBy,
} from "~/js/fetchListApprovalRequest";
import LoadingModal from "./modal/LoadingModal.vue";
import SignaturePad from "signature_pad";
import { checkusersignature, hasSignature, getusersignature } from "~/js/checkusersignature";
import { postusersignature } from "~/js/usersignature";

const { $swal } = useNuxtApp();
const showModal = ref(false);
const isApprovedOpen = ref(false);
const hasPermission = ref(false);
const selectedId = ref("");
const showAllApprovers = ref({});
const signatureFile = ref();
const isHighlighted = ref(false);

const scrollToCurrentUser = () => {
  // First try to find in signatures
  let element = document.getElementById('currentUserCard');

  // If not found, try to find in approvers
  if (!element) {
    element = document.getElementById('currentApproverCard');
  }

  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Trigger highlight animation
    isHighlighted.value = true;

    // Remove highlight after animation completes
    setTimeout(() => {
      isHighlighted.value = false;
    }, 2000);
  }
};

const sortAllSignatories = (groups) => {
  if (!groups || !Array.isArray(groups)) return [];

  // Flatten all groups into one array
  const allSignatories = groups.flatMap(group => group.value || []);

  // Sort: current user first, then pending, then alphabetical
  return allSignatories.sort((a, b) => {
    // Current user always comes first
    if (a.currentuser && !b.currentuser) return -1;
    if (!a.currentuser && b.currentuser) return 1;

    // After current user, pending (response === 0) comes next
    if (a.response === 0 && b.response !== 0) return -1;
    if (a.response !== 0 && b.response === 0) return 1;

    // If both have same status, sort alphabetically by value
    return (a.value || '').localeCompare(b.value || '');
  });
};
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
    const imageUrl = await getusersignature($swal);
    signatureFile.value = URL.createObjectURL(imageUrl);

    const { isConfirmed } = await $swal.fire({
      title: "Confirm Approval",
      html: `
      <div style="font-size:15px; color:#374151; text-align:center;">
        <p>
          Are you sure you want to <strong>approve</strong> this form request?
        </p>

        <img 
          src="${signatureFile.value}" 
          alt="Signature Preview"
          style="
            margin:12px auto;
            max-width:220px;
            max-height:100px;
            object-fit:contain;
            border:1px solid #e5e7eb;
            padding:6px;
            background:white;
          "
        />

        <p style="font-size:13px; color:#6b7280;">
          Once signed, this action cannot be undone.
        </p>
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
      showModal.value = false;
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
    const imageUrl = await getusersignature($swal);
    signatureFile.value = URL.createObjectURL(imageUrl);
    // ✅ Ask confirmation before approving
    const { isConfirmed } = await $swal.fire({
      title: "Confirm Approval",
      html: `
  <div style="font-size:15px; color:#374151; text-align:center;">
    <p>
      Are you sure you want to <strong>sign</strong> this form request?
    </p>

    <img 
      src="${signatureFile.value}" 
      alt="Signature Preview"
      style="
        margin:12px auto;
        max-width:220px;
        max-height:100px;
        object-fit:contain;
        border:1px solid #e5e7eb;
        padding:6px;
        background:white;
      "
    />

    <p style="font-size:13px; color:#6b7280;">
      Once signed, this action cannot be undone.
    </p>
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
      showModal.value = false;
      await $swal.fire({
        title: "Form Signed!",
        text: "The request has been signed successfully.",
        icon: "success",
        timer: 1000,
        showConfirmButton: false,
      });
    }
  }
};

const removeWhiteBackground = (file) => {
    return new Promise((resolve) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = () => (img.src = reader.result);
        reader.readAsDataURL(file);

        img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            canvas.width = img.width;
            canvas.height = img.height;

            // 1. Draw the image
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // 2. High-Contrast Logic
            // We want to find the "middle ground" and push everything 
            // darker than it to BLACK and everything lighter to TRANSPARENT.
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
                // Get brightness (0-255)
                const v = (r * 0.299 + g * 0.587 + b * 0.114);

                // ADJUST THESE TWO NUMBERS IF NEEDED:
                // Lower 'blackPoint' = thinner signature
                // Higher 'whitePoint' = removes more background
                const blackPoint = 130; 
                const whitePoint = 170;

                if (v <= blackPoint) {
                    // Definitely Ink -> Pure Black
                    data[i] = 0; data[i+1] = 0; data[i+2] = 0;
                    data[i+3] = 255;
                } else if (v >= whitePoint) {
                    // Definitely Background -> Transparent
                    data[i+3] = 0;
                } else {
                    // In-between (Edges) -> Smooth transition
                    const a = 1 - (v - blackPoint) / (whitePoint - blackPoint);
                    data[i] = 0; data[i+1] = 0; data[i+2] = 0;
                    data[i+3] = a * 255;
                }
            }

            ctx.putImageData(imageData, 0, 0);
            canvas.toBlob((blob) => resolve(blob), "image/png", 1);
        };
    });
};

const createSignature = async (text) => {
  const { value: result, isConfirmed } = await $swal.fire({
    title: '<span style="font-size:18px;font-weight:800;color:#0f172a;letter-spacing:-.02em;">Create Your Signature</span>',
    html: `
      <div style="display:flex;flex-direction:column;gap:18px;width:100%;align-items:center;box-sizing:border-box;">

        <!-- Pill toggle -->
        <div style="display:flex;background:#f1f5f9;border-radius:12px;padding:4px;gap:4px;width:fit-content;">
          <label id="lbl-draw"
            style="padding:8px 28px;font-weight:700;font-size:13px;cursor:pointer;
                   background:#2563eb;color:#fff;border-radius:9px;
                   transition:all .2s;letter-spacing:.01em;user-select:none;">
            <input type="radio" name="sigType" value="draw" checked style="display:none;"> ✏️&nbsp;&nbsp;Draw
          </label>
          <label id="lbl-upload"
            style="padding:8px 28px;font-weight:700;font-size:13px;cursor:pointer;
                   background:transparent;color:#64748b;border-radius:9px;
                   transition:all .2s;letter-spacing:.01em;user-select:none;">
            <input type="radio" name="sigType" value="upload" style="display:none;"> 📂&nbsp;&nbsp;Upload
          </label>
        </div>

        <!-- ══ DRAW PANEL ══ -->
        <div id="draw-wrapper" style="width:100%;text-align:center;">

          <p style="font-size:12px;color:#94a3b8;margin-bottom:10px;letter-spacing:.02em;">
            Draw your signature inside the box
          </p>

          <div style="position:relative;display:block;width:100%;max-width:700px;margin:0 auto;">
            <canvas id="signature-pad"
              style="display:block;width:100%;height:210px;
                     border:2px dashed #cbd5e1;border-radius:16px;
                     background:linear-gradient(160deg,#f8fafc,#f1f5f9);
                     touch-action:none;cursor:crosshair;
                     box-shadow:inset 0 2px 6px rgba(0,0,0,.05);">
            </canvas>
            <div id="sig-hint" style="
              position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
              pointer-events:none;font-size:16px;color:#d1d5db;font-style:italic;gap:8px;">
              <svg width="20" height="20" fill="none" stroke="#d1d5db" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
              </svg>
              Sign here
            </div>
          </div>

          <!-- Controls row -->
          <div style="display:flex;align-items:center;gap:16px;max-width:700px;margin:12px auto 0;flex-wrap:wrap;justify-content:space-between;">
            <!-- Thickness slider -->
            <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:140px;">
              <svg width="12" height="12" fill="#94a3b8" viewBox="0 0 12 12"><circle cx="6" cy="6" r="2.5"/></svg>
              <input id="thickness-slider" type="range" min="1" max="12" value="3"
                style="flex:1;height:4px;accent-color:#2563eb;cursor:pointer;">
              <svg width="18" height="18" fill="#64748b" viewBox="0 0 18 18"><circle cx="9" cy="9" r="6"/></svg>
            </div>

            <!-- Color swatches -->
            <div style="display:flex;align-items:center;gap:7px;">
              <div id="color-black" data-color="#0f172a" title="Black"
                style="width:26px;height:26px;border-radius:50%;background:#0f172a;
                       border:3px solid #2563eb;cursor:pointer;transition:transform .15s;"></div>
              <div id="color-navy" data-color="#1e3a8a" title="Navy"
                style="width:26px;height:26px;border-radius:50%;background:#1e3a8a;
                       border:2px solid #e2e8f0;cursor:pointer;transition:transform .15s;"></div>
              <div id="color-blue" data-color="#1d4ed8" title="Blue"
                style="width:26px;height:26px;border-radius:50%;background:#1d4ed8;
                       border:2px solid #e2e8f0;cursor:pointer;transition:transform .15s;"></div>
              <div id="color-green" data-color="#14532d" title="Dark Green"
                style="width:26px;height:26px;border-radius:50%;background:#14532d;
                       border:2px solid #e2e8f0;cursor:pointer;transition:transform .15s;"></div>
            </div>

            <!-- Clear -->
            <button id="clear-signature"
              style="display:flex;align-items:center;gap:6px;padding:7px 16px;
                     background:#fff1f2;color:#e11d48;
                     border:1.5px solid #fecdd3;border-radius:10px;
                     font-weight:700;font-size:13px;cursor:pointer;transition:all .15s;"
              onmouseenter="this.style.background='#fecdd3'"
              onmouseleave="this.style.background='#fff1f2'">
              <svg width="13" height="13" fill="none" stroke="#e11d48" stroke-width="2.2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/>
              </svg>
              Clear
            </button>
          </div>
        </div>

        <!-- ══ UPLOAD PANEL ══ -->
        <div id="upload-wrapper" style="display:none;width:100%;max-width:700px;">
          <label for="signature-upload"
            style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                   border:2px dashed #cbd5e1;border-radius:16px;padding:44px 24px;cursor:pointer;
                   background:#f8fafc;gap:12px;transition:border-color .2s,background .2s;"
            onmouseenter="this.style.borderColor='#2563eb';this.style.background='#eff6ff'"
            onmouseleave="this.style.borderColor='#cbd5e1';this.style.background='#f8fafc'">
            <div style="width:54px;height:54px;border-radius:14px;background:#dbeafe;
                        display:flex;align-items:center;justify-content:center;">
              <svg width="28" height="28" fill="none" stroke="#2563eb" stroke-width="1.6" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.338-2.32 5.75 5.75 0 0 1 .605 11.095"/>
              </svg>
            </div>
            <div style="text-align:center;">
              <p style="font-weight:800;font-size:14px;color:#1e293b;margin:0 0 3px;">Click to upload</p>
              <p style="font-size:12px;color:#94a3b8;margin:0;">PNG or JPG · white background removed automatically</p>
            </div>
            <input type="file" id="signature-upload" accept="image/png,image/jpeg" style="display:none;" />
          </label>
          <img id="upload-preview"
            style="display:none;margin:14px auto 0;max-height:180px;
                   border:1.5px solid #e2e8f0;border-radius:12px;
                   box-shadow:0 2px 8px rgba(0,0,0,.06);" />
        </div>

        <!-- ══ TERMS ══ -->
        <div style="width:100%;max-width:700px;background:#f8fafc;border:1.5px solid #e2e8f0;
                    border-radius:12px;padding:12px 16px;">
          <label style="display:flex;align-items:flex-start;gap:10px;font-size:13.5px;
                         cursor:pointer;color:#475569;line-height:1.5;">
            <input type="checkbox" id="agree-terms"
              style="margin-top:2px;accent-color:#2563eb;width:15px;height:15px;cursor:pointer;" />
            <span>I have read and agree to the
              <span id="open-terms"
                style="color:#2563eb;font-weight:700;text-decoration:underline;cursor:pointer;">
                Electronic Signature Terms & Conditions.
              </span>
            </span>
          </label>
        </div>

      </div>
    `,
    width: 780,
    padding: '2.25rem 2.25rem 2rem',
    showCancelButton: true,
    confirmButtonText: '✅ &nbsp;Save Signature',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#2563eb',
    cancelButtonColor: '#94a3b8',
    focusConfirm: false,
    customClass: { popup: 'sig-swal-web' },

    didOpen: () => {
      const canvas        = document.getElementById('signature-pad');
      const hint          = document.getElementById('sig-hint');
      const thickSlider   = document.getElementById('thickness-slider');
      const uploadInput   = document.getElementById('signature-upload');
      const uploadPreview = document.getElementById('upload-preview');
      const agreeChk      = document.getElementById('agree-terms');
      const openTerms     = document.getElementById('open-terms');
      const drawWrapper   = document.getElementById('draw-wrapper');
      const uploadWrapper = document.getElementById('upload-wrapper');
      const lblDraw       = document.getElementById('lbl-draw');
      const lblUpload     = document.getElementById('lbl-upload');
      const colorBtns     = document.querySelectorAll('[data-color]');

      // ── Resize canvas to its rendered size before SignaturePad init ──
      const rect = canvas.getBoundingClientRect();
      canvas.width  = rect.width;
      canvas.height = rect.height;

      // ── SignaturePad init ────────────────────────────────────
      const signaturePad = new SignaturePad(canvas, {
        penColor: '#0f172a',
        minWidth: 1.5,
        maxWidth: 3,
        backgroundColor: 'rgba(0,0,0,0)',  // transparent so CSS gradient bg shows
      });
      signaturePad.addEventListener('beginStroke', () => { hint.style.display = 'none'; });

      // Hide hint on first stroke
      canvas.addEventListener('mousedown',  () => { hint.style.display = 'none'; }, { once: true });
      canvas.addEventListener('touchstart', () => { hint.style.display = 'none'; }, { once: true });

      // ── Clear ────────────────────────────────────────────────
      document.getElementById('clear-signature').addEventListener('click', () => {
        signaturePad.clear();
        hint.style.display = 'flex';
      });

      // ── Thickness ────────────────────────────────────────────
      thickSlider.addEventListener('input', e => {
        const v = parseInt(e.target.value);
        signaturePad.minWidth = Math.max(0.5, v - 1);
        signaturePad.maxWidth = v;
      });

      // ── Color swatches ───────────────────────────────────────
      colorBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          signaturePad.penColor = btn.dataset.color;
          colorBtns.forEach(b => { b.style.border = '2px solid #e2e8f0'; b.style.transform = 'scale(1)'; });
          btn.style.border    = '3px solid #2563eb';
          btn.style.transform = 'scale(1.15)';
        });
        btn.addEventListener('mouseenter', () => { btn.style.transform = 'scale(1.1)'; });
        btn.addEventListener('mouseleave', () => {
          if (btn.dataset.color !== signaturePad.penColor) btn.style.transform = 'scale(1)';
        });
      });

      // ── Mode toggle ──────────────────────────────────────────
      document.querySelectorAll('input[name="sigType"]').forEach(radio => {
        radio.closest('label').addEventListener('click', () => {
          if (radio.value === 'draw') {
            drawWrapper.style.display   = 'block';
            uploadWrapper.style.display = 'none';
            lblDraw.style.background    = '#2563eb'; lblDraw.style.color    = '#fff';
            lblUpload.style.background  = 'transparent'; lblUpload.style.color = '#64748b';
          } else {
            drawWrapper.style.display   = 'none';
            uploadWrapper.style.display = 'block';
            lblUpload.style.background  = '#2563eb'; lblUpload.style.color  = '#fff';
            lblDraw.style.background    = 'transparent'; lblDraw.style.color = '#64748b';
            signaturePad.clear();
            hint.style.display = 'flex';
          }
        });
      });

      // ── Upload preview ───────────────────────────────────────
      uploadInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                try {
                    // 1. Process the image to remove the background
                    const processedBlob = await removeWhiteBackground(file);

                    // 2. Create a URL for the processed image
                    const imageUrl = URL.createObjectURL(processedBlob);

                    // 3. Update the preview
                    uploadPreview.src = imageUrl;
                    uploadPreview.style.display = 'block';

                    // Optional: Clean up the URL when the image is loaded to save memory
                    uploadPreview.onload = () => {
                        URL.revokeObjectURL(imageUrl);
                    };
                } catch (error) {
                    console.error("Error processing image:", error);
                }
            });

      // ── Terms modal ──────────────────────────────────────────
      const showTermsModal = () => {
        if (document.getElementById('terms-popup')) return;
        document.body.insertAdjacentHTML('beforeend', `
          <div id="terms-popup"
            style="position:fixed;inset:0;background:rgba(15,23,42,.6);
                   display:flex;align-items:center;justify-content:center;
                   z-index:99999;backdrop-filter:blur(3px);">
            <div style="background:#fff;width:90%;max-width:520px;border-radius:20px;
                        padding:28px;box-shadow:0 24px 60px rgba(0,0,0,.2);">
              <h2 style="font-weight:800;font-size:17px;color:#0f172a;margin-bottom:14px;letter-spacing:-.02em;">
                Electronic Signature Terms & Conditions.
              </h2>
              <div style="max-height:260px;overflow-y:auto;border:1.5px solid #e2e8f0;padding:14px;
                          border-radius:10px;font-size:13.5px;line-height:1.7;color:#475569;margin-bottom:18px;">
                By using this system to sign documents, you agree that your electronic signature (drawn or typed) is the <b> legal equivalent of your handwritten </b> signature. You consent to the use of electronic signatures for all documents processed through this system.
          You understand that:
                <ol style="padding-left:1.3rem;display:flex;flex-direction:column;gap:8px;">
                  <li>1. Your electronic signature <b>binds you legally</b> to the document you are signing.</li>
                  <li>2. The system will record your <b>user ID, timestamp, IP address, device information, and signature image</b> to validate authenticity.</li>
                  <li>3. The signed document is <b>stored securely</b> and cannot be altered without detection.</li>
                  <li>4. You may <b>request access, correction, or deletion</b> of your personal data in accordance with the <b>Data Privacy Act of 2012 (RA 10173)</b>.</li>
                  <li>5. You confirm that you are <b>authorized to sign</b> the document and agree to comply with company policies regarding document approvals.</li>
                </ol>
              </div>
              <div style="display:flex;justify-content:flex-end;">
                <button id="close-terms"
                  style="background:#2563eb;color:#fff;padding:10px 24px;border:none;
                         border-radius:10px;font-weight:700;font-size:13.5px;cursor:pointer;">
                  I Understand
                </button>
              </div>
            </div>
          </div>`);
        document.getElementById('close-terms').addEventListener('click', () => {
          document.getElementById('terms-popup')?.remove();
          agreeChk.checked = true;
        });
      };

      agreeChk.addEventListener('change', e => { if (e.target.checked) showTermsModal(); });
      openTerms.addEventListener('click', showTermsModal);

      // Expose for preConfirm
      window.signaturePadInstance = signaturePad;
    },

    preConfirm: () => {
      const signaturePad = window.signaturePadInstance;
      const agree        = document.getElementById('agree-terms');
      const uploadInput  = document.getElementById('signature-upload');
      const sigType      = document.querySelector('input[name="sigType"]:checked')?.value;

      if (!agree.checked) {
        $swal.showValidationMessage('Please agree to the Electronic Signature Terms & Conditions.');
        return false;
      }

      if (sigType === 'draw') {
        if (!signaturePad || signaturePad.isEmpty()) {
          $swal.showValidationMessage('Please draw your signature.');
          return false;
        }
        return { type: 'draw', data: signaturePad.toDataURL('image/png') };
      }

      if (!uploadInput.files.length) {
        $swal.showValidationMessage('Please upload a signature image.');
        return false;
      }

      return { type: 'upload', file: uploadInput.files[0] };
    },
  });

  // ================= SAVE SIGNATURE =================
  if (isConfirmed && result) {
    let blob;

    if (result.type === 'draw') {
      const byteString = atob(result.data.split(',')[1]);
      const mimeString = result.data.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++)
        ia[i] = byteString.charCodeAt(i);
      blob = new Blob([ab], { type: mimeString });
    } else {
      blob = await removeWhiteBackground(result.file);
    }

    const formData = new FormData();
    formData.append('signaturefile', blob, 'signature.png');

    await postusersignature(formData, $swal);
    await checkusersignature($swal);
    await confirmApproval(selectedId.value, null);
    $swal.fire({
      title: `Form ${text}!`,
      text: `The request has been ${text} successfully`,
      icon: 'success',
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
    await disapproveApproval(selectedId.value, remarks, $swal);

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
onMounted(async () => {
  await checkusersignature($swal);
  await getListOfTransactions();
  signatureFile.value = await getusersignature($swal);
  console.log(signatureFile.value);
});
</script>

<style>
@keyframes highlight-pulse {

  0%,
  100% {
    background-color: transparent;
  }

  50% {
    background-color: rgb(254 240 138);
    /* yellow-200 */
  }
}

.highlight-pulse {
  animation: highlight-pulse 0.6s ease-in-out 3;

}
</style>
