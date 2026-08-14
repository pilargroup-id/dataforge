import {
  createConversionBatch,
  downloadConversionBatch,
  getConversionBatch,
  getConversionBatches,
  getConversionCapabilities,
  openConversionFile,
} from '../../services/conversion.service.js'

export const ACTIVE_STATUSES = ['UPLOADING', 'VALIDATING', 'QUEUED', 'PROCESSING']

export const STATUS_LABELS = {
  UPLOADING: 'Mengunggah',
  VALIDATING: 'Validasi struktur',
  QUEUED: 'Menunggu antrian',
  PROCESSING: 'Sedang diproses',
  COMPLETED: 'Selesai',
  REJECTED: 'Ditolak',
  FAILED: 'Gagal',
  EXPIRED: 'Kedaluwarsa',
}

export const STATUS_TONE = {
  UPLOADING: 'progress',
  VALIDATING: 'progress',
  QUEUED: 'progress',
  PROCESSING: 'progress',
  COMPLETED: 'success',
  REJECTED: 'danger',
  FAILED: 'danger',
  EXPIRED: 'neutral',
}

export const PROGRESS_STEPS = ['Mulai', 'Unggah', 'Proses', 'Selesai']
export const TERMINAL_DANGER_STATUSES = ['REJECTED', 'FAILED', 'EXPIRED']
export const HISTORY_PAGE_SIZE_OPTIONS = [5, 10, 25]

const HISTORY_DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Jakarta',
})

export function formatHistoryDate(value) {
  if (!value) return '-'
  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) return '-'
  return `${HISTORY_DATE_FORMATTER.format(parsedDate)} WIB`
}

export function getHistoryStatusVariant(status) {
  if (status === 'COMPLETED') return 'active'
  if (ACTIVE_STATUSES.includes(status)) return 'pending'
  return 'inactive'
}

export function getActiveStepIndex(status) {
  if (!status) return 0
  if (status === 'UPLOADING') return 1
  if (['VALIDATING', 'QUEUED', 'PROCESSING'].includes(status)) return 2
  if (status === 'COMPLETED') return 3
  if (TERMINAL_DANGER_STATUSES.includes(status)) return 2
  return 0
}

export function capabilityKey(capability) {
  return `${capability.source_formats.join('-')}__${capability.target_format}`
}

export function pickSourceFormat(capability) {
  return capability.source_formats.includes('XLSX') ? 'XLSX' : capability.source_formats[0]
}

export async function fetchConversionCapabilities() {
  const capabilities = await getConversionCapabilities()
  const firstAllowed = capabilities.find((item) => item.allowed)
  return { capabilities, defaultKey: firstAllowed ? capabilityKey(firstAllowed) : '' }
}

export async function fetchConversionHistory({ page, limit }) {
  return getConversionBatches({ page, limit })
}

export async function fetchConversionBatch(id) {
  return getConversionBatch(id)
}

function validateConversionForm({ selectedCapability, files, isBatchMode, folderName }) {
  if (!selectedCapability) return 'Pilih jenis konversi terlebih dahulu'
  if (files.length === 0) return 'Pilih minimal satu file untuk dikonversi'
  if (isBatchMode && !folderName.trim()) return 'Nama folder / batch wajib diisi'
  if (!isBatchMode && files.length > 1) return 'Konversi ini hanya menerima 1 file'
  return ''
}

export async function convert({ selectedCapability, isBatchMode, folderName, templateCode, files }) {
  const validationError = validateConversionForm({ selectedCapability, files, isBatchMode, folderName })
  if (validationError) {
    throw new Error(validationError)
  }

  const formData = new FormData()
  if (isBatchMode) {
    formData.append('folder_name', folderName.trim())
  }
  if (templateCode) {
    formData.append('template_code', templateCode)
  }
  files.forEach((file) => formData.append('files', file, file.name))

  const source = pickSourceFormat(selectedCapability)
  return createConversionBatch(source, selectedCapability.target_format, formData)
}

export async function downloadConversion(batch) {
  return downloadConversionBatch(batch)
}

export async function previewConversion(batchDetail) {
  const outputFile = (batchDetail.files ?? []).find((file) => file.file_role === 'OUTPUT')
  if (!outputFile) {
    throw new Error('Belum ada file hasil konversi untuk dibuka')
  }
  return openConversionFile(batchDetail.id, outputFile.id)
}
