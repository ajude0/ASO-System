<template>
    <div>
        <button @click="backButton" type="button"
            class="flex items-center ms-6 mt-8 text-gray-700 hover:text-blue-600 transition-colors duration-200">
            <svg class="w-9 h-9" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M5 12h14M5 12l4-4m-4 4 4 4" />
            </svg>
            <span class="text-lg font-bold">Back</span>
        </button>
        <div>
            <div class="bg-white rounded-lg shadow-md p-6">
                <div class="bg-white rounded-lg shadow-md p-6 mb-4">
                    <div class="flex items-center gap-2 mb-4">
                        <h2 class="text-xl font-semibold">{{ pdfTitle }}</h2>
                    </div>
                </div>
                <div class="flex items-center gap-2 mb-4">
                    <div class="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                        1
                    </div>
                    <h2 class="text-xl font-semibold">Sign</h2>
                </div>

                <!-- Signature Upload -->
                <div v-if="!signatureFile" class="mb-6 p-4 bg-gray-50 rounded-xl shadow-md flex flex-col items-center">
                    <!-- Button -->
                    <button @click="createSignature"
                        class="flex items-center justify-center w-full max-w-xs px-4 py-3 bg-green-600 text-white font-semibold rounded-lg shadow hover:bg-green-700 active:bg-green-800 transition-colors duration-200 gap-2">
                        Create Signature
                    </button>

                    <!-- Warning Label -->
                    <p class="mt-3 text-center text-sm text-red-600 bg-red-100 rounded-md px-3 py-2 w-full shadow-sm">
                        ⚠️ You don’t have a current signature. Please create one to
                        continue.
                    </p>
                </div>

                <!-- Sign Button -->
                <button @click="openSigningModal" :disabled="!pdfFile || !signatureFile || prePlacedSignatures.length === 0
                    "
                    class="w-full px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed font-bold text-lg flex items-center justify-center gap-2">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    {{ userSignatures.length == 0 ? "View Document" : "Sign Document" }}
                </button>

            </div>
            <SigntureModal :is-open="isSigningModalOpen" :pdf-file="pdfFile" :signature-file="signatureFile"
                :current-user-name="currentUserName" :current-empl-id="currentEmplId"
                :pre-placed-signatures="prePlacedSignatures" @close="closeSigningModal"
                @save-all-signatures="handleSaveAllSignatures" />
            <ViewSignatureBoxPlacement :isOpen="isViewingModalopen" :pdfFile="pdfFile" :signatures="prePlacedSignatures"
                @close="isViewingModalopen = false" />
        </div>
    </div>
</template>

<script setup>
import SigntureModal from '~/components/SigntureModal.vue';
import SignaturePad from "signature_pad";
import { getToken, getSignDocumentId } from '~/js/cryptoToken';
import { postusersignature } from "~/js/usersignature";
import { API_BASE_URL } from "~/config";
import { getProfile, user } from "~/js/fetchUserProfile";
import { getsignaturepositons, prePlacedSignatures } from '~/js/fetchsignatureposition';
import { fetchDocumentPdf, pdfFile } from "~/js/fetchDocumentPdf";
import { fetchDocumentTitle, title } from "~/js/fetchDocumentTitle";
import { getusersignature } from "~/js/checkusersignature";
import { checkDocumentSignature } from '~/js/checkdocumentsignature';
import ViewSignatureBoxPlacement from '~/components/ViewSignatureBoxPlacement.vue';
import ThankYouPage from '~/components/ThankYouPage.vue';
import LoadingModal from '~/components/modal/LoadingModal.vue';

const { $swal } = useNuxtApp();
const documentId = ref();
const isSigningModalOpen = ref(false);
const currentUserName = ref();
const currentEmplId = ref();
const pdfTitle = ref();
const signatureFile = ref(null);
const isViewingModalopen = ref(false);
const canViewPage = ref(false);
const showThankYouPage = ref(false);
const loading = ref(true);


const getUserStats = (userName) => {
    const userSigs = prePlacedSignatures.value.filter(
        (s) => s.assignedTo === userName
    );
    const signed = userSigs.filter((s) => !s.isEmpty).length;
    const pending = userSigs.length - signed;
    return { total: userSigs.length, signed, pending };
};
const userSignatures = computed(() =>
    prePlacedSignatures.value.filter(
        s =>
            s.assignedEmplId === currentEmplId.value &&
            s.isEmpty
    )
)

const signaturesWithCurrentUserFlag = computed(() =>
    prePlacedSignatures.value.map(s => ({
        ...s,
        isCurrentUser: s.assignedEmplId === currentEmplId.value
    }))
)
// Open signing modal
const openSigningModal = () => {
    if (!pdfFile.value) {
        alert("Please upload a PDF first!");
        return;
    }
    console.log(signatureFile.value)
    if (!signatureFile.value) {
        alert("Please upload your signature image first!");
        return;
    }

    if (prePlacedSignatures.value.length === 0) {
        alert(
            'Please place signature boxes first using "Place Signature Boxes" button!'
        );
        return;
    }

    // const userSignatures = prePlacedSignatures.value.filter(
    //     (s) => s.assignedEmplId === currentEmplId.value && s.isEmpty
    // );

    if (userSignatures.value.length === 0) {
        isViewingModalopen.value = true;
    }
    else {
        isSigningModalOpen.value = true;
    }
};

const removeWhiteBackground = (file) => {
    return new Promise((resolve) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = () => (img.src = reader.result);
        reader.readAsDataURL(file);

        img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Remove white / near-white pixels
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                if (r > 245 && g > 245 && b > 245) {
                    data[i + 3] = 0; // transparent
                }
            }

            ctx.putImageData(imageData, 0, 0);

            canvas.toBlob((blob) => resolve(blob), "image/png", 1);
        };
    });
};

const createSignature = async (text) => {
    const { value: result, isConfirmed } = await $swal.fire({
        title: "Create your own signature",
        html: `
      <div style="display:flex; flex-direction:column; gap:16px; width:100%; align-items:center;">

        <label style="font-weight:600;">Choose how you want to sign:</label>
        <div style="display:flex; gap:16px;">
          <label><input type="radio" name="sigType" value="draw" checked /> Draw</label>
          <label><input type="radio" name="sigType" value="upload" /> Upload</label>
        </div>

        <!-- DRAW SIGNATURE -->
        <div id="draw-wrapper" style="width:100%; text-align:center;">
          <label style="font-weight:600;">Please sign below:</label>
          <canvas id="signature-pad" width="700" height="250"
            style="border:2px dashed #9ca3af; border-radius:12px; background:#f9fafb; width:100%; max-width:700px;">
          </canvas>

          <div style="display:flex; align-items:center; gap:10px; max-width:700px; margin:12px auto 0;">
            <label>Stroke:</label>
            <input id="thickness-slider" type="range" min="1" max="10" value="4" style="flex:1;">
            <span id="thickness-value">4</span>
          </div>

          <button id="clear-signature" class="swal2-cancel swal2-styled"
            style="margin-top:12px; background:#ef4444;">
            Clear Signature
          </button>
        </div>

        <!-- UPLOAD SIGNATURE -->
        <div id="upload-wrapper"
          style="display:none; width:100%; max-width:700px; text-align:center;">
          <label style="font-weight:600;">Upload signature (PNG/JPG):</label>
          <input type="file" id="signature-upload"
            accept="image/png,image/jpeg"
            style="display:block; margin:8px auto;" />

          <img id="upload-preview"
            style="
              display:none;
              margin:12px auto 0;
              max-height:150px;
              border:1px solid #e5e7eb;
              border-radius:8px;
            " />
        </div>

        <!-- TERMS -->
        <div style="width:100%; max-width:700px; text-align:left;">
          <label style="display:flex; align-items:center; gap:8px; font-size:14px;">
            <input type="checkbox" id="agree-terms" />
            <span>
              I have read and agree to the
              <span id="open-terms"
                style="color:#3b82f6; text-decoration:underline; cursor:pointer;">
                Terms and Conditions
              </span>
            </span>
          </label>
        </div>

      </div>
    `,
        width: 800,
        showCancelButton: true,
        confirmButtonText: "Confirm Signature",
        cancelButtonText: "Cancel",
        focusConfirm: false,

        didOpen: () => {
            const canvas = document.getElementById("signature-pad");
            const thicknessSlider = document.getElementById("thickness-slider");
            const thicknessValue = document.getElementById("thickness-value");
            const uploadInput = document.getElementById("signature-upload");
            const uploadPreview = document.getElementById("upload-preview");
            const agreeCheckbox = document.getElementById("agree-terms");
            const openTerms = document.getElementById("open-terms");

            const drawWrapper = document.getElementById("draw-wrapper");
            const uploadWrapper = document.getElementById("upload-wrapper");

            const radios = document.querySelectorAll('input[name="sigType"]');

            const signaturePad = new SignaturePad(canvas, {
                penColor: "black",
                minWidth: 2,
                maxWidth: 5,
            });

            // ================= TERMS MODAL =================
            const showTermsModal = () => {
                if (document.getElementById("terms-popup")) return;

                const termsHtml = `
                        <div id="terms-popup" 
                        style="
                            position: fixed; 
                            top: 0; left: 0; 
                            width: 100vw; height: 100vh; 
                            background: rgba(0,0,0,0.5);
                            display: flex; align-items: center; justify-content: center;
                            z-index: 99999;
                        ">
                        <div style="
                            background: white; 
                            width: 90%; max-width: 600px; 
                            border-radius: 12px; 
                            padding: 20px; 
                            box-shadow: 0 10px 20px rgba(0,0,0,0.2);
                        ">
                            <h2 style="font-weight:600; font-size:18px; margin-bottom:10px;">Terms and Conditions</h2>
                            <div style="max-height:300px; overflow-y:auto; border:1px solid #e5e7eb; padding:10px; border-radius:8px; font-size:14px; line-height:1.6; margin-bottom:16px;">
                            <ol style="padding-left:1.2rem;">
                                <li>By signing this form, you confirm that the information provided is true and accurate.</li>
                                <li>You acknowledge that this signature has the same legal validity as your handwritten signature.</li>
                                <li>Any falsification of information may result in disciplinary or legal action.</li>
                                <li>The organization reserves the right to verify your submission for authenticity.</li>
                                <li>All data collected will be processed in accordance with applicable data protection laws.</li>
                            </ol>
                            </div>
                            <div style="text-align:right;">
                            <button id="close-terms" 
                                style="background:#3b82f6; color:white; padding:8px 16px; border:none; border-radius:6px; cursor:pointer;">
                                I Understand
                            </button>
                            </div>
                        </div>
                        </div>
                    `;

                document.body.insertAdjacentHTML("beforeend", termsHtml);

                document.getElementById("close-terms").addEventListener("click", () => {
                    document.getElementById("terms-popup")?.remove();
                    agreeCheckbox.checked = true;
                });
            };

            agreeCheckbox.addEventListener("change", (e) => {
                if (e.target.checked) showTermsModal();
            });

            openTerms.addEventListener("click", showTermsModal);

            // Toggle draw / upload
            radios.forEach((radio) => {
                radio.addEventListener("change", () => {
                    if (radio.value === "draw" && radio.checked) {
                        drawWrapper.style.display = "block";
                        uploadWrapper.style.display = "none";
                    } else {
                        drawWrapper.style.display = "none";
                        uploadWrapper.style.display = "block";
                        signaturePad.clear();
                    }
                });
            });

            // Stroke thickness
            thicknessSlider.addEventListener("input", (e) => {
                const value = parseInt(e.target.value);
                thicknessValue.textContent = value;
                signaturePad.minWidth = Math.max(1, value - 1);
                signaturePad.maxWidth = value;
            });

            // Clear canvas
            document
                .getElementById("clear-signature")
                .addEventListener("click", () => signaturePad.clear());

            // Upload preview
            uploadInput.addEventListener("change", (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                    uploadPreview.src = reader.result;
                    uploadPreview.style.display = "block";
                };
                reader.readAsDataURL(file);
            });

            window.signaturePadInstance = signaturePad;
        },

        preConfirm: () => {
            const signaturePad = window.signaturePadInstance;
            const agree = document.getElementById("agree-terms");
            const uploadInput = document.getElementById("signature-upload");
            const sigType = document.querySelector(
                'input[name="sigType"]:checked'
            )?.value;

            if (!agree.checked) {
                $swal.showValidationMessage(
                    "Please agree to the Terms and Conditions."
                );
                return false;
            }

            if (sigType === "draw") {
                if (!signaturePad || signaturePad.isEmpty()) {
                    $swal.showValidationMessage("Please draw your signature.");
                    return false;
                }
                return { type: "draw", data: signaturePad.toDataURL("image/png") };
            }

            if (!uploadInput.files.length) {
                $swal.showValidationMessage("Please upload a signature image.");
                return false;
            }

            return { type: "upload", file: uploadInput.files[0] };
        },
    });

    // ================= SAVE SIGNATURE =================
    if (isConfirmed && result) {
        let blob;

        if (result.type === "draw") {
            const byteString = atob(result.data.split(",")[1]);
            const mimeString = result.data.split(",")[0].split(":")[1].split(";")[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++)
                ia[i] = byteString.charCodeAt(i);
            blob = new Blob([ab], { type: mimeString });
        } else {
            blob = await removeWhiteBackground(result.file);
        }

        const formData = new FormData();
        formData.append("signaturefile", blob, "signature.png");

        await postusersignature(formData, $swal);
        signatureFile.value = await getusersignature($swal);
        $swal.fire({
            title: `Success`,
            text: ``,
            icon: "success",
            width: 400,
            timer: 1200,
            showConfirmButton: false,
        });
    }
};

// Handle signature application
const handleSaveAllSignatures = async (updatedSignatures) => {

    const token = getToken();
    const form = new FormData()

    form.append("title", "SAMPLE")
    form.append("file", pdfFile.value)

    // append array correctly
    updatedSignatures.forEach((sig, i) => {
        if (sig.id != null) {
            form.append(`signatories[${i}].id`, sig.id)
        }
        if (sig.isEmpty != null) {
            form.append(`signatories[${i}].isEmpty`, sig.isEmpty == true ? 1 : 0)
        }
        form.append(`signatories[${i}].employeeId`, sig.assignedEmplId)
        form.append(`signatories[${i}].canvasHeight`, sig.canvasHeight)
        form.append(`signatories[${i}].canvasWidth`, sig.canvasWidth)
        form.append(`signatories[${i}].color`, sig.color)
        form.append(`signatories[${i}].dateLock`, sig.dateLock == true ? 1 : 0)
        form.append(`signatories[${i}].dateX`, sig.datePosition ? sig.datePosition.x : 0)
        form.append(`signatories[${i}].dateY`, sig.datePosition ? sig.datePosition.y : 0)
        form.append(`signatories[${i}].dateCanvasHeight`, sig.datePosition ? sig.datePosition.canvasHeight : 0)
        form.append(`signatories[${i}].dateCanvasWidth`, sig.datePosition ? sig.datePosition.canvasWidth : 0)
        form.append(`signatories[${i}].dateWidth`, sig.datePosition ? sig.datePosition.width : 0)
        form.append(`signatories[${i}].dateHeight`, sig.datePosition ? sig.datePosition.height : 0)
        form.append(`signatories[${i}].hasDate`, sig.hasDate == true ? 1 : 0)
        form.append(`signatories[${i}].height`, sig.height)
        form.append(`signatories[${i}].width`, sig.width)
        form.append(`signatories[${i}].page`, sig.page)
        form.append(`signatories[${i}].isEmpty`, sig.isEmpty)
        form.append(`signatories[${i}].signatureLock`, sig.signatureLock == true ? 1 : 0)
        form.append(`signatories[${i}].y`, sig.y)
        form.append(`signatories[${i}].x`, sig.x)
        form.append(`signatories[${i}].enforceSequentialOrder`, sig.enforceSequentialOrder == true ? 1 : 0)
        form.append(`signatories[${i}].approvalOrder`, sig.approvalOrder)
        form.append(`signatories[${i}].signatureDate`, sig.signatureDate ? formatDateToISO(sig.signatureDate) : new Date().toISOString());
    })
    try {
        await $fetch(`${API_BASE_URL}/api/DocumentUploadSignature/sign-signature/${documentId.value}`, {
            method: "POST",
            body: form,
            headers: {
                token: token,
            },
        });
        await $swal.fire({
            title: "Signed Successfully!",
            text: "The request has been signed successfully.",
            icon: "success",
            timer: 1000,
            showConfirmButton: false,
        });
        await checkDocumentSignature(documentId.value);


    } catch (error) {
        let errorMessage = "Something went wrong. Please try again later.";

        // Check if the error response has a readable message
        if (error?.data?.message) {
            errorMessage = error.data.message;

            showToast({

                message: errorMessage,
                type: "error",
                timer: 1000,
                showConfirmButton: false,
            });
        }
    }

};

const closeSigningModal = () => {
    isSigningModalOpen.value = false;
};

const router = useRouter()

const backButton = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
     router.push("/main/638992220838277083");
  }
}


definePageMeta({
    middleware: "auth", // 👈 Tells Nuxt to run the "auth" middleware
});

onMounted(async () => {
    loading.value = true;
    await getProfile();
    currentEmplId.value = user.value.empid;
    currentUserName.value = user.value.requestorname;
    documentId.value = await getSignDocumentId();
    await getsignaturepositons(documentId.value);
    await fetchDocumentPdf(documentId.value);
    await fetchDocumentTitle(documentId.value);
    pdfTitle.value = title.value;
    signatureFile.value = await getusersignature($swal);
    loading.value = false;
});

</script>

<style scoped></style>