import { Dropdown, TextField } from '../../components/forms'
import Upload from '../../components/forms/Upload.jsx'
import {
  Download,
  Eye,
  Pause,
  Play,
  RefreshCw05,
  XClose,
} from '../../components/layoute/TemplateIcons.jsx'

function CardUploadConvert({
  selectedKey,
  capabilityOptions,
  onConversionChange,
  isBatchMode,
  folderName,
  onFolderNameChange,
  templateOptions,
  templateCode,
  onTemplateCodeChange,
  uploadResetKey,
  onFilesChange,
  formError,
  submitting,
  currentBatch,
  downloading,
  onDownload,
  resultRef,
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
  return (
    <div className="convert-page__panel">
      <div className="convert-page__config">
        <Dropdown
          label="Jenis Konversi"
          value={selectedKey}
          options={capabilityOptions}
          required
          onChange={onConversionChange}
        />

        {isBatchMode ? (
          <TextField
            label="Nama Folder / Batch"
            placeholder="Contoh: Marketplace Agustus"
            value={folderName}
            required
            onChange={(event) => onFolderNameChange(event.target.value)}
          />
        ) : null}

        {templateOptions.length > 0 ? (
          <Dropdown
            label="Template"
            value={templateCode}
            options={templateOptions}
            placeholder="Gunakan template default"
            onChange={onTemplateCodeChange}
          />
        ) : null}
      </div>

      <Upload
        key={`${selectedKey}-${uploadResetKey}`}
        label="Dokumen"
        accept=".xls,.xlsx"
        multiple={isBatchMode}
        helperText={
          isBatchMode
            ? 'Pilih seluruh file XLS/XLSX dalam satu folder, maksimal 20 file. Format: .xls / .xlsx'
            : 'Pilih 1 file XLS/XLSX. Format: .xls / .xlsx'
        }
        onFilesChange={onFilesChange}
      />

      {formError ? <p className="convert-page__error">{formError}</p> : null}

      <div className="convert-page__actionbar">
        <div className="convert-page__actionbar-buttons">
          <button type="submit" className="users-table-card__action" disabled={submitting}>
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
      </div>
    </div>
  )
}

export default CardUploadConvert
