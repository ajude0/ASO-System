
import { API_BASE_URL } from "~/config"
import { getToken } from "./cryptoToken";


export const searchQuery = ref(null);
export const loading = ref(false);
export const justifications = ref([]);

const debounce = (fn, delay) => {
    let timeout
    return (...args) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => fn(...args), delay)
    }
  }
export const searchJustifications = async (id) => {
  const token = getToken();
    if (!searchQuery.value) return // Don't search if the query is empty
    loading.value = true
  
    try {
      const response = await $fetch(`${API_BASE_URL}/api/ObjectSource/GetJustifications/${id}`, {
        headers: {
          token: token,
        },
        params: { name: searchQuery.value },
      })
      justifications.value = response
    } catch (error) {
      console.error('Error fetching justifications:', error)
    } finally {
      loading.value = false
    }
  }

  export const debouncedSearch = debounce((storeId) => {
    searchJustifications(storeId);
  }, 500);