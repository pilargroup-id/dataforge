import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import ButtonCreatePage1 from '../../components/button/button-page1/ButtonCreatePage1.jsx';
import DataTablePage1 from '../../components/table/table-page1/DataTablePage1.jsx';
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

function Page1(props) {
  const outletContext = useOutletContext() ?? {}
  const activePage = props.activePage ?? outletContext.activePage
  const searchQuery = props.searchQuery ?? outletContext.searchQuery ?? ''
  const pageTitle = activePage?.title ?? 'Page1'
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

        <div className="users-table-card__actions">
          <ButtonCreatePage1 variant="create">
            Create
          </ButtonCreatePage1>
        </div>
      </div>

      <DataTablePage1
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

export default Page1
