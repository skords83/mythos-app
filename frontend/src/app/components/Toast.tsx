'use client'

import { useEffect } from 'react'
import { AlertCircle, X } from 'lucide-react'
import { RADIUS, CARD_SHADOW } from '@/lib/theme'

interface ToastProps {
  message: string | null
  onDismiss: () => void
}

export function Toast({ message, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(onDismiss, 5000)
    return () => clearTimeout(timer)
  }, [message, onDismiss])

  if (!message) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] animate-fade-in">
      <div className={`flex items-center gap-3 bg-red-600 text-white ${RADIUS} ${CARD_SHADOW} px-4 py-3 max-w-md`}>
        <AlertCircle size={18} className="flex-shrink-0" />
        <p className="text-sm">{message}</p>
        <button onClick={onDismiss} className="flex-shrink-0 opacity-80 hover:opacity-100">
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
