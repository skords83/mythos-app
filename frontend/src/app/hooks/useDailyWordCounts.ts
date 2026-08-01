import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DailyWordCountEntry } from '@/lib/activityStats'

interface UseDailyWordCountsArgs {
  projectId: string | null
}

// C11: loads a project's historical daily word-count log (for the activity
// heatmap/streaks) and upserts today's value. Deliberately separate from
// useProjects' rolloverDailyWordCount, which only tracks a single-day
// baseline for the "today" progress ring, not the append-only history.
export function useDailyWordCounts({ projectId }: UseDailyWordCountsArgs) {
  const router = useRouter()
  const [entries, setEntries] = useState<DailyWordCountEntry[]>([])

  const loadEntries = useCallback(
    async (id: string) => {
      try {
        const response = await fetch(`/api/daily-word-counts?projectId=${id}&days=365`)
        if (response.status === 401) {
          router.push('/login')
          return
        }
        if (!response.ok) return
        const data = await response.json()
        setEntries(data)
      } catch (error) {
        console.error('Error loading daily word counts:', error)
      }
    },
    [router]
  )

  useEffect(() => {
    if (projectId) {
      loadEntries(projectId)
    } else {
      setEntries([])
    }
  }, [projectId, loadEntries])

  const recordWordCount = useCallback(async (id: string, date: string, wordCount: number) => {
    try {
      const response = await fetch('/api/daily-word-counts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: id, date, wordCount }),
      })
      if (!response.ok) return
      const updated = await response.json()
      setEntries((prev) => {
        const idx = prev.findIndex((e) => e.date === updated.date)
        if (idx === -1) {
          return [...prev, { date: updated.date, wordCount: updated.wordCount }].sort((a, b) => a.date.localeCompare(b.date))
        }
        const next = [...prev]
        next[idx] = { date: updated.date, wordCount: updated.wordCount }
        return next
      })
    } catch (error) {
      console.error('Error recording daily word count:', error)
    }
  }, [])

  return { entries, recordWordCount }
}
