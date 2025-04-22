import { getToken } from "./cryptoToken";
import { API_BASE_URL } from "~/config";
export const user = ref();

export const getProfile = async () => {
  
  const token = getToken();
  console.log(token);
  try {
    const response = await $fetch(`${API_BASE_URL}/api/account/get-profile`, {
      headers: {
        token: token,
      },
    });
    user.value = response;

  } catch (error) {
    console.error("Error fetching menus:", error);
  }
};
