import { getToken } from "./cryptoToken";
import { API_BASE_URL } from "~/config";

export const fetchSharedUsers = async (documentid) => {
  const token = getToken();

  try {
    const data = await $fetch(`${API_BASE_URL}/api/SharedDocuments/${documentid}`, {
      method: "GET",
      headers: {
        token: token,
        'Content-Type': 'application/json',
      },
    });
     return data;

  } catch (error) {
    console.error("Error setting status:", error);
  }
};
