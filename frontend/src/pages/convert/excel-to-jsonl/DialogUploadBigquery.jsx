import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { AlertCircle, CheckCircle, RefreshCw05, XClose } from '../../../components/layoute/TemplateIcons.jsx'
import { DropdownSearch, RadioGroup, TextField } from '../../../components/forms/index.js'
import {
  createBigQueryLoad,
  getBigQueryDatasets,
  getBigQueryLoad,
  getBigQueryTable,
  getBigQueryTables,
  validateBigQueryLoad,
} from '../../../services/bigquery.service.js'

const ACTIVE_LOAD_STATUSES = ['QUEUED', 'VALIDATING', 'LOADING']

const LOAD_STATUS_LABELS = {
  QUEUED: 'Menunggu antrian',
  VALIDATING: 'Memvalidasi data',
  LOADING: 'Mengirim ke BigQuery',
  COMPLETED: 'Selesai',
  FAILED: 'Gagal',
}

const WRITE_DISPOSITION_META = [
  {
    value: 'WRITE_APPEND',
    permissionKey: 'append',
    label: 'Tambahkan ke tabel (Append)',
    description: 'Data baru ditambahkan tanpa menghapus data lama.',
  },
  {
    value: 'WRITE_EMPTY',
    permissionKey: 'write_empty',
    label: 'Tulis hanya jika tabel kosong',
    description: 'Hanya berhasil jika tabel tujuan belum memiliki data sama sekali.',
  },
  {
    value: 'WRITE_TRUNCATE',
    permissionKey: 'truncate',
    label: 'Timpa seluruh data (Truncate)',
    description: 'Menghapus seluruh data lama sebelum menulis data baru. Butuh konfirmasi nama tabel.',
  },
]

const ERROR_MESSAGES = {
  BIGQUERY_TABLE_LOAD_IN_PROGRESS:
    'Tabel tujuan sedang diproses oleh upload lain. Coba lagi setelah proses tersebut selesai.',
  BIGQUERY_DATASET_FORBIDDEN: 'Anda tidak memiliki akses ke dataset ini.',
  BIGQUERY_WRITE_DISPOSITION_FORBIDDEN:
    'Anda tidak memiliki izin untuk write preference ini pada dataset tersebut.',
  BIGQUERY_TABLE_NOT_WRITABLE: 'Tabel tujuan tidak dapat ditulis dengan write preference ini.',
  BIGQUERY_TABLE_NOT_EMPTY: 'Tabel tujuan sudah memiliki data, pilih write preference lain.',
  BIGQUERY_TRUNCATE_CONFIRMATION_REQUIRED: 'Ketik ulang nama tabel dengan tepat untuk mengonfirmasi truncate.',
  BIGQUERY_CONVERSION_NOT_COMPLETED: 'Batch konversi belum selesai diproses.',
  BIGQUERY_CONVERSION_EXPIRED: 'Hasil konversi sudah kedaluwarsa.',
  BIGQUERY_CONVERSION_FILE_EXPIRED: 'Berkas hasil konversi sudah tidak tersedia lagi.',
  BIGQUERY_SOURCE_FILES_NOT_FOUND: 'Berkas JSONL hasil konversi tidak ditemukan.',
  BIGQUERY_SOURCE_NOT_JSONL: 'Batch ini bukan hasil konversi JSONL.',
  PERMISSION_DENIED: 'Anda tidak memiliki izin untuk upload BigQuery.',
  BIGQUERY_NOT_CONFIGURED: 'Integrasi BigQuery belum dikonfigurasi di server.',
}

function friendlyError(error, fallback) {
  return ERROR_MESSAGES[error?.code] || error?.message || fallback
}

function formatBytes(bytes) {
  const value = Number(bytes)
  if (!Number.isFinite(value) || value <= 0) return '-'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = value
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  return `${size.toFixed(unitIndex === 0 || size >= 10 ? 0 : 1)} ${units[unitIndex]}`
}

function formatNumber(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '-'
  return number.toLocaleString('id-ID')
}

function DialogUploadBigquery({ isOpen = false, batch, onClose }) {
  const [datasets, setDatasets] = useState([])
  const [datasetsLoading, setDatasetsLoading] = useState(false)
  const [datasetsError, setDatasetsError] = useState('')
  const [datasetId, setDatasetId] = useState('')

  const [tables, setTables] = useState([])
  const [tablesLoading, setTablesLoading] = useState(false)
  const [tablesError, setTablesError] = useState('')
  const [tableId, setTableId] = useState('')

  const [tableMeta, setTableMeta] = useState(null)
  const [tableMetaLoading, setTableMetaLoading] = useState(false)
  const [tableMetaError, setTableMetaError] = useState('')

  const [writeDisposition, setWriteDisposition] = useState('')
  const [truncateConfirmation, setTruncateConfirmation] = useState('')

  const [validation, setValidation] = useState(null)
  const [validating, setValidating] = useState(false)
  const [validateError, setValidateError] = useState('')

  const [job, setJob] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (!isOpen) {
      const resetState = () => {
        setDatasets([])
        setDatasetsError('')
        setDatasetId('')
        setTables([])
        setTablesError('')
        setTableId('')
        setTableMeta(null)
        setTableMetaError('')
        setWriteDisposition('')
        setTruncateConfirmation('')
        setValidation(null)
        setValidateError('')
        setJob(null)
        setSubmitError('')
      }
      resetState()
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKeyDown)

    let isMounted = true
    async function loadDatasets() {
      setDatasetsLoading(true)
      setDatasetsError('')
      try {
        const data = await getBigQueryDatasets()
        if (!isMounted) return
        setDatasets(data)
      } catch (error) {
        if (!isMounted) return
        setDatasetsError(friendlyError(error, 'Gagal memuat daftar dataset BigQuery'))
      } finally {
        if (isMounted) setDatasetsLoading(false)
      }
    }
    loadDatasets()

    return () => {
      isMounted = false
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen || !datasetId) {
      const resetTables = () => setTables([])
      resetTables()
      return undefined
    }

    let isMounted = true
    async function loadTables() {
      setTablesLoading(true)
      setTablesError('')
      try {
        const data = await getBigQueryTables(datasetId)
        if (!isMounted) return
        setTables(data)
      } catch (error) {
        if (!isMounted) return
        setTablesError(friendlyError(error, 'Gagal memuat daftar table'))
      } finally {
        if (isMounted) setTablesLoading(false)
      }
    }
    loadTables()

    return () => {
      isMounted = false
    }
  }, [isOpen, datasetId])

  useEffect(() => {
    if (!isOpen || !datasetId || !tableId) {
      const resetTableMeta = () => setTableMeta(null)
      resetTableMeta()
      return undefined
    }

    let isMounted = true
    async function loadTableMeta() {
      setTableMetaLoading(true)
      setTableMetaError('')
      try {
        const data = await getBigQueryTable(datasetId, tableId)
        if (!isMounted) return
        setTableMeta(data)
        const firstAllowed = WRITE_DISPOSITION_META.find(
          (option) => data?.permissions?.[option.permissionKey],
        )
        setWriteDisposition(firstAllowed ? firstAllowed.value : '')
      } catch (error) {
        if (!isMounted) return
        setTableMetaError(friendlyError(error, 'Gagal memuat metadata table'))
      } finally {
        if (isMounted) setTableMetaLoading(false)
      }
    }
    loadTableMeta()

    return () => {
      isMounted = false
    }
  }, [isOpen, datasetId, tableId])

  useEffect(() => {
    if (!job || !ACTIVE_LOAD_STATUSES.includes(job.status)) {
      return undefined
    }

    const intervalId = setInterval(async () => {
      try {
        const updated = await getBigQueryLoad(job.id)
        setJob(updated)
      } catch {
        // keep last known state if a poll tick fails
      }
    }, 3000)

    return () => clearInterval(intervalId)
  }, [job?.id, job?.status])

  const handleDatasetChange = (value) => {
    setDatasetId(value)
    setTableId('')
    setTableMeta(null)
    setWriteDisposition('')
    setTruncateConfirmation('')
    setValidation(null)
    setValidateError('')
    setJob(null)
    setSubmitError('')
  }

  const handleTableChange = (value) => {
    setTableId(value)
    setTruncateConfirmation('')
    setValidation(null)
    setValidateError('')
    setJob(null)
    setSubmitError('')
  }

  const handleWriteDispositionChange = (value) => {
    setWriteDisposition(value)
    setTruncateConfirmation('')
    setValidation(null)
    setValidateError('')
    setJob(null)
    setSubmitError('')
  }

  const isTruncateSelected = writeDisposition === 'WRITE_TRUNCATE'
  const truncateConfirmed = !isTruncateSelected || truncateConfirmation.trim() === tableId
  const isJobActive = Boolean(job && ACTIVE_LOAD_STATUSES.includes(job.status))

  const handleValidate = async () => {
    if (!batch?.id || !datasetId || !tableId || !writeDisposition) return

    setValidating(true)
    setValidateError('')
    setValidation(null)
    try {
      const result = await validateBigQueryLoad({
        conversion_batch_id: batch.id,
        dataset_id: datasetId,
        table_id: tableId,
        write_disposition: writeDisposition,
      })
      setValidation(result)
    } catch (error) {
      setValidateError(friendlyError(error, 'Gagal memvalidasi data sebelum upload'))
    } finally {
      setValidating(false)
    }
  }

  const handleLoad = async () => {
    if (!batch?.id || !validation?.validation?.valid || !truncateConfirmed) return

    setSubmitting(true)
    setSubmitError('')
    try {
      const created = await createBigQueryLoad({
        conversion_batch_id: batch.id,
        dataset_id: datasetId,
        table_id: tableId,
        write_disposition: writeDisposition,
        ...(isTruncateSelected ? { truncate_confirmation: truncateConfirmation.trim() } : {}),
      })
      setJob(created)
    } catch (error) {
      setSubmitError(friendlyError(error, 'Gagal membuat proses upload BigQuery'))
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen || typeof document === 'undefined') {
    return null
  }

  const datasetOptions = datasets.map((dataset) => ({ value: dataset.id, label: dataset.id }))
  const tableOptions = tables.map((table) => ({ value: table.id, label: table.id }))
  const writeOptions = WRITE_DISPOSITION_META.map((option) => ({
    value: option.value,
    label: option.label,
    description: option.description,
    disabled: !tableMeta?.permissions?.[option.permissionKey],
  }))

  const canValidate = Boolean(datasetId && tableId && writeDisposition) && !validating && !isJobActive
  const canLoad = Boolean(validation?.validation?.valid) && truncateConfirmed && !submitting && !isJobActive
  const jobStatusClass = job?.status ? job.status.toLowerCase() : ''

  const dialogNode = (
    <div className="dashboard-popup-overlay" role="presentation" onClick={onClose}>
      <div
        className="dashboard-popup register-user-popup bigquery-upload-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-upload-bigquery-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">BigQuery</p>
            <h2 className="dashboard-popup__title" id="dialog-upload-bigquery-title">
              Upload ke BigQuery
            </h2>
          </div>

          <button
            type="button"
            className="dashboard-popup__close"
            aria-label="Tutup dialog"
            onClick={onClose}
          >
            <XClose size={18} />
          </button>
        </div>

        <div className="dashboard-popup__body">
          <div className="bigquery-upload-popup__source">
            <p className="bigquery-upload-popup__source-title">{batch?.batch_name || 'Batch konversi'}</p>
            <p className="bigquery-upload-popup__source-meta">
              {batch?.source_format} → {batch?.target_format} · {formatNumber(batch?.total_records)} baris
            </p>
          </div>

          <div className="register-user-popup__grid">
            <div className="register-user-popup__field">
              <DropdownSearch
                id="bigquery-dataset"
                label="Dataset"
                options={datasetOptions}
                value={datasetId}
                placeholder={datasetsLoading ? 'Memuat dataset...' : 'Pilih dataset'}
                disabled={datasetsLoading || isJobActive}
                onChange={handleDatasetChange}
              />
            </div>

            <div className="register-user-popup__field">
              <DropdownSearch
                id="bigquery-table"
                label="Table"
                options={tableOptions}
                value={tableId}
                placeholder={
                  !datasetId ? 'Pilih dataset dahulu' : tablesLoading ? 'Memuat table...' : 'Pilih table'
                }
                disabled={!datasetId || tablesLoading || isJobActive}
                onChange={handleTableChange}
              />
            </div>
          </div>

          {datasetsError ? <p className="register-user-popup__error">{datasetsError}</p> : null}
          {tablesError ? <p className="register-user-popup__error">{tablesError}</p> : null}
          {tableMetaError ? <p className="register-user-popup__error">{tableMetaError}</p> : null}

          {tableId ? (
            <RadioGroup
              label="Write Preference"
              name="bigquery-write-disposition"
              options={writeOptions}
              value={writeDisposition}
              disabled={tableMetaLoading || isJobActive}
              onChange={handleWriteDispositionChange}
            />
          ) : null}

          {isTruncateSelected ? (
            <TextField
              id="bigquery-truncate-confirmation"
              label={`Ketik "${tableId}" untuk konfirmasi truncate`}
              placeholder={tableId}
              value={truncateConfirmation}
              disabled={isJobActive}
              onChange={(event) => setTruncateConfirmation(event.target.value)}
            />
          ) : null}

          {validateError ? <p className="register-user-popup__error">{validateError}</p> : null}

          {validation ? (
            <div
              className={`bigquery-upload-popup__validation bigquery-upload-popup__validation--${
                validation.validation.valid ? 'valid' : 'invalid'
              }`}
            >
              <p className="bigquery-upload-popup__validation-title">
                {validation.validation.valid
                  ? 'Validasi berhasil, data siap diupload.'
                  : `Validasi gagal: ${formatNumber(validation.validation.invalid_records)} baris tidak sesuai schema.`}
              </p>
              <p className="bigquery-upload-popup__validation-meta">
                {formatNumber(validation.source.conversion_records)} baris · {validation.source.jsonl_files}{' '}
                berkas JSONL · {formatBytes(validation.source.size_bytes)}
              </p>
              {!validation.validation.valid && validation.validation.error_samples?.length ? (
                <ul className="bigquery-upload-popup__validation-errors">
                  {validation.validation.error_samples.slice(0, 5).map((sample, index) => (
                    <li key={index}>{typeof sample === 'string' ? sample : JSON.stringify(sample)}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {submitError ? <p className="register-user-popup__error">{submitError}</p> : null}

          {job ? (
            <div className={`bigquery-upload-popup__job bigquery-upload-popup__job--${jobStatusClass}`}>
              <span className="bigquery-upload-popup__job-icon">
                {job.status === 'COMPLETED' ? (
                  <CheckCircle size={18} aria-hidden="true" />
                ) : job.status === 'FAILED' ? (
                  <AlertCircle size={18} aria-hidden="true" />
                ) : (
                  <RefreshCw05 size={18} aria-hidden="true" className="convert-page__spin" />
                )}
              </span>
              <div>
                <p className="bigquery-upload-popup__job-title">
                  {LOAD_STATUS_LABELS[job.status] || job.status}
                </p>
                <span className="bigquery-upload-popup__job-subtitle">
                  {job.status === 'COMPLETED'
                    ? `${formatNumber(job.total_records)} baris berhasil dimuat ke ${job.dataset_id}.${job.table_id}`
                    : job.status === 'FAILED'
                      ? job.error_message || 'Upload gagal diproses.'
                      : 'Anda dapat menutup dialog ini, proses akan tetap berjalan di background.'}
                </span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="dashboard-popup__actions">
          <button
            type="button"
            className="dashboard-popup__button dashboard-popup__button--secondary"
            onClick={onClose}
          >
            {isJobActive || job?.status === 'COMPLETED' ? 'Tutup' : 'Batal'}
          </button>
          <button
            type="button"
            className="dashboard-popup__button dashboard-popup__button--secondary"
            onClick={handleValidate}
            disabled={!canValidate}
          >
            {validating ? 'Memvalidasi...' : 'Validate'}
          </button>
          <button
            type="button"
            className="dashboard-popup__button dashboard-popup__button--primary"
            onClick={handleLoad}
            disabled={!canLoad}
          >
            {submitting ? 'Mengirim...' : 'Load to BigQuery'}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogUploadBigquery
