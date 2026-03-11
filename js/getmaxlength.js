import { API_BASE_URL } from "~/config";
import { getToken } from "./cryptoToken";

export const maxlength = ref({});

export const getMaxlength = async ($swal,entity) => {
  const token = getToken();
  try {
    const data = await $fetch(`${API_BASE_URL}/api/MaxLength`, {
      method: "GET",
      headers: {
        token: token,
      },
     params: {
    entity: entity // send the entity as query string ?entity=User
  }
    });
    maxlength.value = data;
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
