import '../../styles/template-style/TemplateComponents.css'

function CardBigBox({
  as: Component = 'section',
  eyebrow,
  title,
  description,
  headerAction,
  children,
  footer,
  className,
  contentClassName,
  ...props
}) {
  const hasChildren = children !== undefined && children !== null
  const hasFooter = footer !== undefined && footer !== null
  const panelClassName = ['dashboard-panel', className].filter(Boolean).join(' ')
  const headerClassName = [
    'dashboard-panel__header',
    headerAction ? 'dashboard-panel__header--split' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const bodyClassName = ['dashboard-panel__body', contentClassName].filter(Boolean).join(' ')

  return (
    <Component className={panelClassName} {...props}>
      {eyebrow || title || description || headerAction ? (
        <div className={headerClassName}>
          <div>
            {eyebrow ? <p className="dashboard-panel__eyebrow">{eyebrow}</p> : null}
            {title ? <h2 className="dashboard-panel__title">{title}</h2> : null}
            {description ? (
              <p className="dashboard-panel__description">{description}</p>
            ) : null}
          </div>

          {headerAction ? (
            <div className="dashboard-panel__action">{headerAction}</div>
          ) : null}
        </div>
      ) : null}

      {hasChildren ? <div className={bodyClassName}>{children}</div> : null}
      {hasFooter ? <div className="dashboard-panel__footer">{footer}</div> : null}
    </Component>
  )
}

export default CardBigBox
