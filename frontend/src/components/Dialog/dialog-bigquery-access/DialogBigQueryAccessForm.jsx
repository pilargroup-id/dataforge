import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { XClose } from '../../layoute/TemplateIcons.jsx'
import { Checkbox, Dropdown, DropdownSearch, Switch } from '../../forms/index.js'
import { getDirectoryDepartments, getDirectoryUsers } from '../../../services/directory.service.js'
import {
  createBigQueryAccess,
  getBigQueryDatasets,
  updateBigQueryAccess,
} from '../../../services/bigquery.service.js'

const scopeTypeOptions = [
  { value: 'USER', label: 'User' },
  { value: 'DEPARTMENT', label: 'Department' },
  { value: 'COMPANY', label: 'Company' },
]

const effectOptions = [
  { value: 'ALLOW', label: 'Allow' },
  { value: 'DENY', label: 'Deny' },
]

const ERROR_MESSAGES = {
  BIGQUERY_SCOPE_TYPE_INVALID: 'Scope type harus USER, DEPARTMENT, atau COMPANY.',
  BIGQUERY_SCOPE_ID_REQUIRED: 'Scope wajib dipilih/diisi.',
  BIGQUERY_DATASET_REQUIRED: 'Dataset wajib dipilih.',
  BIGQUERY_DATASET_INVALID: 'Dataset tidak valid.',
  BIGQUERY_ACCESS_EFFECT_INVALID: 'Effect harus ALLOW atau DENY.',
  BIGQUERY_ACCESS_BOOLEAN_INVALID: 'Nilai write permission tidak valid.',
  BIGQUERY_DATASET_ACCESS_DUPLICATE: 'Assignment untuk scope dan dataset ini sudah ada.',
  BIGQUERY_DATASET_ACCESS_NOT_FOUND: 'Assignment tidak ditemukan, mungkin sudah dihapus.',
  BIGQUERY_DATASET_LOOKUP_FAILED: 'Dataset tidak ditemukan di BigQuery.',
  BIGQUERY_NOT_CONFIGURED: 'Integrasi BigQuery belum dikonfigurasi di server.',
  IT_ACCESS_REQUIRED: 'Hanya department IT yang dapat mengelola akses ini.',
  PERMISSION_DENIED: 'Anda tidak memiliki izin untuk aksi ini.',
}

function friendlyError(error, fallback) {
  return ERROR_MESSAGES[error?.code] || error?.message || fallback
}

function getUserLabel(user) {
  const name = user?.name || user?.full_name || user?.username || `User #${user?.id}`
  return user?.email ? `${name} (${user.email})` : name
}

function getDepartmentLabel(department) {
  const name = department?.name || department?.department_name || `Department #${department?.id}`
  return department?.code ? `${name} (${department.code})` : name
}

function buildInitialForm(record) {
  if (!record) {
    return {
      scopeType: 'DEPARTMENT',
      scopeId: '',
      datasetId: '',
      effect: 'ALLOW',
      canAppend: true,
      canWriteEmpty: false,
      canTruncate: false,
      isActive: true,
    }
  }

  return {
    scopeType: record.scope_type || 'DEPARTMENT',
    scopeId: record.scope_id !== undefined && record.scope_id !== null ? String(record.scope_id) : '',
    datasetId: record.dataset_id || '',
    effect: record.effect || 'ALLOW',
    canAppend: Boolean(Number(record.can_append)),
    canWriteEmpty: Boolean(Number(record.can_write_empty)),
    canTruncate: Boolean(Number(record.can_truncate)),
    isActive: record.is_active === undefined ? true : Boolean(Number(record.is_active)),
  }
}

function DialogBigQueryAccessForm({
  isOpen = false,
  mode = 'create',
  record = null,
  eyebrow = 'Master Data',
  onClose,
  onSaved,
}) {
  const isEdit = mode === 'edit'
  const [form, setForm] = useState(() => buildInitialForm(record))

  const [datasets, setDatasets] = useState([])
  const [datasetsLoading, setDatasetsLoading] = useState(false)
  const [datasetsError, setDatasetsError] = useState('')

  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [directoryLoading, setDirectoryLoading] = useState(false)
  const [directoryError, setDirectoryError] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (!isOpen) {
      const resetState = () => setSubmitError('')
      resetState()
      return undefined
    }

    const applyInitialForm = () => setForm(buildInitialForm(record))
    applyInitialForm()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
      }
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

    async function loadDirectory() {
      setDirectoryLoading(true)
      setDirectoryError('')
      try {
        const [usersData, departmentsData] = await Promise.all([
          getDirectoryUsers(),
          getDirectoryDepartments(),
        ])
        if (!isMounted) return
        setUsers(usersData)
        setDepartments(departmentsData)
      } catch (error) {
        if (!isMounted) return
        setDirectoryError(error.message || 'Gagal memuat data user/department')
      } finally {
        if (isMounted) setDirectoryLoading(false)
      }
    }

    loadDatasets()
    loadDirectory()

    return () => {
      isMounted = false
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, record, onClose])

  const handleScopeTypeChange = (value) => {
    setSubmitError('')
    setForm((previous) => ({ ...previous, scopeType: value, scopeId: '' }))
  }

  const handleScopeIdChange = (value) => {
    setSubmitError('')
    setForm((previous) => ({ ...previous, scopeId: value != null ? String(value) : '' }))
  }

  const handleScopeIdTextChange = (event) => {
    setSubmitError('')
    setForm((previous) => ({ ...previous, scopeId: event.target.value }))
  }

  const handleDatasetChange = (value) => {
    setSubmitError('')
    setForm((previous) => ({ ...previous, datasetId: value }))
  }

  const handleEffectChange = (value) => {
    setSubmitError('')
    setForm((previous) => ({
      ...previous,
      effect: value,
      canAppend: value === 'ALLOW' ? previous.canAppend : false,
      canWriteEmpty: value === 'ALLOW' ? previous.canWriteEmpty : false,
      canTruncate: value === 'ALLOW' ? previous.canTruncate : false,
    }))
  }

  const handleFlagChange = (field) => (event) => {
    setSubmitError('')
    const { checked } = event.target
    setForm((previous) => ({ ...previous, [field]: checked }))
  }

  const isDenyEffect = form.effect === 'DENY'

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')

    if (!form.scopeType) {
      setSubmitError('Scope type wajib dipilih')
      return
    }
    if (!form.scopeId.trim()) {
      setSubmitError('Scope wajib dipilih/diisi')
      return
    }
    if (!form.datasetId.trim()) {
      setSubmitError('Dataset wajib dipilih')
      return
    }

    const payload = {
      scope_type: form.scopeType,
      scope_id: form.scopeId.trim(),
      dataset_id: form.datasetId.trim(),
      effect: form.effect,
      can_append: isDenyEffect ? false : form.canAppend,
      can_write_empty: isDenyEffect ? false : form.canWriteEmpty,
      can_truncate: isDenyEffect ? false : form.canTruncate,
      is_active: form.isActive,
    }

    setSubmitting(true)
    try {
      const saved = isEdit
        ? await updateBigQueryAccess(record.id, payload)
        : await createBigQueryAccess(payload)
      onSaved?.(saved)
      onClose?.()
    } catch (error) {
      setSubmitError(friendlyError(error, isEdit ? 'Gagal memperbarui akses dataset' : 'Gagal membuat akses dataset'))
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) {
    return null
  }

  if (typeof document === 'undefined') {
    return null
  }

  const scopeLabel =
    form.scopeType === 'USER' ? 'User' : form.scopeType === 'DEPARTMENT' ? 'Department' : 'Company ID'

  const userOptions = users.map((user) => ({ value: String(user.id), label: getUserLabel(user) }))
  const departmentOptions = departments.map((department) => ({
    value: String(department.id),
    label: getDepartmentLabel(department),
  }))
  const datasetOptions = datasets.map((dataset) => ({ value: dataset.id, label: dataset.id }))

  const dialogNode = (
    <div className="dashboard-popup-overlay" role="presentation" onClick={onClose}>
      <div
        className="dashboard-popup register-user-popup bigquery-access-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-bigquery-access-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="dialog-bigquery-access-title">
              {isEdit ? 'Edit Akses Dataset' : 'Tambah Akses Dataset'}
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

        <form onSubmit={handleSubmit}>
          <div className="dashboard-popup__body">
            <div className="register-user-popup__form">
              <div className="register-user-popup__grid">
                <div className="register-user-popup__field">
                  <Dropdown
                    id="bigquery-access-scope-type"
                    label="Scope Type"
                    options={scopeTypeOptions}
                    value={form.scopeType}
                    onChange={handleScopeTypeChange}
                  />
                </div>

                <div className="register-user-popup__field">
                  {form.scopeType === 'USER' ? (
                    <DropdownSearch
                      id="bigquery-access-scope-id"
                      label={scopeLabel}
                      options={userOptions}
                      value={form.scopeId}
                      placeholder={directoryLoading ? 'Memuat user...' : 'Pilih user'}
                      disabled={directoryLoading}
                      onChange={handleScopeIdChange}
                    />
                  ) : form.scopeType === 'DEPARTMENT' ? (
                    <DropdownSearch
                      id="bigquery-access-scope-id"
                      label={scopeLabel}
                      options={departmentOptions}
                      value={form.scopeId}
                      placeholder={directoryLoading ? 'Memuat department...' : 'Pilih department'}
                      disabled={directoryLoading}
                      onChange={handleScopeIdChange}
                    />
                  ) : (
                    <>
                      <label className="register-user-popup__label" htmlFor="bigquery-access-scope-id">
                        {scopeLabel}
                      </label>
                      <input
                        id="bigquery-access-scope-id"
                        type="text"
                        className="register-user-popup__input"
                        placeholder="Masukkan company ID yang sudah dikonfirmasi"
                        value={form.scopeId}
                        onChange={handleScopeIdTextChange}
                      />
                    </>
                  )}
                </div>

                <div className="register-user-popup__field">
                  <DropdownSearch
                    id="bigquery-access-dataset"
                    label="Dataset"
                    options={datasetOptions}
                    value={form.datasetId}
                    placeholder={datasetsLoading ? 'Memuat dataset...' : 'Pilih dataset'}
                    disabled={datasetsLoading}
                    onChange={handleDatasetChange}
                  />
                </div>

                <div className="register-user-popup__field">
                  <Dropdown
                    id="bigquery-access-effect"
                    label="Effect"
                    options={effectOptions}
                    value={form.effect}
                    onChange={handleEffectChange}
                  />
                </div>
              </div>

              <div className="register-user-popup__field">
                <Switch
                  id="bigquery-access-is-active"
                  label="Aktif"
                  description="Assignment ini langsung berlaku selama aktif."
                  checked={form.isActive}
                  onChange={handleFlagChange('isActive')}
                />
              </div>

              <div className="register-user-popup__field">
                <span className="register-user-popup__label">Write Permission</span>
                <div className="bigquery-access-popup__permissions">
                  <Checkbox
                    id="bigquery-access-can-append"
                    label="Can Append"
                    description="Boleh menambahkan data (WRITE_APPEND) ke table pada dataset ini."
                    checked={form.canAppend}
                    disabled={isDenyEffect}
                    onChange={handleFlagChange('canAppend')}
                  />
                  <Checkbox
                    id="bigquery-access-can-write-empty"
                    label="Can Write Empty"
                    description="Boleh menulis (WRITE_EMPTY) hanya jika table tujuan masih kosong."
                    checked={form.canWriteEmpty}
                    disabled={isDenyEffect}
                    onChange={handleFlagChange('canWriteEmpty')}
                  />
                  <Checkbox
                    id="bigquery-access-can-truncate"
                    label="Can Truncate"
                    description="Boleh menimpa seluruh data table (WRITE_TRUNCATE) pada dataset ini."
                    checked={form.canTruncate}
                    disabled={isDenyEffect}
                    onChange={handleFlagChange('canTruncate')}
                  />
                </div>
              </div>

              {isDenyEffect ? (
                <p className="register-user-popup__hint">
                  Effect DENY menonaktifkan seluruh write permission secara otomatis.
                </p>
              ) : null}

              {form.scopeType === 'COMPANY' ? (
                <p className="register-user-popup__hint">
                  Selector company ID belum tersedia dari directory. Pastikan ID yang dimasukkan sudah
                  dikonfirmasi sebelum disimpan.
                </p>
              ) : null}

              {datasetsError ? <p className="register-user-popup__error">{datasetsError}</p> : null}
              {directoryError ? <p className="register-user-popup__error">{directoryError}</p> : null}
              {submitError ? <p className="register-user-popup__error">{submitError}</p> : null}
            </div>
          </div>

          <div className="dashboard-popup__actions">
            <button
              type="button"
              className="dashboard-popup__button dashboard-popup__button--secondary"
              onClick={onClose}
            >
              Batal
            </button>
            <button
              type="submit"
              className="dashboard-popup__button dashboard-popup__button--primary"
              disabled={submitting || datasetsLoading}
            >
              {submitting ? 'Menyimpan...' : isEdit ? 'Simpan' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogBigQueryAccessForm
