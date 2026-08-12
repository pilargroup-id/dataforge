import { useEffect, useId, useRef, useState } from 'react'

import { Check, ChevronDown } from '../../layoute/TemplateIcons.jsx'

function normalizeOption(option) {
  if (typeof option === 'string' || typeof option === 'number') {
    return {
      value: option,
      label: option,
    }
  }

  return option
}

function Dropdown({
  id,
  label,
  helperText,
  error,
  options = [],
  value,
  placeholder = 'Pilih data',
  disabled = false,
  required = false,
  className = '',
  onChange,
}) {
  const generatedId = useId()
  const buttonId = id ?? `dropdown-${generatedId}`
  const menuId = `${buttonId}-menu`
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const normalizedOptions = options.map(normalizeOption)
  const selectedOption = normalizedOptions.find((option) => option.value === value)
  const message = typeof error === 'string' ? error : helperText
  const messageId = message ? `${buttonId}-message` : undefined
  const hasError = Boolean(error)

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [])

  const wrapperClassName = [
    'form-dropdown',
    open ? 'form-dropdown--open' : '',
    hasError ? 'form-dropdown--error' : '',
    disabled ? 'form-dropdown--disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={wrapperClassName} ref={rootRef}>
      {label ? (
        <label className="form-control__label" htmlFor={buttonId}>
          <span>{label}</span>
          {required ? <span className="form-control__required">*</span> : null}
        </label>
      ) : null}

      <button
        id={buttonId}
        className="form-dropdown__trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        aria-invalid={hasError || undefined}
        aria-describedby={messageId}
        disabled={disabled}
        onClick={() => setOpen((currentValue) => !currentValue)}
      >
        <span className={selectedOption ? 'form-dropdown__value' : 'form-dropdown__placeholder'}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown className="form-dropdown__chevron" size={18} />
      </button>

      {open ? (
        <div className="form-dropdown__menu" id={menuId} role="listbox" aria-labelledby={buttonId}>
          {normalizedOptions.length > 0 ? (
            normalizedOptions.map((option) => {
              const selected = option.value === value

              return (
                <button
                  className={`form-dropdown__item${selected ? ' form-dropdown__item--selected' : ''}`}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  disabled={option.disabled}
                  key={option.value}
                  onClick={() => {
                    onChange?.(option.value, option)
                    setOpen(false)
                  }}
                >
                  <span>{option.label}</span>
                  {selected ? <Check size={16} /> : null}
                </button>
              )
            })
          ) : (
            <div className="form-dropdown__empty">Tidak ada data.</div>
          )}
        </div>
      ) : null}

      {message ? (
        <p className="form-control__message" id={messageId}>
          {message}
        </p>
      ) : null}
    </div>
  )
}

export default Dropdown
