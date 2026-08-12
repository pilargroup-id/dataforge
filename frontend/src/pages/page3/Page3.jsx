import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import DataTableAccordion from '../../components/table/DataTableAccordion.jsx';
import { userRows } from '../../dummy/dataTable.js';
import { userTableColumns } from '../../dummy/userTableColumns.jsx';

function userMatchesSearch(user, searchQuery = '') {
  const query = searchQuery.trim().toLowerCase();

  if (!query) {
    return true;
  }

  return [
    user.name,
    user.username,
    user.email,
    user.department,
    user.role,
    user.status,
    ...(user.apps ?? []),
  ].some((value) => String(value).toLowerCase().includes(query));
}

function Page3(props) {
  const outletContext = useOutletContext() ?? {}
  const activePage = props.activePage ?? outletContext.activePage
  const searchQuery = props.searchQuery ?? outletContext.searchQuery ?? ''
  const pageTitle = activePage?.title ?? 'Page2'
  const pageEyebrow = activePage?.eyebrow ?? 'Master Data'
  const filteredUsers = useMemo(
    () => userRows.filter((user) => userMatchesSearch(user, searchQuery)),
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

        <div className="users-table-card__actions" />
      </div>

      <DataTableAccordion
        rows={filteredUsers}
        columns={userTableColumns}
        getRowId={(user) => user.userId}
        tableLabel={`${pageTitle} table`}
        emptyMessage={
          searchQuery ? 'Data tidak ditemukan. Coba pakai kata kunci lain.' : 'Belum ada data.'
        }
      />
    </section>

  )
}

export default Page3
