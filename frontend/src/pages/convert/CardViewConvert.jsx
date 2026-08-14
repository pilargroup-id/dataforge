import { Chart01, FileText01 } from '../../components/layoute/TemplateIcons.jsx'
import { PROGRESS_STEPS } from './convert.service.js'

function CardViewConvert({
  resultRef,
  currentBatch,
  historyMeta,
  progressPercent,
  statusTone,
  activeStepIndex,
  stepperFillPercent,
  isDangerStep,
  progressHeading,
  validationErrors,
  resultSummary,
}) {
  const ResultIcon = resultSummary.icon

  return (
    <aside className="convert-page__panel convert-page__panel--status" ref={resultRef}>
      <div className="convert-page__stats">
        <div className="convert-page__stat">
          <span className="convert-page__stat-icon">
            <FileText01 size={18} aria-hidden="true" />
          </span>
          <div className="convert-page__stat-copy">
            <p className="convert-page__stat-label">Batch Saat Ini</p>
            <p className="convert-page__stat-value">{currentBatch?.batch_name ?? '-'}</p>
          </div>
        </div>
        <div className="convert-page__stat">
          <span className="convert-page__stat-icon">
            <Chart01 size={18} aria-hidden="true" />
          </span>
          <div className="convert-page__stat-copy">
            <p className="convert-page__stat-label">Total Diproses</p>
            <p className="convert-page__stat-value">{historyMeta.total ?? '-'}</p>
          </div>
        </div>
      </div>

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
          {!currentBatch ? (
            <ul className="convert-page__hints">
              <li>Setiap baris pada file akan dibuat menjadi satu dokumen.</li>
              <li>Pastikan header kolom sesuai dengan template yang dipilih.</li>
              <li>Hasil konversi akan dikemas dalam satu file ZIP sesuai nama batch.</li>
            </ul>
          ) : currentBatch.status === 'REJECTED' || currentBatch.status === 'FAILED' ? (
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
    </aside>
  )
}

export default CardViewConvert
