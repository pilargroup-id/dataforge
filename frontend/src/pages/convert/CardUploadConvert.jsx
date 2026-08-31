import { Dropdown, TextField } from '../../components/forms'
import Upload from '../../components/forms/Upload.jsx'
import { Chart01, FileText01 } from '../../components/layoute/TemplateIcons.jsx'

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
  currentBatch,
  historyMeta,
}) {
  return (
    <div className="convert-page__panel">
      <div className="convert-page__config">
        {capabilityOptions.length > 1 ? (
          <Dropdown
            label="Jenis Konversi"
            value={selectedKey}
            options={capabilityOptions}
            required
            onChange={onConversionChange}
          />
        ) : null}

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

        <div className="convert-page__stat-group">
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
    </div>
  )
}

export default CardUploadConvert
