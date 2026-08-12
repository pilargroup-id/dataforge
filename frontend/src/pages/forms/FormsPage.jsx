import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'

import {
  Checkbox,
  Dropdown,
  DropdownCheckBox,
  DropdownSearch,
  RadioGroup,
  Select,
  Switch,
  TextArea,
  TextField,
  Upload,
} from '../../components/forms'
import { Mail, SearchMd, Users01 } from '../../components/layoute/TemplateIcons.jsx'

const roleOptions = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'staff', label: 'Staff' },
]

const departmentOptions = [
  { value: 'legal', label: 'Legal' },
  { value: 'finance', label: 'Finance' },
  { value: 'operation', label: 'Operation' },
  { value: 'technology', label: 'Technology' },
]

const appOptions = [
  {
    value: 'crm',
    label: 'CRM',
    description: 'Sales pipeline dan activity tracking.',
  },
  {
    value: 'ticketing',
    label: 'Ticketing',
    description: 'Issue management dan SLA.',
  },
  {
    value: 'analytics',
    label: 'Analytics',
    description: 'Dashboard performa dan laporan.',
  },
  {
    value: 'document',
    label: 'Document',
    description: 'Kontrol dokumen internal.',
  },
]

const statusOptions = [
  {
    value: 'active',
    label: 'Active',
    description: 'User dapat mengakses aplikasi.',
  },
  {
    value: 'pending',
    label: 'Pending',
    description: 'Menunggu approval dari admin.',
  },
  {
    value: 'inactive',
    label: 'Inactive',
    description: 'Akses sementara dinonaktifkan.',
  },
]

const defaultActivePage = {
  title: 'Forms',
  eyebrow: 'Component Template',
}

function FormsPage({ activePage }) {
  const outletContext = useOutletContext() ?? {}
  const resolvedActivePage = activePage ?? outletContext.activePage ?? defaultActivePage
  const [formValues, setFormValues] = useState({
    name: 'Al Fatih',
    email: 'alfatih@example.com',
    role: 'staff',
    department: 'technology',
    assignee: 'legal',
    apps: ['crm', 'analytics'],
    status: 'active',
    notes: 'Catatan singkat untuk kebutuhan preview komponen form.',
    agreement: true,
    notifications: true,
    uploadLabel: '',
  })

  const updateValue = (fieldName, value) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      [fieldName]: value,
    }))
  }

  return (
    <section className="dashboard-panel users-table-card forms-preview" aria-label={resolvedActivePage.title}>
      <div className="users-table-card__header">
        <div>
          <p className="dashboard-panel__eyebrow">{resolvedActivePage.eyebrow}</p>
          <h1 className="dashboard-panel__title">{resolvedActivePage.title}</h1>
          <p className="users-table-card__description">
            Kumpulan komponen form yang siap dipakai lewat import dari components/forms.
          </p>
        </div>
      </div>

      <div className="forms-preview__grid">
        <article className="forms-preview__section">
          <div className="forms-preview__section-header">
            <h2>Inputs</h2>
            <span>TextField, TextArea, Select</span>
          </div>

          <div className="forms-preview__stack">
            <TextField
              label="Nama user"
              value={formValues.name}
              placeholder="Masukkan nama"
              leftIcon={Users01}
              required
              onChange={(event) => updateValue('name', event.target.value)}
            />
            <TextField
              label="Email"
              type="email"
              value={formValues.email}
              placeholder="nama@company.com"
              leftIcon={Mail}
              helperText="Gunakan email aktif untuk akses aplikasi."
              onChange={(event) => updateValue('email', event.target.value)}
            />
            <Select
              label="Role"
              value={formValues.role}
              options={roleOptions}
              onChange={(event) => updateValue('role', event.target.value)}
            />
            <TextArea
              label="Catatan"
              value={formValues.notes}
              rows={5}
              onChange={(event) => updateValue('notes', event.target.value)}
            />
          </div>
        </article>

        <article className="forms-preview__section">
          <div className="forms-preview__section-header">
            <h2>Selection</h2>
            <span>Checkbox, Switch, RadioGroup</span>
          </div>

          <div className="forms-preview__stack">
            <Checkbox
              label="Setujui akses user"
              description="Approval ini akan dipakai oleh workflow aktivasi."
              checked={formValues.agreement}
              onChange={(event) => updateValue('agreement', event.target.checked)}
            />
            <Switch
              label="Notifikasi aktif"
              description="Kirim update status melalui email."
              checked={formValues.notifications}
              onChange={(event) => updateValue('notifications', event.target.checked)}
            />
            <RadioGroup
              label="Status user"
              value={formValues.status}
              options={statusOptions}
              onChange={(value) => updateValue('status', value)}
            />
          </div>
        </article>

        <article className="forms-preview__section">
          <div className="forms-preview__section-header">
            <h2>Dropdown</h2>
            <span>Dropdown, DropdownSearch, DropdownCheckBox</span>
          </div>

          <div className="forms-preview__stack">
            <Dropdown
              label="Department"
              value={formValues.department}
              options={departmentOptions}
              onChange={(value) => updateValue('department', value)}
            />
            <DropdownSearch
              label="PIC department"
              value={formValues.assignee}
              options={departmentOptions}
              leftIcon={SearchMd}
              onChange={(value) => updateValue('assignee', value)}
            />
            <DropdownCheckBox
              label="Apps access"
              value={formValues.apps}
              options={appOptions}
              helperText="Pilih satu atau beberapa aplikasi untuk user."
              onChange={(values) => updateValue('apps', values)}
            />
          </div>
        </article>

        <article className="forms-preview__section">
          <div className="forms-preview__section-header">
            <h2>Upload</h2>
            <span>Input file drag and drop</span>
          </div>

          <Upload
            label="Dokumen pendukung"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            multiple
            onFilesChange={(files) => {
              const names = Array.isArray(files) ? files.map((file) => file.name).join(', ') : files?.name ?? ''
              updateValue('uploadLabel', names)
            }}
          />

          <div className="forms-preview__summary">
            <span>Preview value</span>
            <strong>{formValues.uploadLabel || 'Belum ada file dipilih'}</strong>
          </div>
        </article>
      </div>
    </section>
  )
}

export default FormsPage
