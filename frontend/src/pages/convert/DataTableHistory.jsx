import { useMemo } from 'react'

import { Download, Eye } from '../../components/layoute/TemplateIcons.jsx'
import DataTableAction from '../../components/table/DataTableAction.jsx'
import {
  PROGRESS_STEPS,
  STATUS_LABELS,
  TERMINAL_DANGER_STATUSES,
  formatHistoryDate,
  getActiveStepIndex,
  getHistoryStatusVariant,
} from './convert.service.js'

export function TimelineProcessCell({ batch }) {
  const activeStepIndex = getActiveStepIndex(batch.status)
  const isDanger = TERMINAL_DANGER_STATUSES.includes(batch.status)
  const fillPercent = (activeStepIndex / (PROGRESS_STEPS.length - 1)) * 100
  const processed = batch.processed_input_files ?? 0
  const total = batch.total_input_files ?? 0

  return (
    <div className="convert-page__history-timeline">
      <div className="convert-page__history-timeline-track">
        <div
          className={`convert-page__history-timeline-fill${isDanger ? ' is-danger' : ''}`}
          style={{ width: `${fillPercent}%` }}
        />
        {PROGRESS_STEPS.map((step, index) => (
          <span
            key={step}
            className={[
              'convert-page__history-timeline-dot',
              index < activeStepIndex ? 'is-complete' : '',
              index === activeStepIndex ? 'is-current' : '',
              index === activeStepIndex && isDanger ? 'is-danger' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            title={step}
          />
        ))}
      </div>
      <div className="convert-page__history-timeline-meta">
        <span className="convert-page__history-timeline-step">
          {PROGRESS_STEPS[activeStepIndex] ?? PROGRESS_STEPS[0]}
        </span>
        <span className="convert-page__history-timeline-count">
          {processed}/{total} file
        </span>
      </div>
    </div>
  )
}

function DataTableHistory({
  batches,
  loading,
  error,
  page,
  pageSize,
  pageSizeOptions,
  meta,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  onView,
  onDownload,
  downloadingId,
  openingId,
}) {
  const columns = useMemo(
    () => [
      {
        key: 'batch',
        header: 'Batch',
        type: 'identity',
        accessor: 'batch_name',
        title: (row) => row.batch_name || row.original_folder_name || 'Batch',
        subtitle: (row) =>
          `${row.source_format} → ${row.target_format} · ${row.total_input_files ?? 0} file`,
      },
      {
        key: 'created_at',
        header: 'Tanggal',
        nowrap: true,
        render: (row) => formatHistoryDate(row.created_at),
      },
      {
        key: 'created_by',
        header: 'Created By',
        nowrap: true,
        render: (row) => row.created_by_name || '-',
      },
      {
        key: 'timeline',
        header: 'Timeline Proses',
        minWidth: 180,
        render: (row) => <TimelineProcessCell batch={row} />,
      },
      {
        key: 'status',
        header: 'Status',
        type: 'status',
        accessor: 'status',
        variant: (row) => getHistoryStatusVariant(row.status),
        format: (value) => STATUS_LABELS[value] ?? value,
      },
    ],
    [],
  )

  const actions = useMemo(
    () => [
      {
        key: 'view',
        label: 'Buka file',
        icon: Eye,
        className: 'convert-page__row-action convert-page__row-action--view',
        disabled: (row) => openingId === row.id,
        onClick: (row) => onView(row),
      },
      {
        key: 'download',
        label: 'Download',
        icon: Download,
        className: 'convert-page__row-action convert-page__row-action--download',
        disabled: (row) =>
          row.status !== 'COMPLETED' || !row.download_available || downloadingId === row.id,
        onClick: (row) => onDownload(row),
      },
    ],
    [downloadingId, openingId, onView, onDownload],
  )

  const totalPages = Math.max(1, meta.totalPages ?? 1)

  const pagination = useMemo(
    () => ({
      currentPage: page,
      totalPages,
      pageSize,
      pageSizeOptions,
      pageSizeLabel: 'Tampilkan',
      pageSizeSuffix: 'baris',
      previousLabel: 'Sebelumnya',
      nextLabel: 'Berikutnya',
      ariaLabel: 'Invoice history pagination',
      summary: `${batches.length === 0 ? 0 : (page - 1) * pageSize + 1}-${Math.min(
        page * pageSize,
        meta.total ?? 0,
      )} dari ${meta.total ?? 0} batch`,
      onPrevious: () => onPageChange(Math.max(1, page - 1)),
      onNext: () => onPageChange(Math.min(totalPages, page + 1)),
      onSelect: (nextPage) => onPageChange(nextPage),
      onPageSizeChange,
    }),
    [page, pageSize, pageSizeOptions, meta, batches.length, totalPages, onPageChange, onPageSizeChange],
  )

  return (
    <div className="convert-page__history">
      <div className="convert-page__history-header">
        <div>
          <p className="dashboard-panel__eyebrow">Riwayat</p>
          <h2 className="convert-page__history-title">Invoice History</h2>
        </div>
      </div>

      {error ? <p className="convert-page__error">{error}</p> : null}

      <DataTableAction
        rows={batches}
        columns={columns}
        actions={actions}
        getRowId={(row) => row.id}
        tableLabel="Invoice history table"
        emptyMessage={loading ? 'Memuat riwayat konversi...' : 'Belum ada riwayat konversi.'}
        pagination={pagination}
        onRowClick={onRowClick}
      />
    </div>
  )
}

export default DataTableHistory
