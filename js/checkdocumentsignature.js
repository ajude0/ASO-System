import { API_BASE_URL } from "~/config";
import { getToken } from "./cryptoToken";


export const checkDocumentSignature = async (id) => {
      try {
        const token = getToken();
         await $fetch(
          `${API_BASE_URL}/api/DocumentUpload/${id}`,
          {
            method:"POST",
            headers: {
              token: token,
            },
          }
        );
        
      } catch (error) {
        console.error("Error fetching form dropdown:", error);
      } 
    };