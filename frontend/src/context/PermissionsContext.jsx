import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { getMyPermissions } from '../services/permission.service.js'

const PermissionsContext = createContext(null)

export function PermissionsProvider({ children }) {
  const [modules, setModules] = useState([])
  const [isIT, setIsIT] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    getMyPermissions()
      .then((data) => {
        if (!isMounted) return
        setModules(data?.modules ?? [])
        setIsIT(Boolean(data?.is_it))
      })
      .catch((err) => {
        if (!isMounted) return
        setError(err.message || 'Gagal memuat data permission')
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const hasModule = useCallback(
    (moduleCode) => {
      if (isIT) return true
      return modules.some((module) => module.code === moduleCode && module.allowed)
    },
    [isIT, modules],
  )

  const hasSubmodule = useCallback(
    (moduleCode, submoduleCode) => {
      if (isIT) return true
      const module = modules.find((item) => item.code === moduleCode)
      return Boolean(module?.submodules?.some((submodule) => submodule.code === submoduleCode && submodule.allowed))
    },
    [isIT, modules],
  )

  const value = useMemo(
    () => ({ loading, error, isIT, modules, hasModule, hasSubmodule }),
    [loading, error, isIT, modules, hasModule, hasSubmodule],
  )

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>
}

export function usePermissions() {
  const context = useContext(PermissionsContext)
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider')
  }
  return context
}
