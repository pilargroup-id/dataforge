import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import BackgroundMain from '../components/layoute/BackgroundMain.jsx'
import Header from '../components/layoute/Header.jsx'
import Sidebar from '../components/layoute/Sidebar.jsx'
import { pageDetails } from '../dummy/pageDetails.js'

const defaultActivePage = {
  title: 'Page1',
  eyebrow: 'Master Data',
  value: '0',
  detail: 'Halaman default.',
}

function AppLayout({
  activePage,
  activePath,
  children,
  isSearchTable = false,
  searchQuery: controlledSearchQuery,
  onRefresh,
  onSearchChange,
}) {
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [internalSearchQuery, setInternalSearchQuery] = useState('')
  const [lastUpdated, setLastUpdated] = useState(() => new Date())

  const resolvedActivePath = activePath ?? location.pathname
  const resolvedActivePage = pageDetails[resolvedActivePath] ?? activePage ?? defaultActivePage
  const resolvedPageTitle = resolvedActivePage.title ?? defaultActivePage.title
  const searchQuery = controlledSearchQuery ?? internalSearchQuery
  const handleSearchChange = onSearchChange ?? setInternalSearchQuery
  const handleRefresh = onRefresh ?? (() => setLastUpdated(new Date()))

  const shellClassName = [
    'dashboard-shell',
    sidebarCollapsed ? 'dashboard-shell--sidebar-collapsed' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const isMyTicketsPage = resolvedActivePath === '/MyTickets'

  return (
    <div className={shellClassName}>
      <BackgroundMain />

      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        activePath={resolvedActivePath}
        userName=""
        userRole=""
        onToggleCollapse={() => setSidebarCollapsed((currentValue) => !currentValue)}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <button
        type="button"
        className={`sidebar-overlay${mobileSidebarOpen ? ' active' : ''}`}
        aria-label="Close sidebar"
        onClick={() => setMobileSidebarOpen(false)}
      />

      <div className="dashboard-stage">
        <Header
          title="Template Pilar"
          showMenuButton
          onMenuToggle={() => setMobileSidebarOpen(true)}
          breadcrumb={[
            { label: 'Template Pilar', href: '#' },
            { label: resolvedPageTitle, href: '#', active: true },
          ]}
          searchProps={{
            value: searchQuery,
            placeholder: isSearchTable ? 'Cari data table...' : 'Search Data...',
            ariaLabel: isSearchTable ? 'Cari data table' : 'Search legal tickets',
            onChange: (event) => handleSearchChange(event.target.value),
          }}
          notificationProps={{
            ariaLabel: 'Open notifications',
            modalTitle: 'Notifications',
          }}
          onRefresh={handleRefresh}
        />

        <main className={`dashboard-main${isMyTicketsPage ? ' dashboard-main--mytickets' : ''}`}>
          <div
            className={`dashboard-content${
              isMyTicketsPage ? ' dashboard-content--mytickets' : ''
            }`}
          >
            {children ?? (
              <Outlet
                context={{
                  activePage: resolvedActivePage,
                  activePath: resolvedActivePath,
                  lastUpdated,
                  searchQuery,
                  onDataChange: handleRefresh,
                }}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default AppLayout
