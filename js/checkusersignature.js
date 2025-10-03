import { API_BASE_URL } from "~/config";
import { getToken } from "./cryptoToken";

export const nenunames = ref([]);
const router = useRouter();
export const messages = ref();
export const signaturepath = ref();

export const checkusersignature = async ($swal) => {
  const token = getToken();
  try {
    const data = await $fetch(`${API_BASE_URL}/api/UserSignature`, {
      method: "GET",
      headers: {
        token: token,
      },
    });
    if (!data) {
      signaturepath.value = null;
    } else {
      const blob = new Blob([data], { type: "image/png" });
      signaturepath.value = URL.createObjectURL(blob);
    }
 
  } catch (error) {
    console.error("Error:", error);
    if (error?.data) {
      let errorMessage = "Something went wrong. Please try again later.";

      if (error.data.innerError) {
        errorMessage = error.data.innerError; // show innerError first
      } else if (error.data.error) {
        errorMessage = error.data.error; // then error
      } else if (error.data.message) {
        errorMessage = error.data.message; // fallback to message
      }
      $swal.fire({
        title: "Error!",
        text: errorMessage,
        icon: "error",
        width: 400,
        timer: 1200,
        showConfirmButton: false,
      });
    }
  }
};
