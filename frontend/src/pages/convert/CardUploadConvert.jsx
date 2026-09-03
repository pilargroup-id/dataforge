import { Dropdown, TextField } from '../../components/forms'
import Upload from '../../components/forms/Upload.jsx'

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
  requiresBranchCode,
  branchCode,
  onBranchCodeChange,
  branchCodeOptions,
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

        {requiresBranchCode ? (
          <Dropdown
            label="BranchCode"
            value={branchCode}
            options={branchCodeOptions}
            placeholder="Pilih BranchCode"
            required
            onChange={onBranchCodeChange}
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

      <div className="convert-page__meta-row">
        <div className="convert-page__meta-item">
          <span className="convert-page__meta-label">Batch Saat Ini</span>
          <span className="convert-page__meta-value" title={currentBatch?.batch_name ?? undefined}>
            {currentBatch?.batch_name ?? '-'}
          </span>
        </div>

        <div className="convert-page__meta-item">
          <span className="convert-page__meta-label">Total Diproses</span>
          <span className="convert-page__meta-value">{historyMeta?.total ?? '-'}</span>
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
