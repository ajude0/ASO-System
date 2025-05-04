import { API_BASE_URL } from "~/config";
import { getToken } from "./cryptoToken";
export const availableApprovers = ref();
export const query = ref({
  search: null,
});
export const getEmployees = async () => {
  const token = getToken();
  try {
    const response = await $fetch(`${API_BASE_URL}/api/Account/get-all-profile`, {
      headers: {
        token: token,
      },
      params: { ...query.value },
    });
    availableApprovers.value = response;
  } catch (error) {
    console.error("Error fetching menus:", error);
  }
};
