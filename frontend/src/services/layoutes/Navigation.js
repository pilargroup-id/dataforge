import {
  LogOutLeft01,
  Table01,
  Chart01,
  Folder,
  TrendingUp,
  MoreHorizontal,
  Users01,
  RefreshCw05,
} from '../../components/layoute/TemplateIcons.jsx'

export const defaultNavigationPath = '/dashboard'

export const implementedNavigationPaths = [
  '/icons',
  '/forms',
  '/Page1',
  '/Page2',
  '/Page3',
  '/Table',
  '/TableActions',
  '/users',
  '/Chart',
  '/Convert',
  '/Master',
  '/Master/UserPermission',
]

export const primaryNavigationItems = [
  {
    id: 'icons',
    label: 'Icons',
    href: '/icons',
    icon: MoreHorizontal,
  },
  {
    id: 'forms',
    label: 'Forms',
    href: '/forms',
    icon: Users01,
  },
  {
    id: 'table',
    label: 'Table',
    icon: Table01,
    icon: Folder,
    children: [
      {
        id: 'page1',
        label: 'Data Table',
        href: '/Page1',
        icon: Table01,
      },
      {
        id: 'page2',
        label: 'Data Table Actions',
        href: '/Page2',
        icon: Table01,
      },
      {
        id: 'page3',
        label: 'Data Table Accordion',
        href: '/Page3',
        icon: Table01,
      },
    ],
  },
  {
    id: 'chart',
    label: 'Chart',
    href: '/Chart',
    icon: Chart01,
  },
  {
    id: 'convert',
    label: 'Convert',
    href: '/Convert',
    icon: RefreshCw05,
  },
  {
    id: 'master',
    label: 'Master',
    href: '/Master',
    icon: Folder,
    children: [
      {
        id: 'user-permission',
        label: 'User Permission',
        href: '/Master/UserPermission',
        icon: Users01,
      },
    ],
  },
]

export const secondaryNavigationItems = [
  {
    id: 'back-pilargroup',
    label: 'Back Pilargroup',
    href: 'https://pilargroup.id/dashboard',
    icon: LogOutLeft01,
    external: true,
  },
]
