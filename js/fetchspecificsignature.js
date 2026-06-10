import { API_BASE_URL } from "~/config";
import { getToken } from "./cryptoToken";

export const prePlacedSignatures = ref([]);

export const getspecificsignaturepositons = async (documentuploadid, currentEmplId, canViewAll = false) => {
  try {
    const token = getToken();
    const data = await $fetch(`${API_BASE_URL}/api/DocumentUploadSignature/${documentuploadid}`, {
      headers: {
        token: token,
      },
    });
    prePlacedSignatures.value = data;

    for (let i = 0; i < prePlacedSignatures.value.length; i++) {
      const item = prePlacedSignatures.value[i];

      if (item.signedBy) {
        // ✅ Only fetch signature image if:
        // - canViewAll is true (e.g. admin/document owner), OR
        // - this signature belongs to the current user
        const isOwner = item.assignedEmplId === currentEmplId;

        if (canViewAll || isOwner) {
          const signatureFile = await getspecificusersignature(item.protectedid);
          prePlacedSignatures.value[i].imageSrc = signatureFile;
        } else {
          // Explicitly null so UI knows there's no image to show
          prePlacedSignatures.value[i].imageSrc = "NO IMAGE";
        }
      }
    }
  } catch (error) {
    console.error("Error fetching form dropdown:", error);
  }
};
export const getspecificusersignature = async (id) => {
  try {
    const token = getToken();

    // Fetch the file as a Blob
    const blob = await $fetch(
      `${API_BASE_URL}/api/DocumentUploadSignature/signature-image/${id}`,
      {
        method: "GET",
        headers: {
          token: token,
        },
        responseType: "blob",
      }
    );

    if (blob != null) {
      // Create an Object URL from the blob
      const objectUrl = URL.createObjectURL(blob);

      return objectUrl; // return the URL string
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching signature:", error);

    let errorMessage = "Something went wrong. Please try again later.";

    if (error?.data) {
      if (error.data.innerError) errorMessage = error.data.innerError;
      else if (error.data.error) errorMessage = error.data.error;
      else if (error.data.message) errorMessage = error.data.message;
    }

    console.error(errorMessage);

    return null;
  }
};

