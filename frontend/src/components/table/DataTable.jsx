import { Fragment, isValidElement, useState } from 'react'

import CreateButton from '../button/ButtonCreate.jsx'
import { ChevronDown, ChevronUp } from '../layoute/TemplateIcons.jsx'
import DetailCard from '../../mobile/data-card/DetailCard.jsx'

function getInitials(value = '') {
  return String(value)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function getDefaultRowId(row, index) {
  return row?.id ?? row?.userId ?? row?.key ?? index
}

function normalizeList(items) {
  if (!Array.isArray(items)) {
    return []
  }

  return items.map((item) => String(item).trim()).filter(Boolean)
}

function sanitizeId(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '-') || 'row'
}

function joinClassNames(...classNames) {
  return classNames.flat().filter(Boolean).join(' ')
}

function resolveTemplateValue(value, row, index) {
  return typeof value === 'function' ? value(row, index) : value
}

function getPathValue(source, path) {
  if (!path || typeof path !== 'string') {
    return undefined
  }

  return path.split('.').reduce((currentValue, key) => currentValue?.[key], source)
}

function normalizePageSizeOptions(options, pageSize) {
  const normalizedOptions = (Array.isArray(options) ? options : [])
    .map((option) => Number(option))
    .filter((option) => Number.isInteger(option) && option > 0)
  const normalizedPageSize = Number(pageSize)

  if (
    Number.isInteger(normalizedPageSize) &&
    normalizedPageSize > 0 &&
    !normalizedOptions.includes(normalizedPageSize)
  ) {
    return [normalizedPageSize, ...normalizedOptions]
  }

  return normalizedOptions
}

function getPaginationItems(currentPage, totalPages) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, 'end-ellipsis', totalPages]
  }

  if (currentPage >= totalPages - 2) {
    return [1, 'start-ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
  }

  return [1, 'start-ellipsis', currentPage - 1, currentPage, currentPage + 1, 'end-ellipsis', totalPages]
}

function getDefaultPaginationConfig(pagination) {
  if (pagination && typeof pagination === 'object') {
    return pagination
  }

  return {}
}

function getColumnValue(column, row, index) {
  if (typeof column.render === 'function') {
    return column.render(row, index)
  }

  if (typeof column.accessor === 'function') {
    return column.accessor(row, index)
  }

  if (typeof column.accessor === 'string') {
    return getPathValue(row, column.accessor)
  }

  if (column.key) {
    return getPathValue(row, column.key)
  }

  return null
}

function getColumnOptionValue(option, row, index) {
  if (typeof option === 'function') {
    return option(row, index)
  }

  if (typeof option === 'string') {
    return getPathValue(row, option)
  }

  return option
}

function getColumnClassName(column, target) {
  const columnKey = sanitizeId(
    column.key ?? (typeof column.accessor === 'string' ? column.accessor : target),
  )
  const baseClassName = target === 'header' ? 'users-table__header-cell' : 'users-table__cell'
  const configuredClassName = target === 'header' ? column.headerClassName : column.cellClassName
  const alignClassName = column.align ? `${baseClassName}--align-${column.align}` : ''
  const typeClassName = column.type ? `${baseClassName}--${column.type}` : ''

  return joinClassNames(
    baseClassName,
    `${baseClassName}--${columnKey}`,
    typeClassName,
    alignClassName,
    column.nowrap ? `${baseClassName}--nowrap` : '',
    column.truncate ? `${baseClassName}--truncate` : '',
    configuredClassName,
  )
}

function getColumnStyle(column, target) {
  const configuredStyle = target === 'header' ? column.headerStyle : column.cellStyle

  return {
    width: column.width,
    minWidth: column.minWidth,
    maxWidth: column.maxWidth,
    ...configuredStyle,
  }
}

function getColumnKey(column, index) {
  if (column.key) {
    return column.key
  }

  if (typeof column.accessor === 'string') {
    return column.accessor
  }

  return `column-${index}`
}

function formatColumnText(value, column, row, index) {
  if (typeof column.format === 'function') {
    return column.format(value, row, index)
  }

  if (column.prefix || column.suffix) {
    return `${column.prefix ?? ''}${value ?? ''}${column.suffix ?? ''}`
  }

  return value
}

function renderColumnValue(column, row, index) {
  const value = getColumnValue(column, row, index)

  if (isValidElement(value)) {
    return value
  }

  if (column.type === 'identity') {
    const title =
      resolveTemplateValue(column.title, row, index) ??
      getColumnOptionValue(column.titleAccessor, row, index) ??
      value
    const subtitle =
      resolveTemplateValue(column.subtitle, row, index) ??
      getColumnOptionValue(column.subtitleAccessor, row, index)
    const initials =
      resolveTemplateValue(column.initials, row, index) ??
      getColumnOptionValue(column.initialsAccessor, row, index)
    const badgeValue =
      resolveTemplateValue(column.badge, row, index) ??
      getColumnOptionValue(column.badgeAccessor, row, index)

    return (
      <DataTableIdentity
        title={title}
        subtitle={subtitle}
        initials={initials}
        badge={badgeValue}
      />
    )
  }

  if (column.type === 'status') {
    const variant =
      resolveTemplateValue(column.variant, row, index) ??
      getColumnOptionValue(column.variantAccessor, row, index) ??
      String(value ?? 'active').toLowerCase()

    return (
      <DataTableStatus variant={variant} inline={column.inline ?? false}>
        {formatColumnText(value, column, row, index)}
      </DataTableStatus>
    )
  }

  if (column.type === 'chips') {
    return (
      <DataTableChips
        items={Array.isArray(value) ? value : normalizeList(String(value ?? '').split(','))}
        empty={column.empty ?? '-'}
        variant={column.variant ?? 'app'}
      />
    )
  }

  return renderBasicValue(formatColumnText(value, column, row, index))
}

function renderBasicValue(value) {
  if (isValidElement(value)) {
    return value
  }

  if (Array.isArray(value)) {
    return <DataTableChips items={value} />
  }

  if (value === null) {
    return <span className="users-table__detail-value users-table__detail-value--muted">null</span>
  }

  if (value === undefined || value === '') {
    return <span className="users-table__detail-value users-table__detail-value--muted">-</span>
  }

  return value
}

function renderDetailValue(value) {
  if (isValidElement(value)) {
    return value
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="users-table__detail-value users-table__detail-value--mono">[]</span>
    }

    return (
      <div className="users-table__detail-chips">
        {value.map((item, index) => (
          <span className="users-table__detail-chip" key={`${item}-${index}`}>
            {item}
          </span>
        ))}
      </div>
    )
  }

  if (value === null) {
    return <span className="users-table__detail-value users-table__detail-value--muted">null</span>
  }

  if (value === undefined || value === '') {
    return <span className="users-table__detail-value users-table__detail-value--muted">-</span>
  }

  return (
    <span
      className={`users-table__detail-value${
        typeof value === 'number' ? ' users-table__detail-value--mono' : ''
      }`}
    >
      {String(value)}
    </span>
  )
}

function getDetailSections(detail, row, index) {
  if (!detail) {
    return []
  }

  if (typeof detail.sections === 'function') {
    return detail.sections(row, index) ?? []
  }

  return detail.sections ?? []
}

function resolveResponsiveValue(value, row, index) {
  if (typeof value === 'function') {
    return value(row, index)
  }

  if (typeof value === 'string') {
    const pathValue = getPathValue(row, value)

    return pathValue === undefined ? value : pathValue
  }

  return value
}

function resolveActionFlag(flag, row, index) {
  return typeof flag === 'function' ? flag(row, index) : flag
}

function getIdentityColumnContent(column, row, index) {
  const value = getColumnValue(column, row, index)

  return {
    title:
      resolveTemplateValue(column.title, row, index) ??
      getColumnOptionValue(column.titleAccessor, row, index) ??
      value,
    subtitle:
      resolveTemplateValue(column.subtitle, row, index) ??
      getColumnOptionValue(column.subtitleAccessor, row, index),
    badge:
      resolveTemplateValue(column.badge, row, index) ??
      getColumnOptionValue(column.badgeAccessor, row, index),
  }
}

function getColumnPlainValue(column, row, index) {
  const value = getColumnValue(column, row, index)

  if (isValidElement(value)) {
    return value
  }

  if (column.type === 'identity') {
    return getIdentityColumnContent(column, row, index).title
  }

  if (column.type === 'chips') {
    return Array.isArray(value) ? value : normalizeList(String(value ?? '').split(','))
  }

  return formatColumnText(value, column, row, index)
}

function getStatusColumnContent(column, row, index) {
  const value = getColumnValue(column, row, index)

  return {
    label: formatColumnText(value, column, row, index),
    variant:
      resolveTemplateValue(column.variant, row, index) ??
      getColumnOptionValue(column.variantAccessor, row, index) ??
      String(value ?? 'active').toLowerCase(),
  }
}

function resolveMobileCardRows(rowsConfig, row, index, defaultRows) {
  if (typeof rowsConfig === 'function') {
    return rowsConfig(row, index) ?? defaultRows
  }

  if (!Array.isArray(rowsConfig)) {
    return defaultRows
  }

  return rowsConfig
    .filter((field) => !(field?.hidden?.(row, index) ?? field?.hidden))
    .map((field, fieldIndex) => ({
      key: field.key ?? `${field.label ?? 'field'}-${fieldIndex}`,
      label: resolveResponsiveValue(field.label, row, index),
      value:
        typeof field.render === 'function'
          ? field.render(row, index)
          : resolveResponsiveValue(field.value, row, index),
      variant: resolveResponsiveValue(field.variant, row, index),
    }))
}

function resolveMobileCardSections(sectionsConfig, row, index, detail) {
  const sourceSections =
    sectionsConfig === true || sectionsConfig === undefined
      ? getDetailSections(detail, row, index)
      : typeof sectionsConfig === 'function'
        ? sectionsConfig(row, index) ?? []
        : Array.isArray(sectionsConfig)
          ? sectionsConfig
          : []

  return sourceSections.map((section, sectionIndex) => ({
    key: section.key ?? section.title ?? `section-${sectionIndex}`,
    title: resolveResponsiveValue(section.title, row, index),
    wide: Boolean(resolveResponsiveValue(section.wide, row, index)),
    fields: (section.fields ?? [])
      .filter((field) => !(field?.hidden?.(row, index) ?? field?.hidden))
      .map((field, fieldIndex) => ({
        key: field.key ?? field.label ?? `field-${fieldIndex}`,
        label: resolveResponsiveValue(field.label, row, index),
        value:
          typeof field.render === 'function'
            ? field.render(row, index)
            : resolveResponsiveValue(field.value, row, index),
        kind: resolveResponsiveValue(field.kind, row, index),
      })),
  }))
}

function resolveMobileCardMetadata(metadataConfig, row, index) {
  if (typeof metadataConfig === 'function') {
    return metadataConfig(row, index) ?? {}
  }

  if (!metadataConfig || typeof metadataConfig !== 'object') {
    return {}
  }

  const items = Array.isArray(metadataConfig.items)
    ? metadataConfig.items
        .filter((item) => !(item?.hidden?.(row, index) ?? item?.hidden))
        .map((item, itemIndex) => ({
          key: item.key ?? item.label ?? `meta-${itemIndex}`,
          label: resolveResponsiveValue(item.label, row, index),
          value:
            typeof item.render === 'function'
              ? item.render(row, index)
              : resolveResponsiveValue(item.value, row, index),
        }))
    : undefined

  return {
    date: resolveResponsiveValue(metadataConfig.date, row, index),
    dateLabel: resolveResponsiveValue(metadataConfig.dateLabel, row, index),
    time: resolveResponsiveValue(metadataConfig.time, row, index),
    timeLabel: resolveResponsiveValue(metadataConfig.timeLabel, row, index),
    items,
  }
}

function resolveMobileCardActions(actionsConfig, row, index, defaultActions) {
  const sourceActions =
    typeof actionsConfig === 'function'
      ? actionsConfig(row, index) ?? defaultActions
      : Array.isArray(actionsConfig)
        ? actionsConfig
        : defaultActions

  return sourceActions
    .filter((action) => !resolveActionFlag(action?.hidden, row, index))
    .map((action) => ({
      key: action.key ?? action.label,
      label: resolveResponsiveValue(action.label ?? action.key ?? 'Action', row, index),
      variant: resolveResponsiveValue(action.variant, row, index),
      icon: action.icon,
      disabled: resolveActionFlag(action.disabled, row, index),
      onClick: (event) => action.onClick?.(row, index, event),
    }))
}

function isActionColumn(column) {
  return (
    column.type === 'action' ||
    String(column.headerClassName ?? '').includes('users-table__action-header') ||
    String(column.cellClassName ?? '').includes('users-table__action-cell')
  )
}

function getDefaultMobileTitleColumn(columns) {
  return columns.find(
    (column) => !column.mobileHidden && column.type !== 'status' && !isActionColumn(column),
  )
}

function getDefaultMobileCardSurface(mobileCard) {
  if (mobileCard && typeof mobileCard === 'object' && typeof mobileCard.surface === 'string') {
    return mobileCard.surface
  }

  return 'card'
}

function getColumnDataKeys(column) {
  return [
    column.accessor,
    column.key,
    column.titleAccessor,
    column.subtitleAccessor,
    column.badgeAccessor,
    column.initialsAccessor,
    column.variantAccessor,
  ].filter((key) => typeof key === 'string' && key.length > 0)
}

function formatMobileDataLabel(key) {
  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\bid\b/gi, 'ID')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function getDefaultMobileCardRows(columns, row, index, titleColumn) {
  const representedKeys = new Set(columns.flatMap(getColumnDataKeys))
  const columnRows = columns
    .filter(
      (column) =>
        !column.mobileHidden &&
        column.type !== 'identity' &&
        column.type !== 'status' &&
        !isActionColumn(column) &&
        column !== titleColumn,
    )
    .map((column, columnIndex) => ({
      key: column.key ?? `mobile-row-${columnIndex}`,
      label: column.mobileLabel ?? column.header,
      value: getColumnPlainValue(column, row, index),
      variant: column.mobileVariant,
    }))

  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    return columnRows
  }

  const extraRows = Object.entries(row)
    .filter(([key, value]) => !representedKeys.has(key) && value !== undefined)
    .map(([key, value]) => ({
      key: `data-${key}`,
      label: formatMobileDataLabel(key),
      value,
    }))

  return [...columnRows, ...extraRows]
}

function buildMobileCardProps({
  mobileCard,
  row,
  index,
  rowKey,
  columns,
  detail,
  actions,
  onRowClick,
  defaultSurface,
}) {
  const mobileCardConfig =
    mobileCard && typeof mobileCard === 'object' ? mobileCard : {}
  const identityColumn = columns.find((column) => column.type === 'identity')
  const statusColumn = columns.find((column) => column.type === 'status')
  const titleColumn = identityColumn ?? getDefaultMobileTitleColumn(columns)
  const identityContent = identityColumn ? getIdentityColumnContent(identityColumn, row, index) : {}
  const defaultStatus = statusColumn ? getStatusColumnContent(statusColumn, row, index) : null
  const defaultRows = getDefaultMobileCardRows(columns, row, index, titleColumn)
  const headerConfig = mobileCardConfig.header ?? {}
  const resolvedTitle =
    resolveResponsiveValue(mobileCardConfig.title, row, index) ??
    identityContent.title ??
    row.name ??
    row.title ??
    (titleColumn ? getColumnPlainValue(titleColumn, row, index) : null) ??
    rowKey
  const resolvedOnClick =
    typeof mobileCardConfig.onClick === 'function'
      ? () => mobileCardConfig.onClick(row, index)
      : typeof onRowClick === 'function'
        ? () => onRowClick(row, index)
        : undefined

  return {
    header: {
      id: resolveResponsiveValue(headerConfig.id, row, index) ?? rowKey,
      type: resolveResponsiveValue(headerConfig.type, row, index),
      status: {
        label:
          resolveResponsiveValue(headerConfig.status?.label, row, index) ??
          defaultStatus?.label,
        variant:
          resolveResponsiveValue(headerConfig.status?.variant, row, index) ??
          defaultStatus?.variant,
      },
    },
    title: resolvedTitle,
    subtitle:
      resolveResponsiveValue(mobileCardConfig.subtitle, row, index) ?? identityContent.subtitle,
    description:
      resolveResponsiveValue(mobileCardConfig.description, row, index) ??
      resolveTemplateValue(detail?.description, row, index),
    rows: resolveMobileCardRows(mobileCardConfig.rows, row, index, defaultRows),
    metadata: resolveMobileCardMetadata(mobileCardConfig.metadata, row, index),
    sections: resolveMobileCardSections(mobileCardConfig.sections, row, index, detail),
    expandableTitle:
      resolveResponsiveValue(mobileCardConfig.expandableTitle, row, index) ??
      detail?.columnLabel ??
      'Detail',
    expandableContent:
      resolveResponsiveValue(mobileCardConfig.expandableContent, row, index) ??
      (typeof detail?.render === 'function' ? detail.render(row, index) : null),
    actions: resolveMobileCardActions(
      mobileCardConfig.actions,
      row,
      index,
      actions,
    ),
    className: resolveResponsiveValue(mobileCardConfig.className, row, index) ?? '',
    defaultExpanded:
      resolveResponsiveValue(mobileCardConfig.defaultExpanded, row, index) ?? false,
    surface: resolveResponsiveValue(mobileCardConfig.surface, row, index) ?? defaultSurface,
    onClick: resolvedOnClick,
  }
}

export function DataTableStatus({
  children,
  variant = 'active',
  inline = false,
  className = '',
}) {
  const statusClassName = [
    'users-table__status',
    inline ? 'users-table__status--inline' : '',
    variant ? `users-table__status--${variant}` : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return <span className={statusClassName}>{children ?? '-'}</span>
}

export function DataTableChips({ items = [], empty = '-', variant = 'app', className = '' }) {
  const normalizedItems = normalizeList(items)

  if (normalizedItems.length === 0) {
    return <span className="users-table__apps-empty">{empty}</span>
  }

  return (
    <div className={['users-table__apps', className].filter(Boolean).join(' ')}>
      {normalizedItems.map((item, index) => (
        <DataTableStatus key={`${item}-${index}`} variant={variant} inline>
          {item}
        </DataTableStatus>
      ))}
    </div>
  )
}

export function DataTableIdentity({ title, subtitle, initials, badge, className = '' }) {
  return (
    <div className={['users-table__identity', className].filter(Boolean).join(' ')}>
      <span className="users-table__avatar">{initials || getInitials(title)}</span>

      <div className="users-table__identity-copy">
        <div className="users-table__name-row">
          <strong className="users-table__name">{title}</strong>
          {badge}
        </div>

        {subtitle ? <p className="users-table__meta">{subtitle}</p> : null}
      </div>
    </div>
  )
}

function DataTable({
  rows = [],
  columns = [],
  getRowId = getDefaultRowId,
  detail = null,
  detailTogglePlacement = 'column',
  actions = [],
  mobileCard,
  pagination = true,
  tableLabel = 'Data table',
  tableMessage = '',
  emptyMessage,
  idPrefix = 'data-table',
  className = '',
  onRowClick,
  getRowClassName,
}) {
  const [expandedRowKey, setExpandedRowKey] = useState(null)
  const [localPage, setLocalPage] = useState(1)
  const [localPageSize, setLocalPageSize] = useState(
    getDefaultPaginationConfig(pagination).pageSize ?? 5,
  )
  const [isPageSizeMenuOpen, setIsPageSizeMenuOpen] = useState(false)
  const hasDetail = Boolean(detail)
  const detailToggleInFirstCell =
    hasDetail && detailTogglePlacement === 'first-cell' && columns.length > 0
  const showDetailColumn = hasDetail && !detailToggleInFirstCell
  const hasMobileCard = mobileCard !== false
  const mobileCardSurface = getDefaultMobileCardSurface(mobileCard)
  const hasPagination = pagination !== false && pagination !== null
  const paginationConfig = getDefaultPaginationConfig(pagination)
  const isControlledPagination =
    hasPagination &&
    typeof paginationConfig.onPrevious === 'function' &&
    typeof paginationConfig.onNext === 'function'
  const effectivePageSize = Number(paginationConfig.pageSize ?? localPageSize)
  const totalRows = Number(paginationConfig.totalRows ?? rows.length)
  const totalPages = Math.max(
    1,
    Number(paginationConfig.totalPages) ||
      Math.ceil(totalRows / (Number.isInteger(effectivePageSize) && effectivePageSize > 0 ? effectivePageSize : 1)),
  )
  const currentPage = Math.min(
    Math.max(1, Number(paginationConfig.currentPage ?? localPage) || 1),
    totalPages,
  )
  const displayRows =
    hasPagination && !isControlledPagination
      ? rows.slice((currentPage - 1) * effectivePageSize, currentPage * effectivePageSize)
      : rows
  const visibleExpandedRowKey = displayRows.some(
    (row, index) => String(getRowId(row, index)) === expandedRowKey,
  )
    ? expandedRowKey
    : null
  const resolvedEmptyMessage = emptyMessage ?? tableMessage ?? 'Belum ada data.'
  const colSpan = columns.length + (showDetailColumn ? 1 : 0)
  const currentPageSize = Number(effectivePageSize)
  const pageSizeOptions = normalizePageSizeOptions(
    paginationConfig.pageSizeOptions ?? [5, 10, 25, 50],
    currentPageSize,
  )
  const canChangePageSize =
    hasPagination &&
    Number.isInteger(currentPageSize) &&
    currentPageSize > 0 &&
    pageSizeOptions.length > 0
  const firstItem = totalRows === 0 ? 0 : (currentPage - 1) * currentPageSize + 1
  const lastItem = Math.min(currentPage * currentPageSize, totalRows)
  const paginationItems = paginationConfig.items ?? getPaginationItems(currentPage, totalPages)
  const paginationSummary =
    paginationConfig.summary ?? `${firstItem}-${lastItem} dari ${totalRows} data`
  const pageSizeMenuId = `${sanitizeId(idPrefix)}-page-size-options`

  const handleToggleRow = (rowKey) => {
    if (!hasDetail) {
      return
    }

    setExpandedRowKey((currentRowKey) => (currentRowKey === rowKey ? null : rowKey))
  }

  const handleRowKeyDown = (event, rowKey) => {
    if (!hasDetail || (event.key !== 'Enter' && event.key !== ' ')) {
      return
    }

    event.preventDefault()
    handleToggleRow(rowKey)
  }

  const handleRowClick = (row, index, rowKey) => {
    onRowClick?.(row, index)
    handleToggleRow(rowKey)
  }

  const handlePageSizeChange = (value) => {
    const nextPageSize = Number(value)

    if (!Number.isInteger(nextPageSize) || nextPageSize <= 0) {
      return
    }

    setIsPageSizeMenuOpen(false)

    if (typeof paginationConfig.onPageSizeChange === 'function') {
      paginationConfig.onPageSizeChange(nextPageSize)
      return
    }

    setLocalPageSize(nextPageSize)
    setLocalPage(1)
  }

  const handlePageSizeBlur = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsPageSizeMenuOpen(false)
    }
  }

  const handlePageSizeKeyDown = (event) => {
    if (event.key === 'Escape') {
      setIsPageSizeMenuOpen(false)
    }
  }

  const handlePreviousPage = () => {
    if (typeof paginationConfig.onPrevious === 'function') {
      paginationConfig.onPrevious()
      return
    }

    setLocalPage((page) => Math.max(1, page - 1))
  }

  const handleNextPage = () => {
    if (typeof paginationConfig.onNext === 'function') {
      paginationConfig.onNext()
      return
    }

    setLocalPage((page) => Math.min(totalPages, page + 1))
  }

  const handleSelectPage = (page) => {
    if (typeof paginationConfig.onSelect === 'function') {
      paginationConfig.onSelect(page)
      return
    }

    setLocalPage(page)
  }

  const renderDetailToggleButton = (rowKey, isExpanded, accordionId, className = '') => (
    <CreateButton
      variant="icon"
      className={joinClassNames('users-table__icon-button--pagination-card', className)}
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        handleToggleRow(rowKey)
      }}
      aria-label={isExpanded ? 'Tutup detail' : 'Buka detail'}
      aria-expanded={isExpanded}
      aria-controls={accordionId}
      title={isExpanded ? 'Tutup detail' : 'Buka detail'}
    >
      {isExpanded ? (
        <ChevronUp size={16} aria-hidden="true" />
      ) : (
        <ChevronDown size={16} aria-hidden="true" />
      )}
    </CreateButton>
  )

  return (
    <div
      className={joinClassNames(
        'users-table-layout',
        hasMobileCard ? 'users-table-layout--with-mobile' : '',
      )}
    >
      <div className={['users-table-wrapper', className].filter(Boolean).join(' ')}>
        <table className="users-table" aria-label={tableLabel}>
          <thead>
            <tr>
              {columns.map((column, columnIndex) => (
                <th
                  key={getColumnKey(column, columnIndex)}
                  scope="col"
                  className={getColumnClassName(column, 'header')}
                  style={getColumnStyle(column, 'header')}
                >
                  {column.header}
                </th>
              ))}

              {showDetailColumn ? (
                <th scope="col" className="users-table__detail-header">
                  {detail.columnLabel ?? 'Detail'}
                </th>
              ) : null}
            </tr>
          </thead>

          <tbody>
            {displayRows.length > 0 ? (
              displayRows.map((row, index) => {
                const rowId = getRowId(row, index)
                const rowKey = String(rowId)
                const safeRowId = sanitizeId(rowKey)
                const isExpanded = visibleExpandedRowKey === rowKey
                const isRowInteractive = hasDetail || typeof onRowClick === 'function'
                const accordionId = `${idPrefix}-accordion-${safeRowId}`
                const detailSections = getDetailSections(detail, row, index)
                const detailTitle = resolveTemplateValue(detail?.title, row, index)
                const detailDescription = resolveTemplateValue(detail?.description, row, index)
                const detailEyebrow = resolveTemplateValue(detail?.eyebrow, row, index)
                const rowClassName = [
                  'users-table__row',
                  isRowInteractive ? 'users-table__row--interactive' : '',
                  isExpanded ? 'users-table__row--expanded' : '',
                  getRowClassName?.(row, index),
                ]
                  .filter(Boolean)
                  .join(' ')

                return (
                  <Fragment key={rowKey}>
                    <tr
                      className={rowClassName}
                      onClick={
                        isRowInteractive ? () => handleRowClick(row, index, rowKey) : undefined
                      }
                      onKeyDown={(event) => handleRowKeyDown(event, rowKey)}
                      tabIndex={hasDetail ? 0 : undefined}
                      aria-expanded={hasDetail ? isExpanded : undefined}
                      aria-controls={hasDetail ? accordionId : undefined}
                    >
                      {columns.map((column, columnIndex) => {
                        const columnValue = renderColumnValue(column, row, index)
                        const showInlineToggle = detailToggleInFirstCell && columnIndex === 0

                        return (
                          <td
                            key={getColumnKey(column, columnIndex)}
                            className={getColumnClassName(column, 'cell')}
                            style={getColumnStyle(column, 'cell')}
                          >
                            {showInlineToggle ? (
                              <div className="users-table__cell-content users-table__cell-content--with-toggle">
                                {renderDetailToggleButton(
                                  rowKey,
                                  isExpanded,
                                  accordionId,
                                  'users-table__cell-toggle-button',
                                )}
                                <div className="users-table__cell-value">{columnValue}</div>
                              </div>
                            ) : (
                              columnValue
                            )}
                          </td>
                        )
                      })}

                      {showDetailColumn ? (
                        <td className="users-table__detail-cell">
                          {renderDetailToggleButton(rowKey, isExpanded, accordionId)}
                        </td>
                      ) : null}
                    </tr>

                    {hasDetail && isExpanded ? (
                      <tr className="users-table__accordion-row">
                        <td colSpan={colSpan}>
                          <div className="users-table__accordion" id={accordionId}>
                            <div className="users-table__accordion-header">
                              <div className="users-table__accordion-copy">
                                <p className="users-table__accordion-eyebrow">
                                  {detailEyebrow ?? 'Detail'}
                                </p>
                                <h3 className="users-table__accordion-title">
                                  {detailTitle ?? row.name ?? row.title ?? rowId}
                                </h3>
                                {detailDescription ? (
                                  <p className="users-table__accordion-description">
                                    {detailDescription}
                                  </p>
                                ) : null}
                              </div>
                            </div>

                            {typeof detail.render === 'function' ? detail.render(row, index) : null}

                            {detailSections.length > 0 ? (
                              <div className="users-table__detail-shell">
                                {detailSections.map((section) => (
                                  <section
                                    key={section.title}
                                    className={`users-table__detail-section${
                                      section.wide ? ' users-table__detail-section--wide' : ''
                                    }`}
                                  >
                                    <div className="users-table__detail-section-header">
                                      <p className="users-table__detail-section-eyebrow">
                                        {section.title}
                                      </p>
                                    </div>

                                    <dl className="users-table__detail-list">
                                      {(section.fields ?? []).map((field) => {
                                        const fieldValue =
                                          typeof field.render === 'function'
                                            ? field.render(row, index)
                                            : resolveTemplateValue(field.value, row, index)

                                        return (
                                          <div
                                            key={field.label}
                                            className={`users-table__detail-row${
                                              field.kind === 'chips'
                                                ? ' users-table__detail-row--stacked'
                                                : ''
                                            }`}
                                          >
                                            <dt className="users-table__detail-label">
                                              {field.label}
                                            </dt>
                                            <dd className="users-table__detail-field">
                                              {renderDetailValue(fieldValue)}
                                            </dd>
                                          </div>
                                        )
                                      })}
                                    </dl>
                                  </section>
                                ))}
                              </div>
                            ) : null}

                            {actions.length > 0 ? (
                              <div className="users-table__accordion-actions">
                                {actions.map((action) => {
                                  if (action.hidden?.(row, index)) {
                                    return null
                                  }

                                  const Icon = action.icon

                                  return (
                                    <CreateButton
                                      key={action.key ?? action.label}
                                      variant="accordion"
                                      tone={action.variant === 'danger' ? 'danger' : 'default'}
                                      type="button"
                                      disabled={action.disabled?.(row, index) ?? action.disabled}
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        action.onClick?.(row, index, event)
                                      }}
                                    >
                                      {Icon ? <Icon size={16} aria-hidden="true" /> : null}
                                      {action.label}
                                    </CreateButton>
                                  )
                                })}
                              </div>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                )
              })
            ) : (
              <tr>
                <td colSpan={colSpan}>
                  <div className="users-table__empty">{resolvedEmptyMessage}</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {hasMobileCard ? (
        <div className="users-table-mobile">
          {displayRows.length > 0 ? (
            <div
              className={joinClassNames(
                'users-table-mobile__cards',
                mobileCardSurface === 'embedded' ? 'users-table-mobile__cards--embedded' : '',
              )}
            >
              {displayRows.map((row, index) => {
                const rowKey = String(getRowId(row, index))
                const cardProps = buildMobileCardProps({
                  mobileCard,
                  row,
                  index,
                  rowKey,
                  columns,
                  detail,
                  actions,
                  onRowClick,
                  defaultSurface: mobileCardSurface,
                })

                return <DetailCard key={rowKey} {...cardProps} />
              })}
            </div>
          ) : (
            <div className="users-table__empty">{resolvedEmptyMessage}</div>
          )}
        </div>
      ) : null}

      {hasPagination ? (
        <div className="users-table-pagination">
          <div className="users-table-pagination__meta">
            <p className="users-table-pagination__summary">{paginationSummary}</p>

            {canChangePageSize ? (
              <div
                className="users-table-pagination__page-size"
                onBlur={handlePageSizeBlur}
                onKeyDown={handlePageSizeKeyDown}
              >
                <span className="users-table-pagination__page-size-label">
                  {paginationConfig.pageSizeLabel ?? 'Rows per page'}
                </span>
                <div className="users-table-pagination__page-size-menu">
                  <button
                    className="users-table-pagination__select"
                    type="button"
                    onClick={() => setIsPageSizeMenuOpen((isOpen) => !isOpen)}
                    aria-haspopup="listbox"
                    aria-expanded={isPageSizeMenuOpen}
                    aria-controls={pageSizeMenuId}
                    aria-label={paginationConfig.pageSizeAriaLabel ?? 'Jumlah baris per halaman'}
                  >
                    <span>{currentPageSize}</span>
                    {isPageSizeMenuOpen ? (
                      <ChevronUp size={16} aria-hidden="true" />
                    ) : (
                      <ChevronDown size={16} aria-hidden="true" />
                    )}
                  </button>

                  {isPageSizeMenuOpen ? (
                    <div
                      className="users-table-pagination__page-size-options"
                      id={pageSizeMenuId}
                      role="listbox"
                      aria-label={paginationConfig.pageSizeAriaLabel ?? 'Jumlah baris per halaman'}
                    >
                      {pageSizeOptions.map((option) => (
                        <button
                          key={option}
                          className={joinClassNames(
                            'users-table-pagination__page-size-option',
                            option === currentPageSize
                              ? 'users-table-pagination__page-size-option--active'
                              : '',
                          )}
                          type="button"
                          role="option"
                          aria-selected={option === currentPageSize}
                          onClick={() => handlePageSizeChange(option)}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                {paginationConfig.pageSizeSuffix ? (
                  <span className="users-table-pagination__page-size-suffix">
                    {paginationConfig.pageSizeSuffix}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          <div
            className="users-table-pagination__controls"
            aria-label={paginationConfig.ariaLabel ?? `${tableLabel} pagination`}
          >
            <CreateButton
              variant="pagination"
              type="button"
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
            >
              {paginationConfig.previousLabel ?? 'Previous'}
            </CreateButton>

            {paginationItems.map((item, index) =>
              typeof item === 'number' ? (
                <CreateButton
                  key={item}
                  variant="pagination"
                  active={item === currentPage}
                  type="button"
                  onClick={() => handleSelectPage(item)}
                  aria-current={item === currentPage ? 'page' : undefined}
                >
                  {item}
                </CreateButton>
              ) : (
                <span
                  key={`${item}-${index}`}
                  className="users-table-pagination__ellipsis"
                  aria-hidden="true"
                >
                  ...
                </span>
              ),
            )}

            <CreateButton
              variant="pagination"
              type="button"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              {paginationConfig.nextLabel ?? 'Next'}
            </CreateButton>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default DataTable
