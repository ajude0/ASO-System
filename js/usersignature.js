import { API_BASE_URL } from "~/config";
import { getToken } from "./cryptoToken";

export const nenunames = ref([]);
const router = useRouter();
export const messages = ref();

export const postusersignature = async (form, $swal) => {
  const token = getToken();
  try {
    const data = await $fetch(`${API_BASE_URL}/api/UserSignature`, {
      method: "POST",
      headers: {
        token: token,
      },
      body: form,
    });

    $swal.fire({
      title: "Success!",
      text: "Signature uploaded successfully.",
      icon: "success",
      width: 400,
      timer: 1200,
      showConfirmButton: false,
    });
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
