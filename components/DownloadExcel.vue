<template>
  <button class="download-btn w-full flex items-center justify-center gap-2" :disabled="isDownloading" @click="handleDownload">
    <span v-if="isDownloading" class="spinner" />
    <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
      <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
    </svg>
    {{ isDownloading ? 'Downloading...' : label }}
  </button>
</template>

<script setup>
import { ref } from 'vue'
import { API_BASE_URL } from '~/config'

const props = defineProps({
  /**
   * Path to the file inside the /public folder.
   * Example: "/userexcel.xls" or "/templates/userexcel.xls"
   */
  filePath: {
    type: String,
    required: true,
  },

  /**
   * The filename the user sees when downloading.
   * Example: "userexcel.xls"
   */
  fileName: {
    type: String,
    default: 'download.xls',
  },

  /** Button label */
  label: {
    type: String,
    default: 'Download Excel',
  },
})

const isDownloading = ref(false)

async function handleDownload() {
  isDownloading.value = true
  try {
    const res = await fetch(`https://apps.fastlogistics.com.ph/digifast/excel/member.xlsx`)
    if (!res.ok) throw new Error(`File not found: ${props.filePath}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = props.fileName
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('[DownloadExcel]', err)
  } finally {
    isDownloading.value = false
  }
}
</script>

<style scoped>
.download-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background-color: #1d7d45;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, opacity 0.2s ease;
}

.download-btn:hover:not(:disabled) {
  background-color: #155e33;
}

.download-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>