'use client'

import { AlertTriangle } from 'lucide-react'

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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] animate-fade-in">
      <div className="bg-white dark:bg-[#262626] rounded-xl shadow-xl p-6 w-full max-w-sm">
        <div className="flex items-start gap-3 mb-4">
          {danger && (
            <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={22} />
          )}
          <div>
            <h2 className="text-lg font-serif font-bold text-gray-900 dark:text-gray-100">
              {title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {message}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 rounded-lg text-white transition-colors ${
              danger ? 'bg-red-500 hover:bg-red-600' : 'bg-[#4A7C59] hover:bg-[#3d6349]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
