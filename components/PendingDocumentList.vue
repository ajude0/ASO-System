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
                <input type="text" id="default-search" v-model="query.Search" @keydown.enter="getListOfPendingDocuments"
                    class="block w-52 md:w-80 h-11 pr-10 pl-10 py-2.5 text-base font-normal shadow-xs text-gray-900 bg-transparent border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none"
                    placeholder="Search" />
            </div>
            <button @click="getListOfPendingDocuments"
                class="py-3 px-4 bg-blue-500 h-11 text-white rounded-md hover:bg-blue-700">
                <svg class="w-6 h-6 text-gray-50 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
                    width="24" height="24" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" stroke-linecap="round" stroke-width="2"
                        d="m21 21-3.5-3.5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
                </svg>
            </button>
        </div>
        
    </div>
    <div class="bg-white flex flex-col rounded">
        <div class="flex flex-col">
            <div class="overflow-auto w-full pb-4">
                <div class="min-w-full inline-block align-middle">
                    <div class="overflow-hidden border rounded-md border-gray-300">
                        <table v-if="!loading" class="table-auto min-w-full rounded-xl">
                            <thead>
                                <tr class="bg-gray-50">
                                    <th @click="sortBy('Id')"
                                        class="p-5 text-left text-sm font-semibold text-gray-900 capitalize cursor-pointer select-none">
                                        <div class="flex items-center gap-1">
                                            <span>ID</span>
                                            <SortIcon :active="query.SortBy === 'Id'"
                                                :descending="query.IsDescending" />
                                        </div>
                                    </th>
                                    <th @click="sortBy('Form')"
                                        class="p-5 text-left text-sm font-semibold text-gray-900 capitalize cursor-pointer select-none">
                                        <div class="flex items-center gap-1">
                                            <span>Form</span>
                                            <SortIcon :active="query.SortBy === 'Form'"
                                                :descending="query.IsDescending" />
                                        </div>
                                    </th>

                                   
                                    <th @click="sortBy('Employeename')"
                                        class="p-5 text-left text-sm font-semibold text-gray-900 capitalize cursor-pointer select-none">
                                        <div class="flex items-center gap-1">
                                            <span>Created By</span>
                                            <SortIcon :active="query.SortBy === 'Employeename'"
                                                :descending="query.IsDescending" />
                                        </div>
                                    </th>
                                    <th @click="sortBy('Createddate')"
                                        class="p-5 text-left text-sm font-semibold text-gray-900 capitalize cursor-pointer select-none">
                                        <div class="flex items-center gap-1">
                                            <span>Created Date</span>
                                            <SortIcon :active="query.SortBy === 'Createddate'"
                                                :descending="query.IsDescending" />
                                        </div>
                                    </th>

                                    <th scope="col"
                                        class="p-5 text-left whitespace-nowrap text-sm leading-6 font-semibold text-gray-900 capitalize">
                                        Actions
                                    </th>
                                    <th scope="col"
                                        class="p-5 text-left whitespace-nowrap text-sm leading-6 font-semibold text-gray-900 capitalize">
                                    </th>
                                </tr>
                            </thead>

                            <tbody class="divide-y divide-gray-300">
                                <tr v-for="(form, index) in forms" :key="index"
                                    class="bg-white transition-all duration-500 hover:bg-gray-50">
                                    <td class="p-5 whitespace-nowrap text-sm leading-6 font-medium text-gray-900">
                                        {{ form.id }}
                                    </td>
                                    <td class="p-5 whitespace-nowrap text-sm leading-6 font-medium text-gray-900">
                                        {{ form.title }}
                                    </td>

                                  
                                    <td class="p-5 whitespace-nowrap text-sm leading-6 font-medium text-gray-900">
                                        {{ form.user }}
                                    </td>

                                    <td class="p-5 whitespace-nowrap text-sm leading-6 font-medium text-gray-900">
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
                                        <button @click="viewDocument(form.id)"
                                            class="p-2 rounded-full bg-white group transition-all duration-500 hover:bg-green-600 flex item-center"
                                            title="View Transaction">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                                                fill="currentColor" width="20" height="20">
                                                <path class="fill-green-600 group-hover:fill-white"
                                                    d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
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

                        <div v-if="forms.length === 0 && !loading" class="p-5 text-center text-gray-500">
                            No Documents
                        </div>
                    </div>
                </div>
            </div>

            <div
                class="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-2 space-y-4 sm:space-y-0 sm:space-x-2 mb-2">
                <!-- Left side: Page info + input -->
                <div class="flex flex-wrap items-center justify-center sm:justify-start space-x-2">
                    <span>Showing</span>
                    <input v-model.number="pageNumberDisplay" @keyup.enter="handlePageInput" type="number"
                        :min="totalPages === 0 ? 0 : 1" :max="totalPages"
                        class="w-16 px-2 py-1 border border-gray-300 rounded text-center" />
                    <span>
                        out of {{ totalPages }} {{ totalPages <= 1 ? "Page" : "Pages" }} ({{ totalEntries }} {{
                            totalEntries <= 1 ? "Entry" : "Entries" }}) </span>
                            <button @click="handlePageInput"
                                class="py-1 px-4 bg-blue-500 hover:bg-blue-700 rounded-md text-white">
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


</template>

<script setup>

import { getListOfPendingDocuments,generatePagination, changePage, totalEntries, totalPages, query, loading, forms, sortBy, changePageSize } from "~/js/fetchPendingDocuments";
import {
    fetchCanAccess,
    nenunames,
    canAdd,
    canDelete,
    canEdit,
} from "~/js/fetchMenu";
import { encryptData } from "~/js/cryptoToken";

const router = useRouter();
const paramid = ref();
const { $swal } = useNuxtApp();
const isViewModalOpen = ref(false);


async function viewDocument(id){
    localStorage.setItem("signDocumentId", encryptData(id));
    router.push("/main/638992220838277083/signDocument")
}

function clearSearch() {
    query.value.Search = "";
    getListOfPendingDocuments();
}
onMounted(() => {
    getListOfPendingDocuments();
    const hash = window.location.hash;
    const parts = hash.split("/");
    paramid.value = parts[parts.length - 1];
    fetchCanAccess(paramid.value);
});

</script>

<style lang="scss" scoped></style>