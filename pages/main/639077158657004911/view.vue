<script setup>
import { ref, onMounted } from 'vue';
import { getProfile, user } from '~/js/fetchUserProfile';
import { getsignaturepositons, prePlacedSignatures } from '~/js/fetchsignatureposition';
import { fetchDocumentPdf, pdfFile } from '~/js/fetchDocumentPdf';
import { fetchDocumentTitle, title,isFreeSign } from '~/js/fetchDocumentTitle';
import { getToken, getDocumentId } from '~/js/cryptoToken';
import LoadingModal from '~/components/modal/LoadingModal.vue';
import PdfViewModal from '~/components/PdfViewModal.vue';

// ─── State ────────────────────────────────────────────────────────────────────
const loading        = ref(true);
const currentUserName = ref('');
const currentEmplId  = ref('');
const strDocId       = ref('');
const pdfTitle       = ref('');
const router = useRouter();

const goBack = () => {
  router.push("/main/639077158657004911");
};

definePageMeta({
  middleware: "auth", // 👈 Tells Nuxt to run the "auth" middleware
  layout: "empty", // 👈 Uses the "empty" layout (custom or default)
});

// ─── Init ─────────────────────────────────────────────────────────────────────
onMounted(async () => {
  loading.value = true;
  await getProfile();
  currentEmplId.value  = user.value.empid;
  currentUserName.value = user.value.requestorname;

  const documentid = getDocumentId();
  strDocId.value   = documentid?.toString();

  await Promise.all([
    getsignaturepositons(documentid),
    fetchDocumentPdf(documentid),
    fetchDocumentTitle(documentid),
  ]);
    console.log(prePlacedSignatures.value);
  pdfTitle.value = title.value;
  loading.value  = false;
});
</script>

<template>
  <!-- Loading state -->
  <div v-if="loading">
    <LoadingModal />
  </div>

  <!-- Full-page PDF viewer — takes over the entire screen once data is ready -->
  <PdfViewModal
    v-else
    :pdf-file="pdfFile"
    :document-id="strDocId"
    :current-user-name="currentUserName"
    :current-empl-id="currentEmplId"
    :pre-placed-signatures="prePlacedSignatures"
    :free-sign="false"
      @back="goBack"
  />
</template>