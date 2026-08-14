import {
  LogOutLeft01,
  Folder,
  Users01,
  RefreshCw05,
} from '../../components/layoute/TemplateIcons.jsx'

export const defaultNavigationPath = '/Convert'

export const implementedNavigationPaths = [
  '/Convert',
  '/Master',
  '/Master/UserPermission',
]

export const primaryNavigationItems = [
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
    moduleCode: 'ADMINISTRATION',
    children: [
      {
        id: 'user-permission',
        label: 'User Permission',
        href: '/Master/UserPermission',
        icon: Users01,
        moduleCode: 'ADMINISTRATION',
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
