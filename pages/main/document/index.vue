<template>
    <div v-if="showThankYouPage">
        <ThankYouPage :transaction-id="documentId" :transaction-name="title"  @refresh="refreshThankYou"/>
    </div>
    <div v-else>
        <div v-if="canViewPage">
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
import { getUrlDocumentId, getToken } from '~/js/cryptoToken';
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

const refreshThankYou = async() => {
    showThankYouPage.value = false;
    await getsignaturepositons(documentId.value);
    await fetchDocumentPdf(documentId.value);
    await fetchDocumentTitle(documentId.value);
}

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

const createSignature = async (text) => {
    const { value: signature, isConfirmed } = await $swal.fire({
        title: `Create your own signature`,
        html: `
                <div style="display:flex; flex-direction:column; align-items:center; gap:1rem; width:100%;">
                    <label style="font-weight:600; font-size:16px;">Please sign below:</label>
                    <canvas id="signature-pad" width="700" height="250" 
                    style="border:2px dashed #9ca3af; border-radius:12px; background:#f9fafb; width:100%; max-width:700px; height:250px;"></canvas>
                    
                    <div style="display:flex; align-items:center; gap:10px; width:100%; max-width:700px; margin-top:12px;">
                    <label style="font-size:14px; font-weight:600;">Stroke:</label>
                    <input id="thickness-slider" type="range" min="1" max="10" value="4" style="flex:1; cursor:pointer;">
                    <span id="thickness-value" style="min-width:25px; text-align:center; font-weight:600;">4</span>
                    </div>

                    <button id="clear-signature" class="swal2-cancel swal2-styled" 
                    style="margin-top:12px; background:#ef4444; border-radius:6px; padding:8px 16px; font-size:14px;">
                    Clear Signature
                    </button>

                    <div style="text-align:left; width:100%; max-width:700px; margin-top:16px;">
                    <label style="display:flex; align-items:center; gap:8px; font-size:14px;">
                        <input type="checkbox" id="agree-terms">
                        <span>I have read and agree to the <span style="color:#3b82f6; text-decoration:underline; cursor:pointer;">Terms and Conditions</span></span>
                    </label>
                    </div>
                </div>
    `,
        width: 800,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: "Confirm Signature",
        cancelButtonText: "Cancel",
        didOpen: () => {
            const canvas = document.getElementById("signature-pad");
            const thicknessSlider = document.getElementById("thickness-slider");
            const thicknessValue = document.getElementById("thickness-value");
            const agreeCheckbox = document.getElementById("agree-terms");

            const signaturePad = new SignaturePad(canvas, {
                backgroundColor: "rgba(255,255,255,0)",
                penColor: "black",
                minWidth: 2,
                maxWidth: 5,
            });

            // Stroke slider
            thicknessSlider.addEventListener("input", (e) => {
                const value = parseInt(e.target.value);
                thicknessValue.textContent = value;
                signaturePad.minWidth = Math.max(1, value - 1);
                signaturePad.maxWidth = value;
            });

            // Clear signature
            document
                .getElementById("clear-signature")
                ?.addEventListener("click", () => signaturePad.clear());

            // Show Terms popup automatically when checkbox is checked
            agreeCheckbox.addEventListener("change", (e) => {
                if (e.target.checked) {
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

                    document
                        .getElementById("close-terms")
                        .addEventListener("click", () => {
                            document.getElementById("terms-popup")?.remove();
                            agreeCheckbox.checked = true; // keep it checked after reading
                        });
                }
            });

            window.signaturePadInstance = signaturePad;
        },
        preConfirm: () => {
            const signaturePad = window.signaturePadInstance;
            const agreeCheckbox = document.getElementById("agree-terms");

            if (!signaturePad || signaturePad.isEmpty()) {
                $swal.showValidationMessage(
                    "✍️ Please provide a signature before confirming."
                );
                return false;
            }

            if (!agreeCheckbox.checked) {
                $swal.showValidationMessage(
                    "✅ Please read and agree to the Terms and Conditions before proceeding."
                );
                return false;
            }

            return signaturePad.toDataURL("image/png");
        },
    });

    if (isConfirmed && signature) {
        const byteString = atob(signature.split(",")[1]);
        const mimeString = signature.split(",")[0].split(":")[1].split(";")[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++)
            ia[i] = byteString.charCodeAt(i);
        const blob = new Blob([ab], { type: mimeString });

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
        showThankYouPage.value = true;

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
definePageMeta({
    middleware: "auth", // 👈 Tells Nuxt to run the "auth" middleware
});

onMounted(async () => {
    await getProfile();

    currentEmplId.value = user.value.empid;
    currentUserName.value = user.value.requestorname;
    documentId.value = await getUrlDocumentId();

    await getsignaturepositons(documentId.value);
    await fetchDocumentPdf(documentId.value);
    await fetchDocumentTitle(documentId.value);
    const hasAccess = signaturesWithCurrentUserFlag.value.some(
        s => s.isCurrentUser
    )

    if (!hasAccess) {
        const result = await $swal.fire({
            title: "Access Denied",
            text: "You are not allowed to view this Document.",
            icon: "error",
            confirmButtonText: "Close", // Button at the bottom
            allowOutsideClick: false,
            allowEscapeKey: false,
        });

        // Redirect only if the user clicks the "Close" button
        if (result.isConfirmed) {
            navigateTo("/main/dashboard");
        }
    }
    else {
        canViewPage.value = true;
    }
    pdfTitle.value = title.value;
    signatureFile.value = await getusersignature($swal);

});

</script>

<style scoped></style>