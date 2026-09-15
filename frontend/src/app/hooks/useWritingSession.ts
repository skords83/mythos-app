import { useCallback, useEffect, useRef } from 'react'
import { htmlToText } from '@/lib/text'

const count = (text: string) => htmlToText(text).split(/\s+/).filter(Boolean).length
interface Session {
  id: string
  date: string
  activeMs: number
  words: number
  last: number
  projectId: string
  paused: boolean
}

export function useWritingSession(projectId: string | undefined, chapterId: string | undefined, onError: (message: string) => void) {
  const session = useRef<Session | null>(null)
  const queue = useRef(Promise.resolve())
  const errorRef = useRef(onError)
  errorRef.current = onError
  const flush = useCallback(() => {
    const s = session.current
    if (!s) return
    const payload = JSON.stringify({ id: s.id, date: s.date, activeSeconds: Math.floor(s.activeMs / 1000), words: s.words })
    const url = `/api/projects/${s.projectId}/writing`
    // Serialize snapshots so an older response cannot overwrite a later word delta.
    queue.current = queue.current.then(async () => {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true })
      if (!response.ok) throw new Error()
      window.dispatchEvent(new CustomEvent('writing-session-saved', {detail: {projectId: s.projectId}}))
    }).catch(() => errorRef.current('Schreibsession konnte nicht gespeichert werden.'))
  }, [])

  useEffect(() => {
    const timer = setInterval(() => { if (session.current && Date.now() - session.current.last < 30000) flush() }, 15000)
    const hidden = () => {
      if (document.visibilityState === 'hidden') {
        flush()
        if (session.current) session.current.paused = true
      }
    }
    document.addEventListener('visibilitychange', hidden)
    window.addEventListener('pagehide', flush)
    window.addEventListener('writing-session-flush', flush)
    return () => {
      clearInterval(timer)
      flush()
      session.current = null
      document.removeEventListener('visibilitychange', hidden)
      window.removeEventListener('pagehide', flush)
      window.removeEventListener('writing-session-flush', flush)
    }
  }, [projectId, flush])

  return useCallback((before: string, after: string) => {
    if (!projectId || !chapterId || before === after || document.visibilityState === 'hidden') return
    const now = Date.now()
    const d = new Date(now)
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    let s = session.current
    const isNew = !s || s.projectId !== projectId || s.date !== date || now - s.last >= 300000
    if (isNew) {
      flush()
      s = { id: globalThis.crypto?.randomUUID?.() ?? `session-${now.toString(36)}-${Math.random().toString(36).slice(2)}`, date, activeMs: 0, words: 0, last: now, projectId, paused: false }
      session.current = s
    }
    if (!s) return
    if (!s.paused) s.activeMs += Math.min(30000, Math.max(0, now - s.last))
    s.words += count(after) - count(before)
    s.last = now
    s.paused = false
    if (isNew) flush()
  }, [projectId, chapterId, flush])
}
