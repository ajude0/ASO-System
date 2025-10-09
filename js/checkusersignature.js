import { API_BASE_URL } from "~/config";
import { getToken } from "./cryptoToken";

export const nenunames = ref([]);
const router = useRouter();
export const messages = ref();
export const hasSignature = ref();
export const signaturepath =ref();

export const checkusersignature = async ($swal) => {
  const token = getToken();
  try {
    const data = await $fetch(`${API_BASE_URL}/api/Signature`, {
      method: "GET",
      headers: {
        token: token,
      },
    });
    if (!data) {
      hasSignature.value = null;
    } else {
      hasSignature.value = data.hasSignature;
    }
    console.log(hasSignature.value);
 
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
