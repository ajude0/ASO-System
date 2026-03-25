<template>
<div v-if="isLoading"> <LoadingModal/></div>
<div v-else>
    <div v-if="showThankYouPage">
        <ThankYouPage :transaction-id="documentId" :transaction-name="title" type-name="Document" @refresh="refreshThankYou"/>
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
            <SigntureModal :is-open="isSigningModalOpen" :pdf-file="pdfFile" :signature-file="signatureFile" :free-sign="isFreeSign"
                :current-user-name="currentUserName" :current-empl-id="currentEmplId"
                :pre-placed-signatures="prePlacedSignatures" @close="closeSigningModal" :documentId="strDocId"
                @save-all-signatures="handleSaveAllSignatures" />
            <ViewSignatureBoxPlacement :isOpen="isViewingModalopen" :pdfFile="pdfFile" :signatures="prePlacedSignatures"
                @close="isViewingModalopen = false" />
        </div>
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
import { fetchDocumentTitle, title,isFreeSign } from "~/js/fetchDocumentTitle";
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
const strDocId = ref("");
const isLoading = ref(false);

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
        title: '<span style="font-size:18px;font-weight:800;color:#0f172a;letter-spacing:-.02em;">Create Your Signature</span>',
        html: `
      <div style="display:flex;flex-direction:column;gap:18px;width:100%;align-items:center;box-sizing:border-box;">

        <!-- Pill toggle -->
        <div style="display:flex;background:#f1f5f9;border-radius:12px;padding:4px;gap:4px;width:fit-content;">
          <label id="lbl-draw"
            style="padding:8px 28px;font-weight:700;font-size:13px;cursor:pointer;
                   background:#2563eb;color:#fff;border-radius:9px;
                   transition:all .2s;letter-spacing:.01em;user-select:none;">
            <input type="radio" name="sigType" value="draw" checked style="display:none;"> ✏️&nbsp;&nbsp;Draw
          </label>
          <label id="lbl-upload"
            style="padding:8px 28px;font-weight:700;font-size:13px;cursor:pointer;
                   background:transparent;color:#64748b;border-radius:9px;
                   transition:all .2s;letter-spacing:.01em;user-select:none;">
            <input type="radio" name="sigType" value="upload" style="display:none;"> 📂&nbsp;&nbsp;Upload
          </label>
        </div>

        <!-- ══ DRAW PANEL ══ -->
        <div id="draw-wrapper" style="width:100%;text-align:center;">

          <p style="font-size:12px;color:#94a3b8;margin-bottom:10px;letter-spacing:.02em;">
            Draw your signature inside the box
          </p>

          <div style="position:relative;display:block;width:100%;max-width:700px;margin:0 auto;">
            <canvas id="signature-pad"
              style="display:block;width:100%;height:210px;
                     border:2px dashed #cbd5e1;border-radius:16px;
                     background:linear-gradient(160deg,#f8fafc,#f1f5f9);
                     touch-action:none;cursor:crosshair;
                     box-shadow:inset 0 2px 6px rgba(0,0,0,.05);">
            </canvas>
            <div id="sig-hint" style="
              position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
              pointer-events:none;font-size:16px;color:#d1d5db;font-style:italic;gap:8px;">
              <svg width="20" height="20" fill="none" stroke="#d1d5db" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
              </svg>
              Sign here
            </div>
          </div>

          <!-- Controls row -->
          <div style="display:flex;align-items:center;gap:16px;max-width:700px;margin:12px auto 0;flex-wrap:wrap;justify-content:space-between;">
            <!-- Thickness slider -->
            <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:140px;">
              <svg width="12" height="12" fill="#94a3b8" viewBox="0 0 12 12"><circle cx="6" cy="6" r="2.5"/></svg>
              <input id="thickness-slider" type="range" min="1" max="12" value="3"
                style="flex:1;height:4px;accent-color:#2563eb;cursor:pointer;">
              <svg width="18" height="18" fill="#64748b" viewBox="0 0 18 18"><circle cx="9" cy="9" r="6"/></svg>
            </div>

            <!-- Color swatches -->
            <div style="display:flex;align-items:center;gap:7px;">
              <div id="color-black" data-color="#0f172a" title="Black"
                style="width:26px;height:26px;border-radius:50%;background:#0f172a;
                       border:3px solid #2563eb;cursor:pointer;transition:transform .15s;"></div>
              <div id="color-navy" data-color="#1e3a8a" title="Navy"
                style="width:26px;height:26px;border-radius:50%;background:#1e3a8a;
                       border:2px solid #e2e8f0;cursor:pointer;transition:transform .15s;"></div>
              <div id="color-blue" data-color="#1d4ed8" title="Blue"
                style="width:26px;height:26px;border-radius:50%;background:#1d4ed8;
                       border:2px solid #e2e8f0;cursor:pointer;transition:transform .15s;"></div>
              <div id="color-green" data-color="#14532d" title="Dark Green"
                style="width:26px;height:26px;border-radius:50%;background:#14532d;
                       border:2px solid #e2e8f0;cursor:pointer;transition:transform .15s;"></div>
            </div>

            <!-- Clear -->
            <button id="clear-signature"
              style="display:flex;align-items:center;gap:6px;padding:7px 16px;
                     background:#fff1f2;color:#e11d48;
                     border:1.5px solid #fecdd3;border-radius:10px;
                     font-weight:700;font-size:13px;cursor:pointer;transition:all .15s;"
              onmouseenter="this.style.background='#fecdd3'"
              onmouseleave="this.style.background='#fff1f2'">
              <svg width="13" height="13" fill="none" stroke="#e11d48" stroke-width="2.2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/>
              </svg>
              Clear
            </button>
          </div>
        </div>

        <!-- ══ UPLOAD PANEL ══ -->
        <div id="upload-wrapper" style="display:none;width:100%;max-width:700px;">
          <label for="signature-upload"
            style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                   border:2px dashed #cbd5e1;border-radius:16px;padding:44px 24px;cursor:pointer;
                   background:#f8fafc;gap:12px;transition:border-color .2s,background .2s;"
            onmouseenter="this.style.borderColor='#2563eb';this.style.background='#eff6ff'"
            onmouseleave="this.style.borderColor='#cbd5e1';this.style.background='#f8fafc'">
            <div style="width:54px;height:54px;border-radius:14px;background:#dbeafe;
                        display:flex;align-items:center;justify-content:center;">
              <svg width="28" height="28" fill="none" stroke="#2563eb" stroke-width="1.6" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.338-2.32 5.75 5.75 0 0 1 .605 11.095"/>
              </svg>
            </div>
            <div style="text-align:center;">
              <p style="font-weight:800;font-size:14px;color:#1e293b;margin:0 0 3px;">Click to upload</p>
              <p style="font-size:12px;color:#94a3b8;margin:0;">PNG or JPG · white background removed automatically</p>
            </div>
            <input type="file" id="signature-upload" accept="image/png,image/jpeg" style="display:none;" />
          </label>
          <img id="upload-preview"
            style="display:none;margin:14px auto 0;max-height:180px;
                   border:1.5px solid #e2e8f0;border-radius:12px;
                   box-shadow:0 2px 8px rgba(0,0,0,.06);" />
        </div>

        <!-- ══ TERMS ══ -->
        <div style="width:100%;max-width:700px;background:#f8fafc;border:1.5px solid #e2e8f0;
                    border-radius:12px;padding:12px 16px;">
          <label style="display:flex;align-items:flex-start;gap:10px;font-size:13.5px;
                         cursor:pointer;color:#475569;line-height:1.5;">
            <input type="checkbox" id="agree-terms"
              style="margin-top:2px;accent-color:#2563eb;width:15px;height:15px;cursor:pointer;" />
            <span>I have read and agree to the
              <span id="open-terms"
                style="color:#2563eb;font-weight:700;text-decoration:underline;cursor:pointer;">
                Electronic Signature Terms & Conditions.
              </span>
            </span>
          </label>
        </div>

      </div>
    `,
        width: 780,
        padding: '2.25rem 2.25rem 2rem',
        showCancelButton: true,
        confirmButtonText: '✅ &nbsp;Save Signature',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#2563eb',
        cancelButtonColor: '#94a3b8',
        focusConfirm: false,
        customClass: { popup: 'sig-swal-web' },

        didOpen: () => {
            const canvas        = document.getElementById('signature-pad');
            const hint          = document.getElementById('sig-hint');
            const thickSlider   = document.getElementById('thickness-slider');
            const uploadInput   = document.getElementById('signature-upload');
            const uploadPreview = document.getElementById('upload-preview');
            const agreeChk      = document.getElementById('agree-terms');
            const openTerms     = document.getElementById('open-terms');
            const drawWrapper   = document.getElementById('draw-wrapper');
            const uploadWrapper = document.getElementById('upload-wrapper');
            const lblDraw       = document.getElementById('lbl-draw');
            const lblUpload     = document.getElementById('lbl-upload');
            const colorBtns     = document.querySelectorAll('[data-color]');

            // ── Resize canvas to its rendered size before SignaturePad init ──
            const rect = canvas.getBoundingClientRect();
            canvas.width  = rect.width;
            canvas.height = rect.height;

            // ── SignaturePad init ────────────────────────────────────
            const signaturePad = new SignaturePad(canvas, {
                penColor: '#0f172a',
                minWidth: 1.5,
                maxWidth: 3,
                backgroundColor: 'rgba(0,0,0,0)',  // transparent so CSS gradient bg shows
            });
            signaturePad.addEventListener('beginStroke', () => { hint.style.display = 'none'; });

            // Hide hint on first stroke
            canvas.addEventListener('mousedown',  () => { hint.style.display = 'none'; }, { once: true });
            canvas.addEventListener('touchstart', () => { hint.style.display = 'none'; }, { once: true });

            // ── Clear ────────────────────────────────────────────────
            document.getElementById('clear-signature').addEventListener('click', () => {
                signaturePad.clear();
                hint.style.display = 'flex';
            });

            // ── Thickness ────────────────────────────────────────────
            thickSlider.addEventListener('input', e => {
                const v = parseInt(e.target.value);
                signaturePad.minWidth = Math.max(0.5, v - 1);
                signaturePad.maxWidth = v;
            });

            // ── Color swatches ───────────────────────────────────────
            colorBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    signaturePad.penColor = btn.dataset.color;
                    colorBtns.forEach(b => { b.style.border = '2px solid #e2e8f0'; b.style.transform = 'scale(1)'; });
                    btn.style.border    = '3px solid #2563eb';
                    btn.style.transform = 'scale(1.15)';
                });
                btn.addEventListener('mouseenter', () => { btn.style.transform = 'scale(1.1)'; });
                btn.addEventListener('mouseleave', () => {
                    if (btn.dataset.color !== signaturePad.penColor) btn.style.transform = 'scale(1)';
                });
            });

            // ── Mode toggle ──────────────────────────────────────────
            document.querySelectorAll('input[name="sigType"]').forEach(radio => {
                radio.closest('label').addEventListener('click', () => {
                    if (radio.value === 'draw') {
                        drawWrapper.style.display   = 'block';
                        uploadWrapper.style.display = 'none';
                        lblDraw.style.background    = '#2563eb'; lblDraw.style.color    = '#fff';
                        lblUpload.style.background  = 'transparent'; lblUpload.style.color = '#64748b';
                    } else {
                        drawWrapper.style.display   = 'none';
                        uploadWrapper.style.display = 'block';
                        lblUpload.style.background  = '#2563eb'; lblUpload.style.color  = '#fff';
                        lblDraw.style.background    = 'transparent'; lblDraw.style.color = '#64748b';
                        signaturePad.clear();
                        hint.style.display = 'flex';
                    }
                });
            });

            // ── Upload preview ───────────────────────────────────────
            uploadInput.addEventListener('change', e => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => { uploadPreview.src = reader.result; uploadPreview.style.display = 'block'; };
                reader.readAsDataURL(file);
            });

            // ── Terms modal ──────────────────────────────────────────
            const showTermsModal = () => {
                if (document.getElementById('terms-popup')) return;
                document.body.insertAdjacentHTML('beforeend', `
                  <div id="terms-popup"
                    style="position:fixed;inset:0;background:rgba(15,23,42,.6);
                           display:flex;align-items:center;justify-content:center;
                           z-index:99999;backdrop-filter:blur(3px);">
                    <div style="background:#fff;width:90%;max-width:520px;border-radius:20px;
                                padding:28px;box-shadow:0 24px 60px rgba(0,0,0,.2);">
                      <h2 style="font-weight:800;font-size:17px;color:#0f172a;margin-bottom:14px;letter-spacing:-.02em;">
                        Electronic Signature Terms & Conditions.
                      </h2>
                      <div style="max-height:260px;overflow-y:auto;border:1.5px solid #e2e8f0;padding:14px;
                                  border-radius:10px;font-size:13.5px;line-height:1.7;color:#475569;margin-bottom:18px;">
                        By using this system to sign documents, you agree that your electronic signature (drawn or typed) is the <b> legal equivalent of your handwritten </b> signature. You consent to the use of electronic signatures for all documents processed through this system.
          You understand that:
                <ol style="padding-left:1.3rem;display:flex;flex-direction:column;gap:8px;">
                  <li>1. Your electronic signature <b>binds you legally</b> to the document you are signing.</li>
                  <li>2. The system will record your <b>user ID, timestamp, IP address, device information, and signature image</b> to validate authenticity.</li>
                  <li>3. The signed document is <b>stored securely</b> and cannot be altered without detection.</li>
                  <li>4. You may <b>request access, correction, or deletion</b> of your personal data in accordance with the <b>Data Privacy Act of 2012 (RA 10173)</b>.</li>
                  <li>5. You confirm that you are <b>authorized to sign</b> the document and agree to comply with company policies regarding document approvals.</li>
                </ol>
                      </div>
                      <div style="display:flex;justify-content:flex-end;">
                        <button id="close-terms"
                          style="background:#2563eb;color:#fff;padding:10px 24px;border:none;
                                 border-radius:10px;font-weight:700;font-size:13.5px;cursor:pointer;">
                          I Understand
                        </button>
                      </div>
                    </div>
                  </div>`);
                document.getElementById('close-terms').addEventListener('click', () => {
                    document.getElementById('terms-popup')?.remove();
                    agreeChk.checked = true;
                });
            };

            agreeChk.addEventListener('change', e => { if (e.target.checked) showTermsModal(); });
            openTerms.addEventListener('click', showTermsModal);

            // Expose for preConfirm
            window.signaturePadInstance = signaturePad;
        },

        preConfirm: () => {
            const signaturePad = window.signaturePadInstance;
            const agree        = document.getElementById('agree-terms');
            const uploadInput  = document.getElementById('signature-upload');
            const sigType      = document.querySelector('input[name="sigType"]:checked')?.value;

            if (!agree.checked) {
                $swal.showValidationMessage('Please agree to the Electronic Signature Terms & Conditions.');
                return false;
            }

            if (sigType === 'draw') {
                if (!signaturePad || signaturePad.isEmpty()) {
                    $swal.showValidationMessage('Please draw your signature.');
                    return false;
                }
                return { type: 'draw', data: signaturePad.toDataURL('image/png') };
            }

            if (!uploadInput.files.length) {
                $swal.showValidationMessage('Please upload a signature image.');
                return false;
            }

            return { type: 'upload', file: uploadInput.files[0] };
        },
    });

    // ================= SAVE SIGNATURE =================
    if (isConfirmed && result) {
        let blob;

        if (result.type === 'draw') {
            const byteString = atob(result.data.split(',')[1]);
            const mimeString = result.data.split(',')[0].split(':')[1].split(';')[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++)
                ia[i] = byteString.charCodeAt(i);
            blob = new Blob([ab], { type: mimeString });
        } else {
            blob = await removeWhiteBackground(result.file);
        }

        const formData = new FormData();
        formData.append('signaturefile', blob, 'signature.png');

        await postusersignature(formData, $swal);
        signatureFile.value = await getusersignature($swal);
        $swal.fire({
            title: 'Signature Saved!',
            icon: 'success',
            width: 380,
            timer: 1300,
            showConfirmButton: false,
        });
    }
};

// Handle signature application
const handleSaveAllSignatures = async (updatedSignatures) => {

    isLoading.value = true;

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
    } finally{
        isLoading.value = false;
    }

};

const closeSigningModal = () => {
    isSigningModalOpen.value = false;
};
definePageMeta({
    middleware: "auth", // 👈 Tells Nuxt to run the "auth" middleware
});

onMounted(async () => {
    isLoading.value = true;
    await getProfile();

    currentEmplId.value = user.value.empid;
    currentUserName.value = user.value.requestorname;
    documentId.value = await getUrlDocumentId();
    strDocId.value = documentId.value?.toString();
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
    isLoading.value = false;
});

</script>

<style scoped></style>