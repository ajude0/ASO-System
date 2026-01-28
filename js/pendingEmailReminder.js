import { API_BASE_URL } from "~/config";
import { getToken } from "./cryptoToken";

export const pendingEmailReminder = async (transactionid, $swal) => {
  try {
    const token = getToken();

    await $fetch(`${API_BASE_URL}/api/Transaction/pending-email-reminder`, {
      method: "POST",
      headers: {
        token: token,
        "Content-Type": "application/json",
      },
      body: {
        transactionId: transactionid,
      },
    });

    await $swal.fire({
      title: "Email Sent!",
      icon: "success",
      timer: 1000,
      showConfirmButton: false,
    });
  } catch (error) {
    console.error("Error sending signature reminder:", error);
    await $swal.fire({
      title: "Error",
      icon: "error",
      timer: 1000,
      showConfirmButton: false,
    });
  }
};
