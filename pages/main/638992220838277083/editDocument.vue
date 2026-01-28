<script setup>
import { ref } from "vue";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { toRaw } from "vue";
import { getProfile, user } from "~/js/fetchUserProfile";
import { getsignaturepositons, prePlacedSignatures } from "~/js/fetchsignatureposition";
import { getusersignature } from "~/js/checkusersignature";
import SignaturePad from "signature_pad";
import { postusersignature } from "~/js/usersignature";
import { API_BASE_URL } from "~/config";
import { getToken, getDocumentId } from "~/js/cryptoToken";
import { fetchDocumentPdf, pdfFile } from "~/js/fetchDocumentPdf";
import { fetchDocumentTitle, title } from "~/js/fetchDocumentTitle";
import { checkDocumentSignature } from "~/js/checkdocumentsignature";
import { emailsignaturereminder } from "~/js/emailsignaturereminder";
import LoadingModal from "~/components/modal/LoadingModal.vue";

// State
const { $swal } = useNuxtApp();
const isSigningModalOpen = ref(false);
const isPlacementModalOpen = ref(false);
const signatureFile = ref(null);
const currentUserName = ref();
const currentEmplId = ref();
const pdfTitle = ref();
const loading = ref(true);

const formatDateToISO = (d) => {
    const [month, day, year] = d.split('-')
    return `${year}-${month}-${day}`
}

// Open placement modal
const openPlacementModal = () => {
    if (!pdfFile.value) {
        alert("Please upload a PDF first!");
        return;
    }
    isPlacementModalOpen.value = true;
};

const resendEmail = (emplId) => {
    emailsignaturereminder(emplId, $swal);
}

// Save signature boxes from placement modal
const handleSaveSignatures = async (boxes) => {
    const token = getToken();
    const docId = getDocumentId();

    const form = new FormData()
    form.append("title", "SAMPLE")
    form.append("file", pdfFile.value)
    // append array correctly
    boxes.forEach((sig, i) => {
        form.append(`signatories[${i}].id`, typeof sig.id === 'number' ? sig.id : 0);
        form.append(`signatories[${i}].employeeId`, sig.assignedEmplId)
        form.append(`signatories[${i}].hasName`, sig.showName == true ? 1 : 0)
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
        form.append(`signatories[${i}].signatureLock`, sig.signatureLock == true ? 1 : 0)
        form.append(`signatories[${i}].y`, sig.y)
        form.append(`signatories[${i}].x`, sig.x)
        form.append(`signatories[${i}].isEmpty`, sig.isEmpty == true ? 1 : 0)
        form.append(`signatories[${i}].enforceSequentialOrder`, sig.enforceSequentialOrder == true ? 1 : 0)
        form.append(`signatories[${i}].approvalOrder`, sig.approvalOrder)
        form.append(`signatories[${i}].signatureDate`, sig.signatureDate ? formatDateToISO(sig.signatureDate) : new Date().toISOString());
    })
    try {
        await $fetch(`${API_BASE_URL}/api/DocumentUPload/EditSignatureDocument/${docId}`, {
            method: "POST",
            body: form,
            headers: {
                token: token,
            },
        });

        await $swal.fire({
            title: "Update Successful!",
            text: "The signature placement was updated successfully.",
            icon: "success",
            timer: 1000,
            showConfirmButton: false,
        });
        await getsignaturepositons(docId);
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

// Open signing modal
const openSigningModal = () => {
    if (!pdfFile.value) {
        alert("Please upload a PDF first!");
        return;
    }
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

    const userSignatures = prePlacedSignatures.value.filter(
        (s) => s.assignedEmplId === currentEmplId.value && s.isEmpty
    );

    if (userSignatures.length === 0) {
        alert(`No pending signatures for ${currentUserName.value}`);
        return;
    }

    isSigningModalOpen.value = true;
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
    // Save all signatures at once
    prePlacedSignatures.value = updatedSignatures;
    console.log(updatedSignatures);
    const token = getToken();
    const docId = getDocumentId();
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
        form.append(`signatories[${i}].hasName`, sig.showName == true ? 1 : 0)
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
        await $fetch(`${API_BASE_URL}/api/DocumentUploadSignature/sign-signature/${docId}`, {
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

        await checkDocumentSignature(docId);

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

// Close modals
const closeSigningModal = () => {
    isSigningModalOpen.value = false;
};

const closePlacementModal = () => {
    isPlacementModalOpen.value = false;
};

const sequential = computed(() => {
    return prePlacedSignatures.value.some(sig => sig.enforceSequentialOrder === true)
})
const signatureStatuses = computed(() => {
    if (!sequential.value) {
        return prePlacedSignatures.value.map(sig => ({
            ...sig,
            approvalStatus: sig.isEmpty ? "pending" : "signed"
        }))
    }

    // Sort by approver number
    const sorted = [...prePlacedSignatures.value].sort((a, b) => a.approvalOrder - b.approvalOrder)

    // Find the lowest approver that is not signed
    const firstUnsigned = sorted.find(sig => sig.isEmpty)

    return sorted.map(sig => {
        let status

        if (!sig.isEmpty) {
            status = "signed"
        } else if (firstUnsigned && sig.approvalOrder === firstUnsigned.approvalOrder) {
            status = "pending"  // Only this one can sign now
        } else {
            status = "waiting"  // All others must wait
        }

        return { ...sig, approvalStatus: status }
    })
})

const getStats = () => {
    const items = signatureStatuses.value;

    const total = items.length;
    const signed = items.filter(s => s.approvalStatus === "signed").length;
    const pending = items.filter(s => s.approvalStatus === "pending").length;  // Only 1 in sequential
    const waiting = items.filter(s => s.approvalStatus === "waiting").length;

    // Find the current pending approver (if sequential)
    const pendingSig = items.find(s => s.approvalStatus === "pending");

    return {
        total,
        signed,
        pending,
        waiting,
        nextApproverNumber: pendingSig ? pendingSig.approvalOrder : null
    };
};

const getUserStats = (userName) => {
    const userSigs = prePlacedSignatures.value.filter(
        (s) => s.assignedTo === userName
    );
    const signed = userSigs.filter((s) => !s.isEmpty).length;
    const pending = userSigs.length - signed;
    return { total: userSigs.length, signed, pending };
};

const saveFinalPdf = async () => {
    try {
        const stats = getStats();
        if (stats.signed === 0) {
            alert("No signatures to save!");
            return;
        }
        if (
            stats.pending > 0 &&
            !confirm(
                `There are still ${stats.pending} pending and ${stats.waiting} waiting signature(s). Save anyway?`
            )
        ) {
            return;
        }
        if (!pdfFile.value) {
            alert("No PDF uploaded.");
            return;
        }

        // Load PDF
        const pdfBytes = await pdfFile.value.arrayBuffer();
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

        for (const sigRaw of prePlacedSignatures.value) {
            const sig = toRaw(sigRaw);
            if (!sig || sig.isEmpty || !sig.imageSrc) continue;

            const pageIndex = Math.max(0, (sig.page || 1) - 1);
            if (pageIndex >= pdfDoc.getPageCount()) continue;
            const page = pdfDoc.getPage(pageIndex);

            const pageWidth = page.getWidth();
            const pageHeight = page.getHeight();

            // Scale coordinates from canvas to PDF
            const canvasWidth = sig.canvasWidth || pageWidth;
            const canvasHeight = sig.canvasHeight || pageHeight;

            const scaleX = pageWidth / canvasWidth;
            const scaleY = pageHeight / canvasHeight;

            if (sig.showName && sig.signedBy) {
                // Embed signature image
                const imgResp = await fetch(sig.imageSrc);
                const imgBytes = await imgResp.arrayBuffer();
                let embeddedImage;
                try {
                    embeddedImage = await pdfDoc.embedPng(imgBytes);
                } catch {
                    embeddedImage = await pdfDoc.embedJpg(imgBytes);
                }

                // Adjust signature width for name like UI
                const maxImgWidth = sig.showName && sig.signedBy
                    ? Math.max(sig.width - 16, sig.signedBy.length * 8) * scaleX
                    : sig.width * scaleX;

                const maxImgHeight = sig.height * scaleY;

                const imgAspect = embeddedImage.width / embeddedImage.height;
                let drawWidth = maxImgWidth;
                let drawHeight = drawWidth / imgAspect;
                if (drawHeight > maxImgHeight) {
                    drawHeight = maxImgHeight;
                    drawWidth = drawHeight * imgAspect;
                }

                // Signature coordinates (flip Y axis) – exact match to UI
                const xOnPdf = sig.x * scaleX + (sig.width * scaleX - drawWidth) / 2;
                let yOnPdf = pageHeight - (sig.y + drawHeight) * scaleY;

                // Adjust y slightly if showing name
                if (sig.showName && sig.signedBy) {
                    yOnPdf -= 5; // reduces vertical position by 1px
                }

                // Draw signature
                page.drawImage(embeddedImage, {
                    x: xOnPdf,
                    y: yOnPdf,
                    width: drawWidth,
                    height: drawHeight,
                });

                // Draw name slightly overlapping signature
                if (sig.showName && sig.signedBy) {
                    const fontSize = Math.max(8, drawHeight * 0.18);
                    const textWidth = Math.min(helveticaFont.widthOfTextAtSize(sig.signedBy, fontSize), drawWidth);
                    const textX = xOnPdf + (drawWidth - textWidth) / 2;

                    // Small overlap with signature
                    const textY = yOnPdf - fontSize / 3;

                    page.drawText(sig.signedBy, {
                        x: textX,
                        y: textY,
                        size: fontSize,
                        font: helveticaFont,
                        color: rgb(0, 0, 0),
                    });
                }

                // Draw date exactly at its canvas position
                if (sig.hasDate && sig.datePosition) {
                    const dp = toRaw(sig.datePosition);
                    const dateX = dp.x * scaleX;
                    let dateY = pageHeight - (dp.y + dp.height) * scaleY;
                    const fontSize = (dp.fontSize || 14) * scaleY;
                    const dateText = dp.dateText || sig.signedDate || "";
                    dateY -= 5;
                    page.drawText(dateText, {
                        x: dateX,
                        y: dateY + (dp.height * scaleY - fontSize) / 2, // vertical center
                        size: fontSize,
                        font: helveticaFont,
                        color: rgb(0, 0, 0),
                    });
                }
            }
            else {
                const xOnPdf = sig.x * scaleX;
                const yOnPdf = pageHeight - sig.y * scaleY - sig.height * scaleY;
                const widthOnPdf = sig.width * scaleX;
                const heightOnPdf = sig.height * scaleY;

                // Embed signature image
                const imgResp = await fetch(sig.imageSrc);
                const imgBytes = await imgResp.arrayBuffer();
                let embeddedImage;
                try {
                    embeddedImage = await pdfDoc.embedPng(imgBytes);
                } catch {
                    embeddedImage = await pdfDoc.embedJpg(imgBytes);
                }

                page.drawImage(embeddedImage, {
                    x: xOnPdf,
                    y: yOnPdf,
                    width: widthOnPdf,
                    height: heightOnPdf,
                });

                // Draw date if exists (no background)
                if (sig.hasDate && sig.datePosition) {
                    const dp = toRaw(sig.datePosition);

                    const dateX = dp.x * scaleX;
                    const dateY = pageHeight - dp.y * scaleY - dp.height * scaleY;
                    const fontSize = (dp.fontSize || 14) * scaleY;
                    const dateText = dp.dateText || sig.signedDate || "";

                    // Draw only the text
                    page.drawText(dateText, {
                        x: dateX + 2, // optional padding
                        y: dateY + (dp.height * scaleY - fontSize) / 2,
                        size: fontSize,
                        font: helveticaFont,
                        color: rgb(0, 0, 0),
                    });
                }
            }
        }

        // Save PDF and trigger download
        const finalPdfBytes = await pdfDoc.save();
        const blob = new Blob([finalPdfBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "SignedDocument.pdf";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        alert("Signed PDF downloaded: SignedDocument.pdf");
    } catch (err) {
        console.error("Error saving final PDF:", err);
        alert("Failed to save PDF. Check console for details.");
    }
};
onMounted(async () => {
    loading.value = true;
    await getProfile();
    signatureFile.value = await getusersignature($swal);
    currentEmplId.value = user.value.empid;
    currentUserName.value = user.value.requestorname;
    const documentid = getDocumentId();
    await getsignaturepositons(documentid);
    await fetchDocumentPdf(documentid);
    await fetchDocumentTitle(documentid);
    pdfTitle.value = title.value;
    loading.value = false;
});
</script>

<template>
    <div v-if="loading">
        <LoadingModal />
    </div>
    <div v-else class="min-h-screen bg-gray-50 p-8">
        <div class="mx-auto">
            <div class="mb-8">
                <h1 class="text-3xl font-bold text-gray-900 mb-2">
                    PDF Multi-User Signature System
                </h1>
                <p class="text-gray-600">
                    Place signature boxes, assign to users, and collect signatures
                </p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Left Column: Main Controls -->
                <div class="lg:col-span-2 space-y-6">
                    <!-- Step 1: Upload PDF -->
                    <div class="bg-white rounded-lg shadow-md p-6">
                        <div class="flex items-center gap-2 mb-4">

                            <h2 class="text-xl font-semibold">{{ pdfTitle }}</h2>
                        </div>
                    </div>

                    <!-- Step 2: Place Signature Boxes -->
                    <div class="bg-white rounded-lg shadow-md p-6">
                        <div class="flex items-center gap-2 mb-4">
                            <div
                                class="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                                1
                            </div>
                            <h2 class="text-xl font-semibold">Place Signature Boxes</h2>
                        </div>
                        <p class="text-sm text-gray-600 mb-4">
                            Draw boxes on the PDF where each person should sign
                        </p>
                        <button @click="openPlacementModal" :disabled="!pdfFile"
                            class="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Place Signature Boxes
                        </button>
                        <p v-if="prePlacedSignatures.length > 0" class="text-sm text-green-600 mt-2 text-center">
                            ✓ {{ prePlacedSignatures.length }} box(es) placed
                        </p>
                    </div>

                    <!-- Step 3: Current User & Sign -->
                    <div class="bg-white rounded-lg shadow-md p-6">
                        <div class="flex items-center gap-2 mb-4">
                            <div
                                class="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                                2
                            </div>
                            <h2 class="text-xl font-semibold">Sign</h2>
                        </div>

                        <!-- Signature Upload -->
                        <div v-if="!signatureFile"
                            class="mb-6 p-4 bg-gray-50 rounded-xl shadow-md flex flex-col items-center">
                            <!-- Button -->
                            <button @click="createSignature"
                                class="flex items-center justify-center w-full max-w-xs px-4 py-3 bg-green-600 text-white font-semibold rounded-lg shadow hover:bg-green-700 active:bg-green-800 transition-colors duration-200 gap-2">
                                Create Signature
                            </button>

                            <!-- Warning Label -->
                            <p
                                class="mt-3 text-center text-sm text-red-600 bg-red-100 rounded-md px-3 py-2 w-full shadow-sm">
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
                            Sign Document
                        </button>
                        <p class="text-xs text-gray-500 mt-2 text-center">
                            {{ getUserStats(currentUserName).pending }} signature(s) pending
                        </p>
                    </div>

                    <!-- Actions -->
                    <div class="bg-white rounded-lg shadow-md p-6">
                        <h2 class="text-xl font-semibold mb-4">Actions</h2>
                        <div class="flex flex-wrap gap-3">
                            <button @click="saveFinalPdf" :disabled="getStats().signed === 0"
                                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold">
                                💾 Download PDF
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Right Column: Stats & Signature List -->
                <div class="space-y-6">
                    <!-- Overall Progress -->
                    <!-- Overall Progress -->
                    <div class="bg-white rounded-lg shadow-md p-6">
                        <h2 class="text-xl font-semibold mb-4">Document Progress</h2>

                        <div class="space-y-3">

                            <!-- Total -->
                            <div class="flex justify-between items-center">
                                <span class="text-gray-600">Total Boxes:</span>
                                <span class="font-bold text-lg">{{ getStats().total }}</span>
                            </div>

                            <!-- Signed -->
                            <div class="flex justify-between items-center">
                                <span class="text-green-600">Signed:</span>
                                <span class="font-bold text-lg text-green-600">{{ getStats().signed }}</span>
                            </div>

                            <!-- Pending -->
                            <div class="flex justify-between items-center">
                                <span class="text-orange-600">Pending:</span>
                                <span class="font-bold text-lg text-orange-600">{{ getStats().pending }}</span>
                            </div>

                            <!-- Waiting -->
                            <div class="flex justify-between items-center">
                                <span class="text-gray-600">Waiting:</span>
                                <span class="font-bold text-lg text-gray-600">{{ getStats().waiting }}</span>
                            </div>

                            <!-- Progress bar -->
                            <div class="mt-4 pt-4 border-t">
                                <div class="w-full bg-gray-200 rounded-full h-4">
                                    <div class="bg-green-600 h-4 rounded-full transition-all duration-300" :style="{
                                        width: `${getStats().total > 0
                                            ? (getStats().signed / getStats().total) * 100
                                            : 0}%`,
                                    }">
                                    </div>
                                </div>

                                <p class="text-xs text-gray-500 text-center mt-1">
                                    {{
                                        getStats().total > 0
                                            ? Math.round((getStats().signed / getStats().total) * 100)
                                            : 0
                                    }}% Complete
                                </p>
                            </div>

                            <!-- Dynamic Status Message -->
                            <p class="text-sm text-center mt-3 font-medium" :class="{
                                'text-green-700': getStats().signed === getStats().total,
                                'text-orange-700': getStats().pending === 1,
                                'text-gray-600': getStats().waiting > 0 && getStats().pending === 0
                            }">

                                <!-- DONE -->
                                <template v-if="getStats().signed === getStats().total">
                                    ✅ All signatures completed.
                                </template>

                                <!-- PENDING APPROVER -->
                                <template v-else-if="getStats().nextApproverNumber">
                                    ⏳ Waiting for Signer #{{ getStats().nextApproverNumber }} to sign…
                                </template>

                                <!-- DEFAULT -->
                                <template v-else>
                                    ⏳ Waiting for signatures…
                                </template>
                            </p>

                        </div>
                    </div>


                    <!-- Signature Boxes List -->
                    <div class="bg-white rounded-lg shadow-md p-6">
                        <h2 class="text-xl font-semibold mb-4">All Signature Boxes</h2>

                        <div v-if="prePlacedSignatures.length === 0" class="text-gray-400 text-center py-8 text-sm">
                            No signature boxes placed yet
                        </div>

                        <div v-else class="space-y-2 max-h-96 overflow-y-auto">
                            <div v-for="sig in signatureStatuses" :key="sig.id" class="p-3 border rounded text-sm"
                                :class="{
                                    'border-green-300 bg-green-50': sig.approvalStatus === 'signed',
                                    'border-blue-300 bg-blue-50': sig.approvalStatus === 'pending',
                                    'border-gray-300 bg-gray-50': sig.approvalStatus === 'waiting'
                                }">
                                <div class="flex justify-between items-start">
                                    <div>
                                        <p class="font-semibold">{{ sig.assignedTo }}</p>
                                        <p class="text-xs text-gray-600">Page {{ sig.page }}</p>
                                        <p class="text-xs text-gray-500">
                                            {{ Math.round(sig.width) }}×{{ Math.round(sig.height) }}px
                                        </p>
                                    </div>
                                    <div class="flex flex-col">
                                        <div>
                                            <span v-if="sig.approvalStatus === 'signed'"
                                                class="text-green-600 text-xs font-bold">✓
                                                Signed</span>

                                            <span v-else-if="sig.approvalStatus === 'pending'"
                                                class="text-orange-500 text-xs font-bold">⏳
                                                Pending</span>

                                            <span v-else class="text-gray-500 text-xs">⏳ Waiting</span>
                                        </div>

                                        <button v-if="sig.approvalStatus === 'pending'"
                                            @click="resendEmail(sig.assignedEmplId)" class="mt-2 flex items-center gap-2 px-3 py-1.5
                                            bg-blue-600 text-white text-sm font-medium
                                            rounded-lg shadow hover:bg-blue-700
                                            transition-all duration-200">

                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                                stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                                                <path stroke-linecap="round" stroke-linejoin="round"
                                                    d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z" />
                                            </svg>

                                            Email
                                        </button>

                                    </div>

                                </div>

                                <div v-if="sig.approvalStatus === 'signed'"
                                    class="mt-2 pt-2 border-t text-xs text-gray-600">
                                    <p>By: {{ sig.signedBy }}</p>
                                    <p>Date: {{ sig.signedDate }}</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>

        <!-- Signature Box Placement Modal -->
        <SignatureBoxPlacement :is-open="isPlacementModalOpen" :pdf-file="pdfFile"
            :existingSignatures="prePlacedSignatures" @close="closePlacementModal"
            @save-signatures="handleSaveSignatures" />

        <!-- Signing Modal -->
        <SigntureModal :is-open="isSigningModalOpen" :pdf-file="pdfFile" :signature-file="signatureFile"
            :current-user-name="currentUserName" :current-empl-id="currentEmplId"
            :pre-placed-signatures="prePlacedSignatures" @close="closeSigningModal"
            @save-all-signatures="handleSaveAllSignatures" />
    </div>
</template>

<script>
import SignatureBoxPlacement from "~/components/SignatureBoxPlacement.vue";
import SigntureModal from "~/components/SigntureModal.vue";
</script>
