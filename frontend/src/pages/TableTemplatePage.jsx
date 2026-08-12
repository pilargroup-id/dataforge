import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'

import ButtonMain from '../components/button/ButtonMain.jsx'
import ButtonRangeDate from '../components/button/ButtonRangeDate.jsx'
import DialogDelete from '../components/dialog/DialogDelete.jsx'
import DialogEdit from '../components/dialog/DialogEdit.jsx'
import { Edit03, Trash03, Users01 } from '../components/layoute/TemplateIcons.jsx'
import DataTable from '../components/table/DataTable.jsx'
import DataTableAction from '../components/table/DataTableAction.jsx'
import { userRows } from '../dummy/dataTable.js'
import { userTableColumns } from '../dummy/userTableColumns.jsx'

const usersPageSizeOptions = [5, 10, 25, 50]
const defaultUsersPageSize = usersPageSizeOptions[0]
const defaultActivePage = {
  title: 'Data Table',
  eyebrow: 'Table Template',
  value: '0',
  detail: 'Contoh komponen table.',
}

function getPaginationItems(currentPage, totalPages) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, 'end-ellipsis', totalPages]
  }

  if (currentPage >= totalPages - 2) {
    return [1, 'start-ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
  }

  return [1, 'start-ellipsis', currentPage - 1, currentPage, currentPage + 1, 'end-ellipsis', totalPages]
}

function getUserDetailSections(user) {
  return [
    {
      title: 'Account',
      fields: [
        { label: 'user_id', value: user.userId },
        { label: 'username', value: user.username },
        { label: 'email', value: user.email },
        { label: 'phone', value: user.phone },
      ],
    },
    {
      title: 'Organization',
      fields: [
        { label: 'department_id', value: user.departmentId },
        { label: 'department', value: user.department },
        { label: 'role', value: user.role },
        { label: 'job_level', value: user.jobLevel },
      ],
    },
    {
      title: 'Access',
      wide: true,
      fields: [
        { label: 'apps', value: user.apps, kind: 'chips' },
        { label: 'status', value: user.status },
        { label: 'created_at', value: user.createdAt },
        { label: 'updated_at', value: user.updatedAt },
        { label: 'last_active', value: user.lastActive },
      ],
    },
  ]
}

function userMatchesSearch(user, searchQuery) {
  const query = searchQuery.trim().toLowerCase()

  if (!query) {
    return true
  }

  return [
    user.name,
    user.username,
    user.email,
    user.department,
    user.role,
    user.status,
    ...(user.apps ?? []),
  ].some((value) => String(value).toLowerCase().includes(query))
}

function TableTemplatePage({ activePage, activePath, searchQuery, onDataChange }) {
  const outletContext = useOutletContext() ?? {}
  const resolvedActivePage = activePage ?? outletContext.activePage ?? defaultActivePage
  const resolvedActivePath = activePath ?? outletContext.activePath ?? '/Table'
  const resolvedSearchQuery = searchQuery ?? outletContext.searchQuery ?? ''
  const handleDataChange = onDataChange ?? outletContext.onDataChange ?? (() => {})
  const [tableUsers, setTableUsers] = useState(userRows)
  const [usersPage, setUsersPage] = useState(1)
  const [usersPageSize, setUsersPageSize] = useState(defaultUsersPageSize)
  const [activeActionDialog, setActiveActionDialog] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)

  const isUsersPage = resolvedActivePath === '/users'
  const isTableActionsPage = resolvedActivePath === '/TableActions'
  const tableEntityLabel = isUsersPage ? 'user' : 'data'
  const selectedUserName = selectedUser?.name ?? 'data ini'

  const filteredUsers = useMemo(
    () => tableUsers.filter((user) => userMatchesSearch(user, resolvedSearchQuery)),
    [resolvedSearchQuery, tableUsers],
  )
  const activeUsersCount = useMemo(
    () => tableUsers.filter((user) => user.statusKey === 'active').length,
    [tableUsers],
  )
  const uniqueAppsCount = useMemo(
    () => new Set(tableUsers.flatMap((user) => user.apps ?? [])).size,
    [tableUsers],
  )
  const usersTotalPages = Math.max(1, Math.ceil(filteredUsers.length / usersPageSize))
  const usersCurrentPage = Math.min(usersPage, usersTotalPages)
  const paginatedUsers = useMemo(() => {
    const startIndex = (usersCurrentPage - 1) * usersPageSize

    return filteredUsers.slice(startIndex, startIndex + usersPageSize)
  }, [filteredUsers, usersCurrentPage, usersPageSize])
  const overviewCards = useMemo(
    () => [
      {
        ...resolvedActivePage,
        value: String(tableUsers.length),
      },
      {
        title: 'Active Users',
        eyebrow: 'Status',
        value: String(activeUsersCount),
        detail: 'User yang saat ini aktif dan dapat mengakses aplikasi.',
      },
      {
        title: 'Apps Access',
        eyebrow: 'Access',
        value: String(uniqueAppsCount),
        detail: 'Aplikasi yang sudah dipetakan pada user internal.',
      },
    ],
    [resolvedActivePage, activeUsersCount, tableUsers.length, uniqueAppsCount],
  )

  const closeActionDialog = () => {
    setActiveActionDialog(null)
    setSelectedUser(null)
  }

  const openActionDialog = (dialogType, user) => {
    setSelectedUser(user)
    setActiveActionDialog(dialogType)
  }

  const handleDeleteConfirm = () => {
    if (selectedUser?.userId) {
      setTableUsers((currentUsers) =>
        currentUsers.filter((user) => user.userId !== selectedUser.userId),
      )
    }

    handleDataChange()
    closeActionDialog()
  }

  const userTableActions = useMemo(
    () => [
      {
        key: 'edit',
        label: 'Edit',
        icon: Edit03,
        onClick: (user) => openActionDialog('edit', user),
      },
      {
        key: 'delete',
        label: 'Delete',
        icon: Trash03,
        variant: 'danger',
        onClick: (user) => openActionDialog('delete', user),
      },
    ],
    [],
  )

  const usersPagination = useMemo(() => {
    const firstItem = filteredUsers.length === 0 ? 0 : (usersCurrentPage - 1) * usersPageSize + 1
    const lastItem = Math.min(usersCurrentPage * usersPageSize, filteredUsers.length)

    return {
      summary: `${firstItem}-${lastItem} dari ${filteredUsers.length} ${tableEntityLabel}`,
      currentPage: usersCurrentPage,
      totalPages: usersTotalPages,
      items: getPaginationItems(usersCurrentPage, usersTotalPages),
      pageSize: usersPageSize,
      pageSizeOptions: usersPageSizeOptions,
      pageSizeLabel: 'Tampilkan',
      pageSizeSuffix: 'baris',
      previousLabel: 'Sebelumnya',
      nextLabel: 'Berikutnya',
      ariaLabel: 'Users pagination',
      pageSizeAriaLabel: 'Jumlah baris per halaman',
      onPrevious: () => setUsersPage((currentPage) => Math.max(1, currentPage - 1)),
      onNext: () => setUsersPage((currentPage) => Math.min(usersTotalPages, currentPage + 1)),
      onSelect: (page) => setUsersPage(page),
      onPageSizeChange: (pageSize) => {
        setUsersPageSize(pageSize)
        setUsersPage(1)
      },
    }
  }, [filteredUsers.length, tableEntityLabel, usersCurrentPage, usersPageSize, usersTotalPages])

  return (
    <>
      <section className="dashboard-overview" aria-label="Ringkasan dashboard">
        {overviewCards.map((card) => (
          <article className="dashboard-card" key={card.title}>
            <div className="dashboard-card__badge-row">
              <div className="status-badge">
                <span className="dashboard-card__label">{card.title}</span>
              </div>
            </div>
            <strong className="dashboard-card__value">{card.value}</strong>
            <p className="dashboard-card__detail">{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="dashboard-panel users-table-card" aria-label={resolvedActivePage.title}>
        <div className="users-table-card__header">
          <div>
            <p className="dashboard-panel__eyebrow">{resolvedActivePage.eyebrow}</p>
            <h1 className="dashboard-panel__title">{resolvedActivePage.title}</h1>
            <p className="users-table-card__description">
              {isUsersPage
                ? 'Template data table untuk daftar user internal, akses aplikasi, dan detail account.'
                : isTableActionsPage
                  ? 'Template data table dengan kolom Action berisi tombol icon-only untuk edit dan delete.'
                  : ''}
            </p>
          </div>

          <div className="users-table-card__actions">
            <ButtonRangeDate />
            <button type="button" className="users-table-card__action" onClick={handleDataChange}>
              <Users01 size={18} aria-hidden="true" />
              <span>{isUsersPage ? 'Tambah User' : 'Tambah Data'}</span>
            </button>
            <ButtonMain />
          </div>
        </div>

        {isTableActionsPage ? (
          <DataTableAction
            rows={paginatedUsers}
            columns={userTableColumns}
            actions={userTableActions}
            getRowId={(user) => user.userId}
            tableLabel={`${resolvedActivePage.title} table`}
            emptyMessage={
              resolvedSearchQuery ? 'Data tidak ditemukan. Coba pakai kata kunci lain.' : 'Belum ada data.'
            }
            pagination={usersPagination}
          />
        ) : (
          <DataTable
            rows={paginatedUsers}
            columns={userTableColumns}
            getRowId={(user) => user.userId}
            tableLabel={`${resolvedActivePage.title} table`}
            emptyMessage={
              resolvedSearchQuery ? 'Data tidak ditemukan. Coba pakai kata kunci lain.' : 'Belum ada data.'
            }
            detail={{
              columnLabel: 'Detail',
              buttonLabel: 'Detail',
              eyebrow: 'User detail',
              title: (user) => user.name,
              description: (user) => `${user.role} - ${user.department}`,
              sections: getUserDetailSections,
            }}
            actions={userTableActions}
            pagination={usersPagination}
          />
        )}
      </section>

      <DialogEdit
        isOpen={activeActionDialog === 'edit'}
        title={`Edit ${selectedUserName}`}
        user={selectedUser}
        onClose={closeActionDialog}
        onConfirm={() => {
          handleDataChange()
          closeActionDialog()
        }}
      />
      <DialogDelete
        isOpen={activeActionDialog === 'delete'}
        title={`Delete ${selectedUserName}`}
        user={selectedUser}
        onClose={closeActionDialog}
        onConfirm={handleDeleteConfirm}
      />
    </>
  )
}

export default TableTemplatePage
