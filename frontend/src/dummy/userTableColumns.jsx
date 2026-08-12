export const userTableColumns = [
  {
    key: 'user',
    header: 'User',
    accessor: 'name',
    type: 'identity',
    subtitleAccessor: 'username',
    minWidth: 260,
  },
  {
    key: 'department',
    header: 'Department',
    accessor: 'department',
  },
  {
    key: 'role',
    header: 'Role',
    accessor: 'role',
  },
  {
    key: 'status',
    header: 'Status',
    accessor: 'status',
    type: 'status',
    variantAccessor: 'statusKey',
    nowrap: true,
  },
  {
    key: 'apps',
    header: 'Apps',
    accessor: 'apps',
    type: 'chips',
    minWidth: 220,
  },
]
