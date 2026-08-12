import { useId } from 'react'

function TextArea({
  id,
  label,
  helperText,
  error,
  className = '',
  inputClassName = '',
  required = false,
  disabled = false,
  rows = 4,
  ...props
}) {
  const generatedId = useId()
  const inputId = id ?? `text-area-${generatedId}`
  const message = typeof error === 'string' ? error : helperText
  const messageId = message ? `${inputId}-message` : undefined
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
        <label className="form-control__label" htmlFor={inputId}>
          <span>{label}</span>
          {required ? <span className="form-control__required">*</span> : null}
        </label>
      ) : null}

      <textarea
        id={inputId}
        className={['form-control__textarea', inputClassName].filter(Boolean).join(' ')}
        rows={rows}
        required={required}
        disabled={disabled}
        aria-invalid={hasError || undefined}
        aria-describedby={messageId}
        {...props}
      />

      {message ? (
        <p className="form-control__message" id={messageId}>
          {message}
        </p>
      ) : null}
    </div>
  )
}

export default TextArea
