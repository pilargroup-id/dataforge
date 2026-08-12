import { useEffect, useId, useRef } from 'react'

import { Check } from '../layoute/TemplateIcons.jsx'

function Checkbox({
  id,
  label,
  description,
  error,
  className = '',
  required = false,
  disabled = false,
  indeterminate = false,
  ...props
}) {
  const generatedId = useId()
  const inputId = id ?? `checkbox-${generatedId}`
  const inputRef = useRef(null)
  const messageId = error ? `${inputId}-message` : undefined

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate
    }
  }, [indeterminate])

  const wrapperClassName = [
    'form-choice',
    'form-choice--checkbox',
    error ? 'form-choice--error' : '',
    disabled ? 'form-choice--disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={wrapperClassName}>
      <label className="form-choice__label" htmlFor={inputId}>
        <input
          id={inputId}
          ref={inputRef}
          className="form-choice__input"
          type="checkbox"
          required={required}
          disabled={disabled}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={messageId}
          {...props}
        />
        <span className="form-choice__box" aria-hidden="true">
          {indeterminate ? <span className="form-choice__dash" /> : <Check size={14} />}
        </span>
        <span className="form-choice__copy">
          <span className="form-choice__title">
            {label}
            {required ? <span className="form-control__required">*</span> : null}
          </span>
          {description ? <span className="form-choice__description">{description}</span> : null}
        </span>
      </label>

      {error ? (
        <p className="form-choice__message" id={messageId}>
          {typeof error === 'string' ? error : 'Field ini wajib dipilih.'}
        </p>
      ) : null}
    </div>
  )
}

export default Checkbox
