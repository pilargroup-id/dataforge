import {
  cancelConversionBatch,
  continueConversionBatch,
  createConversionBatch,
  downloadConversionBatch,
  getConversionBatch,
  getConversionBatches,
  getConversionCapabilities,
  openConversionFile,
  pauseConversionBatch,
} from '../../services/conversion.service.js'

// Belum ada master data BranchCode di backend, jadi daftar ini di-hardcode di FE.
// Tambahkan entry baru di sini per database_code kalau ada BranchCode/database Accurate lain.
export const BRANCH_CODE_OPTIONS_BY_DATABASE = {
  KATO: [{ value: '1513362031', label: 'KATO' }],
}

export const ACTIVE_STATUSES = ['UPLOADING', 'VALIDATING', 'QUEUED', 'PROCESSING', 'PAUSING', 'COMPLETING']
export const PAUSABLE_STATUSES = ['QUEUED', 'VALIDATING', 'PROCESSING']
export const CANCELLABLE_STATUSES = ['QUEUED', 'VALIDATING', 'PROCESSING', 'PAUSING', 'PAUSED', 'COMPLETING']

export const STATUS_LABELS = {
  UPLOADING: 'Mengunggah',
  VALIDATING: 'Validasi struktur',
  QUEUED: 'Menunggu antrian',
  PROCESSING: 'Sedang diproses',
  PAUSING: 'Menjeda proses',
  PAUSED: 'Dijeda',
  COMPLETING: 'Menyelesaikan berkas',
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
  PAUSING: 'progress',
  PAUSED: 'neutral',
  COMPLETING: 'progress',
  COMPLETED: 'success',
  REJECTED: 'danger',
  FAILED: 'danger',
  EXPIRED: 'neutral',
}

export const PROGRESS_STEPS = ['Mulai', 'Unggah', 'Proses', 'Selesai']
export const TERMINAL_DANGER_STATUSES = ['REJECTED', 'FAILED', 'EXPIRED']
export const HISTORY_PAGE_SIZE_OPTIONS = [10, 25, 50]

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
  if (ACTIVE_STATUSES.includes(status) || status === 'PAUSED') return 'pending'
  return 'inactive'
}

export function getActiveStepIndex(status) {
  if (!status) return 0
  if (status === 'UPLOADING') return 1
  if (['VALIDATING', 'QUEUED', 'PROCESSING', 'PAUSING', 'PAUSED', 'COMPLETING'].includes(status)) return 2
  if (status === 'COMPLETED') return 3
  if (TERMINAL_DANGER_STATUSES.includes(status)) return 2
  return 0
}

export function findCapabilityForBatch(capabilities, batch) {
  if (!batch) return null
  return (
    (capabilities ?? []).find(
      (item) =>
        item.target_format === batch.target_format &&
        item.source_formats.includes(batch.source_format),
    ) ?? null
  )
}

export function canPauseBatch(batch, supportsPauseResume) {
  return Boolean(supportsPauseResume) && PAUSABLE_STATUSES.includes(batch?.status)
}

export function canContinueBatch(batch) {
  return batch?.status === 'PAUSED'
}

export function canCancelBatch(batch) {
  return CANCELLABLE_STATUSES.includes(batch?.status)
}

export function formatPauseExpiry(seconds) {
  if (!seconds || seconds <= 0) return ''
  const totalMinutes = Math.floor(seconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours <= 0) return `${minutes} menit`
  return `${hours} jam ${minutes} menit`
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

export async function fetchConversionCapabilitiesByFormat(targetFormat) {
  const allCapabilities = await getConversionCapabilities()
  const capabilities = allCapabilities.filter((item) => item.target_format === targetFormat)
  const firstAllowed = capabilities.find((item) => item.allowed)
  return { capabilities, defaultKey: firstAllowed ? capabilityKey(firstAllowed) : '' }
}

export async function fetchConversionHistory({ page, limit, targetFormat }) {
  return getConversionBatches({ page, limit, targetFormat })
}

export async function fetchConversionBatch(id) {
  return getConversionBatch(id)
}

function validateConversionForm({ selectedCapability, files, isBatchMode, folderName, requiresBranchCode, branchCode }) {
  if (!selectedCapability) return 'Pilih jenis konversi terlebih dahulu'
  if (files.length === 0) return 'Pilih minimal satu file untuk dikonversi'
  if (isBatchMode && !folderName.trim()) return 'Nama folder / batch wajib diisi'
  if (!isBatchMode && files.length > 1) return 'Konversi ini hanya menerima 1 file'
  if (requiresBranchCode && !branchCode.trim()) return 'BranchCode wajib diisi'
  return ''
}

export async function convert({
  selectedCapability,
  isBatchMode,
  folderName,
  templateCode,
  files,
  requiresBranchCode,
  branchCode,
}) {
  const validationError = validateConversionForm({
    selectedCapability,
    files,
    isBatchMode,
    folderName,
    requiresBranchCode,
    branchCode,
  })
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
  if (branchCode?.trim()) {
    formData.append('branch_code', branchCode.trim())
  }
  files.forEach((file) => formData.append('files', file, file.name))

  const source = pickSourceFormat(selectedCapability)
  return createConversionBatch(source, selectedCapability.target_format, formData)
}

export async function downloadConversion(batch) {
  return downloadConversionBatch(batch)
}

export async function pauseConversion(batch) {
  return pauseConversionBatch(batch.id)
}

export async function continueConversion(batch) {
  return continueConversionBatch(batch.id)
}

export async function cancelConversion(batch) {
  return cancelConversionBatch(batch.id)
}

export async function previewConversion(batchDetail) {
  const outputFile = (batchDetail.files ?? []).find((file) => file.file_role === 'OUTPUT')
  if (!outputFile) {
    throw new Error('Belum ada file hasil konversi untuk dibuka')
  }
  return openConversionFile(batchDetail.id, outputFile.id)
}
