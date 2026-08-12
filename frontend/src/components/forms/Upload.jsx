import { useId, useState } from 'react'

import { Upload as UploadIcon } from '../layoute/TemplateIcons.jsx'

function formatFileList(files) {
  return Array.from(files ?? []).map((file) => file.name)
}

function Upload({
  id,
  label,
  helperText = 'PNG, JPG, PDF, DOCX maksimal sesuai validasi backend.',
  error,
  className = '',
  accept,
  multiple = false,
  disabled = false,
  required = false,
  onChange,
  onFilesChange,
  ...props
}) {
  const generatedId = useId()
  const inputId = id ?? `upload-${generatedId}`
  const [isDragActive, setIsDragActive] = useState(false)
  const [fileNames, setFileNames] = useState([])
  const message = typeof error === 'string' ? error : helperText
  const messageId = message ? `${inputId}-message` : undefined
  const hasError = Boolean(error)

  const updateFiles = (files) => {
    setFileNames(formatFileList(files))
    onFilesChange?.(multiple ? Array.from(files ?? []) : files?.[0] ?? null)
  }

  const handleChange = (event) => {
    updateFiles(event.target.files)
    onChange?.(event)
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDragActive(false)

    if (disabled) {
      return
    }

    updateFiles(event.dataTransfer.files)
  }

  const wrapperClassName = [
    'form-upload',
    isDragActive ? 'form-upload--drag-active' : '',
    hasError ? 'form-upload--error' : '',
    disabled ? 'form-upload--disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={wrapperClassName}>
      {label ? (
        <div className="form-control__label">
          <span>{label}</span>
          {required ? <span className="form-control__required">*</span> : null}
        </div>
      ) : null}

      <label
        className="form-upload__dropzone"
        htmlFor={inputId}
        onDragEnter={(event) => {
          event.preventDefault()
          setIsDragActive(true)
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={handleDrop}
      >
        <input
          id={inputId}
          className="form-upload__input"
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          required={required}
          aria-invalid={hasError || undefined}
          aria-describedby={messageId}
          onChange={handleChange}
          {...props}
        />
        <span className="form-upload__icon" aria-hidden="true">
          <UploadIcon size={22} />
        </span>
        <span className="form-upload__title">
          {fileNames.length > 0 ? fileNames.join(', ') : 'Pilih atau tarik file ke sini'}
        </span>
        <span className="form-upload__meta">{message}</span>
      </label>
    </div>
  )
}

export default Upload
