<template>

  <div class="flex flex-col md:flex-row justify-between mb-4">
    <div class="flex gap-2">
      <div class="relative text-gray-500 focus-within:text-gray-900">
        <!-- Left Icon -->
        <div class="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <svg class="w-5 h-5" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M17.5 17.5L15.4167 15.4167M15.8333 9.16667C15.8333 5.48477 12.8486 2.5 9.16667 2.5C5.48477 2.5 2.5 5.48477 2.5 9.16667C2.5 12.8486 5.48477 15.8333 9.16667 15.8333C11.0005 15.8333 12.6614 15.0929 13.8667 13.8947C15.0814 12.6872 15.8333 11.0147 15.8333 9.16667Z"
              stroke="#9CA3AF" stroke-width="1.6" stroke-linecap="round" />
          </svg>
        </div>
        <!-- Clear Icon -->
        <div v-if="query.Search" class="absolute inset-y-0 right-3 flex items-center">
          <svg @click="clearSearch" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
            stroke-width="1.5" stroke="currentColor" class="size-5 cursor-pointer text-red-500">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <!-- Input -->
        <input type="text" v-model="query.Search" @keydown.enter="getListOfPendingDocuments"
          class="block w-52 md:w-80 h-11 pr-10 pl-10 py-2.5 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Search documents…" />
      </div>
      <button @click="getListOfPendingDocuments"
        class="h-11 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-width="2" d="m21 21-3.5-3.5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
        </svg>
      </button>
    </div>
  </div>

  <!-- ─── LOADING SKELETON ─── -->
  <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    <div v-for="i in 6" :key="i" class="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
      <div class="flex items-start justify-between mb-3">
        <div class="h-4 bg-gray-200 rounded w-10"></div>
        <div class="h-6 bg-gray-200 rounded-full w-20"></div>
      </div>
      <div class="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div class="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
      <div class="border-t border-gray-100 pt-3 flex items-center justify-between">
        <div class="h-4 bg-gray-200 rounded w-28"></div>
        <div class="h-8 bg-gray-200 rounded-lg w-16"></div>
      </div>
    </div>
  </div>

  <!-- ─── CARD GRID ─── -->
  <div v-else-if="forms.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    <div
      v-for="(form, index) in forms"
      :key="index"
      class="doc-card bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3 hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer group"
      @click="viewDocument(form.id)"
    >
      <!-- Top row: ID badge + action -->
      <div class="flex items-center justify-between">
        <span class="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414A1 1 0 0 1 19 9.414V19a2 2 0 0 1-2 2Z" />
          </svg>
          #{{ form.id }}
        </span>
        <!-- View button -->
        <button
          @click.stop="viewDocument(form.id)"
          class="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg group-hover:bg-green-600 group-hover:text-white group-hover:border-green-600 transition-all duration-200"
          title="View Document"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
          View
        </button>
      </div>

      <!-- Document title -->
      <div>
        <p class="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{{ form.title }}</p>
      </div>

      <!-- Meta row -->
      <div class="flex flex-col gap-1.5 text-xs text-gray-500">
        <div class="flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
          <span class="truncate font-medium text-gray-700">{{ form.user }}</span>
        </div>
        <div class="flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
          <span>{{
            new Date(form.createddate).toLocaleString("en-US", {
              year: "numeric", month: "short", day: "numeric",
              hour: "numeric", minute: "numeric", hour12: true,
            })
          }}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- ─── EMPTY STATE ─── -->
  <div v-else class="flex flex-col items-center justify-center py-16 text-center">
    <div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
      <svg class="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414A1 1 0 0 1 19 9.414V19a2 2 0 0 1-2 2Z" />
      </svg>
    </div>
    <p class="text-gray-500 font-medium">No Documents Found</p>
    <p class="text-gray-400 text-sm mt-1">Try adjusting your search.</p>
  </div>

  <!-- ─── PAGINATION ─── -->
  <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-5 gap-4">
    <!-- Page info + jump -->
    <div class="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-sm text-gray-600">
      <span>Showing</span>
      <input v-model.number="pageNumberDisplay" @keyup.enter="handlePageInput" type="number"
        :min="totalPages === 0 ? 0 : 1" :max="totalPages"
        class="w-14 px-2 py-1 border border-gray-300 rounded text-center text-sm" />
      <span>of {{ totalPages }} {{ totalPages <= 1 ? "Page" : "Pages" }} ({{ totalEntries }} {{ totalEntries <= 1 ? "Entry" : "Entries" }})</span>
      <button @click="handlePageInput" class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors">Go</button>
    </div>

    <!-- Page buttons -->
    <div class="flex flex-wrap justify-center gap-1">
      <button @click="changePage(query.PageNumber - 1)"
        :disabled="query.PageNumber === 1"
        class="px-2 py-1.5 border rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" width="1.2em" height="1.2em" viewBox="0 0 24 24">
          <path fill="currentColor" d="m14 18l-6-6l6-6l1.4 1.4l-4.6 4.6l4.6 4.6z" />
        </svg>
      </button>
      <template v-for="page in generatePagination()" :key="page">
        <span v-if="typeof page === 'string'"
          class="px-3 py-1.5 border rounded-lg text-gray-400 cursor-default text-sm">{{ page }}</span>
        <button v-else @click="changePage(page)"
          :class="query.PageNumber === page ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-600 hover:bg-gray-100'"
          class="px-3 py-1.5 border rounded-lg text-sm transition-colors">
          {{ page }}
        </button>
      </template>
      <button @click="changePage(query.PageNumber + 1)"
        :disabled="query.PageNumber === totalPages"
        class="px-2 py-1.5 border rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" width="1.2em" height="1.2em" viewBox="0 0 24 24">
          <path fill="currentColor" d="M12.6 12L8 7.4L9.4 6l6 6l-6 6L8 16.6z" />
        </svg>
      </button>
    </div>

    <!-- Rows per page -->
    <div class="flex items-center justify-center sm:justify-end gap-2 text-sm text-gray-600">
      <label for="pageSize">Rows per page:</label>
      <select id="pageSize" v-model.number="query.PageSize" @change="changePageSize"
        class="border border-gray-300 rounded px-2 py-1 text-sm">
        <option value="5">5</option>
        <option value="10">10</option>
        <option value="20">20</option>
        <option value="100">100</option>
      </select>
    </div>
  </div>

</template>

<script setup>
import { getListOfPendingDocuments, generatePagination, changePage, totalEntries, totalPages, query, loading, forms, sortBy, changePageSize } from "~/js/fetchPendingDocuments";
import { fetchCanAccess, nenunames, canAdd, canDelete, canEdit } from "~/js/fetchMenu";
import { encryptData } from "~/js/cryptoToken";

const router = useRouter();
const paramid = ref();
const { $swal } = useNuxtApp();

async function viewDocument(id) {
  localStorage.setItem("signDocumentId", encryptData(id));
  router.push("/main/639098620889818896/mobileSignDocument");
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

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.doc-card {
  transition: box-shadow 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
}
.doc-card:active {
  transform: scale(0.98);
}
</style>