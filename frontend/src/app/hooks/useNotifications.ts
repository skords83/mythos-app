import { useState } from 'react'

export interface ConfirmDialogState {
  title: string
  message: string
  onConfirm: () => void
}

export function useNotifications() {
  const [errorToast, setErrorToast] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null)

  const showError = (message: string) => setErrorToast(message)
  const requestConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({ title, message, onConfirm })
  }

  return {
    errorToast,
    setErrorToast,
    confirmDialog,
    setConfirmDialog,
    showError,
    requestConfirm,
  }
}
