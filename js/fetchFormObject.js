import { API_BASE_URL } from "~/config";
import { getToken,getFormId } from "./cryptoToken";

export const forms = ref([{}]);
export const loading = ref(false)

export const getFormObject = async () => {
    const formId = getFormId();
    const token = getToken();
    loading.value = true;
    try {
      const data = await $fetch(`${API_BASE_URL}/api/FormObject/get-form/${formId}`, {
        headers: {
          token: token,
        }
      });
 
      forms.value = data;
      console.log(forms.value);
    } catch (error) {
      console.error("Error fetching menus:", error);
    } finally{
      loading.value = false;
    }
  };