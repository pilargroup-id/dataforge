import {
  LogOutLeft01,
  Folder,
  Users01,
  RefreshCw05,
  FileText01,
} from '../../components/layoute/TemplateIcons.jsx'

export const defaultNavigationPath = '/Convert/ExcelToJSONL'

export const implementedNavigationPaths = [
  '/Convert/ExcelToJSONL',
  '/Convert/ExcelToPDF',
  '/Convert/ExcelToXML',
  '/Master',
  '/Master/UserPermission',
]

export const primaryNavigationItems = [
  {
    id: 'convert',
    label: 'Convert',
    icon: RefreshCw05,
    children: [
      {
        id: 'convert-excel-to-jsonl',
        label: 'Excel To JSONL',
        href: '/Convert/ExcelToJSONL',
        icon: FileText01,
      },
      {
        id: 'convert-excel-to-pdf',
        label: 'Excel To PDF',
        href: '/Convert/ExcelToPDF',
        icon: FileText01,
      },
      {
        id: 'convert-excel-to-xml',
        label: 'Excel To XML',
        href: '/Convert/ExcelToXML',
        icon: FileText01,
      },
    ],
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
