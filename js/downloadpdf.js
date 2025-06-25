import { API_BASE_URL } from "~/config";
import { getToken } from "./cryptoToken";
export const isDownloading = ref({})

export const downloadvpnForm = async (id, title) => {
  isDownloading.value[id] = true;
  const token = getToken();
  try {
    const blob = await $fetch(`${API_BASE_URL}/api/Pdf/print-pdf-form/${id}`, {
      method: "POST",
      headers: {
        token: token,
      },
      responseType: "blob", // important: treat the response as a Blob
    });

    // Create a URL for the blob and trigger a download
    const url = window.URL.createObjectURL(new Blob([blob]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${title}_${id}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url); // Clean up
  } catch (error) {
    console.error("Error downloading VPN form:", error);
  } finally {
    isDownloading.value[id] = false;
  }
};
