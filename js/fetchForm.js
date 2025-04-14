import { getToken } from "./cryptoToken";
import { API_BASE_URL } from "~/config";

export const formTitles = ref([]);
export const formDetails = ref({});

export const getFormTitle = async () => {
    const token = getToken();
    try {
      const response = await $fetch(`${API_BASE_URL}/api/FormObject`, {
        headers: {
          token: token,
        },
      });
      formTitles.value = response;
      console.log('hey');
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
    } catch (error) {
      console.error("Error fetching form details:", error);
    } 
  };