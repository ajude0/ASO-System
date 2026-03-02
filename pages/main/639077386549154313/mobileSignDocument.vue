signdocumentmobile
<template>
    <div v-if="loading"><LoadingModal/></div>
    <div v-else>
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

                <!-- Sign Button (always shown, disabled while loading modal flow) -->
                <button
                    @click="openSigningModal"
                    :disabled="!pdfFile || prePlacedSignatures.length === 0 || autoFlowBusy"
                    class="w-full px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed font-bold text-lg flex items-center justify-center gap-2"
                >
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    {{ userSignatures.length === 0 ? "View Document" : "Sign Document" }}
                </button>
            </div>

            <MobileSignModal
                :is-open="isSigningModalOpen"
                :pdf-file="pdfFile"
                :signature-file="signatureFile"
                :current-user-name="currentUserName"
                :current-empl-id="currentEmplId"
                :pre-placed-signatures="prePlacedSignatures"
                @close="closeSigningModal"
                @save-all-signatures="handleSaveAllSignatures"
                :documentId="strDocId"
            />
            <ViewSignatureBoxPlacement
                :isOpen="isViewingModalopen"
                :pdfFile="pdfFile"
                :signatures="prePlacedSignatures"
                @close="isViewingModalopen = false"
            />
        </div>
    </div>
</template>

<script setup>
import SigntureModal from '~/components/SigntureModal.vue';
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
import LoadingModal from '~/components/modal/LoadingModal.vue';
import MobileSignModal from '~/components/MobileSignModal.vue';

const { $swal } = useNuxtApp();
const documentId = ref();
const isSigningModalOpen = ref(false);
const currentUserName = ref();
const currentEmplId = ref();
const pdfTitle = ref();
const signatureFile = ref(null);
const isViewingModalopen = ref(false);
const strDocId = ref("");
const loading = ref(true);
// Prevents double-clicks while the auto-flow (create signature → sign) is running
const autoFlowBusy = ref(false);

const userSignatures = computed(() =>
    prePlacedSignatures.value.filter(
        s => s.assignedEmplId === currentEmplId.value && s.isEmpty
    )
);

// ─────────────────────────────────────────────────────────────────────────────
// createSignature — returns true if the user successfully saved a signature.
// Uses a fully custom canvas drawing engine so touch coords are pixel-perfect
// on every device (no dependency on signature_pad's broken mobile scaling).
// ─────────────────────────────────────────────────────────────────────────────
const createSignature = async () => {
    // ── Detect hi-DPI / mobile device pixel ratio ──
    const DPR = window.devicePixelRatio || 1;

    // ── Canvas logical dimensions (CSS px) ──
    const CANVAS_CSS_W = Math.min(window.innerWidth - 48, 700);
    const CANVAS_CSS_H = 220;

    const { value: result, isConfirmed } = await $swal.fire({
        title: "Create your own signature",
        html: `
      <div style="display:flex;flex-direction:column;gap:14px;width:100%;align-items:center;box-sizing:border-box;">

        <!-- Mode toggle (pill style) -->
        <div style="display:flex;gap:0;border:2px solid #d1d5db;border-radius:9999px;overflow:hidden;width:fit-content;">
          <label id="lbl-draw" style="padding:8px 24px;font-weight:600;font-size:14px;cursor:pointer;background:#2563eb;color:#fff;transition:all .2s;">
            <input type="radio" name="sigType" value="draw" checked style="display:none;"> ✏️ Draw
          </label>
          <label id="lbl-upload" style="padding:8px 24px;font-weight:600;font-size:14px;cursor:pointer;background:#fff;color:#374151;transition:all .2s;">
            <input type="radio" name="sigType" value="upload" style="display:none;"> 📁 Upload
          </label>
        </div>

        <!-- DRAW panel -->
        <div id="draw-wrapper" style="width:100%;text-align:center;">
          <p style="font-size:13px;color:#6b7280;margin-bottom:8px;">Sign your name in the box below</p>

          <!-- Canvas wrapper — touch-action:none prevents page scroll while drawing -->
          <div style="position:relative;display:inline-block;width:100%;max-width:700px;">
            <canvas id="signature-pad"
              style="
                display:block;
                width:100%;
                max-width:700px;
                height:${CANVAS_CSS_H}px;
                border:2px dashed #9ca3af;
                border-radius:12px;
                background:#f9fafb;
                touch-action:none;
                cursor:crosshair;
              "></canvas>
            <!-- "Sign here" watermark -->
            <div id="sig-hint" style="
              position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
              pointer-events:none;font-size:16px;color:#d1d5db;font-style:italic;gap:8px;">
              <svg width="20" height="20" fill="none" stroke="#d1d5db" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
              </svg>
              Sign here
            </div>
          </div>

          <!-- Stroke thickness -->
          <div style="display:flex;align-items:center;gap:10px;max-width:700px;margin:10px auto 0;">
            <span style="font-size:13px;color:#6b7280;">Thin</span>
            <input id="thickness-slider" type="range" min="1" max="10" value="3" style="flex:1;">
            <span style="font-size:13px;color:#6b7280;">Thick</span>
          </div>

          <!-- Color row -->
          <div style="display:flex;align-items:center;gap:8px;justify-content:center;margin-top:8px;">
            <span style="font-size:13px;color:#6b7280;">Color:</span>
            <div id="color-black"  data-color="#000000" style="width:28px;height:28px;border-radius:50%;background:#000;border:3px solid #2563eb;cursor:pointer;"></div>
            <div id="color-blue"   data-color="#1e3a8a" style="width:28px;height:28px;border-radius:50%;background:#1e3a8a;border:2px solid #e5e7eb;cursor:pointer;"></div>
            <div id="color-navy"   data-color="#1d4ed8" style="width:28px;height:28px;border-radius:50%;background:#1d4ed8;border:2px solid #e5e7eb;cursor:pointer;"></div>
          </div>

          <button id="clear-signature"
            style="margin-top:12px;background:#ef4444;color:#fff;border:none;padding:8px 20px;border-radius:8px;font-weight:600;font-size:14px;cursor:pointer;">
            🗑 Clear
          </button>
        </div>

        <!-- UPLOAD panel -->
        <div id="upload-wrapper" style="display:none;width:100%;max-width:700px;text-align:center;">
          <label style="
            display:flex;flex-direction:column;align-items:center;justify-content:center;
            border:2px dashed #9ca3af;border-radius:12px;padding:32px;cursor:pointer;
            background:#f9fafb;gap:10px;" for="signature-upload">
            <svg width="40" height="40" fill="none" stroke="#9ca3af" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.338-2.32 5.75 5.75 0 0 1 .605 11.095"/>
            </svg>
            <span style="font-size:14px;color:#6b7280;">Tap to upload PNG / JPG</span>
            <input type="file" id="signature-upload" accept="image/png,image/jpeg" style="display:none;" />
          </label>
          <img id="upload-preview" style="display:none;margin:14px auto 0;max-height:160px;border:1px solid #e5e7eb;border-radius:8px;" />
        </div>

        <!-- Terms -->
        <div style="width:100%;max-width:700px;text-align:left;">
          <label style="display:flex;align-items:flex-start;gap:8px;font-size:14px;cursor:pointer;">
            <input type="checkbox" id="agree-terms" style="margin-top:2px;" />
            <span>I have read and agree to the
              <span id="open-terms" style="color:#3b82f6;text-decoration:underline;cursor:pointer;">
                Terms and Conditions
              </span>
            </span>
          </label>
        </div>
      </div>
    `,
        width: Math.min(window.innerWidth - 16, 820),
        showCancelButton: true,
        confirmButtonText: "✅ Save Signature",
        cancelButtonText: "Cancel",
        focusConfirm: false,
        customClass: { popup: 'sig-swal-popup' },

        didOpen: () => {
            const canvas     = document.getElementById("signature-pad");
            const hint       = document.getElementById("sig-hint");
            const thickSlider = document.getElementById("thickness-slider");
            const uploadInput = document.getElementById("signature-upload");
            const uploadPreview = document.getElementById("upload-preview");
            const agreeCheckbox = document.getElementById("agree-terms");
            const openTerms     = document.getElementById("open-terms");
            const drawWrapper   = document.getElementById("draw-wrapper");
            const uploadWrapper = document.getElementById("upload-wrapper");
            const lblDraw   = document.getElementById("lbl-draw");
            const lblUpload = document.getElementById("lbl-upload");
            const colorBtns = document.querySelectorAll("[data-color]");

            // ── Size the canvas backing store to match physical pixels ──
            const rect = canvas.getBoundingClientRect();
            const dpr  = window.devicePixelRatio || 1;
            canvas.width  = Math.round(rect.width  * dpr);
            canvas.height = Math.round(rect.height * dpr);
            const ctx = canvas.getContext("2d");
            ctx.scale(dpr, dpr);          // all drawing coords now in CSS px
            ctx.lineCap     = "round";
            ctx.lineJoin    = "round";
            ctx.strokeStyle = "#000000";
            ctx.lineWidth   = 3;

            let drawing   = false;
            let lastX     = 0;
            let lastY     = 0;
            let isEmpty   = true;
            let penColor  = "#000000";
            let penWidth  = 3;

            // ── Map any pointer/touch event to CSS-px coords on canvas ──
            const getPos = (e) => {
                const r = canvas.getBoundingClientRect();
                if (e.touches) {
                    const t = e.touches[0] || e.changedTouches[0];
                    return { x: t.clientX - r.left, y: t.clientY - r.top };
                }
                return { x: e.clientX - r.left, y: e.clientY - r.top };
            };

            const startDraw = (e) => {
    e.preventDefault();
    drawing = true;
    const { x, y } = getPos(e);
    lastX = x; lastY = y;
    ctx.beginPath();
    ctx.moveTo(x, y);  // start path
    isEmpty = false;
    hint.style.display = "none";

    // Draw a dot for single tap
    ctx.arc(x, y, penWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = penColor;
    ctx.fill();
};

const draw = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const { x, y } = getPos(e);

    // Draw a smooth line from last point to current
    ctx.lineTo(x, y);
    ctx.strokeStyle = penColor;
    ctx.lineWidth   = penWidth;
    ctx.stroke();

    lastX = x; lastY = y;
};

const stopDraw = (e) => {
    if (!drawing) return;
    e.preventDefault();
    drawing = false;
    ctx.closePath();
};

            // ── Attach both mouse and touch listeners ──
            canvas.addEventListener("mousedown",  startDraw, { passive: false });
            canvas.addEventListener("mousemove",  draw,      { passive: false });
            canvas.addEventListener("mouseup",    stopDraw,  { passive: false });
            canvas.addEventListener("mouseleave", stopDraw,  { passive: false });
            canvas.addEventListener("touchstart", startDraw, { passive: false });
            canvas.addEventListener("touchmove",  draw,      { passive: false });
            canvas.addEventListener("touchend",   stopDraw,  { passive: false });

            // ── Clear button ──
            document.getElementById("clear-signature").addEventListener("click", () => {
                ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
                isEmpty = true;
                hint.style.display = "flex";
            });

            // ── Thickness slider ──
            thickSlider.addEventListener("input", (e) => {
                penWidth = parseInt(e.target.value);
                ctx.lineWidth = penWidth;
            });

            // ── Color picker ──
            colorBtns.forEach(btn => {
                btn.addEventListener("click", () => {
                    penColor = btn.dataset.color;
                    ctx.strokeStyle = penColor;
                    colorBtns.forEach(b => b.style.border = "2px solid #e5e7eb");
                    btn.style.border = "3px solid #2563eb";
                });
            });

            // ── Mode toggle (Draw / Upload) ──
            const radios = document.querySelectorAll('input[name="sigType"]');
            radios.forEach(radio => {
                radio.closest("label").addEventListener("click", () => {
                    if (radio.value === "draw") {
                        drawWrapper.style.display  = "block";
                        uploadWrapper.style.display = "none";
                        lblDraw.style.background   = "#2563eb";
                        lblDraw.style.color        = "#fff";
                        lblUpload.style.background = "#fff";
                        lblUpload.style.color      = "#374151";
                    } else {
                        drawWrapper.style.display  = "none";
                        uploadWrapper.style.display = "block";
                        lblUpload.style.background = "#2563eb";
                        lblUpload.style.color      = "#fff";
                        lblDraw.style.background   = "#fff";
                        lblDraw.style.color        = "#374151";
                    }
                });
            });

            // ── Upload preview ──
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

            // ── Terms modal ──
            const showTermsModal = () => {
                if (document.getElementById("terms-popup")) return;
                document.body.insertAdjacentHTML("beforeend", `
                  <div id="terms-popup" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:99999;">
                    <div style="background:#fff;width:90%;max-width:560px;border-radius:14px;padding:24px;box-shadow:0 16px 32px rgba(0,0,0,0.2);">
                      <h2 style="font-weight:700;font-size:18px;margin-bottom:12px;">Terms and Conditions</h2>
                      <div style="max-height:280px;overflow-y:auto;border:1px solid #e5e7eb;padding:12px;border-radius:8px;font-size:14px;line-height:1.7;margin-bottom:16px;">
                        <ol style="padding-left:1.2rem;">
                          <li>By signing this form, you confirm that the information provided is true and accurate.</li>
                          <li>You acknowledge that this signature has the same legal validity as your handwritten signature.</li>
                          <li>Any falsification of information may result in disciplinary or legal action.</li>
                          <li>The organization reserves the right to verify your submission for authenticity.</li>
                          <li>All data collected will be processed in accordance with applicable data protection laws.</li>
                        </ol>
                      </div>
                      <div style="text-align:right;">
                        <button id="close-terms" style="background:#2563eb;color:#fff;padding:10px 20px;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:14px;">I Understand</button>
                      </div>
                    </div>
                  </div>`);
                document.getElementById("close-terms").addEventListener("click", () => {
                    document.getElementById("terms-popup")?.remove();
                    agreeCheckbox.checked = true;
                });
            };
            agreeCheckbox.addEventListener("change", (e) => { if (e.target.checked) showTermsModal(); });
            openTerms.addEventListener("click", showTermsModal);

            // Expose isEmpty check for preConfirm
            window._sigCanvas = { canvas, ctx, dpr, getIsEmpty: () => isEmpty };
        },

        preConfirm: () => {
            const agree      = document.getElementById("agree-terms");
            const uploadInput = document.getElementById("signature-upload");
            const sigType    = document.querySelector('input[name="sigType"]:checked')?.value;

            if (!agree.checked) {
                $swal.showValidationMessage("Please agree to the Terms and Conditions.");
                return false;
            }
            if (sigType === "draw") {
                if (!window._sigCanvas || window._sigCanvas.getIsEmpty()) {
                    $swal.showValidationMessage("Please draw your signature first.");
                    return false;
                }
                // Export at full backing-store resolution (= physical pixels)
                return { type: "draw", data: window._sigCanvas.canvas.toDataURL("image/png") };
            }
            if (!uploadInput.files.length) {
                $swal.showValidationMessage("Please upload a signature image.");
                return false;
            }
            return { type: "upload", file: uploadInput.files[0] };
        },
    });

    if (!isConfirmed || !result) return false;  // user cancelled

    let blob;
    if (result.type === "draw") {
        const byteString = atob(result.data.split(",")[1]);
        const mimeString = result.data.split(",")[0].split(":")[1].split(";")[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
        blob = new Blob([ab], { type: mimeString });
    } else {
        blob = await removeWhiteBackground(result.file);
    }

    const formData = new FormData();
    formData.append("signaturefile", blob, "signature.png");
    await postusersignature(formData, $swal);
    signatureFile.value = await getusersignature($swal);

    await $swal.fire({ title: "Signature saved!", icon: "success", width: 400, timer: 1200, showConfirmButton: false });
    return true;  // signature successfully created
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
            for (let i = 0; i < data.length; i += 4) {
                if (data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245) data[i + 3] = 0;
            }
            ctx.putImageData(imageData, 0, 0);
            canvas.toBlob((blob) => resolve(blob), "image/png", 1);
        };
    });
};

// ─────────────────────────────────────────────────────────────────────────────
// openSigningModal — unified entry point:
//   • No signature  → open create-signature modal, then open sign modal on success
//   • Has signature → open sign modal (or view modal if no boxes assigned to user)
// ─────────────────────────────────────────────────────────────────────────────
const openSigningModal = async () => {
    if (!pdfFile.value || prePlacedSignatures.value.length === 0) return;

    if (!signatureFile.value) {
        autoFlowBusy.value = true;
        const created = await createSignature();
        autoFlowBusy.value = false;
        if (!created) return;   // user cancelled — stop here
    }

    // At this point signatureFile is guaranteed to exist
    if (userSignatures.value.length === 0) {
        isViewingModalopen.value = true;
    } else {
        isSigningModalOpen.value = true;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Auto-trigger on mount — as soon as loading is done, kick off the flow
// ─────────────────────────────────────────────────────────────────────────────
watch(loading, async (isLoading) => {
    if (!isLoading) {
        // Small tick so the DOM is fully ready before we fire Swal
        await nextTick();
        openSigningModal();
    }
});

const handleSaveAllSignatures = async (updatedSignatures) => {
    const token = getToken();
    const form = new FormData();
    form.append("title", "SAMPLE");
    form.append("file", pdfFile.value);

    updatedSignatures.forEach((sig, i) => {
        if (sig.id != null) form.append(`signatories[${i}].id`, sig.id);
        if (sig.isEmpty != null) form.append(`signatories[${i}].isEmpty`, sig.isEmpty == true ? 1 : 0);
        form.append(`signatories[${i}].employeeId`, sig.assignedEmplId);
        form.append(`signatories[${i}].canvasHeight`, sig.canvasHeight);
        form.append(`signatories[${i}].canvasWidth`, sig.canvasWidth);
        form.append(`signatories[${i}].color`, sig.color);
        form.append(`signatories[${i}].dateLock`, sig.dateLock == true ? 1 : 0);
        form.append(`signatories[${i}].dateX`, sig.datePosition ? sig.datePosition.x : 0);
        form.append(`signatories[${i}].dateY`, sig.datePosition ? sig.datePosition.y : 0);
        form.append(`signatories[${i}].dateCanvasHeight`, sig.datePosition ? sig.datePosition.canvasHeight : 0);
        form.append(`signatories[${i}].dateCanvasWidth`, sig.datePosition ? sig.datePosition.canvasWidth : 0);
        form.append(`signatories[${i}].dateWidth`, sig.datePosition ? sig.datePosition.width : 0);
        form.append(`signatories[${i}].dateHeight`, sig.datePosition ? sig.datePosition.height : 0);
        form.append(`signatories[${i}].hasDate`, sig.hasDate == true ? 1 : 0);
        form.append(`signatories[${i}].height`, sig.height);
        form.append(`signatories[${i}].width`, sig.width);
        form.append(`signatories[${i}].page`, sig.page);
        form.append(`signatories[${i}].signatureLock`, sig.signatureLock == true ? 1 : 0);
        form.append(`signatories[${i}].y`, sig.y);
        form.append(`signatories[${i}].x`, sig.x);
        form.append(`signatories[${i}].enforceSequentialOrder`, sig.enforceSequentialOrder == true ? 1 : 0);
        form.append(`signatories[${i}].approvalOrder`, sig.approvalOrder);
        form.append(`signatories[${i}].signatureDate`, sig.signatureDate ? formatDateToISO(sig.signatureDate) : new Date().toISOString());
    });

    try {
        await $fetch(`${API_BASE_URL}/api/DocumentUploadSignature/sign-signature/${documentId.value}`, {
            method: "POST",
            body: form,
            headers: { token: token },
        });
        await $swal.fire({ title: "Signed Successfully!", text: "The request has been signed successfully.", icon: "success", timer: 1000, showConfirmButton: false });
        await checkDocumentSignature(documentId.value);
        await getsignaturepositons(documentId.value);
    } catch (error) {
        const errorMessage = error?.data?.message || "Something went wrong. Please try again later.";
        showToast({ message: errorMessage, type: "error", timer: 1000, showConfirmButton: false });
    }
};

const closeSigningModal = () => { isSigningModalOpen.value = false; };

const router = useRouter();
const backButton = () => {
    if (window.history.length > 1) router.back();
    else router.push("/main/638992220838277083");
};

definePageMeta({ middleware: "auth" });

onMounted(async () => {
    loading.value = true;
    await getProfile();
    currentEmplId.value = user.value.empid;
    currentUserName.value = user.value.requestorname;
    documentId.value = await getSignDocumentId();
    strDocId.value = documentId.value?.toString();
    await getsignaturepositons(documentId.value);
    await fetchDocumentPdf(documentId.value);
    await fetchDocumentTitle(documentId.value);
    pdfTitle.value = title.value;
    signatureFile.value = await getusersignature($swal);
    loading.value = false;
});
</script>

<style scoped></style>