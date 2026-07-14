'use client'

import { AlertTriangle } from 'lucide-react'
import { MODAL_PANEL, RADIUS, BUTTON_SECONDARY, ACCENT, TEXT_PRIMARY, TEXT_SECONDARY } from '@/lib/theme'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Löschen',
  cancelLabel = 'Abbrechen',
  danger = true,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-zinc-950/60 flex items-center justify-center z-[60] animate-fade-in">
      <div className={`${MODAL_PANEL} p-6 w-full max-w-sm`}>
        <div className="flex items-start gap-3 mb-4">
          {danger && (
            <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={22} />
          )}
          <div>
            <h2 className={`text-lg font-serif font-bold ${TEXT_PRIMARY}`}>
              {title}
            </h2>
            <p className={`text-sm ${TEXT_SECONDARY} mt-1`}>
              {message}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className={`flex-1 px-4 py-2 ${BUTTON_SECONDARY} ${RADIUS}`}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 ${RADIUS} text-white transition-colors ${
              danger ? 'bg-red-500 hover:bg-red-600' : ACCENT
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
