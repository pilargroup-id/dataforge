import { useEffect } from 'react'
import { createPortal } from 'react-dom'

import { AlertCircle, RefreshCw05, XClose } from '../../layoute/TemplateIcons.jsx'

function DialogCancel({
  isOpen = false,
  eyebrow = 'Convert',
  title = 'Batalkan Konversi',
  message = 'Batalkan konversi ini? Seluruh data batch akan dihapus permanen dan tidak dapat dikembalikan.',
  loading = false,
  onClose,
  onConfirm,
}) {
  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !loading) {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, loading, onClose])

  if (!isOpen) {
    return null
  }

  if (typeof document === 'undefined') {
    return null
  }

  const handleOverlayClick = () => {
    if (!loading) {
      onClose?.()
    }
  }

  const dialogNode = (
    <div className="dashboard-popup-overlay" role="presentation" onClick={handleOverlayClick}>
      <div
        className="dashboard-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-cancel-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="dialog-cancel-title">
              {title}
            </h2>
          </div>

          <button
            type="button"
            className="dashboard-popup__close"
            aria-label="Tutup dialog"
            onClick={onClose}
            disabled={loading}
          >
            <XClose size={18} />
          </button>
        </div>

        <div className="dashboard-popup__body">
          <div className="dashboard-popup__notice">
            <AlertCircle size={18} aria-hidden="true" />
            <p>{message}</p>
          </div>
        </div>

        <div className="dashboard-popup__actions">
          <button
            type="button"
            className="dashboard-popup__button dashboard-popup__button--secondary"
            onClick={onClose}
            disabled={loading}
          >
            Batal
          </button>
          <button
            type="button"
            className="dashboard-popup__button dashboard-popup__button--danger"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <RefreshCw05 size={16} aria-hidden="true" className="dashboard-popup__spinner" />
            ) : null}
            {loading ? 'Membatalkan...' : 'Ya, Batalkan'}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogCancel
