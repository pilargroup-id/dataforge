import DialogCancel from '../../components/Dialog/dialog-convert/DialogCancel.jsx'
import CardUploadConvert from './CardUploadConvert.jsx'
import CardViewConvert from './CardViewConvert.jsx'
import DataTableHistory from './DataTableHistory.jsx'
import { HISTORY_PAGE_SIZE_OPTIONS } from './convert.service.js'
import useConvertWorkspace from './useConvertWorkspace.js'

function ConvertWorkspace({ targetFormat, activePage }) {
  const workspace = useConvertWorkspace(targetFormat)

  return (
    <section className="dashboard-panel users-table-card convert-page" aria-label={activePage.title}>
      <div className="users-table-card__header">
        <div>
          <p className="dashboard-panel__eyebrow">{activePage.eyebrow}</p>
          <h1 className="dashboard-panel__title">{activePage.title}</h1>
        </div>
      </div>

      <form className="convert-page__body" onSubmit={workspace.handleSubmit}>
        {workspace.capabilitiesLoading ? (
          <p className="convert-page__hint">Memuat jenis konversi yang tersedia...</p>
        ) : workspace.capabilitiesError ? (
          <p className="convert-page__error">{workspace.capabilitiesError}</p>
        ) : workspace.allowedCapabilities.length === 0 ? (
          <p className="convert-page__hint">
            Anda belum memiliki akses ke modul convert manapun. Hubungi admin IT untuk permintaan akses.
          </p>
        ) : (
          <div className="convert-page__grid">
            <CardUploadConvert
              selectedKey={workspace.selectedKey}
              capabilityOptions={workspace.capabilityOptions}
              onConversionChange={workspace.handleConversionChange}
              isBatchMode={workspace.isBatchMode}
              folderName={workspace.folderName}
              onFolderNameChange={workspace.setFolderName}
              templateOptions={workspace.templateOptions}
              templateCode={workspace.templateCode}
              onTemplateCodeChange={workspace.onTemplateCodeChange}
              requiresBranchCode={workspace.requiresBranchCode}
              branchCode={workspace.branchCode}
              onBranchCodeChange={workspace.setBranchCode}
              branchCodeOptions={workspace.branchCodeOptions}
              uploadResetKey={workspace.uploadResetKey}
              onFilesChange={workspace.handleFilesChange}
              formError={workspace.formError}
            />

            <CardViewConvert
              targetFormat={targetFormat}
              resultRef={workspace.resultRef}
              currentBatch={workspace.currentBatch}
              historyMeta={workspace.historyMeta}
              progressPercent={workspace.progressPercent}
              statusTone={workspace.statusTone}
              activeStepIndex={workspace.activeStepIndex}
              stepperFillPercent={workspace.stepperFillPercent}
              isDangerStep={workspace.isDangerStep}
              progressHeading={workspace.progressHeading}
              validationErrors={workspace.validationErrors}
              resultSummary={workspace.resultSummary}
              submitting={workspace.submitting}
              downloading={workspace.downloading}
              onDownload={workspace.handleDownload}
              canPause={workspace.canPause}
              canContinue={workspace.canContinue}
              canCancel={workspace.canCancel}
              pausing={workspace.pausing}
              continuing={workspace.continuing}
              cancelling={workspace.cancelling}
              onPause={workspace.handlePause}
              onContinue={workspace.handleContinue}
              onCancel={workspace.handleCancel}
            />
          </div>
        )}
      </form>

      <DataTableHistory
        batches={workspace.historyBatches}
        loading={workspace.historyLoading}
        error={workspace.historyError}
        page={workspace.historyPage}
        pageSize={workspace.historyPageSize}
        pageSizeOptions={HISTORY_PAGE_SIZE_OPTIONS}
        meta={workspace.historyMeta}
        onPageChange={workspace.setHistoryPage}
        onPageSizeChange={workspace.handleHistoryPageSizeChange}
        onRowClick={workspace.handleHistoryRowClick}
        onView={workspace.handleViewBatch}
        onDownload={workspace.handleHistoryDownload}
        downloadingId={workspace.downloadingHistoryId}
        openingId={workspace.openingHistoryId}
      />

      <DialogCancel
        isOpen={workspace.cancelDialogOpen}
        onClose={workspace.handleCancelDialogClose}
        onConfirm={workspace.handleCancelConfirm}
        loading={workspace.cancelling}
      />
    </section>
  )
}

export default ConvertWorkspace
