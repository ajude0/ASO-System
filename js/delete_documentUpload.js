import { API_BASE_URL } from "~/config";
import { getToken } from "./cryptoToken";

const router = useRouter();
export const messages = ref();

export const deleteDocumentUploadById = async (id,$swal) => {
  const token = getToken();
  try {
    const data = await $fetch(`${API_BASE_URL}/api/DocumentUpload/softDelete/${id}`, {
      method: "POST",
      headers: {
        token: token,
      },
    });
    await $swal.fire({
        title: "Success",
        text: data.message,
        icon: "success",
        timer: 1000,
        showConfirmButton: false,
      });

  } catch (error) {
    let errorMessage = "Something went wrong. Please try again later.";

    // Check if the error response has a readable message
    if (error?.data?.message) {
      errorMessage = error.data.message;

     await $swal.fire({
        title: "Error",
        text: errorMessage,
        icon: "error",
        timer: 1000,
        showConfirmButton: false,
      });
    }
  }
};
