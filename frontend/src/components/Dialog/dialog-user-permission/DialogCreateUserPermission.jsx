import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { XClose } from '../../layoute/TemplateIcons.jsx'
import { Dropdown, DropdownCheckBox, DropdownSearch } from '../../forms/index.js'
import { getDirectoryDepartments, getDirectoryUsers } from '../../../services/directory.service.js'
import { createPermissionAssignment, getPermissionCatalog } from '../../../services/permission.service.js'

const scopeTypeOptions = [
  { value: 'USER', label: 'User' },
  { value: 'DEPARTMENT', label: 'Department' },
  { value: 'COMPANY', label: 'Company' },
]

const effectOptions = [
  { value: 'ALLOW', label: 'Allow' },
  { value: 'DENY', label: 'Deny' },
]

const INITIAL_FORM = {
  scopeType: 'DEPARTMENT',
  scopeId: '',
  moduleCode: '',
  submoduleCodes: [],
  effect: 'ALLOW',
}

function getUserLabel(user) {
  const name = user?.name || user?.full_name || user?.username || `User #${user?.id}`
  return user?.email ? `${name} (${user.email})` : name
}

function getDepartmentLabel(department) {
  const name = department?.name || department?.department_name || `Department #${department?.id}`
  return department?.code ? `${name} (${department.code})` : name
}

function DialogCreateUserPermission({
  isOpen = false,
  eyebrow = 'Master Data',
  title = 'Create User Permission',
  onClose,
  onCreated,
}) {
  const [form, setForm] = useState(INITIAL_FORM)

  const [catalog, setCatalog] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogError, setCatalogError] = useState('')

  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [directoryLoading, setDirectoryLoading] = useState(false)
  const [directoryError, setDirectoryError] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (!isOpen) {
      const resetForm = () => {
        setForm(INITIAL_FORM)
        setSubmitError('')
      }
      resetForm()
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    let isMounted = true

    async function loadCatalog() {
      setCatalogLoading(true)
      setCatalogError('')
      try {
        const data = await getPermissionCatalog()
        if (!isMounted) return
        setCatalog(data)
        const firstActiveModule = data.find((module) => module.is_active)
        if (firstActiveModule) {
          setForm((previous) => ({ ...previous, moduleCode: firstActiveModule.code }))
        }
      } catch (error) {
        if (!isMounted) return
        setCatalogError(error.message || 'Gagal memuat daftar module permission')
      } finally {
        if (isMounted) setCatalogLoading(false)
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

    loadCatalog()
    loadDirectory()

    return () => {
      isMounted = false
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  const handleFieldChange = (field) => (event) => {
    const { value } = event.target
    setSubmitError('')
    setForm((previous) => ({ ...previous, [field]: value }))
  }

  const handleScopeTypeChange = (value) => {
    setSubmitError('')
    setForm((previous) => ({ ...previous, scopeType: value, scopeId: '' }))
  }

  const handleScopeIdChange = (value) => {
    setSubmitError('')
    setForm((previous) => ({ ...previous, scopeId: value != null ? String(value) : '' }))
  }

  const handleModuleChange = (value) => {
    setSubmitError('')
    setForm((previous) => ({ ...previous, moduleCode: value, submoduleCodes: [] }))
  }

  const handleSubmoduleChange = (values) => {
    setSubmitError('')
    setForm((previous) => ({ ...previous, submoduleCodes: values }))
  }

  const handleEffectChange = (value) => {
    setSubmitError('')
    setForm((previous) => ({ ...previous, effect: value }))
  }

  const selectedModule = catalog.find((module) => module.code === form.moduleCode) ?? null
  const submoduleOptions = (selectedModule?.submodules ?? []).filter((submodule) => submodule.is_active)

  const activeModules = catalog.filter((module) => module.is_active)

  const userOptions = users.map((user) => ({ value: String(user.id), label: getUserLabel(user) }))
  const departmentOptions = departments.map((department) => ({
    value: String(department.id),
    label: getDepartmentLabel(department),
  }))
  const moduleOptions = activeModules.map((module) => ({
    value: module.code,
    label: module.name,
  }))
  const submoduleCheckboxOptions = submoduleOptions.map((submodule) => ({
    value: submodule.code,
    label: submodule.name,
  }))

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
    if (!form.moduleCode) {
      setSubmitError('Module wajib dipilih')
      return
    }

    setSubmitting(true)
    try {
      const submoduleCodes = form.submoduleCodes.length > 0 ? form.submoduleCodes : [undefined]
      const created = await Promise.all(
        submoduleCodes.map((submoduleCode) =>
          createPermissionAssignment({
            scope_type: form.scopeType,
            scope_id: form.scopeId.trim(),
            module_code: form.moduleCode,
            submodule_code: submoduleCode || undefined,
            effect: form.effect,
          }),
        ),
      )
      onCreated?.(created)
      onClose?.()
    } catch (error) {
      setSubmitError(error.message || 'Gagal membuat permission')
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

  const dialogNode = (
    <div className="dashboard-popup-overlay" role="presentation" onClick={onClose}>
      <div
        className="dashboard-popup register-user-popup user-permission-create-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-create-user-permission-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="dialog-create-user-permission-title">
              {title}
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
                    id="permission-scope-type"
                    label="Scope Type"
                    options={scopeTypeOptions}
                    value={form.scopeType}
                    onChange={handleScopeTypeChange}
                  />
                </div>

                <div className="register-user-popup__field">
                  {form.scopeType === 'USER' ? (
                    <DropdownSearch
                      id="permission-scope-id"
                      label={scopeLabel}
                      options={userOptions}
                      value={form.scopeId}
                      placeholder={directoryLoading ? 'Memuat user...' : 'Pilih user'}
                      disabled={directoryLoading}
                      onChange={handleScopeIdChange}
                    />
                  ) : form.scopeType === 'DEPARTMENT' ? (
                    <DropdownSearch
                      id="permission-scope-id"
                      label={scopeLabel}
                      options={departmentOptions}
                      value={form.scopeId}
                      placeholder={directoryLoading ? 'Memuat department...' : 'Pilih department'}
                      disabled={directoryLoading}
                      onChange={handleScopeIdChange}
                    />
                  ) : (
                    <>
                      <label className="register-user-popup__label" htmlFor="permission-scope-id">
                        {scopeLabel}
                      </label>
                      <input
                        id="permission-scope-id"
                        type="text"
                        className="register-user-popup__input"
                        placeholder="Masukkan company ID yang sudah dikonfirmasi"
                        value={form.scopeId}
                        onChange={handleFieldChange('scopeId')}
                      />
                    </>
                  )}
                </div>

                <div className="register-user-popup__field">
                  <Dropdown
                    id="permission-module"
                    label="Module"
                    options={moduleOptions}
                    value={form.moduleCode}
                    placeholder={catalogLoading ? 'Memuat module...' : 'Pilih module'}
                    disabled={catalogLoading}
                    onChange={handleModuleChange}
                  />
                </div>

                <div className="register-user-popup__field">
                  <DropdownCheckBox
                    id="permission-submodule"
                    label="Submodule"
                    options={submoduleCheckboxOptions}
                    value={form.submoduleCodes}
                    placeholder="Seluruh submodule (module-level)"
                    disabled={!submoduleOptions.length}
                    onChange={handleSubmoduleChange}
                  />
                </div>

                <div className="register-user-popup__field">
                  <Dropdown
                    id="permission-effect"
                    label="Effect"
                    options={effectOptions}
                    value={form.effect}
                    onChange={handleEffectChange}
                  />
                </div>
              </div>

              {form.scopeType === 'COMPANY' ? (
                <p className="register-user-popup__hint">
                  Selector company ID belum tersedia dari directory. Pastikan ID yang dimasukkan sudah
                  dikonfirmasi sebelum disimpan.
                </p>
              ) : null}

              {catalogError ? <p className="register-user-popup__error">{catalogError}</p> : null}
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
              disabled={submitting || catalogLoading}
            >
              {submitting ? 'Menyimpan...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogCreateUserPermission
