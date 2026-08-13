export const permissionTableColumns = [
  {
    key: 'role',
    header: 'Role',
    accessor: 'role',
    type: 'identity',
    subtitleAccessor: 'roleCode',
    minWidth: 220,
  },
  {
    key: 'department',
    header: 'Department',
    accessor: 'department',
  },
  {
    key: 'modules',
    header: 'Modules',
    accessor: 'modules',
    type: 'chips',
    minWidth: 240,
  },
  {
    key: 'level',
    header: 'Access Level',
    accessor: 'level',
    type: 'status',
    variantAccessor: 'levelKey',
    nowrap: true,
  },
  {
    key: 'status',
    header: 'Status',
    accessor: 'status',
    type: 'status',
    variantAccessor: 'statusKey',
    nowrap: true,
  },
]
