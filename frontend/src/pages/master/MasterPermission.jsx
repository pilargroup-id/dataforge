import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import ButtonCreateUserPermission from '../../components/button/button-user-permission/ButtonCreateUserPermission.jsx'
import DataTableMasterPermission from '../../components/table/master/DataTableMasterPermission.jsx'
import { permissionRows } from '../../dummy/dataTable.js'
import { permissionTableColumns } from '../../dummy/permissionTableColumns.jsx'

function permissionMatchesSearch(permission, searchQuery = '') {
  const query = searchQuery.trim().toLowerCase()

  if (!query) {
    return true
  }

  return [
    permission.role,
    permission.roleCode,
    permission.department,
    permission.level,
    permission.status,
    ...(permission.modules ?? []),
  ].some((value) => String(value).toLowerCase().includes(query))
}

function MasterPermission(props) {
  const outletContext = useOutletContext() ?? {}
  const activePage = props.activePage ?? outletContext.activePage
  const searchQuery = props.searchQuery ?? outletContext.searchQuery ?? ''
  const pageTitle = activePage?.title ?? 'User Permission'
  const pageEyebrow = activePage?.eyebrow ?? 'Master Data'
  const filteredPermissions = useMemo(
    () => permissionRows.filter((permission) => permissionMatchesSearch(permission, searchQuery)),
    [searchQuery],
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
          <ButtonCreateUserPermission variant="create">Create</ButtonCreateUserPermission>
        </div>
      </div>

      <DataTableMasterPermission
        rows={filteredPermissions}
        columns={permissionTableColumns}
        getRowId={(permission) => permission.permissionId}
        tableLabel={`${pageTitle} table`}
        emptyMessage={
          searchQuery ? 'Data tidak ditemukan. Coba pakai kata kunci lain.' : 'Belum ada data.'
        }
      />
    </section>
  )
}

export default MasterPermission
