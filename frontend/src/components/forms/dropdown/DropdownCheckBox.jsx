import { useEffect, useId, useMemo, useRef, useState } from 'react'

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

function DropdownCheckBox({
  id,
  label,
  helperText,
  error,
  options = [],
  value = [],
  placeholder = 'Pilih beberapa data',
  disabled = false,
  required = false,
  className = '',
  maxVisibleValues = 2,
  onChange,
}) {
  const generatedId = useId()
  const buttonId = id ?? `dropdown-checkbox-${generatedId}`
  const menuId = `${buttonId}-menu`
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const normalizedOptions = useMemo(() => options.map(normalizeOption), [options])
  const selectedValues = Array.isArray(value) ? value : []
  const selectedOptions = normalizedOptions.filter((option) => selectedValues.includes(option.value))
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

  const selectedLabel = selectedOptions
    .slice(0, maxVisibleValues)
    .map((option) => option.label)
    .join(', ')
  const hiddenSelectedCount = Math.max(0, selectedOptions.length - maxVisibleValues)

  const updateSelectedValues = (nextValues) => {
    const nextOptions = normalizedOptions.filter((option) => nextValues.includes(option.value))
    onChange?.(nextValues, nextOptions)
  }

  const toggleOption = (option) => {
    if (option.disabled) {
      return
    }

    const exists = selectedValues.includes(option.value)
    const nextValues = exists
      ? selectedValues.filter((currentValue) => currentValue !== option.value)
      : [...selectedValues, option.value]

    updateSelectedValues(nextValues)
  }

  const wrapperClassName = [
    'form-dropdown',
    'form-dropdown--checkbox',
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
        <span className={selectedOptions.length > 0 ? 'form-dropdown__value' : 'form-dropdown__placeholder'}>
          {selectedOptions.length > 0
            ? `${selectedLabel}${hiddenSelectedCount > 0 ? ` +${hiddenSelectedCount}` : ''}`
            : placeholder}
        </span>
        <ChevronDown className="form-dropdown__chevron" size={18} />
      </button>

      {open ? (
        <div className="form-dropdown__menu" id={menuId} role="listbox" aria-labelledby={buttonId} aria-multiselectable="true">
          {selectedOptions.length > 0 ? (
            <button className="form-dropdown__clear-action" type="button" onClick={() => updateSelectedValues([])}>
              Clear selected
            </button>
          ) : null}

          {normalizedOptions.length > 0 ? (
            normalizedOptions.map((option) => {
              const selected = selectedValues.includes(option.value)

              return (
                <button
                  className={`form-dropdown__item form-dropdown__item--checkbox${
                    selected ? ' form-dropdown__item--selected' : ''
                  }`}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  disabled={option.disabled}
                  key={option.value}
                  onClick={() => toggleOption(option)}
                >
                  <span className="form-dropdown__checkbox-mark" aria-hidden="true">
                    {selected ? <Check size={14} /> : null}
                  </span>
                  <span className="form-dropdown__item-copy">
                    <span>{option.label}</span>
                    {option.description ? <small>{option.description}</small> : null}
                  </span>
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

export default DropdownCheckBox
