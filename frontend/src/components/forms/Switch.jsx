import { useId } from 'react'

function Switch({
  id,
  label,
  description,
  className = '',
  disabled = false,
  required = false,
  ...props
}) {
  const generatedId = useId()
  const inputId = id ?? `switch-${generatedId}`

  const wrapperClassName = [
    'form-switch',
    disabled ? 'form-switch--disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <label className={wrapperClassName} htmlFor={inputId}>
      <span className="form-switch__copy">
        {label ? (
          <span className="form-switch__title">
            {label}
            {required ? <span className="form-control__required">*</span> : null}
          </span>
        ) : null}
        {description ? <span className="form-switch__description">{description}</span> : null}
      </span>

      <span className="form-switch__control">
        <input
          id={inputId}
          className="form-switch__input"
          type="checkbox"
          role="switch"
          disabled={disabled}
          required={required}
          {...props}
        />
        <span className="form-switch__track" aria-hidden="true">
          <span className="form-switch__thumb" />
        </span>
      </span>
    </label>
  )
}

export default Switch
