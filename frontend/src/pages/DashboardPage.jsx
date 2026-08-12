import { useOutletContext } from 'react-router-dom'

const defaultActivePage = {
  title: 'Page1',
  eyebrow: 'Master Data',
}

function DashboardPage({ activePage, activePath, lastUpdated, searchQuery }) {
  const outletContext = useOutletContext() ?? {}
  const resolvedActivePage = activePage ?? outletContext.activePage ?? defaultActivePage
  const resolvedActivePath = activePath ?? outletContext.activePath ?? '/'
  const resolvedLastUpdated = lastUpdated ?? outletContext.lastUpdated ?? new Date()
  const resolvedSearchQuery = searchQuery ?? outletContext.searchQuery ?? ''

  if (resolvedActivePath === '/MyTickets') {
    return (
      <section className="dashboard-panel" aria-label={resolvedActivePage.title}>
        <div className="dashboard-panel__header">
          <p className="dashboard-panel__eyebrow">{resolvedActivePage.eyebrow}</p>
          <h1 className="dashboard-panel__title">{resolvedActivePage.title}</h1>
        </div>

        <div className="users-table__empty">Belum ada data.</div>
      </section>
    )
  }

  return (
    <section className="dashboard-grid" aria-label="Aktivitas legal">
      <article className="dashboard-panel">
        <div className="dashboard-panel__header">
          <p className="dashboard-panel__eyebrow">{resolvedActivePage.eyebrow}</p>
          <h1 className="dashboard-panel__title">{resolvedActivePage.title}</h1>
        </div>

        <div className="dashboard-stack">
          <div className="users-table__empty">Belum ada data aktivitas.</div>
        </div>
      </article>

      <aside className="dashboard-panel">
        <div className="dashboard-panel__header">
          <p className="dashboard-panel__eyebrow">Workspace</p>
          <h2 className="dashboard-panel__title">Status</h2>
        </div>

        <ul className="dashboard-list">
          <li className="dashboard-list__item">Search: {resolvedSearchQuery || 'Belum ada kata kunci'}</li>
          <li className="dashboard-list__item">Path aktif: {resolvedActivePath}</li>
          <li className="dashboard-list__item">
            Update terakhir: {resolvedLastUpdated.toLocaleTimeString('id-ID')}
          </li>
        </ul>
      </aside>
    </section>
  )
}

export default DashboardPage
