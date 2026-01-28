import { getToken } from "./cryptoToken";
import { API_BASE_URL } from "~/config";

export const pdfFile = ref(null);

export const fetchDocumentPdf = async (id) => {
  try {
    const token = getToken(); // if API requires auth

    // Fetch the file as a blob
    const blob = await $fetch(`${API_BASE_URL}/api/DocumentList/get-document-pdf/${id}`, {
      method: "GET",
      headers: {
        token: token,
      },
      responseType: "blob",
    });

    // Convert blob to a File object
    const file = new File([blob], `document_${id}.pdf`, { type: "application/pdf" });

    pdfFile.value = file;

  } catch (error) {
    console.error("Error fetching PDF:", error);
  }
};