import { API_BASE_URL } from "~/config"
import { getToken } from "./cryptoToken";

export const viewPdf = async (transactionId) => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/api/Pdf/view-pdf-form/${transactionId}`, {
    method: 'POST',
    headers: {
      token: token,
    },
  })

  // ✅ Extract filename from Content-Disposition header
  const contentDisposition = response.headers.get('Content-Disposition')
  let filename = 'Document'

  if (contentDisposition) {
    const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
    if (match && match[1]) {
      filename = match[1].replace(/['"]/g, '').trim()
    }
  }

  const blob = await response.blob()
  const namedBlob = new Blob([blob], { type: 'application/pdf' })
  const pdfUrl = URL.createObjectURL(namedBlob)

  // ✅ Wrap in HTML page to control tab title
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${filename}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { width: 100vw; height: 100vh; overflow: hidden; }
          iframe { width: 100%; height: 100%; border: none; }
        </style>
      </head>
      <body>
        <iframe src="${pdfUrl}"></iframe>
      </body>
    </html>
  `

  const htmlBlob = new Blob([htmlContent], { type: 'text/html' })
  const htmlUrl = URL.createObjectURL(htmlBlob)

  window.open(htmlUrl, '_blank')
}