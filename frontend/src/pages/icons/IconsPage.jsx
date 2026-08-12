import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
    LogOutLeft01,
    Table01,
    Chart01,
    Folder,
    TrendingUp,
    MoreHorizontal,
} from '../../components/layoute/TemplateIcons.jsx'

function iconPages(props) {
  const outletContext = useOutletContext() ?? {}
  const activePage = props.activePage ?? outletContext.activePage
  const searchQuery = props.searchQuery ?? outletContext.searchQuery ?? ''
  const pageTitle = activePage?.title ?? 'Page1'
  const pageEyebrow = activePage?.eyebrow ?? 'Master Data'

  // Deklarasikan icon dalam array
  const icons = useMemo(() => [
    { name: 'LogOut', icon: LogOutLeft01, color: '#FF6B6B' },
    { name: 'Table', icon: Table01, color: '#4ECDC4' },
    { name: 'Chart', icon: Chart01, color: '#45B7D1' },
    { name: 'Folder', icon: Folder, color: '#FFA07A' },
    { name: 'Trending', icon: TrendingUp, color: '#98D8C8' },
    { name: 'More', icon: MoreHorizontal, color: '#F7DC6F' },
  ], [])

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
      </div>

      {/* Menampilkan Icons */}
      <div className="icons-display" style={{ display: 'flex', gap: '20px', padding: '20px', flexWrap: 'wrap' }}>
        {icons.map((item, index) => {
          const IconComponent = item.icon;
          return (
            <div key={index} style={{ textAlign: 'center' }}>
              <div style={{ 
                width: '60px', 
                height: '60px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                backgroundColor: '#f0f0f0',
                borderRadius: '8px'
              }}>
                <IconComponent size={32} color={item.color} />
              </div>
              <p style={{ marginTop: '8px', fontSize: '12px' }}>{item.name}</p>
            </div>
          );
        })}
      </div>
    </section>
  )
}

export default iconPages