import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import ButtonCreateUserPermission from '../../components/button/button-user-permission/ButtonCreateUserPermission.jsx'
import DataTableMasterPermission from '../../components/table/master/DataTableMasterPermission.jsx'
import { getDirectoryDepartments, getDirectoryUsers } from '../../services/directory.service.js'
import { getPermissionAssignments } from '../../services/permission.service.js'

const DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Jakarta',
})

function formatDate(value) {
  if (!value) return '-'
  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) return '-'
  return `${DATE_FORMATTER.format(parsedDate)} WIB`
}

function permissionMatchesSearch(permission, searchQuery = '') {
  const query = searchQuery.trim().toLowerCase()

  if (!query) {
    return true
  }

  return [
    permission.module_name,
    permission.module_code,
    permission.submodule_name,
    permission.submodule_code,
    permission.scope_type,
    permission.scope_name,
    permission.effect,
    permission.created_by_name,
  ].some((value) => String(value ?? '').toLowerCase().includes(query))
}

function MasterPermission(props) {
  const outletContext = useOutletContext() ?? {}
  const activePage = props.activePage ?? outletContext.activePage
  const searchQuery = props.searchQuery ?? outletContext.searchQuery ?? ''
  const pageTitle = activePage?.title ?? 'User Permission'
  const pageEyebrow = activePage?.eyebrow ?? 'Master Data'

  const [permissions, setPermissions] = useState([])
  const [permissionsLoading, setPermissionsLoading] = useState(true)
  const [permissionsError, setPermissionsError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const [userDirectory, setUserDirectory] = useState([])
  const [departmentDirectory, setDepartmentDirectory] = useState([])

  useEffect(() => {
    let isMounted = true

    Promise.all([getDirectoryUsers(), getDirectoryDepartments()])
      .then(([users, departments]) => {
        if (!isMounted) return
        setUserDirectory(users)
        setDepartmentDirectory(departments)
      })
      .catch(() => {
        // "Dibuat Oleh" and "Scope" fall back to the raw id when the directory can't be loaded
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadPermissions() {
      setPermissionsLoading(true)
      setPermissionsError('')
      try {
        const data = await getPermissionAssignments()
        if (!isMounted) return
        setPermissions(data)
      } catch (error) {
        if (!isMounted) return
        setPermissionsError(error.message || 'Gagal memuat data permission')
      } finally {
        if (isMounted) setPermissionsLoading(false)
      }
    }

    loadPermissions()

    return () => {
      isMounted = false
    }
  }, [refreshKey])

  const userNameById = useMemo(() => {
    const map = new Map()
    userDirectory.forEach((user) => {
      if (user?.id === undefined || user?.id === null) return
      map.set(String(user.id), user.name || user.full_name || user.username || null)
    })
    return map
  }, [userDirectory])

  const departmentNameById = useMemo(() => {
    const map = new Map()
    departmentDirectory.forEach((department) => {
      if (department?.id === undefined || department?.id === null) return
      map.set(String(department.id), department.name || department.department_name || null)
    })
    return map
  }, [departmentDirectory])

  const decoratedPermissions = useMemo(
    () =>
      permissions.map((permission) => {
        const scopeName =
          permission.scope_type === 'DEPARTMENT'
            ? departmentNameById.get(String(permission.scope_id))
            : permission.scope_type === 'USER'
              ? userNameById.get(String(permission.scope_id))
              : null

        return {
          ...permission,
          created_by_name: userNameById.get(String(permission.created_by)) || permission.created_by,
          scope_name: scopeName || permission.scope_id,
        }
      }),
    [permissions, userNameById, departmentNameById],
  )

  const filteredPermissions = useMemo(
    () => decoratedPermissions.filter((permission) => permissionMatchesSearch(permission, searchQuery)),
    [decoratedPermissions, searchQuery],
  )

  const columns = useMemo(
    () => [
      {
        key: 'module',
        header: 'Module',
        type: 'identity',
        accessor: 'module_name',
        subtitle: (row) => row.submodule_name || 'Seluruh submodule',
        minWidth: 220,
      },
      {
        key: 'scope',
        header: 'Scope',
        render: (row) => `${row.scope_type} · ${row.scope_name}`,
        minWidth: 160,
      },
      {
        key: 'effect',
        header: 'Effect',
        accessor: 'effect',
        type: 'status',
        variant: (row) => (row.effect === 'ALLOW' ? 'active' : 'inactive'),
        nowrap: true,
      },
      {
        key: 'is_active',
        header: 'Status',
        accessor: 'is_active',
        type: 'status',
        variant: (row) => (Number(row.is_active) ? 'active' : 'inactive'),
        format: (value) => (Number(value) ? 'Aktif' : 'Nonaktif'),
        nowrap: true,
      },
      {
        key: 'created_by',
        header: 'Dibuat Oleh',
        accessor: 'created_by_name',
        minWidth: 180,
      },
      {
        key: 'created_at',
        header: 'Dibuat Pada',
        accessor: 'created_at',
        format: (value) => formatDate(value),
        nowrap: true,
      },
    ],
    [],
  )

  return (
    <section
      className="dashboard-panel users-table-card parents-table-card"
      aria-label={pageTitle}
    >
      <div className="users-table-card__header">
        <div>
          <p className="dashboard-panel__eyebrow">{pageEyebrow}</p>
          <h1 className="dashboard-panel__title">{pageTitle}</h1>
        </div>

        <div className="users-table-card__actions">
          <ButtonCreateUserPermission
            variant="create"
            dialogProps={{ onCreated: () => setRefreshKey((key) => key + 1) }}
          >
            Create
          </ButtonCreateUserPermission>
        </div>
      </div>

      {permissionsError ? <p className="convert-page__error">{permissionsError}</p> : null}

      <DataTableMasterPermission
        rows={filteredPermissions}
        columns={columns}
        getRowId={(permission) => permission.id}
        tableLabel={`${pageTitle} table`}
        emptyMessage={
          permissionsLoading
            ? 'Memuat data...'
            : searchQuery
              ? 'Data tidak ditemukan. Coba pakai kata kunci lain.'
              : 'Belum ada data.'
        }
      />
    </section>
  )
}

export default MasterPermission
