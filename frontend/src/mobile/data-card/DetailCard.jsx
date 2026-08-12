import { Fragment, isValidElement } from 'react'

import CreateButton from '../../components/button/ButtonCreate.jsx'
import ButtonDelete from '../../components/button/ButtonDelete.jsx'
import ButtonEdit from '../../components/button/ButtonEdit.jsx'

function joinClassNames(...classNames) {
  return classNames.filter(Boolean).join(' ')
}

function getActionButton(action) {
  const actionKey = String(action.key ?? action.label ?? '').toLowerCase()

  if (actionKey === 'edit') {
    return ButtonEdit
  }

  if (actionKey === 'delete' || action.variant === 'danger') {
    return ButtonDelete
  }

  return null
}

function normalizeList(items) {
  if (!Array.isArray(items)) {
    return []
  }

  return items
    .map((item) => String(item ?? '').trim())
    .filter(Boolean)
}

function renderCardValue(value, emptyLabel) {
  if (isValidElement(value)) {
    return value
  }

  if (Array.isArray(value)) {
    const items = normalizeList(value)

    if (items.length === 0) {
      return <span className="detail-card-mobile__value detail-card-mobile__value--muted">{emptyLabel}</span>
    }

    return (
      <div className="detail-card-mobile__chips">
        {items.map((item, index) => (
          <span className="detail-card-mobile__chip" key={`${item}-${index}`}>
            {item}
          </span>
        ))}
      </div>
    )
  }

  if (value === null || value === undefined || value === '') {
    return <span className="detail-card-mobile__value detail-card-mobile__value--muted">{emptyLabel}</span>
  }

  return <span className="detail-card-mobile__value">{String(value)}</span>
}

function renderMetadataValue(item) {
  if (isValidElement(item.value)) {
    return item.value
  }

  return <span>{String(item.value)}</span>
}

function DetailCardField({ field, emptyLabel = '-' }) {
  return (
    <div
      className={joinClassNames(
        'detail-card-mobile__field',
        field.kind === 'chips' ? 'detail-card-mobile__field--stacked' : '',
      )}
    >
      <dt className="detail-card-mobile__field-label">{field.label}</dt>
      <dd className="detail-card-mobile__field-value">{renderCardValue(field.value, emptyLabel)}</dd>
    </div>
  )
}

export default function DetailCard({
  header = {},
  title = '',
  subtitle = '',
  description = '',
  rows = [],
  metadata = {},
  sections = [],
  expandableTitle = 'Detail',
  expandableContent = null,
  actions = [],
  className = '',
  emptyLabel = '-',
  defaultExpanded = false,
  surface = 'card',
  onClick,
}) {
  const metadataItems = Array.isArray(metadata.items)
    ? metadata.items.filter((item) => item?.value !== undefined && item?.value !== null && item?.value !== '')
    : [
        metadata.date
          ? {
              label: metadata.dateLabel ?? 'Tanggal',
              value: metadata.date,
            }
          : null,
        metadata.time
          ? {
              label: metadata.timeLabel ?? 'Waktu',
              value: metadata.time,
            }
          : null,
      ].filter(Boolean)
  const hasExpandableContent = Boolean(expandableContent) || sections.length > 0
  const isInteractive = typeof onClick === 'function'
  const rootClassName = joinClassNames(
    'detail-card-mobile',
    surface === 'embedded' ? 'detail-card-mobile--embedded' : '',
    isInteractive ? 'detail-card-mobile--interactive' : '',
    className,
  )

  return (
    <article
      className={rootClassName}
      onClick={isInteractive ? onClick : undefined}
      onKeyDown={
        isInteractive
          ? (event) => {
              if (event.key !== 'Enter' && event.key !== ' ') {
                return
              }

              event.preventDefault()
              onClick()
            }
          : undefined
      }
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
    >
      {(header.id || header.type || header.status?.label) && (
        <div className="detail-card-mobile__panel detail-card-mobile__header">
          <div className="detail-card-mobile__header-copy">
            {header.id ? <p className="detail-card-mobile__eyebrow">{header.id}</p> : null}
            {header.type ? <p className="detail-card-mobile__type">{header.type}</p> : null}
          </div>

          {header.status?.label ? (
            <span
              className={joinClassNames(
                'detail-card-mobile__status',
                header.status?.variant
                  ? `detail-card-mobile__status--${header.status.variant}`
                  : 'detail-card-mobile__status--default',
              )}
            >
              <span className="detail-card-mobile__status-dot" aria-hidden="true" />
              {header.status.label}
            </span>
          ) : null}
        </div>
      )}

      {(title || subtitle || description) && (
        <div className="detail-card-mobile__panel detail-card-mobile__hero">
          {title ? <h3 className="detail-card-mobile__title">{title}</h3> : null}
          {subtitle ? <p className="detail-card-mobile__subtitle">{subtitle}</p> : null}
          {description ? <p className="detail-card-mobile__description">{description}</p> : null}
        </div>
      )}

      {rows.length > 0 ? (
        <div className="detail-card-mobile__panel detail-card-mobile__rows">
          {rows.map((row, index) => (
            <section className="detail-card-mobile__row" key={row.key ?? `row-${index}`}>
              <p className="detail-card-mobile__row-label">{row.label}</p>
              <div
                className={joinClassNames(
                  'detail-card-mobile__row-value',
                  row.variant === 'muted' ? 'detail-card-mobile__row-value--muted' : '',
                )}
              >
                {renderCardValue(row.value, emptyLabel)}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {hasExpandableContent ? (
        <details
          className="detail-card-mobile__panel detail-card-mobile__details"
          open={defaultExpanded}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <summary className="detail-card-mobile__summary">
            <span>{expandableTitle}</span>
            <span className="detail-card-mobile__summary-icon" aria-hidden="true">
              v
            </span>
          </summary>

          <div className="detail-card-mobile__details-content">
            {expandableContent ? (
              <div className="detail-card-mobile__expandable-copy">{expandableContent}</div>
            ) : null}

            {sections.length > 0 ? (
              <div className="detail-card-mobile__sections">
                {sections.map((section, sectionIndex) => (
                  <section
                    className={joinClassNames(
                      'detail-card-mobile__section',
                      section.wide ? 'detail-card-mobile__section--wide' : '',
                    )}
                    key={section.key ?? `section-${sectionIndex}`}
                  >
                    {section.title ? (
                      <p className="detail-card-mobile__section-title">{section.title}</p>
                    ) : null}

                    <dl className="detail-card-mobile__fields">
                      {(section.fields ?? []).map((field, fieldIndex) => (
                        <Fragment key={field.key ?? `field-${fieldIndex}`}>
                          <DetailCardField field={field} emptyLabel={emptyLabel} />
                        </Fragment>
                      ))}
                    </dl>
                  </section>
                ))}
              </div>
            ) : null}
          </div>
        </details>
      ) : null}

      {actions.length > 0 ? (
        <div className="detail-card-mobile__panel detail-card-mobile__actions">
          {actions.map((action, index) => {
            const Icon = action.icon
            const buttonLabel = action.label ?? action.key ?? 'Action'
            const ActionButton = getActionButton(action)
            const buttonKey = action.key ?? `${buttonLabel}-${index}`
            const handleClick = (event) => {
              event.stopPropagation()
              action.onClick?.(event)
            }

            return ActionButton ? (
              <ActionButton
                key={buttonKey}
                icon={Icon}
                disabled={action.disabled}
                label={buttonLabel}
                onClick={handleClick}
              />
            ) : (
              <CreateButton
                key={buttonKey}
                variant="icon"
                tone={action.variant === 'danger' ? 'danger' : 'default'}
                type="button"
                disabled={action.disabled}
                aria-label={buttonLabel}
                title={buttonLabel}
                onClick={handleClick}
              >
                {Icon ? <Icon size={16} aria-hidden="true" /> : buttonLabel}
              </CreateButton>
            )
          })}
        </div>
      ) : null}

      {metadataItems.length > 0 ? (
        <div className="detail-card-mobile__panel detail-card-mobile__meta">
          {metadataItems.map((item, index) => (
            <div className="detail-card-mobile__meta-item" key={item.key ?? item.label ?? index}>
              {item.label ? <span className="detail-card-mobile__meta-label">{item.label}</span> : null}
              <span className="detail-card-mobile__meta-value">{renderMetadataValue(item)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  )
}
