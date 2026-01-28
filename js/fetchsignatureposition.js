import { API_BASE_URL } from "~/config";
import { getToken } from "./cryptoToken";

export const prePlacedSignatures = ref([]);

export const getsignaturepositons = async (documentuploadid) => {
  try {
    const token = getToken();
    const data = await $fetch(`${API_BASE_URL}/api/DocumentUploadSignature/${documentuploadid}`, {
      headers: {
        token: token,
      },
    });
    prePlacedSignatures.value = data;
     // Loop through dropdowns and fetch signature if signedBy has value
    for (let i = 0; i < prePlacedSignatures.value.length; i++) {
      const item = prePlacedSignatures.value[i];

      if (item.signedBy) {
        // Fetch the signature image
        const signatureFile = await getusersignature(item.id);

        // Attach to the dropdown object
        prePlacedSignatures.value[i].imageSrc = signatureFile;
      }
    }
  } catch (error) {
    console.error("Error fetching form dropdown:", error);
  }
};

export const getusersignature = async (id) => {
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

