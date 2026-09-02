import { useEffect, useMemo, useRef, useState } from 'react'

import {
  AlertCircle,
  CheckCircle,
  FileText01,
  Pause,
  RefreshCw05,
} from '../../components/layoute/TemplateIcons.jsx'
import {
  ACTIVE_STATUSES,
  BRANCH_CODE_OPTIONS_BY_DATABASE,
  HISTORY_PAGE_SIZE_OPTIONS,
  PROGRESS_STEPS,
  STATUS_LABELS,
  STATUS_TONE,
  TERMINAL_DANGER_STATUSES,
  cancelConversion,
  canCancelBatch,
  canContinueBatch,
  canPauseBatch,
  capabilityKey,
  continueConversion,
  convert,
  downloadConversion,
  fetchConversionBatch,
  fetchConversionCapabilitiesByFormat,
  fetchConversionHistory,
  findCapabilityForBatch,
  formatPauseExpiry,
  getActiveStepIndex,
  pauseConversion,
  previewConversion,
} from './convert.service.js'

function useConvertWorkspace(targetFormat) {
  const [capabilities, setCapabilities] = useState([])
  const [capabilitiesLoading, setCapabilitiesLoading] = useState(true)
  const [capabilitiesError, setCapabilitiesError] = useState('')

  const [selectedKey, setSelectedKey] = useState('')
  const [folderName, setFolderName] = useState('')
  const [templateCode, setTemplateCode] = useState('')
  const [branchCode, setBranchCode] = useState('')
  const [files, setFiles] = useState([])
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [uploadResetKey, setUploadResetKey] = useState(0)

  const [currentBatch, setCurrentBatch] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [pausing, setPausing] = useState(false)
  const [continuing, setContinuing] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
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
        const { capabilities: data, defaultKey } = await fetchConversionCapabilitiesByFormat(targetFormat)
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
  }, [targetFormat])

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
        const { data, meta } = await fetchConversionHistory({
          page: historyPage,
          limit: historyPageSize,
          targetFormat,
        })
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
  }, [targetFormat, historyPage, historyPageSize, historyRefreshKey])

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

  const templates = selectedCapability?.templates ?? []

  const branchGroups = []
  const seenBranchValues = new Set()
  templates.forEach((template) => {
    if (!template.database_code) return
    const options = BRANCH_CODE_OPTIONS_BY_DATABASE[template.database_code] ?? []
    options.forEach((option) => {
      if (seenBranchValues.has(option.value)) return
      seenBranchValues.add(option.value)
      branchGroups.push({ ...option, database_code: template.database_code })
    })
  })

  const requiresBranchCode = templates.some((template) => template.requires_branch_code)
  const branchCodeOptions = branchGroups.map(({ value, label }) => ({ value, label }))

  const selectedBranchGroup = branchGroups.find((group) => group.value === branchCode) ?? null
  const visibleTemplates = selectedBranchGroup
    ? templates.filter((template) => template.database_code === selectedBranchGroup.database_code)
    : templates

  const templateOptions = visibleTemplates.map((template) => ({
    value: template.code,
    label: template.name || template.code,
  }))

  const currentBatchCapability = useMemo(
    () => findCapabilityForBatch(capabilities, currentBatch),
    [capabilities, currentBatch],
  )
  const supportsPauseResume = currentBatchCapability?.supports_pause_resume ?? false

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
    setBranchCode('')
    setFormError('')
    setUploadResetKey((n) => n + 1)
  }

  const handleTemplateCodeChange = (value) => {
    setTemplateCode(value)
    setFormError('')
  }

  const handleBranchCodeChange = (value) => {
    setBranchCode(value)
    setFormError('')
    const group = branchGroups.find((option) => option.value === value) ?? null
    const currentTemplate = templates.find((template) => template.code === templateCode)
    if (currentTemplate && group && currentTemplate.database_code !== group.database_code) {
      setTemplateCode('')
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')

    setSubmitting(true)
    try {
      const batch = await convert({
        selectedCapability,
        isBatchMode,
        folderName,
        templateCode,
        files,
        requiresBranchCode,
        branchCode,
      })
      setCurrentBatch(batch)
      setFiles([])
      setFolderName('')
      setBranchCode('')
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

  const handlePause = async () => {
    if (!currentBatch) return
    setFormError('')
    setPausing(true)
    try {
      const updated = await pauseConversion(currentBatch)
      setCurrentBatch(updated)
    } catch (error) {
      setFormError(error.message || 'Gagal menjeda konversi')
    } finally {
      setPausing(false)
    }
  }

  const handleContinue = async () => {
    if (!currentBatch) return
    setFormError('')
    setContinuing(true)
    try {
      const updated = await continueConversion(currentBatch)
      setCurrentBatch(updated)
      setHistoryRefreshKey((key) => key + 1)
    } catch (error) {
      if (error.code === 'PAUSED_BATCH_EXPIRED') {
        setCurrentBatch(null)
        setHistoryRefreshKey((key) => key + 1)
      }
      setFormError(error.message || 'Gagal melanjutkan konversi')
    } finally {
      setContinuing(false)
    }
  }

  const handleCancel = () => {
    if (!currentBatch) return
    setCancelDialogOpen(true)
  }

  const handleCancelDialogClose = () => {
    if (cancelling) return
    setCancelDialogOpen(false)
  }

  const handleCancelConfirm = async () => {
    if (!currentBatch) return
    setFormError('')
    setCancelling(true)
    try {
      await cancelConversion(currentBatch)
      setCurrentBatch(null)
      setHistoryRefreshKey((key) => key + 1)
    } catch (error) {
      setFormError(error.message || 'Gagal membatalkan konversi')
    } finally {
      setCancelling(false)
      setCancelDialogOpen(false)
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

  const progressPercent =
    currentBatch?.progress_percent !== undefined && currentBatch?.progress_percent !== null
      ? Math.round(Number(currentBatch.progress_percent))
      : currentBatch?.total_input_files
        ? Math.round(((currentBatch.processed_input_files ?? 0) / currentBatch.total_input_files) * 100)
        : 0

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
  } else if (currentBatch.status === 'PAUSING') {
    resultSummary = {
      icon: RefreshCw05,
      title: currentBatch.batch_name,
      subtitle: 'Menyelesaikan unit kerja aktif sampai checkpoint aman sebelum berhenti...',
      tone: 'progress',
      spin: true,
    }
  } else if (isBatchActive) {
    resultSummary = {
      icon: RefreshCw05,
      title: currentBatch.batch_name,
      subtitle: 'Sedang diproses, mohon tunggu...',
      tone: 'progress',
      spin: true,
    }
  } else if (currentBatch.status === 'PAUSED') {
    const remaining = formatPauseExpiry(currentBatch.pause_expires_in_seconds)
    resultSummary = {
      icon: Pause,
      title: currentBatch.batch_name,
      subtitle: remaining
        ? `Dijeda. Klik Lanjutkan untuk melanjutkan dari checkpoint terakhir. Data akan dihapus dalam ${remaining} jika tidak dilanjutkan.`
        : 'Dijeda. Klik Lanjutkan untuk melanjutkan dari checkpoint terakhir.',
      tone: 'neutral',
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

  return {
    capabilitiesLoading,
    capabilitiesError,
    allowedCapabilities,

    selectedKey,
    capabilityOptions,
    handleConversionChange,
    isBatchMode,
    folderName,
    setFolderName,
    templateOptions,
    templateCode,
    onTemplateCodeChange: handleTemplateCodeChange,
    requiresBranchCode,
    branchCode,
    onBranchCodeChange: handleBranchCodeChange,
    branchCodeOptions,
    uploadResetKey,
    handleFilesChange,
    formError,
    submitting,
    handleSubmit,

    currentBatch,
    downloading,
    handleDownload,
    resultRef,
    canPause: canPauseBatch(currentBatch, supportsPauseResume),
    canContinue: canContinueBatch(currentBatch),
    canCancel: canCancelBatch(currentBatch),
    pausing,
    continuing,
    cancelling,
    handlePause,
    handleContinue,
    handleCancel,
    cancelDialogOpen,
    handleCancelDialogClose,
    handleCancelConfirm,

    historyMeta,
    progressPercent,
    statusTone,
    activeStepIndex,
    stepperFillPercent,
    isDangerStep,
    progressHeading,
    validationErrors,
    resultSummary,

    historyBatches,
    historyLoading,
    historyError,
    historyPage,
    setHistoryPage,
    historyPageSize,
    handleHistoryPageSizeChange,
    handleHistoryRowClick,
    handleViewBatch,
    handleHistoryDownload,
    downloadingHistoryId,
    openingHistoryId,
  }
}

export default useConvertWorkspace
