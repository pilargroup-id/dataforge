import { useCallback, useState } from 'react'

const DEFAULT_TITLES = {
  error: 'Terjadi Kesalahan',
  warning: 'Peringatan',
  success: 'Berhasil',
  info: 'Informasi',
}

const INITIAL_ALERT_STATE = {
  open: false,
  title: '',
  message: '',
  severity: 'info',
}

export function useAlert() {
  const [alertState, setAlertState] = useState(INITIAL_ALERT_STATE)

  const openAlert = useCallback((severity, message, title) => {
    setAlertState({
      open: true,
      title: title || DEFAULT_TITLES[severity] || DEFAULT_TITLES.info,
      message,
      severity,
    })
  }, [])

  const closeAlert = useCallback(() => {
    setAlertState((currentState) => ({
      ...currentState,
      open: false,
    }))
  }, [])

  const showError = useCallback((message, title) => {
    openAlert('error', message, title)
  }, [openAlert])

  const showWarning = useCallback((message, title) => {
    openAlert('warning', message, title)
  }, [openAlert])

  const showSuccess = useCallback((message, title) => {
    openAlert('success', message, title)
  }, [openAlert])

  const showInfo = useCallback((message, title) => {
    openAlert('info', message, title)
  }, [openAlert])

  return {
    alertState,
    closeAlert,
    showError,
    showInfo,
    showSuccess,
    showWarning,
  }
}
