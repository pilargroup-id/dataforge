import { useState } from 'react'

/**
 * DetailCard Component - Responsive mobile card untuk menampilkan detail item
 * 
 * Props:
 * - header: { id, type, status: { label, variant } }
 * - title: string
 * - rows: array of { label, value, variant }
 * - metadata: { date, time }
 * - onEdit: callback function
 * - expandableContent: JSX atau { title, content }
 * - actions: array of { label, onClick, variant }
 */
export default function DetailCard({
  header = {},
  title = '',
  rows = [],
  metadata = {},
  onEdit = null,
  expandableContent = null,
  actions = [],
  className = '',
}) {
  const [isEditing, setIsEditing] = useState(false)

  const {
    id = 'ID-001',
    type = 'Type',
    status = { label: 'Active', variant: 'default' },
  } = header

  const statusColors = {
    danger: {
      bg: 'bg-red-50',
      text: 'text-red-600',
      dot: 'bg-red-500',
    },
    success: {
      bg: 'bg-green-50',
      text: 'text-green-600',
      dot: 'bg-green-500',
    },
    warning: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-600',
      dot: 'bg-yellow-500',
    },
    default: {
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      dot: 'bg-blue-500',
    },
  }

  const statusStyle = statusColors[status.variant] || statusColors.default

  const handleEdit = () => {
    setIsEditing(!isEditing)
    onEdit?.(!isEditing)
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 ${className}`}>
      <div className="mx-auto max-w-md">
        {/* Main Card */}
        <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-200">
          {/* Header Section */}
          {(id || type || status) && (
            <div className="border-b border-slate-200 px-4 py-3 sm:px-6">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex-1">
                  {id && (
                    <h2 className="text-lg font-semibold text-slate-900">{id}</h2>
                  )}
                  {type && (
                    <p className="mt-1 text-sm text-slate-500">{type}</p>
                  )}
                </div>
                {onEdit && (
                  <button
                    onClick={handleEdit}
                    className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 active:bg-slate-300"
                    aria-label="Edit"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Edit
                  </button>
                )}
              </div>

              {/* Status Badge */}
              {status.label && (
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full ${statusStyle.bg} px-2.5 py-1 text-xs font-medium ${statusStyle.text}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
                    {status.label}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Title Section */}
          {title && (
            <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
              <h3 className="text-base font-medium text-slate-900">{title}</h3>
            </div>
          )}

          {/* Content Grid */}
          {rows.length > 0 && (
            <div className={`grid divide-x divide-slate-200`} style={{ gridTemplateColumns: `repeat(${rows.length}, 1fr)` }}>
              {rows.map((row, index) => (
                <div key={index} className="px-4 py-4 sm:px-6">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    {row.icon ? (
                      row.icon
                    ) : (
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    )}
                    {row.label}
                  </p>
                  <p
                    className={`mt-2 text-sm font-semibold ${
                      row.variant === 'muted'
                        ? 'text-slate-400'
                        : 'text-slate-900'
                    }`}
                  >
                    {row.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Metadata Footer */}
          {(metadata.date || metadata.time) && (
            <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
              <div className="flex items-center justify-between text-xs text-slate-600 flex-wrap gap-2">
                {metadata.date && (
                  <div className="flex items-center gap-1.5">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    {metadata.date}
                  </div>
                )}
                {metadata.time && (
                  <div className="flex items-center gap-1.5">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {metadata.time}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          {actions.length > 0 && (
            <div className="border-t border-slate-200 px-4 py-3 sm:px-6">
              <div className="flex gap-2 flex-wrap">
                {actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.onClick}
                    className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      action.variant === 'danger'
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : action.variant === 'success'
                        ? 'bg-green-50 text-green-600 hover:bg-green-100'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Edit Mode Notice */}
        {isEditing && (
          <div className="mt-4 rounded-lg bg-blue-50 p-4 text-sm text-blue-800 ring-1 ring-blue-200">
            Mode edit diaktifkan. Silakan edit informasi di atas.
          </div>
        )}

        {/* Expandable Content */}
        {expandableContent && (
          <div className="mt-6 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-200">
            <details className="group">
              <summary className="flex cursor-pointer items-center justify-between px-4 py-4 sm:px-6 hover:bg-slate-50">
                <span className="font-medium text-slate-900">
                  {typeof expandableContent === 'object' && expandableContent.title
                    ? expandableContent.title
                    : 'Informasi Tambahan'}
                </span>
                <svg
                  className="h-5 w-5 transition-transform group-open:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              </summary>
              <div className="border-t border-slate-200 px-4 py-4 text-sm text-slate-600 sm:px-6">
                {typeof expandableContent === 'object' && expandableContent.content
                  ? expandableContent.content
                  : expandableContent}
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Example Usage:
 * 
 * <DetailCard
 *   header={{
 *     id: 'TCK-252',
 *     type: 'Software - Lain-lain',
 *     status: { label: 'Void', variant: 'danger' }
 *   }}
 *   title="testing"
 *   rows={[
 *     { label: 'Requester', value: 'fatih', variant: 'default' },
 *     { label: 'Support', value: '-', variant: 'muted' }
 *   ]}
 *   metadata={{
 *     date: '30 Mar 2026',
 *     time: '13:52 WIB'
 *   }}
 *   onEdit={(isEditing) => console.log('Edit mode:', isEditing)}
 *   actions={[
 *     { label: 'Delete', onClick: () => alert('Deleted'), variant: 'danger' }
 *   ]}
 *   expandableContent={{
 *     title: 'Informasi Tambahan',
 *     content: (
 *       <>
 *         <p className="mb-3">
 *           <span className="font-medium text-slate-900">Dibuat:</span> 28 Mar 2026
 *         </p>
 *       </>
 *     )
 *   }}
 * />
 */
