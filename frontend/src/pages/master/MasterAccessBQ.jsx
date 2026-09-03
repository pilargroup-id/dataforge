import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import ButtonCreateBigQueryAccess from '../../components/button/button-bigquery-access/ButtonCreateBigQueryAccess.jsx'
import DialogBigQueryAccessForm from '../../components/Dialog/dialog-bigquery-access/DialogBigQueryAccessForm.jsx'
import DialogDeleteBigQueryAccess from '../../components/Dialog/dialog-bigquery-access/DialogDeleteBigQueryAccess.jsx'
import DataTableMasterPermission from '../../components/table/master/DataTableMasterPermission.jsx'
import { getDirectoryDepartments, getDirectoryUsers } from '../../services/directory.service.js'
import { deleteBigQueryAccess, getBigQueryAccessList } from '../../services/bigquery.service.js'

const DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Jakarta',
})

const DELETE_ERROR_MESSAGES = {
  BIGQUERY_DATASET_ACCESS_NOT_FOUND: 'Assignment tidak ditemukan, mungkin sudah dihapus.',
  IT_ACCESS_REQUIRED: 'Hanya department IT yang dapat mengelola akses ini.',
}

const NETWORK_ERROR_MESSAGE = 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda dan coba lagi.'
const GENERIC_SERVER_ERROR_MESSAGE =
  'Terjadi kesalahan pada server. Coba lagi beberapa saat lagi atau hubungi tim IT jika masalah berlanjut.'

// Backend intentionally returns a generic "Internal Server Error" for unexpected failures
// (see backend/src/middleware/error.middleware.js) so it never leaks internal details to
// the client. Mirror that here instead of showing raw backend/network text to the user.
function resolveErrorMessage(error, knownMessages = {}, fallback = GENERIC_SERVER_ERROR_MESSAGE) {
  if (error?.code && knownMessages[error.code]) {
    return knownMessages[error.code]
  }
  if (!error?.status) {
    return NETWORK_ERROR_MESSAGE
  }
  if (error.status >= 500) {
    return GENERIC_SERVER_ERROR_MESSAGE
  }
  return error?.message || fallback
}

function formatDate(value) {
  if (!value) return '-'
  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) return '-'
  return `${DATE_FORMATTER.format(parsedDate)} WIB`
}

function accessMatchesSearch(access, searchQuery = '') {
  const query = searchQuery.trim().toLowerCase()

  if (!query) {
    return true
  }

  return [
    access.dataset_id,
    access.project_id,
    access.scope_type,
    access.scope_name,
    access.effect,
    access.created_by_name,
  ].some((value) => String(value ?? '').toLowerCase().includes(query))
}

function getWriteAccessChips(access) {
  if (access.effect !== 'ALLOW') return []

  const chips = []
  if (Number(access.can_append)) chips.push('Append')
  if (Number(access.can_write_empty)) chips.push('Write Empty')
  if (Number(access.can_truncate)) chips.push('Truncate')
  return chips
}

function MasterAccessBQ(props) {
  const outletContext = useOutletContext() ?? {}
  const activePage = props.activePage ?? outletContext.activePage
  const searchQuery = props.searchQuery ?? outletContext.searchQuery ?? ''
  const pageTitle = activePage?.title ?? 'Access BigQuery'
  const pageEyebrow = activePage?.eyebrow ?? 'Master Data'

  const [accessList, setAccessList] = useState([])
  const [accessLoading, setAccessLoading] = useState(true)
  const [accessError, setAccessError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const [userDirectory, setUserDirectory] = useState([])
  const [departmentDirectory, setDepartmentDirectory] = useState([])

  const [editingRecord, setEditingRecord] = useState(null)
  const [deletingRecord, setDeletingRecord] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')

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

    async function loadAccessList() {
      setAccessLoading(true)
      setAccessError('')
      try {
        const data = await getBigQueryAccessList()
        if (!isMounted) return
        setAccessList(data)
      } catch (error) {
        if (!isMounted) return
        setAccessError(resolveErrorMessage(error, {}, 'Gagal memuat data akses dataset BigQuery'))
      } finally {
        if (isMounted) setAccessLoading(false)
      }
    }

    loadAccessList()

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

  const decoratedAccessList = useMemo(
    () =>
      accessList.map((access) => {
        const scopeName =
          access.scope_type === 'DEPARTMENT'
            ? departmentNameById.get(String(access.scope_id))
            : access.scope_type === 'USER'
              ? userNameById.get(String(access.scope_id))
              : null

        return {
          ...access,
          created_by_name: userNameById.get(String(access.created_by)) || access.created_by,
          scope_name: scopeName || access.scope_id,
        }
      }),
    [accessList, userNameById, departmentNameById],
  )

  const filteredAccessList = useMemo(
    () => decoratedAccessList.filter((access) => accessMatchesSearch(access, searchQuery)),
    [decoratedAccessList, searchQuery],
  )

  const handleRefresh = () => setRefreshKey((key) => key + 1)

  const handleDeleteConfirm = async () => {
    if (!deletingRecord) return

    setDeleteLoading(true)
    setDeleteError('')
    try {
      await deleteBigQueryAccess(deletingRecord.id)
      setDeletingRecord(null)
      handleRefresh()
    } catch (error) {
      setDeleteError(resolveErrorMessage(error, DELETE_ERROR_MESSAGES, 'Gagal menghapus akses dataset'))
    } finally {
      setDeleteLoading(false)
    }
  }

  const columns = useMemo(
    () => [
      {
        key: 'dataset',
        header: 'Dataset',
        type: 'identity',
        accessor: 'dataset_id',
        subtitle: (row) => row.project_id,
        minWidth: 200,
      },
      {
        key: 'scope',
        header: 'Scope',
        render: (row) => `${row.scope_type} · ${row.scope_name}`,
        minWidth: 180,
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
        key: 'write_access',
        header: 'Write Access',
        type: 'chips',
        accessor: (row) => getWriteAccessChips(row),
        empty: 'Tidak ada',
        minWidth: 200,
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

  const actions = useMemo(
    () => [
      {
        key: 'edit',
        label: 'Edit',
        onClick: (row) => setEditingRecord(row),
      },
      {
        key: 'delete',
        label: 'Delete',
        variant: 'danger',
        onClick: (row) => {
          setDeleteError('')
          setDeletingRecord(row)
        },
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
          <ButtonCreateBigQueryAccess dialogProps={{ onSaved: handleRefresh }}>
            Create
          </ButtonCreateBigQueryAccess>
        </div>
      </div>

      {accessError ? (
        <div className="convert-page__error convert-page__error--with-action">
          <span>{accessError}</span>
          <button type="button" className="convert-page__error-retry" onClick={handleRefresh}>
            Coba Lagi
          </button>
        </div>
      ) : null}

      <DataTableMasterPermission
        rows={filteredAccessList}
        columns={columns}
        actions={actions}
        getRowId={(access) => access.id}
        tableLabel={`${pageTitle} table`}
        emptyMessage={
          accessLoading
            ? 'Memuat data...'
            : searchQuery
              ? 'Data tidak ditemukan. Coba pakai kata kunci lain.'
              : 'Belum ada data.'
        }
      />

      <DialogBigQueryAccessForm
        mode="edit"
        isOpen={Boolean(editingRecord)}
        record={editingRecord}
        onClose={() => setEditingRecord(null)}
        onSaved={handleRefresh}
      />

      <DialogDeleteBigQueryAccess
        isOpen={Boolean(deletingRecord)}
        record={deletingRecord}
        loading={deleteLoading}
        onClose={() => {
          if (deleteLoading) return
          setDeletingRecord(null)
          setDeleteError('')
        }}
        onConfirm={handleDeleteConfirm}
      />

      {deleteError ? <p className="convert-page__error">{deleteError}</p> : null}
    </section>
  )
}

export default MasterAccessBQ
