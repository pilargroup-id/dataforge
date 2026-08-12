import { useState } from 'react'

import { ChevronDown, ChevronUp } from '../layoute/TemplateIcons.jsx'

function joinClassNames(...classNames) {
  return classNames.flat().filter(Boolean).join(' ')
}

function sanitizeId(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '-') || 'row-per-page'
}

function DataTableRowPerPage({
  id = 'data-table-row-per-page',
  label = 'Rows per page',
  ariaLabel = 'Jumlah baris per halaman',
  value,
  options = [],
  suffix = '',
  onChange,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const menuId = `${sanitizeId(id)}-options`

  const handleChange = (option) => {
    setIsOpen(false)
    onChange?.(option)
  }

  const handleBlur = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsOpen(false)
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div
      className="users-table-pagination__page-size"
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      <span className="users-table-pagination__page-size-label">{label}</span>

      <div className="users-table-pagination__page-size-menu">
        <button
          className="users-table-pagination__select"
          type="button"
          onClick={() => setIsOpen((currentValue) => !currentValue)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={menuId}
          aria-label={ariaLabel}
        >
          <span>{value}</span>
          {isOpen ? (
            <ChevronUp size={16} aria-hidden="true" />
          ) : (
            <ChevronDown size={16} aria-hidden="true" />
          )}
        </button>

        {isOpen ? (
          <div
            className="users-table-pagination__page-size-options"
            id={menuId}
            role="listbox"
            aria-label={ariaLabel}
          >
            {options.map((option) => (
              <button
                key={option}
                className={joinClassNames(
                  'users-table-pagination__page-size-option',
                  option === value ? 'users-table-pagination__page-size-option--active' : '',
                )}
                type="button"
                role="option"
                aria-selected={option === value}
                onClick={() => handleChange(option)}
              >
                {option}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {suffix ? (
        <span className="users-table-pagination__page-size-suffix">{suffix}</span>
      ) : null}
    </div>
  )
}

export default DataTableRowPerPage
