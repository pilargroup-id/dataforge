import { useId } from 'react'

function normalizeOption(option) {
  if (typeof option === 'string' || typeof option === 'number') {
    return {
      value: option,
      label: option,
    }
  }

  return option
}

function Select({
  id,
  label,
  helperText,
  error,
  className = '',
  inputClassName = '',
  options = [],
  placeholder = 'Pilih data',
  required = false,
  disabled = false,
  children,
  ...props
}) {
  const generatedId = useId()
  const selectId = id ?? `select-${generatedId}`
  const message = typeof error === 'string' ? error : helperText
  const messageId = message ? `${selectId}-message` : undefined
  const hasError = Boolean(error)

  const wrapperClassName = [
    'form-control',
    hasError ? 'form-control--error' : '',
    disabled ? 'form-control--disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={wrapperClassName}>
      {label ? (
        <label className="form-control__label" htmlFor={selectId}>
          <span>{label}</span>
          {required ? <span className="form-control__required">*</span> : null}
        </label>
      ) : null}

      <div className="form-control__select-shell">
        <select
          id={selectId}
          className={['form-control__select', inputClassName].filter(Boolean).join(' ')}
          required={required}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={messageId}
          {...props}
        >
          {placeholder ? (
            <option value="" disabled={required}>
              {placeholder}
            </option>
          ) : null}
          {children ??
            options.map((option) => {
              const normalizedOption = normalizeOption(option)

              return (
                <option
                  key={normalizedOption.value}
                  value={normalizedOption.value}
                  disabled={normalizedOption.disabled}
                >
                  {normalizedOption.label}
                </option>
              )
            })}
        </select>
      </div>

      {message ? (
        <p className="form-control__message" id={messageId}>
          {message}
        </p>
      ) : null}
    </div>
  )
}

export default Select
