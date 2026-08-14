import { useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'

import {
  AlertCircle,
  CheckCircle,
  FileText01,
  RefreshCw05,
} from '../../components/layoute/TemplateIcons.jsx'
import CardUploadConvert from './CardUploadConvert.jsx'
import CardViewConvert from './CardViewConvert.jsx'
import DataTableHistory from './DataTableHistory.jsx'
import {
  ACTIVE_STATUSES,
  HISTORY_PAGE_SIZE_OPTIONS,
  PROGRESS_STEPS,
  STATUS_LABELS,
  STATUS_TONE,
  TERMINAL_DANGER_STATUSES,
  capabilityKey,
  convert,
  downloadConversion,
  fetchConversionBatch,
  fetchConversionCapabilities,
  fetchConversionHistory,
  getActiveStepIndex,
  previewConversion,
} from './convert.service.js'

const defaultActivePage = {
  title: 'Convert',
  eyebrow: 'File Conversion',
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
  const [openingHistoryId, setOpeningHistoryId] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function loadCapabilities() {
      setCapabilitiesLoading(true)
      setCapabilitiesError('')
      try {
        const { capabilities: data, defaultKey } = await fetchConversionCapabilities()
        if (!isMounted) return
        setCapabilities(data)
        if (defaultKey) setSelectedKey(defaultKey)
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
        const updated = await fetchConversionBatch(currentBatch.id)
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
        const { data, meta } = await fetchConversionHistory({ page: historyPage, limit: historyPageSize })
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

    setSubmitting(true)
    try {
      const batch = await convert({ selectedCapability, isBatchMode, folderName, templateCode, files })
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
      await downloadConversion(currentBatch)
    } catch (error) {
      setFormError(error.message || 'Gagal mengunduh hasil konversi')
    } finally {
      setDownloading(false)
    }
  }

  const handleViewBatch = async (batch) => {
    setHistoryError('')
    try {
      const detail = await fetchConversionBatch(batch.id)
      setCurrentBatch(detail)

      if (detail.status === 'COMPLETED' && detail.download_available) {
        setOpeningHistoryId(batch.id)
        try {
          await previewConversion(detail)
        } finally {
          setOpeningHistoryId(null)
        }
      } else {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    } catch (error) {
      setHistoryError(error.message || 'Gagal membuka batch')
    }
  }

  const handleHistoryRowClick = async (batch) => {
    setHistoryError('')
    try {
      const detail = await fetchConversionBatch(batch.id)
      setCurrentBatch(detail)
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch (error) {
      setHistoryError(error.message || 'Gagal memuat detail batch')
    }
  }

  const handleHistoryDownload = async (batch) => {
    setDownloadingHistoryId(batch.id)
    try {
      await downloadConversion(batch)
    } catch (error) {
      setHistoryError(error.message || 'Gagal mengunduh hasil konversi')
    } finally {
      setDownloadingHistoryId(null)
    }
  }

  const handleHistoryPageSizeChange = (size) => {
    setHistoryPageSize(size)
    setHistoryPage(1)
  }

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
          <div className="convert-page__grid">
            <CardUploadConvert
              selectedKey={selectedKey}
              capabilityOptions={capabilityOptions}
              onConversionChange={handleConversionChange}
              isBatchMode={isBatchMode}
              folderName={folderName}
              onFolderNameChange={setFolderName}
              templateOptions={templateOptions}
              templateCode={templateCode}
              onTemplateCodeChange={setTemplateCode}
              uploadResetKey={uploadResetKey}
              onFilesChange={handleFilesChange}
              formError={formError}
              submitting={submitting}
              currentBatch={currentBatch}
              downloading={downloading}
              onDownload={handleDownload}
              resultRef={resultRef}
            />

            <CardViewConvert
              resultRef={resultRef}
              currentBatch={currentBatch}
              historyMeta={historyMeta}
              progressPercent={progressPercent}
              statusTone={statusTone}
              activeStepIndex={activeStepIndex}
              stepperFillPercent={stepperFillPercent}
              isDangerStep={isDangerStep}
              progressHeading={progressHeading}
              validationErrors={validationErrors}
              resultSummary={resultSummary}
            />
          </div>
        )}
      </form>

      <DataTableHistory
        batches={historyBatches}
        loading={historyLoading}
        error={historyError}
        page={historyPage}
        pageSize={historyPageSize}
        pageSizeOptions={HISTORY_PAGE_SIZE_OPTIONS}
        meta={historyMeta}
        onPageChange={setHistoryPage}
        onPageSizeChange={handleHistoryPageSizeChange}
        onRowClick={handleHistoryRowClick}
        onView={handleViewBatch}
        onDownload={handleHistoryDownload}
        downloadingId={downloadingHistoryId}
        openingId={openingHistoryId}
      />
    </section>
  )
}

export default ConvertPage
