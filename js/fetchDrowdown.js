import { API_BASE_URL } from "~/config";
import { getToken } from "./cryptoToken";

export const dropdowns = ref();

export const getDropdowns = async () => {
      try {
        const token = getToken();
        const data = await $fetch(
          `${API_BASE_URL}/api/Dropdown`,
          {
            headers: {
              token: token,
            },
          }
        );
        dropdowns.value = data;
        
      } catch (error) {
        console.error("Error fetching form dropdown:", error);
      } 
    };