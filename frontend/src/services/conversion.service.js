import { API_BASE_URL, apiFetch, getStoredToken } from './api.js'

export async function getConversionCapabilities() {
  const response = await apiFetch('/api/conversions/capabilities')
  return response?.data?.supported_conversions ?? []
}

export async function createConversionBatch(sourceFormat, targetFormat, formData) {
  const response = await apiFetch(`/api/conversions/${sourceFormat}/${targetFormat}`, {
    method: 'POST',
    body: formData,
  })
  return response?.data ?? null
}

export async function getConversionBatch(id) {
  const response = await apiFetch(`/api/conversions/${id}`)
  return response?.data ?? null
}

export async function getConversionBatches({ page = 1, limit = 5 } = {}) {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) }).toString()
  const response = await apiFetch(`/api/conversions?${query}`)
  return {
    data: response?.data ?? [],
    meta: response?.meta ?? { page, limit, total: 0, totalPages: 1 },
  }
}

export async function downloadConversionBatch(batch) {
  const token = getStoredToken()
  const response = await fetch(`${API_BASE_URL}/api/conversions/${batch.id}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (!response.ok) {
    throw new Error('Gagal mengunduh hasil konversi')
  }

  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = batch.zip_file_name || `${batch.batch_name || 'dataforge'}.zip`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
