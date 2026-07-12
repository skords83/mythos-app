'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

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
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5] dark:bg-[#1A1A1B]">
      <div className="bg-white dark:bg-[#262626] rounded-lg shadow p-8 max-w-md text-center">
        <h2 className="text-lg font-semibold mb-2">Etwas ist schiefgelaufen</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Der Fehler wurde protokolliert. Versuche es erneut.
        </p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          Erneut versuchen
        </button>
      </div>
    </div>
  )
}
