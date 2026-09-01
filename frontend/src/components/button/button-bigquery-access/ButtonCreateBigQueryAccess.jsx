import { useState } from 'react'

import DialogBigQueryAccessForm from '../../Dialog/dialog-bigquery-access/DialogBigQueryAccessForm.jsx'

function ButtonCreateBigQueryAccess({
  children = 'Create',
  className = 'dashboard-popup__button dashboard-popup__button--primary',
  type = 'button',
  onClick,
  dialogProps = {},
  ...buttonProps
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleOpenDialog = (event) => {
    onClick?.(event)

    if (!event.defaultPrevented) {
      setIsDialogOpen(true)
    }
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
  }

  return (
    <>
      <button
        type={type}
        className={className}
        onClick={handleOpenDialog}
        aria-haspopup="dialog"
        aria-expanded={isDialogOpen}
        {...buttonProps}
      >
        {children}
      </button>

      <DialogBigQueryAccessForm
        {...dialogProps}
        mode="create"
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
      />
    </>
  )
}

export default ButtonCreateBigQueryAccess
