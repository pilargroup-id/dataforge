import { Menu01 } from './TemplateIcons.jsx'

import logoPiagam from '../../images/logo-piagam2.svg'
import logoPiagamTransparent from '../../images/logo-piagam.svg'
import '../../styles/template-style/TemplateComponents.css'

function Header({ title = 'Template Pilar', onMenuToggle, showMenuButton = false }) {
  return (
    <header className="header-main">
      <img
        src={logoPiagamTransparent}
        alt=""
        aria-hidden="true"
        className="header-accent-logo"
      />

      <div className="header-content">
        <div className="header-left">
          {showMenuButton ? (
            <button
              type="button"
              className="header-menu-button"
              aria-label="Open sidebar"
              onClick={onMenuToggle}
            >
              <Menu01 size={20} />
            </button>
          ) : null}

          <div className="header-brand">
            <img src={logoPiagam} alt="Logo Piagam" className="header-brand-logo" />
          </div>
        </div>

        <div className="header-right">
          <span className="header-brand-title">{title}</span>
        </div>
      </div>
    </header>
  )
}

export default Header
