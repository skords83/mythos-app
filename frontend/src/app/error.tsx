'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { MODAL_PANEL, TEXT_PRIMARY, TEXT_MUTED, ACCENT, RADIUS, SURFACE } from '@/lib/theme'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className={`min-h-screen flex items-center justify-center ${SURFACE}`}>
      <div className={`${MODAL_PANEL} p-8 max-w-md text-center`}>
        <h2 className={`${TEXT_PRIMARY} text-lg font-semibold mb-2`}>Etwas ist schiefgelaufen</h2>
        <p className={`text-sm ${TEXT_MUTED} mb-4`}>
          Der Fehler wurde protokolliert. Versuche es erneut.
        </p>
        <button
          onClick={() => reset()}
          className={`px-4 py-2 ${ACCENT} text-white ${RADIUS}`}
        >
          Erneut versuchen
        </button>
      </div>
    </div>
  )
}
