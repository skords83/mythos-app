'use client'

import { ChapterDraft } from '@/lib/chapterDraftStore'

interface DraftRecoveryBannerProps {
  draft: ChapterDraft
  onRestore: () => void
  onDiscard: () => void
}

export function DraftRecoveryBanner({ draft, onRestore, onDiscard }: DraftRecoveryBannerProps) {
  const formattedTime = new Date(draft.updatedAt).toLocaleString('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return (
    <div className="mb-6 flex items-center justify-between gap-4 rounded-none border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
      <span>Ungesicherter lokaler Entwurf vom {formattedTime} gefunden.</span>
      <div className="flex shrink-0 gap-2">
        <button
          onClick={onRestore}
          className="rounded-none bg-amber-600 px-3 py-1 text-white transition-colors hover:bg-amber-700"
        >
          Wiederherstellen
        </button>
        <button
          onClick={onDiscard}
          className="rounded-none border border-amber-400 px-3 py-1 transition-colors hover:bg-amber-100 dark:hover:bg-amber-900"
        >
          Verwerfen
        </button>
      </div>
    </div>
  )
}
