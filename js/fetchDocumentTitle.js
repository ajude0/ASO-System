import { API_BASE_URL } from "~/config";
import { getToken } from "./cryptoToken";

export const title = ref();

export const fetchDocumentTitle = async (id) => {
      try {
        const token = getToken();
        const data = await $fetch(
          `${API_BASE_URL}/api/DocumentList/get-document-title/${id}`,
          {
            headers: {
              token: token,
            },
          }
        );
        title.value = data;
        
      } catch (error) {
        console.error("Error fetching form dropdown:", error);
      } 
    };