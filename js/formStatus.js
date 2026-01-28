import { getToken, getFormId } from "./cryptoToken";
import { API_BASE_URL } from "~/config";

export const setStatus = async (status) => {
  const token = getToken();
  const formId = getFormId();
  try {
    await $fetch(`${API_BASE_URL}/api/Form/set-status/${formId}`, {
      method: "POST",
      headers: {
        token: token,
        'Content-Type': 'application/json',
      },
      body: status,
    });
    
  } catch (error) {
    console.error("Error setting status:", error);
  }
};
