import { API_BASE_URL } from "~/config";
import { getToken } from "./cryptoToken";
export const availableApprovers = ref([]);
export const lastSearched = ref();
export const approverIndex = ref(0);
export const proxyIndex = ref(0);
export const query = ref({
  search: null,
});

export const getEmployees = async () => {
  const token = getToken();
  try {
    const response = await $fetch(
      `${API_BASE_URL}/api/Account/get-all-profile`,
      {
        headers: {
          token: token,
        },
        params: { ...query.value },
      }
    );
    approverIndex.value = 0;
    proxyIndex.value = 0;
    availableApprovers.value = response;
    lastSearched.value = query.value.search
  } catch (error) {
    console.error("Error fetching menus:", error);
  }
};


