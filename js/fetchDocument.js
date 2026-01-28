import { getToken } from "./cryptoToken";
import { API_BASE_URL } from "~/config";
import { decryptData } from "./cryptoToken";

export const loading = ref(false);
export const formTitles = ref([]);
export const formDetails = ref({});
export const forms = ref({});
export const highlightedIndex = ref(0);
export const totalEntries = ref(0);
export const totalPages = ref(0);
export const query = ref({
  Search: "",
  Status: "",
  SortBy: 'Createddate',  // default sort (backend fallback also handles this)
  IsDescending: true,
  IsApproved: "",
  PageNumber: 1,
  PageSize: 5,
});


  export const getListOfDocuments = async () => {
    loading.value = true;
    const token = getToken();
    try {
      if (!query.value || !query.value.PageSize) {
        throw new Error("PageSize is required in query.");
      }
  
      const response = await $fetch(`${API_BASE_URL}/api/DocumentList`, {
        headers: {
          token: token,
        },
        params: { ...query.value },
      });
  
      if (!response || !response.forms) {
        throw new Error("No transactions found or error in response.");
      }
  
      forms.value = response.forms;
      totalEntries.value = response.totalCount;
      totalPages.value = Math.ceil(response.totalCount / query.value.PageSize);
  
    } catch (error) {
      console.error("Error fetching transactions:", error.message || error);
    } finally {
      loading.value = false;
    }
  };
  
  export const sortBy = (column) => {
    if (query.value.SortBy === column) {
      // reverse direction if same column clicked again
      query.value.IsDescending = !query.value.IsDescending
    } else {
      query.value.SortBy = column
      query.value.IsDescending = false
    }
    getListOfDocuments()
  }
  
  export const changePageSize = () => {
    query.value.PageNumber = 1 // reset to first page
    getListOfDocuments()
  }

  export const changePage = (page) => {
    if (page < 1 || page > totalPages.value) return;
    query.value.PageNumber = page;
    getListOfDocuments();
  };
  
  export const generatePagination = () => {
    if (totalPages.value <= 1) return [];
    let pages = [];
    const current = query.value.PageNumber;
    const maxVisible = 5;
  
    if (totalPages.value <= maxVisible) {
      for (let i = 1; i <= totalPages.value; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (current > 3) pages.push("...");
  
      let start = Math.max(2, current - 1);
      let end = Math.min(totalPages.value - 1, current + 1);
  
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
  
      if (current < totalPages.value - 2) pages.push("...");
      pages.push(totalPages.value);
    }
    return pages;
  };

  export const softDeleteForm = async (id) => {
    loading.value = true;
    const token = getToken();
  
    try {
      await $fetch(`${API_BASE_URL}/api/Form/soft-delete/${id}`, {
        method: "POST",
        headers: {
          token: token,
        },
      });
      getListOfDocuments();
    } catch (error) {
      console.error("Error deleting transaction:", error);
    } finally{
      loading.value = false;
    }
  };