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

function DataTableAction({
  columns = [],
  actions = [],
  mobileCard,
  actionColumnLabel = 'Action',
  actionColumnKey = 'action',
  actionCellClassName = 'users-table__action-cell',
  actionCellStyle = { width: '1%', whiteSpace: 'nowrap' },
  ...props
}) {
  const resolvedActions = actions.length > 0 ? actions : defaultActions
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

export default DataTableAction
