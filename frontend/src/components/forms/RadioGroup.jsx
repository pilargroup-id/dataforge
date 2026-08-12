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

function RadioGroup({
  label,
  helperText,
  error,
  name,
  options = [],
  value,
  defaultValue,
  onChange,
  className = '',
  direction = 'vertical',
  required = false,
  disabled = false,
}) {
  const generatedId = useId()
  const groupName = name ?? `radio-group-${generatedId}`
  const message = typeof error === 'string' ? error : helperText
  const messageId = message ? `${groupName}-message` : undefined
  const hasError = Boolean(error)

  const wrapperClassName = [
    'form-radio-group',
    direction === 'horizontal' ? 'form-radio-group--horizontal' : '',
    hasError ? 'form-radio-group--error' : '',
    disabled ? 'form-radio-group--disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <fieldset className={wrapperClassName} aria-describedby={messageId}>
      {label ? (
        <legend className="form-control__label">
          <span>{label}</span>
          {required ? <span className="form-control__required">*</span> : null}
        </legend>
      ) : null}

      <div className="form-radio-group__options">
        {options.map((option) => {
          const normalizedOption = normalizeOption(option)
          const optionId = `${groupName}-${String(normalizedOption.value).replace(/\s+/g, '-')}`
          const checkedProps =
            value === undefined
              ? { defaultChecked: defaultValue === normalizedOption.value }
              : { checked: value === normalizedOption.value }

          return (
            <label className="form-radio" htmlFor={optionId} key={normalizedOption.value}>
              <input
                id={optionId}
                className="form-radio__input"
                type="radio"
                name={groupName}
                value={normalizedOption.value}
                required={required}
                disabled={disabled || normalizedOption.disabled}
                onChange={(event) => onChange?.(event.target.value, event)}
                {...checkedProps}
              />
              <span className="form-radio__mark" aria-hidden="true" />
              <span className="form-radio__copy">
                <span className="form-radio__title">{normalizedOption.label}</span>
                {normalizedOption.description ? (
                  <span className="form-radio__description">{normalizedOption.description}</span>
                ) : null}
              </span>
            </label>
          )
        })}
      </div>

      {message ? (
        <p className="form-control__message" id={messageId}>
          {message}
        </p>
      ) : null}
    </fieldset>
  )
}

export default RadioGroup
