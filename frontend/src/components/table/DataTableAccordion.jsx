import CreateButton from '../button/ButtonCreate.jsx'
import ButtonDelete from '../button/ButtonDelete.jsx'
import ButtonEdit from '../button/ButtonEdit.jsx'
import DataTable from './DataTable.jsx'

export {
  DataTableChips,
  DataTableIdentity,
  DataTableStatus,
} from './DataTable.jsx'

const defaultActions = [
  {
    key: 'edit',
    label: 'Edit',
  },
  {
    key: 'delete',
    label: 'Delete',
    variant: 'danger',
  },
]

function isActionHidden(action, row, index) {
  return typeof action.hidden === 'function' ? action.hidden(row, index) : action.hidden
}

function isActionDisabled(action, row, index) {
  return typeof action.disabled === 'function' ? action.disabled(row, index) : action.disabled
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

function formatDetailLabel(key) {
  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\bid\b/gi, 'ID')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function getDefaultDetailFields(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    return [{ label: 'Value', value: row }]
  }

  return Object.entries(row)
    .filter(([, value]) => value !== undefined && typeof value !== 'function')
    .map(([key, value]) => ({
      label: formatDetailLabel(key),
      value,
      kind: Array.isArray(value) ? 'chips' : undefined,
    }))
}

const defaultDetail = {
  columnLabel: 'Detail',
  eyebrow: 'Detail data',
  title: (row) => row?.name ?? row?.title ?? row?.username ?? row?.userId ?? row?.id ?? 'Detail',
  description: (row) =>
    [row?.role, row?.department].filter(Boolean).join(' - ') || row?.email || undefined,
  sections: (row) => [
    {
      title: 'Informasi lengkap',
      wide: true,
      fields: getDefaultDetailFields(row),
    },
  ],
}

function DataTableAccordion({
  columns = [],
  actions = [],
  detail,
  mobileCard,
  actionColumnLabel = 'Action',
  actionColumnKey = 'action',
  actionCellClassName = 'users-table__action-cell',
  actionCellStyle = { width: '1%', whiteSpace: 'nowrap' },
  ...props
}) {
  const resolvedActions = actions.length > 0 ? actions : defaultActions
  const resolvedDetail = detail === false ? null : detail ?? defaultDetail
  const actionColumn =
    resolvedActions.length > 0
      ? {
          key: actionColumnKey,
          header: actionColumnLabel,
          headerClassName: 'users-table__action-header',
          cellClassName: actionCellClassName,
          cellStyle: actionCellStyle,
          render: (row, index) => (
            <>
              {resolvedActions.map((action, actionIndex) => {
                if (isActionHidden(action, row, index)) {
                  return null
                }

                const Icon = action.icon
                const buttonLabel = action.label ?? action.key ?? 'Action'
                const ActionButton = getActionButton(action)
                const buttonKey = action.key ?? `${buttonLabel}-${actionIndex}`
                const isDisabled = isActionDisabled(action, row, index)
                const handleClick = (event) => {
                  event.stopPropagation()
                  action.onClick?.(row, index, event)
                }

                return ActionButton ? (
                  <ActionButton
                    key={buttonKey}
                    icon={Icon}
                    disabled={isDisabled}
                    label={buttonLabel}
                    onClick={handleClick}
                  />
                ) : (
                  <CreateButton
                    key={buttonKey}
                    variant="icon"
                    tone={action.variant === 'danger' ? 'danger' : 'default'}
                    type="button"
                    disabled={isDisabled}
                    aria-label={buttonLabel}
                    title={buttonLabel}
                    onClick={handleClick}
                  >
                    {Icon ? <Icon size={16} aria-hidden="true" /> : buttonLabel}
                  </CreateButton>
                )
              })}
            </>
          ),
        }
      : null

  return (
    <DataTable
      {...props}
      detail={resolvedDetail}
      detailTogglePlacement="first-cell"
      mobileCard={
        mobileCard === false
          ? false
          : {
              ...(mobileCard ?? {}),
              actions: mobileCard?.actions ?? resolvedActions,
            }
      }
      columns={actionColumn ? [...columns, actionColumn] : columns}
    />
  )
}

export default DataTableAccordion
