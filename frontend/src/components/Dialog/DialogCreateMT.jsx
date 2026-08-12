import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { FileText01, XClose } from '../layoute/TemplateIcons.jsx'

const supportOptions = [
  'Alya Pratama',
  'Bima Saputra',
  'Dio Mahendra',
  'Clara Wijaya',
  'Evelyn Santoso',
]

const priorityOptions = ['Low', 'Medium', 'High']

const documentStatusOptions = ['Lengkap', 'Belum lengkap']

function DialogCreateTicket({
  isOpen = false,
  eyebrow = 'Create Ticket',
  title = 'Create Tickets',
  onClose,
}) {
  const [selectedFileName, setSelectedFileName] = useState('')
  const [isDragActive, setIsDragActive] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setSelectedFileName('')
      setIsDragActive(false)
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    setSelectedFileName(file?.name ?? '')
  }

  const handleDragOver = (event) => {
    event.preventDefault()
    setIsDragActive(true)
  }

  const handleDragLeave = (event) => {
    event.preventDefault()
    setIsDragActive(false)
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDragActive(false)

    const file = event.dataTransfer.files?.[0]
    setSelectedFileName(file?.name ?? '')
  }

  if (!isOpen) {
    return null
  }

  if (typeof document === 'undefined') {
    return null
  }

  const dialogNode = (
    <div className="dashboard-popup-overlay" role="presentation" onClick={onClose}>
      <div
        className="dashboard-popup register-user-popup mtickets-create-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-create-ticket-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="dialog-create-ticket-title">
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

        <div className="dashboard-popup__body">
          <div className="register-user-popup__layout">
            <div className="register-user-popup__main">
              <div className="register-user-popup__form">
                <div className="register-user-popup__grid">
                  <div className="register-user-popup__field">
                    <label className="register-user-popup__label" htmlFor="ticket-category">
                      Category
                    </label>
                    <select
                      id="ticket-category"
                      className="register-user-popup__select register-user-popup__select--arrow-offset"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Pilih category
                      </option>
                      <option value="Contract">Contract</option>
                      <option value="Compliance">Compliance</option>
                      <option value="Litigation">Litigation</option>
                      <option value="Corporate">Corporate</option>
                      <option value="Advisory">Advisory</option>
                    </select>
                  </div>

                  <div className="register-user-popup__field">
                    <label className="register-user-popup__label" htmlFor="ticket-support-name">
                      Support Name
                    </label>
                    <select
                      id="ticket-support-name"
                      className="register-user-popup__select register-user-popup__select--arrow-offset"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Pilih support name
                      </option>
                      {supportOptions.map((supportName) => (
                        <option key={supportName} value={supportName}>
                          {supportName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="register-user-popup__field">
                    <label className="register-user-popup__label" htmlFor="ticket-priority">
                      Priority
                    </label>
                    <select
                      id="ticket-priority"
                      className="register-user-popup__select register-user-popup__select--arrow-offset"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Pilih priority
                      </option>
                      {priorityOptions.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="register-user-popup__field">
                    <label className="register-user-popup__label" htmlFor="ticket-document-status">
                      Status Document
                    </label>
                    <select
                      id="ticket-document-status"
                      className="register-user-popup__select register-user-popup__select--arrow-offset"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Pilih status document
                      </option>
                      {documentStatusOptions.map((documentStatus) => (
                        <option key={documentStatus} value={documentStatus}>
                          {documentStatus}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="register-user-popup__field register-user-popup__field--full">
                    <label className="register-user-popup__label" htmlFor="ticket-issue">
                      Masalah
                    </label>
                    <textarea
                      id="ticket-issue"
                      className="register-user-popup__input master-project-popup__textarea"
                      placeholder="Jelaskan permasalahan atau kebutuhan legal yang ingin diajukan."
                    />
                  </div>
                </div>
              </div>
            </div>

            <aside className="register-user-popup__section mtickets-create-popup__upload-panel">
              <div className="register-user-popup__section-header">
                <p className="register-user-popup__label">Upload File</p>
                <p className="register-user-popup__hint">
                  Letakkan dokumen pendukung di area ini agar popup tetap ringkas.
                </p>
              </div>

              <label
                htmlFor="ticket-attachment"
                className={`register-user-popup__upload mtickets-create-popup__upload${
                  isDragActive ? ' is-drag-active' : ''
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  id="ticket-attachment"
                  type="file"
                  className="register-user-popup__upload-input"
                  onChange={handleFileChange}
                />
                <span className="register-user-popup__upload-icon">
                  <FileText01 size={20} />
                </span>
                <span className="register-user-popup__upload-title">Drag and drop file di sini</span>
                <span className="register-user-popup__upload-meta">
                  atau klik untuk memilih file dari perangkat Anda
                </span>
                <span className="register-user-popup__upload-file">
                  {selectedFileName || 'Belum ada file yang dipilih'}
                </span>
              </label>
            </aside>
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
            type="button"
            className="dashboard-popup__button dashboard-popup__button--primary"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogCreateTicket
