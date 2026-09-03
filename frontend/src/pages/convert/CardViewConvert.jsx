import { useState } from 'react'

import {
  Download,
  Eye,
  Pause,
  Play,
  RefreshCw05,
  Upload,
  XClose,
} from '../../components/layoute/TemplateIcons.jsx'
import { PROGRESS_STEPS, formatPauseExpiry } from './convert.service.js'
import DialogUploadBigquery from './excel-to-jsonl/DialogUploadBigquery.jsx'

function CardViewConvert({
  targetFormat,
  resultRef,
  currentBatch,
  progressPercent,
  statusTone,
  activeStepIndex,
  stepperFillPercent,
  isDangerStep,
  progressHeading,
  validationErrors,
  resultSummary,
  submitting,
  downloading,
  onDownload,
  canPause,
  canContinue,
  canCancel,
  pausing,
  continuing,
  cancelling,
  onPause,
  onContinue,
  onCancel,
}) {
  const ResultIcon = resultSummary.icon
  const [isBigQueryDialogOpen, setBigQueryDialogOpen] = useState(false)
  const canUploadToBigQuery = targetFormat === 'JSONL'
  const bigQueryUploadDisabled =
    !currentBatch || currentBatch.status !== 'COMPLETED' || !currentBatch.download_available
  const hasSecondaryActions = canUploadToBigQuery || canPause || canContinue || canCancel

  return (
    <aside className="convert-page__panel convert-page__panel--status" ref={resultRef}>
      <div className="convert-page__progress-card">
        <div className="convert-page__progress-card-header">
          <p className="convert-page__progress-heading">{progressHeading}</p>
          <span className={`convert-page__pill convert-page__pill--${statusTone}`}>
            {progressPercent}%
          </span>
        </div>

        <div className="convert-page__stepper">
          <div className="convert-page__stepper-track">
            <div
              className={`convert-page__stepper-track-fill${isDangerStep ? ' is-danger' : ''}`}
              style={{ width: `${stepperFillPercent}%` }}
            />
            {PROGRESS_STEPS.map((step, index) => (
              <span
                key={step}
                className={[
                  'convert-page__stepper-dot',
                  index < activeStepIndex ? 'is-complete' : '',
                  index === activeStepIndex ? 'is-current' : '',
                  index === activeStepIndex && isDangerStep ? 'is-danger' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
            ))}
          </div>
          <div className="convert-page__stepper-labels">
            {PROGRESS_STEPS.map((step, index) => (
              <span key={step} className={index === activeStepIndex ? 'is-current' : ''}>
                {step}
              </span>
            ))}
          </div>
        </div>

        <div className="convert-page__progress-content">
          {!currentBatch ? null : currentBatch.status === 'REJECTED' || currentBatch.status === 'FAILED' ? (
            <div className="convert-page__validation">
              <p>{currentBatch.error_message || 'Batch gagal diproses.'}</p>
              {validationErrors?.invalid_files?.length > 0 ? (
                <ul>
                  {validationErrors.invalid_files.map((invalidFile) => (
                    <li key={invalidFile.file_name}>
                      <strong>{invalidFile.file_name}</strong>
                      {invalidFile.missing_headers?.length > 0
                        ? ` · kolom hilang: ${invalidFile.missing_headers.join(', ')}`
                        : ''}
                      {invalidFile.unexpected_headers?.length > 0
                        ? ` · kolom tak dikenal: ${invalidFile.unexpected_headers.join(', ')}`
                        : ''}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : (
            <p className="convert-page__hint">
              {currentBatch.source_format} → {currentBatch.target_format} ·{' '}
              {currentBatch.processed_input_files ?? 0}/{currentBatch.total_input_files ?? 0} file
              diproses
              {currentBatch.status === 'PAUSED' && formatPauseExpiry(currentBatch.pause_expires_in_seconds)
                ? ` · sisa waktu ${formatPauseExpiry(currentBatch.pause_expires_in_seconds)} sebelum data dihapus`
                : ''}
            </p>
          )}
        </div>
      </div>

      <div className={`convert-page__result-summary convert-page__result-summary--${resultSummary.tone}`}>
        <span className="convert-page__result-summary-icon">
          <ResultIcon
            size={18}
            aria-hidden="true"
            className={resultSummary.spin ? 'convert-page__spin' : ''}
          />
        </span>
        <div>
          <p className="convert-page__result-summary-title">{resultSummary.title}</p>
          <span className="convert-page__result-summary-subtitle">{resultSummary.subtitle}</span>
        </div>
      </div>

      <div className="convert-page__actionbar">
        <div className="convert-page__actionbar-buttons convert-page__actionbar-buttons--primary">
          <button
            type="submit"
            className="convert-page__btn convert-page__btn--primary"
            disabled={submitting}
          >
            <RefreshCw05
              size={18}
              aria-hidden="true"
              className={submitting ? 'convert-page__spin' : ''}
            />
            {submitting ? 'Mengunggah...' : 'Convert'}
          </button>

          <button
            type="button"
            className="convert-page__btn convert-page__btn--outline"
            onClick={onDownload}
            disabled={
              !currentBatch ||
              currentBatch.status !== 'COMPLETED' ||
              !currentBatch.download_available ||
              downloading
            }
          >
            <Download size={18} aria-hidden="true" />
            {downloading ? 'Mengunduh...' : 'Download'}
          </button>

          <button
            type="button"
            className="convert-page__btn convert-page__btn--outline"
            onClick={() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            disabled={!currentBatch}
          >
            <Eye size={18} aria-hidden="true" />
            Output
          </button>
        </div>

        {hasSecondaryActions ? (
          <div className="convert-page__actionbar-buttons convert-page__actionbar-buttons--secondary">
            {canUploadToBigQuery ? (
              <button
                type="button"
                className="convert-page__btn convert-page__btn--outline"
                onClick={() => setBigQueryDialogOpen(true)}
                disabled={bigQueryUploadDisabled}
              >
                <Upload size={18} aria-hidden="true" />
                Upload BQ
              </button>
            ) : null}

            {canPause ? (
              <button
                type="button"
                className="convert-page__btn convert-page__btn--outline"
                onClick={onPause}
                disabled={pausing}
              >
                <Pause size={18} aria-hidden="true" />
                {pausing ? 'Menjeda...' : 'Pause'}
              </button>
            ) : null}

            {canContinue ? (
              <button
                type="button"
                className="convert-page__btn convert-page__btn--outline"
                onClick={onContinue}
                disabled={continuing}
              >
                <Play size={18} aria-hidden="true" />
                {continuing ? 'Melanjutkan...' : 'Lanjutkan'}
              </button>
            ) : null}

            {canCancel ? (
              <button
                type="button"
                className="convert-page__btn convert-page__btn--outline convert-page__btn--danger"
                onClick={onCancel}
                disabled={cancelling}
              >
                <XClose size={18} aria-hidden="true" />
                {cancelling ? 'Membatalkan...' : 'Batalkan'}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {canUploadToBigQuery ? (
        <DialogUploadBigquery
          isOpen={isBigQueryDialogOpen}
          batch={currentBatch}
          onClose={() => setBigQueryDialogOpen(false)}
        />
      ) : null}
    </aside>
  )
}

export default CardViewConvert
