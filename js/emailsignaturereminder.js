import { API_BASE_URL } from "~/config";
import { getToken,getDocumentId} from "./cryptoToken";


export const emailsignaturereminder = async (emplid,$swal) => {
  try {
   
    const token = getToken();
     const docId = getDocumentId();
    await $fetch(`${API_BASE_URL}/api/DocumentUploadSignature/email-signature-reminder`, {
      method: "POST",
      headers: {
        token: token,
      },
      body: {
        documentUploadId: docId, // int
        emplId: emplid,          // string
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

export const sharedemailsignaturereminder = async (emplid,$swal,docID) => {
  try {
    const token = getToken();

    await $fetch(`${API_BASE_URL}/api/DocumentUploadSignature/email-signature-reminder`, {
      method: "POST",
      headers: {
        token: token,
      },
      body: {
        documentUploadId: docID, // int
        emplId: emplid,          // string
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
