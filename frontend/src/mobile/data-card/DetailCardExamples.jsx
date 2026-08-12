import { useState } from 'react'
import DetailCard from './DetailCardAdvanced'

/**
 * DetailCardExamples - Showcase berbagai contoh penggunaan DetailCard
 */
export default function DetailCardExamples() {
  const [activeTab, setActiveTab] = useState('ticket')

  // Example 1: Ticket/Issue
  const ticketData = {
    header: {
      id: 'TCK-252',
      type: 'Software - Lain-lain',
      status: { label: 'Void', variant: 'danger' },
    },
    title: 'testing',
    rows: [
      { label: 'Requester', value: 'fatih', variant: 'default' },
      { label: 'Support', value: '-', variant: 'muted' },
    ],
    metadata: {
      date: '30 Mar 2026',
      time: '13:52 WIB',
    },
    onEdit: (isEditing) => console.log('Ticket edit:', isEditing),
    actions: [
      {
        label: 'Resolve',
        onClick: () => alert('Ticket resolved'),
        variant: 'success',
      },
      {
        label: 'Close',
        onClick: () => alert('Ticket closed'),
        variant: 'default',
      },
    ],
    expandableContent: {
      title: 'Informasi Ticket',
      content: (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-slate-900">Prioritas</p>
            <p className="mt-1 text-sm">High</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-900">Kategori</p>
            <p className="mt-1 text-sm">Bug Report</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-900">Dibuat</p>
            <p className="mt-1 text-sm">28 Mar 2026 10:30 WIB</p>
          </div>
        </div>
      ),
    },
  }

  // Example 2: User Profile
  const userProfileData = {
    header: {
      id: 'USR-001',
      type: 'Administrator',
      status: { label: 'Active', variant: 'success' },
    },
    title: 'Fatih Rahman',
    rows: [
      { label: 'Email', value: 'fatih@example.com', variant: 'default' },
      { label: 'Phone', value: '+62 812 3456 7890', variant: 'default' },
      { label: 'Department', value: 'IT Support', variant: 'default' },
    ],
    metadata: {
      date: '15 Jan 2026',
      time: '09:00 WIB',
    },
    onEdit: (isEditing) => console.log('User edit:', isEditing),
    expandableContent: {
      title: 'Informasi Lanjut',
      content: (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-slate-900">Terakhir Login</p>
            <p className="mt-1 text-sm">30 Mar 2026 13:52 WIB</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-900">Verifikasi Email</p>
            <p className="mt-1 text-sm">✓ Verified</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-900">2FA Status</p>
            <p className="mt-1 text-sm">Enabled</p>
          </div>
        </div>
      ),
    },
  }

  // Example 3: Order
  const orderData = {
    header: {
      id: 'ORD-2026-0521',
      type: 'Physical Goods',
      status: { label: 'Shipped', variant: 'warning' },
    },
    title: 'Gaming Laptop Bundle',
    rows: [
      { label: 'Customer', value: 'John Doe', variant: 'default' },
      { label: 'Amount', value: 'Rp 25.000.000', variant: 'default' },
      { label: 'Tracking', value: 'SHP123456', variant: 'default' },
    ],
    metadata: {
      date: '29 Mar 2026',
      time: '14:30 WIB',
    },
    actions: [
      {
        label: 'View Tracking',
        onClick: () => alert('Opening tracking page'),
        variant: 'default',
      },
      {
        label: 'Cancel',
        onClick: () => alert('Cancel order'),
        variant: 'danger',
      },
    ],
    expandableContent: {
      title: 'Detail Pengiriman',
      content: (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-slate-900">Kurir</p>
            <p className="mt-1 text-sm">JNE Express</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-900">Estimasi Tiba</p>
            <p className="mt-1 text-sm">2-3 hari kerja</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-900">Alamat Tujuan</p>
            <p className="mt-1 text-sm">Jl. Example No. 123, Jakarta</p>
          </div>
        </div>
      ),
    },
  }

  // Example 4: Project Task
  const taskData = {
    header: {
      id: 'TSK-145',
      type: 'Development',
      status: { label: 'In Progress', variant: 'default' },
    },
    title: 'Implement user authentication',
    rows: [
      { label: 'Assignee', value: 'Sarah Chen', variant: 'default' },
      { label: 'Priority', value: 'High', variant: 'default' },
      { label: 'Progress', value: '75%', variant: 'default' },
    ],
    metadata: {
      date: '25 Mar 2026',
      time: '08:00 WIB',
    },
    onEdit: (isEditing) => console.log('Task edit:', isEditing),
    expandableContent: {
      title: 'Deskripsi Task',
      content: (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-slate-900">Sprint</p>
            <p className="mt-1 text-sm">Sprint 24 (Mar 24 - Apr 7)</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-900">Target Selesai</p>
            <p className="mt-1 text-sm">2 Apr 2026</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-900">Reviewer</p>
            <p className="mt-1 text-sm">Mike Johnson</p>
          </div>
        </div>
      ),
    },
  }

  const examplesMap = {
    ticket: { label: 'Ticket', data: ticketData },
    user: { label: 'User Profile', data: userProfileData },
    order: { label: 'Order', data: orderData },
    task: { label: 'Task', data: taskData },
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">DetailCard Examples</h1>
          <p className="mt-2 text-slate-300">
            Responsive mobile card component showcase
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-2 justify-center">
          {Object.entries(examplesMap).map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`rounded-lg px-4 py-2 font-medium transition-colors ${
                activeTab === key
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex justify-center">
          <DetailCard {...examplesMap[activeTab].data} />
        </div>

        {/* Code Info */}
        <div className="mt-12 rounded-lg bg-slate-800 p-6 text-slate-200">
          <h2 className="mb-4 text-lg font-semibold text-white">
            📝 Props Documentation
          </h2>
          <div className="space-y-3 text-sm">
            <p>
              <span className="font-semibold text-blue-400">header</span> - Object
              dengan id, type, status (label & variant)
            </p>
            <p>
              <span className="font-semibold text-blue-400">title</span> - String,
              judul utama card
            </p>
            <p>
              <span className="font-semibold text-blue-400">rows</span> - Array of
              objects dengan label, value, variant
            </p>
            <p>
              <span className="font-semibold text-blue-400">metadata</span> - Object
              dengan date dan time
            </p>
            <p>
              <span className="font-semibold text-blue-400">onEdit</span> - Function,
              callback saat edit button diklik
            </p>
            <p>
              <span className="font-semibold text-blue-400">actions</span> - Array of
              buttons dengan label, onClick, variant
            </p>
            <p>
              <span className="font-semibold text-blue-400">
                expandableContent
              </span>{' '}
              - JSX atau object dengan title & content
            </p>
          </div>
        </div>

        {/* Variant Info */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Status: Danger', variant: 'danger', color: 'bg-red-500' },
            {
              label: 'Status: Success',
              variant: 'success',
              color: 'bg-green-500',
            },
            {
              label: 'Status: Warning',
              variant: 'warning',
              color: 'bg-yellow-500',
            },
            {
              label: 'Status: Default',
              variant: 'default',
              color: 'bg-blue-500',
            },
          ].map((item) => (
            <div
              key={item.variant}
              className="rounded-lg bg-slate-800 p-4 text-center"
            >
              <div className={`mb-2 inline-block h-3 w-3 rounded-full ${item.color}`} />
              <p className="text-sm font-medium text-slate-200">{item.label}</p>
            </div>
          ))}
        </div>

        {/* Features */}
        <div className="mt-12 rounded-lg bg-slate-800 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">✨ Features</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex gap-3">
              <span className="text-lg">📱</span>
              <div>
                <p className="font-semibold text-white">Fully Responsive</p>
                <p className="text-sm text-slate-400">
                  Dioptimalkan untuk mobile, tablet, dan desktop
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-lg">🎨</span>
              <div>
                <p className="font-semibold text-white">Customizable</p>
                <p className="text-sm text-slate-400">
                  Props-based design untuk fleksibilitas maksimal
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-lg">⚡</span>
              <div>
                <p className="font-semibold text-white">Lightweight</p>
                <p className="text-sm text-slate-400">
                  Menggunakan React hooks, tanpa dependencies tambahan
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-lg">♿</span>
              <div>
                <p className="font-semibold text-white">Accessible</p>
                <p className="text-sm text-slate-400">
                  ARIA labels dan semantic HTML
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
