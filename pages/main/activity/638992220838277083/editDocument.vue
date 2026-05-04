<script setup>
import { ref } from "vue";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { toRaw } from "vue";
import { getProfile, user } from "~/js/fetchUserProfile";
import {
  getsignaturepositons,
  prePlacedSignatures,
} from "~/js/fetchsignatureposition";
import { getusersignature } from "~/js/checkusersignature";
import SignaturePad from "signature_pad";
import { postusersignature } from "~/js/usersignature";
import { API_BASE_URL } from "~/config";
import { getToken, getDocumentId } from "~/js/cryptoToken";
import { fetchDocumentPdf, pdfFile } from "~/js/fetchDocumentPdf";
import { fetchDocumentTitle, title, isLiveView, isFreeSign } from "~/js/fetchDocumentTitle";
import { checkDocumentSignature } from "~/js/checkdocumentsignature";
import { emailsignaturereminder } from "~/js/emailsignaturereminder";
import LoadingModal from "~/components/modal/LoadingModal.vue";
import { getMaxlength, maxlength } from "~/js/getmaxlength";
import {
  getEmployeesForSigner,
  availableApprovers,
  query,
  loading as employeeLoading,
} from "~/js/fetchEmployees";

// State
const { $swal } = useNuxtApp();
const isSigningModalOpen = ref(false);
const isPlacementModalOpen = ref(false);
const signatureFile = ref(null);
const currentUserName = ref();
const strDocId = ref("");
const currentEmplId = ref();
const pdfTitle = ref();
const loading = ref(true);
const isEditingTitle = ref(false);
const titleInput = ref(null);

// ─── Share Users ───────────────────────────────────────────────────────────────
const sharedUsers = ref([]);
const showShareModal = ref(false);
const shareApproverIndex = ref(-1);
const shareScrollContainer = ref(null);

const formatUserName = (u) => {
  if (!u) return "";
  if (u.employeename2 && u.employeename1)
    return `${u.employeename2}, ${u.employeename1}`;
  return u.employeename2 || u.employeename1 || u.name || "Unknown User";
};

const openShareModal = async () => {
  showShareModal.value = true;
  query.value.search = "";
  availableApprovers.value = null;
  shareApproverIndex.value = -1;
  await getEmployeesForSigner();
};

const closeShareModal = () => {
  showShareModal.value = false;
  query.value.search = "";
  availableApprovers.value = null;
  shareApproverIndex.value = -1;
};

const handleShareEnterKey = async () => {
  await getEmployeesForSigner();
};

const moveShareDown = () => {
  if (!Array.isArray(availableApprovers.value)) return;
  shareApproverIndex.value = Math.min(
    shareApproverIndex.value + 1,
    availableApprovers.value.length - 1
  );
  nextTick(() => {
    shareScrollContainer.value
      ?.querySelectorAll("[data-approver]")
      [shareApproverIndex.value]?.scrollIntoView({ block: "nearest" });
  });
};

const moveShareUp = () => {
  if (!Array.isArray(availableApprovers.value)) return;
  shareApproverIndex.value = Math.max(shareApproverIndex.value - 1, 0);
  nextTick(() => {
    shareScrollContainer.value
      ?.querySelectorAll("[data-approver]")
      [shareApproverIndex.value]?.scrollIntoView({ block: "nearest" });
  });
};

const isUserAlreadyShared = (u) => {
  const name = formatUserName(u);
  return sharedUsers.value.some(
    (s) => (s.emplId && s.emplId === u.emplId) || s.name === name
  );
};

const toggleShareUser = (u) => {
  const name = formatUserName(u);
  const existingIndex = sharedUsers.value.findIndex(
    (s) => (s.emplId && s.emplId === u.emplId) || s.name === name
  );
  if (existingIndex !== -1) {
    sharedUsers.value.splice(existingIndex, 1);
  } else {
    sharedUsers.value.push({
      name,
      emplId: u.emplId || null,
      branchname: u.branchname || "",
      positionname: u.positionname || "",
    });
  }
};

const removeSharedUser = (index) => {
  sharedUsers.value.splice(index, 1);
};

const saveSharedUsers = async () => {
  const token = getToken();
  const documentid = getDocumentId();
  try {
    const body = sharedUsers.value.map((u) => ({ emplid: u.emplId || "" }));
    console.log("body",body);
    await $fetch(`${API_BASE_URL}/api/SharedDocuments/update/${documentid}`, {
      method: "POST",
      headers: { token, "Content-Type": "application/json" },
      body: body,
    });
    closeShareModal();
    await $swal.fire({
      title: "Shared Users Updated",
      icon: "success",
      timer: 1200,
      showConfirmButton: false,
    });
  } catch (error) {
    $swal.fire({
      icon: "error",
      title: "Error",
      text: error?.data?.message || "Failed to update shared users",
      confirmButtonColor: "#d33",
    });
  }
};
// ──────────────────────────────────────────────────────────────────────────────

function toggleEditTitle() {
  isEditingTitle.value = !isEditingTitle.value;
  if (isEditingTitle.value) {
    nextTick(() => titleInput.value?.focus());
  }
}

const saveEditTitle = async () => {
  const token = getToken();
  const documentid = getDocumentId();
  try {
    isLoading.value = true;
    const newtitlename = pdfTitle.value;
    const data = await $fetch(
      `${API_BASE_URL}/api/DocumentUpload/updateTitle/${documentid}`,
      {
        method: "POST",
        headers: { token },
        body: JSON.stringify(newtitlename),
      }
    );
    if (data.success) {
      isEditingTitle.value = false;
      await $swal.fire({
        icon: "success",
        title: "Success",
        text: "Document title updated successfully",
        confirmButtonColor: "#3085d6",
        timer: 2000,
        showConfirmButton: false,
      });
    }
  } catch (error) {
    $swal.fire({
      icon: "error",
      title: "Error",
      text: error?.data?.message || "Failed to update document title",
      confirmButtonColor: "#d33",
    });
  } finally {
    isLoading.value = false;
  }
};

const toggleLiveView = async () => {
  const newValue = !isLiveView.value;
  const { isConfirmed } = await $swal.fire({
    title: newValue
      ? '<span style="font-size:1.1rem;font-weight:700;">Enable Live View?</span>'
      : '<span style="font-size:1.1rem;font-weight:700;">Disable Live View?</span>',
    html: newValue
      ? `<div style="text-align:left;padding:4px 0;">
          <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;">
            <span style="font-size:1.4rem;">📊</span>
            <p style="margin:0;color:#374151;font-size:0.9rem;line-height:1.5;">
              This document will appear on the <strong>dashboard</strong>.
            </p>
          </div>
          <div style="display:flex;align-items:flex-start;gap:12px;">
            <span style="font-size:1.4rem;">🔴</span>
            <p style="margin:0;color:#374151;font-size:0.9rem;line-height:1.5;">
              The user can view all signers in real-time as they complete their signatures.
            </p>
          </div>
        </div>`
      : `<div style="text-align:left;padding:4px 0;">
          <div style="display:flex;align-items:flex-start;gap:12px;">
            <span style="font-size:1.4rem;">🔒</span>
            <p style="margin:0;color:#374151;font-size:0.9rem;line-height:1.5;">
              This document will <strong>no longer</strong> be reflected on the dashboard.
            </p>
          </div>
        </div>`,
    icon: "info",
    showCancelButton: true,
    confirmButtonText: newValue ? "✅ Enable" : "🔒 Disable",
    cancelButtonText: "Cancel",
    confirmButtonColor: newValue ? "#2563EB" : "#6B7280",
    cancelButtonColor: "#e5e7eb",
  });

  if (!isConfirmed) return;

  try {
    const docId = getDocumentId();
    const token = getToken();
    const res = await $fetch(
      `${API_BASE_URL}/api/DocumentUpload/toggle-live-view/${docId}`,
      {
        method: "POST",
        headers: { token, "Content-Type": "application/json" },
        body: JSON.stringify(newValue ? 1 : 0),
      }
    );
    isLiveView.value = newValue;
    await $swal.fire({
      title: newValue ? "Live View Enabled!" : "Live View Disabled!",
      text: newValue
        ? "This document is now visible on the dashboard with real-time signing updates."
        : "This document is no longer visible on the dashboard.",
      icon: "success",
      timer: 1500,
      showConfirmButton: false,
    });
    console.log(res.message);
  } catch (error) {
    console.error("Error updating live view:", error);
    await $swal.fire({
      title: "Update Failed",
      text: "Something went wrong while updating Live View. Please try again.",
      icon: "error",
      confirmButtonColor: "#2563EB",
    });
  }
};

const formatDateToISO = (d) => {
  const [month, day, year] = d.split("-");
  return `${year}-${month}-${day}`;
};

const openPlacementModal = () => {
  if (!pdfFile.value) {
    alert("Please upload a PDF first!");
    return;
  }
  isPlacementModalOpen.value = true;
};

const resendEmail = (emplId) => {
  emailsignaturereminder(emplId, $swal);
};

const handleSaveSignatures = async (boxes) => {
  loading.value = true;
  const token = getToken();
  const docId = getDocumentId();
  const form = new FormData();
  form.append("title", "SAMPLE");
  form.append("file", pdfFile.value);
  boxes.forEach((sig, i) => {
    form.append(`signatories[${i}].id`, typeof sig.id === "number" ? sig.id : 0);
    form.append(`signatories[${i}].employeeId`, sig.assignedEmplId);
    form.append(`signatories[${i}].hasName`, sig.showName == true ? 1 : 0);
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
    form.append(`signatories[${i}].isEmpty`, sig.isEmpty == true ? 1 : 0);
    form.append(`signatories[${i}].enforceSequentialOrder`, sig.enforceSequentialOrder == true ? 1 : 0);
    form.append(`signatories[${i}].approvalOrder`, sig.approvalOrder);
    form.append(
      `signatories[${i}].signatureDate`,
      sig.signatureDate ? formatDateToISO(sig.signatureDate) : new Date().toISOString()
    );
  });
  try {
    await $fetch(
      `${API_BASE_URL}/api/DocumentUPload/EditSignatureDocument/${docId}`,
      { method: "POST", body: form, headers: { token } }
    );
    await $swal.fire({
      title: "Update Successful!",
      text: "The signature placement was updated successfully.",
      icon: "success",
      timer: 1000,
      showConfirmButton: false,
    });
    await getsignaturepositons(docId);
  } catch (error) {
    prePlacedSignatures.value = null;
    let errorMessage = "Something went wrong. Please try again later.";
    if (error?.data?.message) {
      errorMessage = error.data.message;
      showToast({ message: errorMessage, type: "error", timer: 1000, showConfirmButton: false });
    }
  } finally {
    loading.value = false;
  }
};

const openSigningModal = () => {
  if (!pdfFile.value) { alert("Please upload a PDF first!"); return; }
  if (!signatureFile.value) { alert("Please upload your signature image first!"); return; }
  if (prePlacedSignatures.value.length === 0) {
    alert('Please place signature boxes first using "Place Signature Boxes" button!');
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
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const v = r * 0.299 + g * 0.587 + b * 0.114;
        const blackPoint = 130, whitePoint = 170;
        if (v <= blackPoint) {
          data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 255;
        } else if (v >= whitePoint) {
          data[i + 3] = 0;
        } else {
          const a = 1 - (v - blackPoint) / (whitePoint - blackPoint);
          data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = a * 255;
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
        <div style="display:flex;background:#f1f5f9;border-radius:12px;padding:4px;gap:4px;width:fit-content;">
          <label id="lbl-draw" style="padding:8px 28px;font-weight:700;font-size:13px;cursor:pointer;background:#2563eb;color:#fff;border-radius:9px;transition:all .2s;letter-spacing:.01em;user-select:none;">
            <input type="radio" name="sigType" value="draw" checked style="display:none;"> ✏️&nbsp;&nbsp;Draw
          </label>
          <label id="lbl-upload" style="padding:8px 28px;font-weight:700;font-size:13px;cursor:pointer;background:transparent;color:#64748b;border-radius:9px;transition:all .2s;letter-spacing:.01em;user-select:none;">
            <input type="radio" name="sigType" value="upload" style="display:none;"> 📂&nbsp;&nbsp;Upload
          </label>
        </div>
        <div id="draw-wrapper" style="width:100%;text-align:center;">
          <p style="font-size:12px;color:#94a3b8;margin-bottom:10px;letter-spacing:.02em;">Draw your signature inside the box</p>
          <div style="position:relative;display:block;width:100%;max-width:700px;margin:0 auto;">
            <canvas id="signature-pad" style="display:block;width:100%;height:210px;border:2px dashed #cbd5e1;border-radius:16px;background:linear-gradient(160deg,#f8fafc,#f1f5f9);touch-action:none;cursor:crosshair;box-shadow:inset 0 2px 6px rgba(0,0,0,.05);"></canvas>
            <div id="sig-hint" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;font-size:16px;color:#d1d5db;font-style:italic;gap:8px;">
              <svg width="20" height="20" fill="none" stroke="#d1d5db" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
              Sign here
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:16px;max-width:700px;margin:12px auto 0;flex-wrap:wrap;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:140px;">
              <svg width="12" height="12" fill="#94a3b8" viewBox="0 0 12 12"><circle cx="6" cy="6" r="2.5"/></svg>
              <input id="thickness-slider" type="range" min="1" max="12" value="3" style="flex:1;height:4px;accent-color:#2563eb;cursor:pointer;">
              <svg width="18" height="18" fill="#64748b" viewBox="0 0 18 18"><circle cx="9" cy="9" r="6"/></svg>
            </div>
            <div style="display:flex;align-items:center;gap:7px;">
              <div id="color-black" data-color="#0f172a" title="Black" style="width:26px;height:26px;border-radius:50%;background:#0f172a;border:3px solid #2563eb;cursor:pointer;transition:transform .15s;"></div>
              <div id="color-navy"  data-color="#1e3a8a" title="Navy"  style="width:26px;height:26px;border-radius:50%;background:#1e3a8a;border:2px solid #e2e8f0;cursor:pointer;transition:transform .15s;"></div>
              <div id="color-blue"  data-color="#1d4ed8" title="Blue"  style="width:26px;height:26px;border-radius:50%;background:#1d4ed8;border:2px solid #e2e8f0;cursor:pointer;transition:transform .15s;"></div>
              <div id="color-green" data-color="#14532d" title="Dark Green" style="width:26px;height:26px;border-radius:50%;background:#14532d;border:2px solid #e2e8f0;cursor:pointer;transition:transform .15s;"></div>
            </div>
            <button id="clear-signature" style="display:flex;align-items:center;gap:6px;padding:7px 16px;background:#fff1f2;color:#e11d48;border:1.5px solid #fecdd3;border-radius:10px;font-weight:700;font-size:13px;cursor:pointer;transition:all .15s;" onmouseenter="this.style.background='#fecdd3'" onmouseleave="this.style.background='#fff1f2'">
              <svg width="13" height="13" fill="none" stroke="#e11d48" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>
              Clear
            </button>
          </div>
        </div>
        <div id="upload-wrapper" style="display:none;width:100%;max-width:700px;">
          <label for="signature-upload" style="display:flex;flex-direction:column;align-items:center;justify-content:center;border:2px dashed #cbd5e1;border-radius:16px;padding:44px 24px;cursor:pointer;background:#f8fafc;gap:12px;transition:border-color .2s,background .2s;" onmouseenter="this.style.borderColor='#2563eb';this.style.background='#eff6ff'" onmouseleave="this.style.borderColor='#cbd5e1';this.style.background='#f8fafc'">
            <div style="width:54px;height:54px;border-radius:14px;background:#dbeafe;display:flex;align-items:center;justify-content:center;">
              <svg width="28" height="28" fill="none" stroke="#2563eb" stroke-width="1.6" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.338-2.32 5.75 5.75 0 0 1 .605 11.095"/></svg>
            </div>
            <div style="text-align:center;">
              <p style="font-weight:800;font-size:14px;color:#1e293b;margin:0 0 3px;">Click to upload</p>
              <p style="font-size:12px;color:#94a3b8;margin:0;">PNG or JPG · white background removed automatically</p>
            </div>
            <input type="file" id="signature-upload" accept="image/png,image/jpeg" style="display:none;" />
          </label>
          <img id="upload-preview" style="display:none;margin:14px auto 0;max-height:180px;border:1.5px solid #e2e8f0;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.06);" />
        </div>
        <div style="width:100%;max-width:700px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:12px;padding:12px 16px;">
          <label style="display:flex;align-items:flex-start;gap:10px;font-size:13.5px;cursor:pointer;color:#475569;line-height:1.5;">
            <input type="checkbox" id="agree-terms" style="margin-top:2px;accent-color:#2563eb;width:15px;height:15px;cursor:pointer;" />
            <span>I have read and agree to the <span id="open-terms" style="color:#2563eb;font-weight:700;text-decoration:underline;cursor:pointer;">Electronic Signature Terms & Conditions.</span></span>
          </label>
        </div>
      </div>
    `,
    width: 780,
    padding: "2.25rem 2.25rem 2rem",
    showCancelButton: true,
    confirmButtonText: "✅ &nbsp;Save Signature",
    cancelButtonText: "Cancel",
    confirmButtonColor: "#2563eb",
    cancelButtonColor: "#94a3b8",
    focusConfirm: false,
    customClass: { popup: "sig-swal-web" },
    didOpen: () => {
      const canvas = document.getElementById("signature-pad");
      const hint = document.getElementById("sig-hint");
      const thickSlider = document.getElementById("thickness-slider");
      const uploadInput = document.getElementById("signature-upload");
      const uploadPreview = document.getElementById("upload-preview");
      const agreeChk = document.getElementById("agree-terms");
      const openTerms = document.getElementById("open-terms");
      const drawWrapper = document.getElementById("draw-wrapper");
      const uploadWrapper = document.getElementById("upload-wrapper");
      const lblDraw = document.getElementById("lbl-draw");
      const lblUpload = document.getElementById("lbl-upload");
      const colorBtns = document.querySelectorAll("[data-color]");

      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      const signaturePad = new SignaturePad(canvas, {
        penColor: "#0f172a",
        minWidth: 1.5,
        maxWidth: 3,
        backgroundColor: "rgba(0,0,0,0)",
      });
      signaturePad.addEventListener("beginStroke", () => { hint.style.display = "none"; });

      document.getElementById("clear-signature").addEventListener("click", () => {
        signaturePad.clear();
        hint.style.display = "flex";
      });

      thickSlider.addEventListener("input", (e) => {
        const v = parseInt(e.target.value);
        signaturePad.minWidth = Math.max(0.5, v - 1);
        signaturePad.maxWidth = v;
      });

      colorBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          signaturePad.penColor = btn.dataset.color;
          colorBtns.forEach((b) => { b.style.border = "2px solid #e2e8f0"; b.style.transform = "scale(1)"; });
          btn.style.border = "3px solid #2563eb";
          btn.style.transform = "scale(1.15)";
        });
        btn.addEventListener("mouseenter", () => { btn.style.transform = "scale(1.1)"; });
        btn.addEventListener("mouseleave", () => {
          if (btn.dataset.color !== signaturePad.penColor) btn.style.transform = "scale(1)";
        });
      });

      document.querySelectorAll('input[name="sigType"]').forEach((radio) => {
        radio.closest("label").addEventListener("click", () => {
          if (radio.value === "draw") {
            drawWrapper.style.display = "block";
            uploadWrapper.style.display = "none";
            lblDraw.style.background = "#2563eb"; lblDraw.style.color = "#fff";
            lblUpload.style.background = "transparent"; lblUpload.style.color = "#64748b";
          } else {
            drawWrapper.style.display = "none";
            uploadWrapper.style.display = "block";
            lblUpload.style.background = "#2563eb"; lblUpload.style.color = "#fff";
            lblDraw.style.background = "transparent"; lblDraw.style.color = "#64748b";
            signaturePad.clear();
            hint.style.display = "flex";
          }
        });
      });

      uploadInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          const processedBlob = await removeWhiteBackground(file);
          const imageUrl = URL.createObjectURL(processedBlob);
          uploadPreview.src = imageUrl;
          uploadPreview.style.display = "block";
          uploadPreview.onload = () => { URL.revokeObjectURL(imageUrl); };
        } catch (error) {
          console.error("Error processing image:", error);
        }
      });

      const showTermsModal = () => {
        if (document.getElementById("terms-popup")) return;
        document.body.insertAdjacentHTML("beforeend", `
          <div id="terms-popup" style="position:fixed;inset:0;background:rgba(15,23,42,.6);display:flex;align-items:center;justify-content:center;z-index:99999;backdrop-filter:blur(3px);">
            <div style="background:#fff;width:90%;max-width:520px;border-radius:20px;padding:28px;box-shadow:0 24px 60px rgba(0,0,0,.2);">
              <h2 style="font-weight:800;font-size:17px;color:#0f172a;margin-bottom:14px;letter-spacing:-.02em;">Electronic Signature Terms & Conditions.</h2>
              <div style="max-height:260px;overflow-y:auto;border:1.5px solid #e2e8f0;padding:14px;border-radius:10px;font-size:13.5px;line-height:1.7;color:#475569;margin-bottom:18px;">
                By using this system to sign documents, you agree that your electronic signature (drawn or typed) is the <b>legal equivalent of your handwritten</b> signature. You consent to the use of electronic signatures for all documents processed through this system.
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
                <button id="close-terms" style="background:#2563eb;color:#fff;padding:10px 24px;border:none;border-radius:10px;font-weight:700;font-size:13.5px;cursor:pointer;">I Understand</button>
              </div>
            </div>
          </div>`);
        document.getElementById("close-terms").addEventListener("click", () => {
          document.getElementById("terms-popup")?.remove();
          agreeChk.checked = true;
        });
      };

      agreeChk.addEventListener("change", (e) => { if (e.target.checked) showTermsModal(); });
      openTerms.addEventListener("click", showTermsModal);

      window.signaturePadInstance = signaturePad;
    },
    preConfirm: () => {
      const signaturePad = window.signaturePadInstance;
      const agree = document.getElementById("agree-terms");
      const uploadInput = document.getElementById("signature-upload");
      const sigType = document.querySelector('input[name="sigType"]:checked')?.value;
      if (!agree.checked) {
        $swal.showValidationMessage("Please agree to the Electronic Signature Terms & Conditions.");
        return false;
      }
      if (sigType === "draw") {
        if (!signaturePad || signaturePad.isEmpty()) {
          $swal.showValidationMessage("Please draw your signature first.");
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

  if (!isConfirmed || !result) return;

  let blob;
  if (result.type === "draw") {
    const byteString = atob(result.data.split(",")[1]);
    const mime = result.data.split(",")[0].split(":")[1].split(";")[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    blob = new Blob([ab], { type: mime });
  } else {
    blob = await removeWhiteBackground(result.file);
  }

  const formData = new FormData();
  formData.append("signaturefile", blob, "signature.png");
  await postusersignature(formData, $swal);
  signatureFile.value = await getusersignature($swal);
  $swal.fire({ title: "Signature Saved!", icon: "success", width: 380, timer: 1300, showConfirmButton: false });
};

const handleSaveAllSignatures = async (updatedSignatures) => {
  loading.value = true;
  prePlacedSignatures.value = updatedSignatures;
  const token = getToken();
  const docId = getDocumentId();
  const form = new FormData();
  form.append("title", "SAMPLE");
  form.append("file", pdfFile.value);
  updatedSignatures.forEach((sig, i) => {
    if (sig.id != null) form.append(`signatories[${i}].id`, sig.id);
    if (sig.isEmpty != null) form.append(`signatories[${i}].isEmpty`, sig.isEmpty == true ? 1 : 0);
    form.append(`signatories[${i}].employeeId`, sig.assignedEmplId);
    form.append(`signatories[${i}].canvasHeight`, sig.canvasHeight);
    form.append(`signatories[${i}].canvasWidth`, sig.canvasWidth);
    form.append(`signatories[${i}].hasName`, sig.showName == true ? 1 : 0);
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
    form.append(`signatories[${i}].isEmpty`, sig.isEmpty);
    form.append(`signatories[${i}].signatureLock`, sig.signatureLock == true ? 1 : 0);
    form.append(`signatories[${i}].y`, sig.y);
    form.append(`signatories[${i}].x`, sig.x);
    form.append(`signatories[${i}].enforceSequentialOrder`, sig.enforceSequentialOrder == true ? 1 : 0);
    form.append(`signatories[${i}].approvalOrder`, sig.approvalOrder);
    form.append(
      `signatories[${i}].signatureDate`,
      sig.signatureDate ? formatDateToISO(sig.signatureDate) : new Date().toISOString()
    );
  });
  try {
    await $fetch(
      `${API_BASE_URL}/api/DocumentUploadSignature/sign-signature/${docId}`,
      { method: "POST", body: form, headers: { token } }
    );
    await $swal.fire({
      title: "Signed Successfully!",
      text: "The request has been signed successfully.",
      icon: "success",
      timer: 1000,
      showConfirmButton: false,
    });
    await checkDocumentSignature(docId);
  } catch (error) {
    await getsignaturepositons(docId);
    let errorMessage = "Something went wrong. Please try again later.";
    if (error?.data?.message) {
      errorMessage = error.data.message;
      showToast({ message: errorMessage, type: "error", timer: 1000, showConfirmButton: false });
    }
  } finally {
    loading.value = false;
  }
};

const closeSigningModal = () => { isSigningModalOpen.value = false; };
const closePlacementModal = () => { isPlacementModalOpen.value = false; };

const sequential = computed(() => {
  return prePlacedSignatures.value.some((sig) => sig.enforceSequentialOrder === true);
});

const signatureStatuses = computed(() => {
  const grouped = {};
  let signatures = [...prePlacedSignatures.value];
  if (sequential.value) {
    signatures.sort((a, b) => a.approvalOrder - b.approvalOrder);
    const firstUnsigned = signatures.find((sig) => sig.isEmpty);
    signatures = signatures.map((sig) => {
      let approvalStatus;
      if (!sig.isEmpty) { approvalStatus = "signed"; }
      else if (firstUnsigned && sig.approvalOrder === firstUnsigned.approvalOrder) { approvalStatus = "pending"; }
      else { approvalStatus = "waiting"; }
      return { ...sig, approvalStatus };
    });
  } else {
    signatures = signatures.map((sig) => ({ ...sig, approvalStatus: sig.isEmpty ? "pending" : "signed" }));
  }
  signatures.forEach((sig) => {
    const key = sig.assignedEmplId;
    if (!grouped[key]) {
      grouped[key] = { assignedEmplId: key, assignedTo: sig.assignedTo, total: 0, signed: 0, pending: 0, waiting: 0 };
    }
    grouped[key].total++;
    if (sig.approvalStatus === "signed") grouped[key].signed++;
    if (sig.approvalStatus === "pending") grouped[key].pending++;
    if (sig.approvalStatus === "waiting") grouped[key].waiting++;
  });
  return Object.values(grouped);
});

const signatureStatusestemp = computed(() => {
  if (!sequential.value) {
    return prePlacedSignatures.value.map((sig) => ({ ...sig, approvalStatus: sig.isEmpty ? "pending" : "signed" }));
  }
  const sorted = [...prePlacedSignatures.value].sort((a, b) => a.approvalOrder - b.approvalOrder);
  const firstUnsigned = sorted.find((sig) => sig.isEmpty);
  return sorted.map((sig) => {
    let status;
    if (!sig.isEmpty) { status = "signed"; }
    else if (firstUnsigned && sig.approvalOrder === firstUnsigned.approvalOrder) { status = "pending"; }
    else { status = "waiting"; }
    return { ...sig, approvalStatus: status };
  });
});

const getStats = () => {
  const items = signatureStatusestemp.value;
  const total = items.length;
  const signed = items.filter((s) => s.approvalStatus === "signed").length;
  const pending = items.filter((s) => s.approvalStatus === "pending").length;
  const waiting = items.filter((s) => s.approvalStatus === "waiting").length;
  const pendingSig = items.find((s) => s.approvalStatus === "pending");
  return { total, signed, pending, waiting, nextApproverNumber: pendingSig ? pendingSig.approvalOrder : null };
};

const saveFinalPdf = async () => {
  try {
    const stats = getStats();
    if (stats.signed === 0) { alert("No signatures to save!"); return; }
    if (stats.pending > 0 && !confirm(`There are still ${stats.pending} pending and ${stats.waiting} waiting signature(s). Save anyway?`)) return;
    if (!pdfFile.value) { alert("No PDF uploaded."); return; }

    const pdfBytes = await pdfFile.value.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    for (const sigRaw of prePlacedSignatures.value) {
      const sig = toRaw(sigRaw);
      if (!sig || sig.isEmpty || !sig.imageSrc) continue;
      const pageIndex = Math.max(0, (sig.page || 1) - 1);
      if (pageIndex >= pdfDoc.getPageCount()) continue;
      const page = pdfDoc.getPage(pageIndex);
      const pageWidth = page.getWidth(), pageHeight = page.getHeight();
      const canvasWidth = sig.canvasWidth || pageWidth;
      const canvasHeight = sig.canvasHeight || pageHeight;
      const scaleX = pageWidth / canvasWidth, scaleY = pageHeight / canvasHeight;

      if (sig.showName && sig.signedBy) {
        const imgResp = await fetch(sig.imageSrc);
        const imgBytes = await imgResp.arrayBuffer();
        let embeddedImage;
        try { embeddedImage = await pdfDoc.embedPng(imgBytes); }
        catch { embeddedImage = await pdfDoc.embedJpg(imgBytes); }
        const maxImgWidth = Math.max(sig.width - 16, sig.signedBy.length * 8) * scaleX;
        const maxImgHeight = sig.height * scaleY;
        const imgAspect = embeddedImage.width / embeddedImage.height;
        let drawWidth = maxImgWidth, drawHeight = drawWidth / imgAspect;
        if (drawHeight > maxImgHeight) { drawHeight = maxImgHeight; drawWidth = drawHeight * imgAspect; }
        const xOnPdf = sig.x * scaleX + (sig.width * scaleX - drawWidth) / 2;
        let yOnPdf = pageHeight - (sig.y + drawHeight) * scaleY;
        if (sig.showName && sig.signedBy) yOnPdf -= 5;
        page.drawImage(embeddedImage, { x: xOnPdf, y: yOnPdf, width: drawWidth, height: drawHeight });
        if (sig.showName && sig.signedBy) {
          const fontSize = Math.max(8, drawHeight * 0.18);
          const textWidth = Math.min(helveticaFont.widthOfTextAtSize(sig.signedBy, fontSize), drawWidth);
          const textX = xOnPdf + (drawWidth - textWidth) / 2;
          const textY = yOnPdf - fontSize / 3;
          page.drawText(sig.signedBy, { x: textX, y: textY, size: fontSize, font: helveticaFont, color: rgb(0, 0, 0) });
        }
        if (sig.hasDate && sig.datePosition) {
          const dp = toRaw(sig.datePosition);
          const dateX = dp.x * scaleX;
          let dateY = pageHeight - (dp.y + dp.height) * scaleY - 5;
          const fontSize = (dp.fontSize || 14) * scaleY;
          const dateText = dp.dateText || sig.signedDate || "";
          page.drawText(dateText, { x: dateX, y: dateY + (dp.height * scaleY - fontSize) / 2, size: fontSize, font: helveticaFont, color: rgb(0, 0, 0) });
        }
      } else {
        const xOnPdf = sig.x * scaleX, yOnPdf = pageHeight - sig.y * scaleY - sig.height * scaleY;
        const widthOnPdf = sig.width * scaleX, heightOnPdf = sig.height * scaleY;
        const imgResp = await fetch(sig.imageSrc);
        const imgBytes = await imgResp.arrayBuffer();
        let embeddedImage;
        try { embeddedImage = await pdfDoc.embedPng(imgBytes); }
        catch { embeddedImage = await pdfDoc.embedJpg(imgBytes); }
        page.drawImage(embeddedImage, { x: xOnPdf, y: yOnPdf, width: widthOnPdf, height: heightOnPdf });
        if (sig.hasDate && sig.datePosition) {
          const dp = toRaw(sig.datePosition);
          const dateX = dp.x * scaleX, dateY = pageHeight - dp.y * scaleY - dp.height * scaleY;
          const fontSize = (dp.fontSize || 14) * scaleY;
          const dateText = dp.dateText || sig.signedDate || "";
          page.drawText(dateText, { x: dateX + 2, y: dateY + (dp.height * scaleY - fontSize) / 2, size: fontSize, font: helveticaFont, color: rgb(0, 0, 0) });
        }
      }
    }

    const finalPdfBytes = await pdfDoc.save();
    const blob = new Blob([finalPdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "SignedDocument.pdf";
    document.body.appendChild(a); a.click(); a.remove();
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
  await getMaxlength($swal, "AsoDocumentUpload");
  signatureFile.value = await getusersignature($swal);
  currentEmplId.value = user.value.empid;
  currentUserName.value = user.value.requestorname;
  const documentid = getDocumentId();
  strDocId.value = documentid?.toString();
  await getsignaturepositons(documentid);
  await fetchDocumentPdf(documentid);
  await fetchDocumentTitle(documentid);
  sharedUsers.value = await fetchSharedUsers(documentid);
  console.log('here',sharedUsers.value)
  pdfTitle.value = title.value;
  loading.value = false;
  console.log(isLiveView.value);
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

          <!-- Document Title + Live View Toggle Card -->
          <div class="bg-white rounded-2xl border border-zinc-100 shadow-sm px-5 py-4 gap-4"
            :class="isEditingTitle ? 'flex-row' : 'flex flex-col sm:flex-row justify-between'">
            <div class="flex items-center gap-3 min-w-0" :class="isEditingTitle ? 'w-full' : ''">
              <div class="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                <svg class="w-4 h-4 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14,2 14,8 20,8" />
                </svg>
              </div>
              <div v-if="!isEditingTitle" class="flex items-center gap-2 min-w-0">
                <h2 class="text-base font-semibold text-zinc-800 truncate tracking-tight">{{ pdfTitle }}</h2>
                <button class="shrink-0 p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-all duration-200" @click="toggleEditTitle">
                  <svg class="w-6 h-6 text-blue-500 hover:text-blue-800" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m14.304 4.844 2.852 2.852M7 7H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-4.5m2.409-9.91a2.017 2.017 0 0 1 0 2.853l-6.844 6.844L8 14l.713-3.565 6.844-6.844a2.015 2.015 0 0 1 2.852 0Z" />
                  </svg>
                </button>
              </div>
              <div v-else class="flex items-center gap-2 min-w-0 flex-1">
                <div class="flex-1 relative">
                  <input v-model="pdfTitle" @keyup.enter="saveEditTitle" @keyup.esc="isEditingTitle = false"
                    :maxlength="maxlength.Title" ref="titleInput"
                    class="text-base font-semibold text-zinc-800 tracking-tight bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1 outline-none w-full focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-200 relative" />
                  <div class="absolute right-0 text-xs text-gray-500 mt-1 mb-1 text-right">
                    {{ pdfTitle?.length || 0 }}/{{ maxlength.Title }}
                  </div>
                </div>
                <button @click="isEditingTitle = false"
                  class="shrink-0 p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-all duration-200" title="Cancel">
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
                <button @click="saveEditTitle"
                  class="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-all duration-200 shadow-sm" title="Save">
                  <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline points="20,6 9,17 4,12" />
                  </svg>
                  Save
                </button>
              </div>
            </div>
            <!-- Live View Toggle -->
            <div class="flex items-center justify-between p-3 rounded-xl border transition-all duration-300 shrink-0"
              :class="[isLiveView ? 'border-blue-300 bg-blue-50' : 'border-zinc-200 bg-zinc-50', isEditingTitle ? 'mt-6 w-full' : 'min-w-[220px]']">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-300 shrink-0"
                  :class="isLiveView ? 'bg-blue-600' : 'bg-zinc-300'">
                  <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M15 10l4.553-2.069A1 1 0 0121 8.868v6.264a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                  </svg>
                </div>
                <div>
                  <p class="text-sm font-semibold text-zinc-700 leading-none mb-0.5">Live View</p>
                  <p class="text-[11px] transition-colors duration-300 leading-none"
                    :class="isLiveView ? 'text-blue-500' : 'text-zinc-400'">
                    {{ isLiveView ? 'Visible on dashboard' : 'Hidden from dashboard' }}
                  </p>
                </div>
              </div>
              <button type="button" @click="toggleLiveView"
                class="relative inline-flex h-6 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ml-3 shrink-0"
                :class="isLiveView ? 'bg-blue-600' : 'bg-zinc-300'" style="width: 44px;">
                <span class="sr-only">Toggle Live View</span>
                <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300 ease-in-out"
                  :style="isLiveView ? 'transform: translateX(24px)' : 'transform: translateX(4px)'" />
              </button>
            </div>
          </div>

          <!-- Share Document Card -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex items-center gap-2 mb-4">
              <div class="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </div>
              <h2 class="text-xl font-semibold">Share Document</h2>
            </div>
            <p class="text-sm text-gray-600 mb-4">
              Manage people who can view this document. They will have read-only access.
            </p>

            <!-- Add users button -->
            <button @click="openShareModal"
              class="w-full px-4 py-2.5 border-2 border-dashed border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition font-semibold text-sm flex items-center justify-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Manage Shared Access
            </button>

            <!-- Selected users list -->
            <div v-if="sharedUsers.length > 0" class="mt-4 space-y-2">
              <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                Shared with — {{ sharedUsers.length }}
              </p>
              <div v-for="(u, index) in sharedUsers" :key="u.emplId || u.name"
                class="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
                <div class="w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {{ u.name.split(',')[0]?.trim()?.charAt(0) || '?' }}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-gray-800 truncate">{{ u.name }}</p>
                  <p class="text-xs text-gray-400 truncate">{{ u.positionname || u.branchname || 'No info' }}</p>
                </div>
              </div>
            </div>

            <!-- Empty state -->
            <div v-else class="mt-4 flex flex-col items-center py-6 text-gray-300">
              <svg class="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M17 20h5v-2a4 4 0 00-5.356-3.712M9 20H4v-2a4 4 0 015.356-3.712M15 7a4 4 0 11-8 0 4 4 0 018 0zm6 3a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p class="text-sm text-gray-400">No one added yet.</p>
              <p class="text-xs text-gray-300 mt-0.5">Optional — leave empty to keep it private.</p>
            </div>
          </div>

          <!-- Step 1: Place Signature Boxes -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex items-center gap-2 mb-4">
              <div class="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">1</div>
              <h2 class="text-xl font-semibold">{{ isFreeSign ? "Add Member" : "Place Signature Boxes" }}</h2>
            </div>
            <p class="text-sm text-gray-600 mb-4">
              {{ isFreeSign ? "Add members who will sign this document" : "Draw boxes on the PDF where each person should sign" }}
            </p>
            <button @click="openPlacementModal" :disabled="!pdfFile"
              class="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2">
              <div v-if="!isFreeSign" class="flex gap-1 items-center">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Place Signature Boxes
              </div>
              <div v-else>Add Member/s</div>
            </button>
            <p v-if="prePlacedSignatures.length > 0" class="text-sm text-green-600 mt-2 text-center">
              ✓ {{ prePlacedSignatures.length }} box(es) placed
            </p>
          </div>

          <!-- Step 2: Sign -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex items-center gap-2 mb-4">
              <div class="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">2</div>
              <h2 class="text-xl font-semibold">Sign</h2>
            </div>
            <div v-if="!signatureFile" class="mb-6 p-4 bg-gray-50 rounded-xl shadow-md flex flex-col items-center">
              <button @click="createSignature"
                class="flex items-center justify-center w-full max-w-xs px-4 py-3 bg-green-600 text-white font-semibold rounded-lg shadow hover:bg-green-700 active:bg-green-800 transition-colors duration-200 gap-2">
                Create Signature
              </button>
              <p class="mt-3 text-center text-sm text-red-600 bg-red-100 rounded-md px-3 py-2 w-full shadow-sm">
                ⚠️ You don't have a current signature. Please create one to continue.
              </p>
            </div>
            <button @click="openSigningModal" :disabled="!pdfFile || !signatureFile || prePlacedSignatures.length === 0"
              class="w-full px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed font-bold text-lg flex items-center justify-center gap-2">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Sign Document
            </button>
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
          <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-xl font-semibold mb-4">Document Progress</h2>
            <div class="space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-gray-600">Total Boxes:</span>
                <span class="font-bold text-lg">{{ getStats().total }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-green-600">Signed:</span>
                <span class="font-bold text-lg text-green-600">{{ getStats().signed }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-orange-600">Pending:</span>
                <span class="font-bold text-lg text-orange-600">{{ getStats().pending }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-600">Waiting:</span>
                <span class="font-bold text-lg text-gray-600">{{ getStats().waiting }}</span>
              </div>
              <div class="mt-4 pt-4 border-t">
                <div class="w-full bg-gray-200 rounded-full h-4">
                  <div class="bg-green-600 h-4 rounded-full transition-all duration-300"
                    :style="{ width: `${getStats().total > 0 ? (getStats().signed / getStats().total) * 100 : 0}%` }"></div>
                </div>
                <p class="text-xs text-gray-500 text-center mt-1">
                  {{ getStats().total > 0 ? Math.round((getStats().signed / getStats().total) * 100) : 0 }}% Complete
                </p>
              </div>
              <div class="pt-3 border-t space-y-2">
                <div class="flex items-center gap-2 text-xs">
                  <span class="w-2 h-2 rounded-full shrink-0" :class="isLiveView ? 'bg-blue-500' : 'bg-zinc-300'"></span>
                  <span :class="isLiveView ? 'text-blue-600 font-medium' : 'text-zinc-400'">
                    Live View {{ isLiveView ? 'ON — visible on dashboard' : 'OFF' }}
                  </span>
                </div>
                <div class="flex items-center gap-2 text-xs">
                  <span class="w-2 h-2 rounded-full shrink-0" :class="sharedUsers.length > 0 ? 'bg-blue-500' : 'bg-gray-300'"></span>
                  <span :class="sharedUsers.length > 0 ? 'text-blue-600 font-medium' : 'text-gray-400'">
                    Shared with {{ sharedUsers.length }} person{{ sharedUsers.length !== 1 ? 's' : '' }}
                  </span>
                </div>
              </div>
              <p class="text-sm text-center mt-3 font-medium" :class="{
                'text-green-700': getStats().signed === getStats().total,
                'text-orange-700': getStats().pending === 1,
                'text-gray-600': getStats().waiting > 0 && getStats().pending === 0,
              }">
                <template v-if="getStats().signed === getStats().total">✅ All signatures completed.</template>
                <template v-else-if="getStats().nextApproverNumber">⏳ Waiting for Signer #{{ getStats().nextApproverNumber }} to sign…</template>
                <template v-else>⏳ Waiting for signatures…</template>
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
              <div v-for="sig in signatureStatuses" :key="sig.assignedEmplId" class="p-3 border rounded text-sm" :class="{
                'border-green-300 bg-green-50': sig.pending === 0 && sig.waiting === 0,
                'border-blue-300 bg-blue-50': sig.pending > 0,
                'border-gray-300 bg-gray-50': sig.pending === 0 && sig.waiting > 0,
              }">
                <div class="flex justify-between items-start">
                  <div>
                    <p class="font-semibold">{{ sig.assignedTo }}</p>
                    <p class="text-xs text-gray-600">Total signatures: {{ sig.total }}</p>
                    <p class="text-xs text-gray-500">
                      Signed: {{ sig.signed }} / Pending: {{ sig.pending }}
                      <span v-if="sig.waiting > 0"> / Waiting: {{ sig.waiting }}</span>
                    </p>
                  </div>
                  <div class="flex flex-col items-end">
                    <span v-if="sig.pending > 0" class="text-orange-500 text-xs font-bold">⏳ Pending</span>
                    <span v-else-if="sig.waiting > 0" class="text-gray-500 text-xs font-bold">⏳ Waiting</span>
                    <span v-else class="text-green-600 text-xs font-bold">✓ Completed</span>
                    <button v-if="sig.pending > 0" @click="resendEmail(sig.assignedEmplId)"
                      class="mt-2 flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg shadow hover:bg-blue-700 transition-all duration-200">
                      Resend
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Signature Box Placement Modal -->
    <SignatureBoxPlacement :is-open="isPlacementModalOpen" :pdf-file="pdfFile" :free-sign="isFreeSign"
      :existingSignatures="prePlacedSignatures" @close="closePlacementModal" @save-signatures="handleSaveSignatures" />

    <!-- Signing Modal -->
    <SigntureModal :is-open="isSigningModalOpen" :pdf-file="pdfFile" :signature-file="signatureFile"
      :current-user-name="currentUserName" :current-empl-id="currentEmplId" :documentId="strDocId"
      :pre-placed-signatures="prePlacedSignatures" :free-sign="isFreeSign" @close="closeSigningModal"
      @save-all-signatures="handleSaveAllSignatures" />

    <!-- ── Share Users Modal ─────────────────────────────────────────────────── -->
    <div v-if="showShareModal" @click.self="closeShareModal"
      class="fixed inset-0 p-4 flex flex-wrap justify-center items-center w-full h-full z-[1000] before:fixed before:inset-0 before:w-full before:h-full before:bg-[rgba(0,0,0,0.5)] overflow-auto font-[sans-serif]">
      <div class="w-full max-w-4xl bg-white shadow-lg rounded-2xl p-6 relative">

        <!-- Modal Header -->
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-lg font-bold text-gray-800">Share Document With</h3>
            <p class="text-xs text-gray-400 mt-0.5">Search and select multiple people. Click a row to toggle selection.</p>
          </div>
        </div>

        <!-- Search -->
        <div class="flex gap-2 mb-3">
          <input type="text" v-model="query.search"
            @keydown.enter.prevent="handleShareEnterKey"
            @keydown.down.prevent="moveShareDown"
            @keydown.up.prevent="moveShareUp"
            placeholder="Search by name..."
            class="w-full h-11 px-4 rounded-md border border-gray-700 focus:outline-none text-sm" />
          <button @click="getEmployeesForSigner"
            class="py-2 px-4 bg-blue-600 h-11 text-white rounded-lg hover:bg-blue-700 transition flex-shrink-0">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-width="2" d="m21 21-3.5-3.5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
            </svg>
          </button>
        </div>

        <!-- Results Table -->
        <div class="max-h-64 overflow-y-auto border border-gray-200 rounded-lg" ref="shareScrollContainer">
          <table class="min-w-full text-sm text-left">
            <thead class="bg-gray-50 sticky top-0">
              <tr>
                <th class="px-4 py-2.5 border-b text-xs font-bold text-gray-500 uppercase tracking-wide w-8"></th>
                <th class="px-4 py-2.5 border-b text-xs font-bold text-gray-500 uppercase tracking-wide">Name</th>
                <th class="px-4 py-2.5 border-b text-xs font-bold text-gray-500 uppercase tracking-wide">Branch</th>
                <th class="px-4 py-2.5 border-b text-xs font-bold text-gray-500 uppercase tracking-wide">Position</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(u, index) in availableApprovers" :key="index"
                @click="toggleShareUser(u)"
                class="cursor-pointer transition-colors"
                :class="[
                  isUserAlreadyShared(u) ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50',
                  index === shareApproverIndex ? 'ring-2 ring-inset ring-blue-400' : ''
                ]"
                data-approver>
                <td class="px-4 py-3 border-b">
                  <div class="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                    :class="isUserAlreadyShared(u) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'">
                    <svg v-if="isUserAlreadyShared(u)" class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </td>
                <td class="px-4 py-3 border-b font-medium text-gray-800">{{ formatUserName(u) }}</td>
                <td class="px-4 py-3 border-b text-gray-500">{{ u.branchname }}</td>
                <td class="px-4 py-3 border-b text-gray-500">{{ u.positionname }}</td>
              </tr>
              <tr v-if="employeeLoading">
                <td colspan="4" class="p-3 text-gray-400 text-center text-sm">Loading users...</td>
              </tr>
              <tr v-else-if="!availableApprovers || availableApprovers.length === 0">
                <td colspan="4" class="p-3 text-gray-400 text-center text-sm">No users found.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Selected chips preview -->
        <div v-if="sharedUsers.length > 0" class="mt-4 pt-3 border-t">
          <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Selected</p>
          <div class="flex flex-wrap gap-2">
            <span v-for="(u, i) in sharedUsers" :key="u.emplId || u.name"
              class="inline-flex items-center gap-1.5 bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1.5 rounded-full">
              {{ u.name.split(',')[0]?.trim() }}
              <button @click.stop="removeSharedUser(i)" class="hover:text-red-600 transition leading-none font-bold">✕</button>
            </span>
          </div>
        </div>

        <!-- Footer -->
        <div class="mt-4 flex justify-end gap-2">
          <button @click="closeShareModal"
            class="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition font-medium">
            Cancel
          </button>
          <button @click="saveSharedUsers"
            class="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition">
            Save — {{ sharedUsers.length }} selected
          </button>
        </div>
      </div>
    </div>
    <!-- ── End Share Modal ───────────────────────────────────────────────────── -->

  </div>
</template>

<script>
import SignatureBoxPlacement from "~/components/SignatureBoxPlacement.vue";
import SigntureModal from "~/components/SigntureModal.vue";
import { isLoading } from "~/js/fetchTransactions";
import { fetchSharedUsers } from "~/js/fetchSharedUsers";
</script>