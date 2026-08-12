import { Edit03 } from '../layoute/TemplateIcons.jsx'

function ButtonEdit({
  label = 'Edit',
  icon: Icon = Edit03,
  size = 16,
  className = '',
  type = 'button',
  ...buttonProps
}) {
  const buttonClassName = ['users-table__icon-button users-table__icon-button--pagination-card', className]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type={type}
      className={buttonClassName}
      aria-label={label}
      title={label}
      {...buttonProps}
    >
      <Icon size={size} aria-hidden="true" />
    </button>
  )
}

export default ButtonEdit
