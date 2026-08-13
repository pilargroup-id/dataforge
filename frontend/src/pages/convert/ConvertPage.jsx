import { useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'

import { Dropdown, TextField } from '../../components/forms'
import Upload from '../../components/forms/Upload.jsx'
import {
  AlertCircle,
  Chart01,
  CheckCircle,
  Download,
  Eye,
  FileText01,
  RefreshCw05,
} from '../../components/layoute/TemplateIcons.jsx'
import DataTableAction from '../../components/table/DataTableAction.jsx'
import {
  createConversionBatch,
  downloadConversionBatch,
  getConversionBatch,
  getConversionBatches,
  getConversionCapabilities,
} from '../../services/conversion.service.js'

const defaultActivePage = {
  title: 'Convert',
  eyebrow: 'File Conversion',
}

const ACTIVE_STATUSES = ['UPLOADING', 'VALIDATING', 'QUEUED', 'PROCESSING']

const STATUS_LABELS = {
  UPLOADING: 'Mengunggah',
  VALIDATING: 'Validasi struktur',
  QUEUED: 'Menunggu antrian',
  PROCESSING: 'Sedang diproses',
  COMPLETED: 'Selesai',
  REJECTED: 'Ditolak',
  FAILED: 'Gagal',
  EXPIRED: 'Kedaluwarsa',
}

const STATUS_TONE = {
  UPLOADING: 'progress',
  VALIDATING: 'progress',
  QUEUED: 'progress',
  PROCESSING: 'progress',
  COMPLETED: 'success',
  REJECTED: 'danger',
  FAILED: 'danger',
  EXPIRED: 'neutral',
}

const PROGRESS_STEPS = ['Mulai', 'Unggah', 'Proses', 'Selesai']
const TERMINAL_DANGER_STATUSES = ['REJECTED', 'FAILED', 'EXPIRED']

function getActiveStepIndex(status) {
  if (!status) return 0
  if (status === 'UPLOADING') return 1
  if (['VALIDATING', 'QUEUED', 'PROCESSING'].includes(status)) return 2
  if (status === 'COMPLETED') return 3
  if (TERMINAL_DANGER_STATUSES.includes(status)) return 2
  return 0
}

const HISTORY_PAGE_SIZE_OPTIONS = [5, 10, 25]

const HISTORY_DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Jakarta',
})

function formatHistoryDate(value) {
  if (!value) return '-'
  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) return '-'
  return `${HISTORY_DATE_FORMATTER.format(parsedDate)} WIB`
}

function getHistoryStatusVariant(status) {
  if (status === 'COMPLETED') return 'active'
  if (ACTIVE_STATUSES.includes(status)) return 'pending'
  return 'inactive'
}

function capabilityKey(capability) {
  return `${capability.source_formats.join('-')}__${capability.target_format}`
}

function pickSourceFormat(capability) {
  return capability.source_formats.includes('XLSX') ? 'XLSX' : capability.source_formats[0]
}

function ConvertPage({ activePage }) {
  const outletContext = useOutletContext() ?? {}
  const resolvedActivePage = activePage ?? outletContext.activePage ?? defaultActivePage

  const [capabilities, setCapabilities] = useState([])
  const [capabilitiesLoading, setCapabilitiesLoading] = useState(true)
  const [capabilitiesError, setCapabilitiesError] = useState('')

  const [selectedKey, setSelectedKey] = useState('')
  const [folderName, setFolderName] = useState('')
  const [templateCode, setTemplateCode] = useState('')
  const [files, setFiles] = useState([])
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [uploadResetKey, setUploadResetKey] = useState(0)

  const [currentBatch, setCurrentBatch] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const resultRef = useRef(null)

  const [historyBatches, setHistoryBatches] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState('')
  const [historyPage, setHistoryPage] = useState(1)
  const [historyPageSize, setHistoryPageSize] = useState(HISTORY_PAGE_SIZE_OPTIONS[0])
  const [historyMeta, setHistoryMeta] = useState({ total: 0, totalPages: 1 })
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)
  const [downloadingHistoryId, setDownloadingHistoryId] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function loadCapabilities() {
      setCapabilitiesLoading(true)
      setCapabilitiesError('')
      try {
        const data = await getConversionCapabilities()
        if (!isMounted) return
        setCapabilities(data)
        const firstAllowed = data.find((item) => item.allowed)
        if (firstAllowed) setSelectedKey(capabilityKey(firstAllowed))
      } catch (error) {
        if (!isMounted) return
        setCapabilitiesError(error.message || 'Gagal memuat daftar konversi yang tersedia')
      } finally {
        if (isMounted) setCapabilitiesLoading(false)
      }
    }

    loadCapabilities()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!currentBatch || !ACTIVE_STATUSES.includes(currentBatch.status)) {
      return undefined
    }

    const intervalId = setInterval(async () => {
      try {
        const updated = await getConversionBatch(currentBatch.id)
        setCurrentBatch(updated)
        if (!ACTIVE_STATUSES.includes(updated.status)) {
          setHistoryRefreshKey((key) => key + 1)
        }
      } catch {
        // keep last known state if a poll tick fails
      }
    }, 3000)

    return () => clearInterval(intervalId)
  }, [currentBatch?.id, currentBatch?.status])

  useEffect(() => {
    let isMounted = true

    async function loadHistory() {
      setHistoryLoading(true)
      setHistoryError('')
      try {
        const { data, meta } = await getConversionBatches({ page: historyPage, limit: historyPageSize })
        if (!isMounted) return
        setHistoryBatches(data)
        setHistoryMeta(meta)
      } catch (error) {
        if (!isMounted) return
        setHistoryError(error.message || 'Gagal memuat riwayat konversi')
      } finally {
        if (isMounted) setHistoryLoading(false)
      }
    }

    loadHistory()

    return () => {
      isMounted = false
    }
  }, [historyPage, historyPageSize, historyRefreshKey])

  const allowedCapabilities = useMemo(() => capabilities.filter((item) => item.allowed), [capabilities])

  const selectedCapability = useMemo(
    () => allowedCapabilities.find((item) => capabilityKey(item) === selectedKey) ?? null,
    [allowedCapabilities, selectedKey],
  )

  const isBatchMode = (selectedCapability?.input_mode ?? 'batch') === 'batch'

  const capabilityOptions = allowedCapabilities.map((item) => ({
    value: capabilityKey(item),
    label: `Excel → ${item.target_format}`,
  }))

  const templateOptions = (selectedCapability?.templates ?? []).map((template) => ({
    value: template.code,
    label: template.name || template.code,
  }))

  const handleFilesChange = (nextFiles) => {
    setFormError('')
    if (Array.isArray(nextFiles)) {
      setFiles(nextFiles)
    } else {
      setFiles(nextFiles ? [nextFiles] : [])
    }
  }

  const handleConversionChange = (value) => {
    setSelectedKey(value)
    setFiles([])
    setTemplateCode('')
    setFormError('')
    setUploadResetKey((n) => n + 1)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')

    if (!selectedCapability) {
      setFormError('Pilih jenis konversi terlebih dahulu')
      return
    }
    if (files.length === 0) {
      setFormError('Pilih minimal satu file untuk dikonversi')
      return
    }
    if (isBatchMode && !folderName.trim()) {
      setFormError('Nama folder / batch wajib diisi')
      return
    }
    if (!isBatchMode && files.length > 1) {
      setFormError('Konversi ini hanya menerima 1 file')
      return
    }

    const formData = new FormData()
    if (isBatchMode) {
      formData.append('folder_name', folderName.trim())
    }
    if (templateCode) {
      formData.append('template_code', templateCode)
    }
    files.forEach((file) => formData.append('files', file, file.name))

    setSubmitting(true)
    try {
      const source = pickSourceFormat(selectedCapability)
      const batch = await createConversionBatch(source, selectedCapability.target_format, formData)
      setCurrentBatch(batch)
      setFiles([])
      setFolderName('')
      setUploadResetKey((n) => n + 1)
      setHistoryPage(1)
      setHistoryRefreshKey((key) => key + 1)
    } catch (error) {
      setFormError(error.message || 'Gagal membuat batch konversi')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDownload = async () => {
    if (!currentBatch) return
    setDownloading(true)
    try {
      await downloadConversionBatch(currentBatch)
    } catch (error) {
      setFormError(error.message || 'Gagal mengunduh hasil konversi')
    } finally {
      setDownloading(false)
    }
  }

  const handleViewBatch = async (batch) => {
    setHistoryError('')
    try {
      const detail = await getConversionBatch(batch.id)
      setCurrentBatch(detail)
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch (error) {
      setHistoryError(error.message || 'Gagal memuat detail batch')
    }
  }

  const handleHistoryDownload = async (batch) => {
    setDownloadingHistoryId(batch.id)
    try {
      await downloadConversionBatch(batch)
    } catch (error) {
      setHistoryError(error.message || 'Gagal mengunduh hasil konversi')
    } finally {
      setDownloadingHistoryId(null)
    }
  }

  const historyColumns = useMemo(
    () => [
      {
        key: 'batch',
        header: 'Batch',
        type: 'identity',
        accessor: 'batch_name',
        title: (row) => row.batch_name || row.original_folder_name || 'Batch',
        subtitle: (row) =>
          `${row.source_format} → ${row.target_format} · ${row.total_input_files ?? 0} file`,
      },
      {
        key: 'created_at',
        header: 'Tanggal',
        nowrap: true,
        render: (row) => formatHistoryDate(row.created_at),
      },
      {
        key: 'status',
        header: 'Status',
        type: 'status',
        accessor: 'status',
        variant: (row) => getHistoryStatusVariant(row.status),
        format: (value) => STATUS_LABELS[value] ?? value,
      },
    ],
    [],
  )

  const historyActions = useMemo(
    () => [
      {
        key: 'view',
        label: 'Lihat detail',
        icon: Eye,
        onClick: (row) => handleViewBatch(row),
      },
      {
        key: 'download',
        label: 'Download',
        icon: Download,
        disabled: (row) =>
          row.status !== 'COMPLETED' || !row.download_available || downloadingHistoryId === row.id,
        onClick: (row) => handleHistoryDownload(row),
      },
    ],
    [downloadingHistoryId],
  )

  const historyTotalPages = Math.max(1, historyMeta.totalPages ?? 1)

  const historyPagination = useMemo(
    () => ({
      currentPage: historyPage,
      totalPages: historyTotalPages,
      pageSize: historyPageSize,
      pageSizeOptions: HISTORY_PAGE_SIZE_OPTIONS,
      pageSizeLabel: 'Tampilkan',
      pageSizeSuffix: 'baris',
      previousLabel: 'Sebelumnya',
      nextLabel: 'Berikutnya',
      ariaLabel: 'Invoice history pagination',
      summary: `${historyBatches.length === 0 ? 0 : (historyPage - 1) * historyPageSize + 1}-${Math.min(
        historyPage * historyPageSize,
        historyMeta.total ?? 0,
      )} dari ${historyMeta.total ?? 0} batch`,
      onPrevious: () => setHistoryPage((page) => Math.max(1, page - 1)),
      onNext: () => setHistoryPage((page) => Math.min(historyTotalPages, page + 1)),
      onSelect: (page) => setHistoryPage(page),
      onPageSizeChange: (size) => {
        setHistoryPageSize(size)
        setHistoryPage(1)
      },
    }),
    [historyPage, historyPageSize, historyMeta, historyBatches.length, historyTotalPages],
  )

  const progressPercent = currentBatch?.total_input_files
    ? Math.round(((currentBatch.processed_input_files ?? 0) / currentBatch.total_input_files) * 100)
    : currentBatch?.progress_percent ?? 0

  const statusTone = STATUS_TONE[currentBatch?.status] ?? 'neutral'
  const isBatchActive = currentBatch ? ACTIVE_STATUSES.includes(currentBatch.status) : false
  const validationErrors = currentBatch?.validation_errors

  const activeStepIndex = getActiveStepIndex(currentBatch?.status)
  const stepperFillPercent = (activeStepIndex / (PROGRESS_STEPS.length - 1)) * 100
  const isDangerStep = currentBatch ? TERMINAL_DANGER_STATUSES.includes(currentBatch.status) : false
  const progressHeading = currentBatch ? (STATUS_LABELS[currentBatch.status] ?? currentBatch.status) : 'Belum ada proses'

  let resultSummary
  if (!currentBatch) {
    resultSummary = {
      icon: FileText01,
      title: 'Belum ada hasil',
      subtitle: 'Mulai konversi untuk melihat hasilnya di sini.',
      tone: 'neutral',
    }
  } else if (isBatchActive) {
    resultSummary = {
      icon: RefreshCw05,
      title: currentBatch.batch_name,
      subtitle: 'Sedang diproses, mohon tunggu...',
      tone: 'progress',
      spin: true,
    }
  } else if (currentBatch.status === 'COMPLETED') {
    resultSummary = {
      icon: CheckCircle,
      title: currentBatch.batch_name,
      subtitle: 'Hasil siap diunduh.',
      tone: 'success',
    }
  } else {
    resultSummary = {
      icon: AlertCircle,
      title: currentBatch.batch_name || 'Batch gagal',
      subtitle: currentBatch.error_message || 'Batch gagal diproses.',
      tone: 'danger',
    }
  }

  const ResultIcon = resultSummary.icon

  return (
    <section className="dashboard-panel users-table-card convert-page" aria-label={resolvedActivePage.title}>
      <div className="users-table-card__header">
        <div>
          <p className="dashboard-panel__eyebrow">{resolvedActivePage.eyebrow}</p>
          <h1 className="dashboard-panel__title">{resolvedActivePage.title}</h1>
        </div>
      </div>

      <form className="convert-page__body" onSubmit={handleSubmit}>
        {capabilitiesLoading ? (
          <p className="convert-page__hint">Memuat jenis konversi yang tersedia...</p>
        ) : capabilitiesError ? (
          <p className="convert-page__error">{capabilitiesError}</p>
        ) : allowedCapabilities.length === 0 ? (
          <p className="convert-page__hint">
            Anda belum memiliki akses ke modul convert manapun. Hubungi admin IT untuk permintaan akses.
          </p>
        ) : (
          <>
            <div className="convert-page__grid">
              <div className="convert-page__panel">
                <div className="convert-page__config">
                  {isBatchMode ? (
                    <TextField
                      label="Nama Folder / Batch"
                      placeholder="Contoh: Marketplace Agustus"
                      value={folderName}
                      required
                      helperText="Dipakai sebagai nama batch dan nama file ZIP hasil konversi."
                      onChange={(event) => setFolderName(event.target.value)}
                    />
                  ) : null}

                  <Dropdown
                    label="Jenis Konversi"
                    value={selectedKey}
                    options={capabilityOptions}
                    required
                    onChange={handleConversionChange}
                    className="convert-page__row-conversion"
                  />
                </div>

                {templateOptions.length > 0 ? (
                  <Dropdown
                    label="Template"
                    value={templateCode}
                    options={templateOptions}
                    placeholder="Gunakan template default"
                    onChange={(value) => setTemplateCode(value)}
                  />
                ) : null}

                <Upload
                  key={`${selectedKey}-${uploadResetKey}`}
                  label="Dokumen"
                  accept=".xls,.xlsx"
                  multiple={isBatchMode}
                  helperText={
                    isBatchMode
                      ? 'Pilih seluruh file XLS/XLSX dalam satu folder, maksimal 20 file. Format: .xls / .xlsx'
                      : 'Pilih 1 file XLS/XLSX. Format: .xls / .xlsx'
                  }
                  onFilesChange={handleFilesChange}
                />

                {formError ? <p className="convert-page__error">{formError}</p> : null}
              </div>

              <aside className="convert-page__panel convert-page__panel--status" ref={resultRef}>
                <div className="convert-page__stats">
                  <div className="convert-page__stat">
                    <span className="convert-page__stat-icon">
                      <FileText01 size={18} aria-hidden="true" />
                    </span>
                    <div className="convert-page__stat-copy">
                      <p className="convert-page__stat-label">Batch Saat Ini</p>
                      <p className="convert-page__stat-value">{currentBatch?.batch_name ?? '-'}</p>
                    </div>
                  </div>
                  <div className="convert-page__stat">
                    <span className="convert-page__stat-icon">
                      <Chart01 size={18} aria-hidden="true" />
                    </span>
                    <div className="convert-page__stat-copy">
                      <p className="convert-page__stat-label">Total Diproses</p>
                      <p className="convert-page__stat-value">{historyMeta.total ?? '-'}</p>
                    </div>
                  </div>
                </div>

                <div className="convert-page__progress-card">
                  <div className="convert-page__progress-card-header">
                    <p className="convert-page__progress-heading">{progressHeading}</p>
                    <span className={`convert-page__pill convert-page__pill--${statusTone}`}>
                      {progressPercent}%
                    </span>
                  </div>

                  <div className="convert-page__stepper">
                    <div className="convert-page__stepper-track">
                      <div
                        className={`convert-page__stepper-track-fill${isDangerStep ? ' is-danger' : ''}`}
                        style={{ width: `${stepperFillPercent}%` }}
                      />
                      {PROGRESS_STEPS.map((step, index) => (
                        <span
                          key={step}
                          className={[
                            'convert-page__stepper-dot',
                            index < activeStepIndex ? 'is-complete' : '',
                            index === activeStepIndex ? 'is-current' : '',
                            index === activeStepIndex && isDangerStep ? 'is-danger' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        />
                      ))}
                    </div>
                    <div className="convert-page__stepper-labels">
                      {PROGRESS_STEPS.map((step, index) => (
                        <span key={step} className={index === activeStepIndex ? 'is-current' : ''}>
                          {step}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="convert-page__progress-content">
                    {!currentBatch ? (
                      <ul className="convert-page__hints">
                        <li>Setiap baris pada file akan dibuat menjadi satu dokumen.</li>
                        <li>Pastikan header kolom sesuai dengan template yang dipilih.</li>
                      </ul>
                    ) : currentBatch.status === 'REJECTED' || currentBatch.status === 'FAILED' ? (
                      <div className="convert-page__validation">
                        <p>{currentBatch.error_message || 'Batch gagal diproses.'}</p>
                        {validationErrors?.invalid_files?.length > 0 ? (
                          <ul>
                            {validationErrors.invalid_files.map((invalidFile) => (
                              <li key={invalidFile.file_name}>
                                <strong>{invalidFile.file_name}</strong>
                                {invalidFile.missing_headers?.length > 0
                                  ? ` · kolom hilang: ${invalidFile.missing_headers.join(', ')}`
                                  : ''}
                                {invalidFile.unexpected_headers?.length > 0
                                  ? ` · kolom tak dikenal: ${invalidFile.unexpected_headers.join(', ')}`
                                  : ''}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ) : (
                      <p className="convert-page__hint">
                        {currentBatch.source_format} → {currentBatch.target_format} ·{' '}
                        {currentBatch.total_input_files} file
                      </p>
                    )}
                  </div>
                </div>

                <div className={`convert-page__result-summary convert-page__result-summary--${resultSummary.tone}`}>
                  <span className="convert-page__result-summary-icon">
                    <ResultIcon
                      size={18}
                      aria-hidden="true"
                      className={resultSummary.spin ? 'convert-page__spin' : ''}
                    />
                  </span>
                  <div>
                    <p className="convert-page__result-summary-title">{resultSummary.title}</p>
                    <span className="convert-page__result-summary-subtitle">{resultSummary.subtitle}</span>
                  </div>
                </div>
              </aside>
            </div>

            <div className="convert-page__actionbar">
              <div className="convert-page__actionbar-buttons">
                <button
                  type="submit"
                  className="users-table-card__action"
                  disabled={submitting}
                >
                  <RefreshCw05
                    size={18}
                    aria-hidden="true"
                    className={submitting ? 'convert-page__spin' : ''}
                  />
                  {submitting ? 'Mengunggah...' : 'Mulai Convert'}
                </button>

                <button
                  type="button"
                  className="convert-page__btn convert-page__btn--outline"
                  onClick={handleDownload}
                  disabled={
                    !currentBatch ||
                    currentBatch.status !== 'COMPLETED' ||
                    !currentBatch.download_available ||
                    downloading
                  }
                >
                  <Download size={18} aria-hidden="true" />
                  {downloading ? 'Mengunduh...' : 'Download Hasil'}
                </button>

                <button
                  type="button"
                  className="convert-page__btn convert-page__btn--outline"
                  onClick={() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  disabled={!currentBatch}
                >
                  <Eye size={18} aria-hidden="true" />
                  Lihat Output
                </button>
              </div>
            </div>
          </>
        )}
      </form>

      <div className="convert-page__history">
        <div className="convert-page__history-header">
          <div>
            <p className="dashboard-panel__eyebrow">Riwayat</p>
            <h2 className="convert-page__history-title">Invoice History</h2>
          </div>
        </div>

        {historyError ? <p className="convert-page__error">{historyError}</p> : null}

        <DataTableAction
          rows={historyBatches}
          columns={historyColumns}
          actions={historyActions}
          getRowId={(row) => row.id}
          tableLabel="Invoice history table"
          emptyMessage={historyLoading ? 'Memuat riwayat konversi...' : 'Belum ada riwayat konversi.'}
          pagination={historyPagination}
        />
      </div>
    </section>
  )
}

export default ConvertPage
