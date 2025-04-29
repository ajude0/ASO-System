import { getToken } from "./cryptoToken";
import { API_BASE_URL } from "~/config";
import { decryptData } from "./cryptoToken";

export const loading = ref(false);
export const formTitles = ref([]);
export const formDetails = ref({});
export const forms = ref({});
export const totalEntries = ref(0);
export const totalPages = ref(0);
export const query = ref({
  Search: "",
  Status:"",
  IsApproved: "",
  PageNumber: 1,
  PageSize: 5,
});

export const getFormTitle = async () => {
    const token = getToken();
    try {
      const response = await $fetch(`${API_BASE_URL}/api/FormObject`, {
        headers: {
          token: token,
        },
      });
      formTitles.value = response;
    
    } catch (error) {
      console.error("Error fetching menus:", error);
    } 
}

export const getFormDetails = async (formId) => {
  console.log(formId);
    try {
      const token = getToken();
      const response = await $fetch(
        `${API_BASE_URL}/api/FormObject/${formId}`,
        {
          headers: {
            token: token,
          },
        }
      );
      formDetails.value = response.data;
      console.log(response.data)
    } catch (error) {
      console.error("Error fetching form details:", error);
    } 
  };

  export const getListOfForms = async () => {
    loading.value = true;
    const token = getToken();
    try {
      if (!query.value || !query.value.PageSize) {
        throw new Error("PageSize is required in query.");
      }
  
      const response = await $fetch(`${API_BASE_URL}/api/Form`, {
        headers: {
          token: token,
        },
        params: { ...query.value },
      });
  
      if (!response || !response.forms) {
        throw new Error("No transactions found or error in response.");
      }
  
      forms.value = response.forms;
      console.log(forms.value);
      totalEntries.value = response.totalCount;
      totalPages.value = Math.ceil(response.totalCount / query.value.PageSize);
  
    } catch (error) {
      console.error("Error fetching transactions:", error.message || error);
    } finally {
      loading.value = false;
    }
  };

  export const changePage = (page) => {
    if (page < 1 || page > totalPages.value) return;
    query.value.PageNumber = page;
    getListOfForms();
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
      getListOfForms();
    } catch (error) {
      console.error("Error deleting transaction:", error);
    } finally{
      loading.value = false;
    }
  };