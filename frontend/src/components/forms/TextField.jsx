import { useId } from 'react'

function TextField({
  id,
  label,
  helperText,
  error,
  className = '',
  inputClassName = '',
  required = false,
  disabled = false,
  leftIcon,
  rightIcon,
  type = 'text',
  ...props
}) {
  const generatedId = useId()
  const inputId = id ?? `text-field-${generatedId}`
  const message = typeof error === 'string' ? error : helperText
  const messageId = message ? `${inputId}-message` : undefined
  const hasError = Boolean(error)
  const LeftIcon = leftIcon
  const RightIcon = rightIcon

  const wrapperClassName = [
    'form-control',
    hasError ? 'form-control--error' : '',
    disabled ? 'form-control--disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const inputShellClassName = [
    'form-control__input-shell',
    LeftIcon ? 'form-control__input-shell--with-left-icon' : '',
    RightIcon ? 'form-control__input-shell--with-right-icon' : '',
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

      <div className={inputShellClassName}>
        {LeftIcon ? <LeftIcon className="form-control__icon form-control__icon--left" size={18} /> : null}
        <input
          id={inputId}
          className={['form-control__input', inputClassName].filter(Boolean).join(' ')}
          type={type}
          required={required}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={messageId}
          {...props}
        />
        {RightIcon ? (
          <RightIcon className="form-control__icon form-control__icon--right" size={18} />
        ) : null}
      </div>

      {message ? (
        <p className="form-control__message" id={messageId}>
          {message}
        </p>
      ) : null}
    </div>
  )
}

export default TextField
