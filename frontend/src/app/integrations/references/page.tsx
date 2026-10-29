'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { ChapterReference } from '@/lib/chapter-references'

type Inspection = { updatedAt: string; references: (ChapterReference & { orphaned: boolean; unavailable: boolean })[]; targets: { id: string; name: string; kind: string }[] }
export default function ReferencesPage() {
  const [chapters, setChapters] = useState<{ id: string; title: string; project: { title: string } }[]>([])
  const [chapterId, setChapterId] = useState('')
  const [data, setData] = useState<Inspection | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [targets, setTargets] = useState<Record<string, string>>({})
  useEffect(() => {
    const controller = new AbortController()
    setData(null); setTargets({}); setError('')
    fetch('/api/integrations/references' + (chapterId ? '?chapterId=' + encodeURIComponent(chapterId) : ''), { cache: 'no-store', signal: controller.signal })
      .then(async response => { const result = await response.json(); if (!response.ok) throw new Error(result.error); return result })
      .then(result => chapterId ? setData(result) : setChapters(result.chapters))
      .catch(e => { if (e.name !== 'AbortError') setError(e.message) })
    return () => controller.abort()
  }, [chapterId])
  async function change(key: string, targetId: string | null) {
    if (!data || busy) return
    if (!window.confirm(targetId === null ? 'Nur diese Verknüpfung entfernen? Der sichtbare Text bleibt erhalten.' : 'Diese Verknüpfung auf das gewählte Ziel umstellen?')) return
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/integrations/references', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chapterId, key, targetId, expectedUpdatedAt: data.updatedAt }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      const refresh = await fetch('/api/integrations/references?chapterId=' + encodeURIComponent(chapterId), { cache: 'no-store' })
      const updated = await refresh.json()
      if (!refresh.ok) throw new Error(updated.error)
      setData(updated); setTargets({})
    } catch (e) { setError(e instanceof Error ? e.message : 'Änderung fehlgeschlagen') }
    finally { setBusy(false) }
  }
  return <main className="mx-auto max-w-4xl p-6 text-zinc-900 dark:text-zinc-100">
    <Link href="/integrations/approvals" className="underline">Zur Kapitelprüfung</Link>
    <h1 className="my-5 text-2xl font-semibold">Verwaiste Verknüpfungen</h1>
    <p className="mb-5">Prüfe Figuren, Orte, Gegenstände und Kommentaranker. Verknüpfungen mit fehlenden Zielen können gezielt ersetzt oder entfernt werden. Vorhandene, aber nicht verfügbare Ziele bleiben geschützt. Der sichtbare Kapiteltext bleibt erhalten. Jede Änderung sichert die bisherige Fassung als Kapitelversion.</p>
    <label htmlFor="chapter">Kapitel</label>
    <select id="chapter" disabled={busy} value={chapterId} onChange={e => setChapterId(e.target.value)} className="mx-3 max-w-full rounded border bg-white p-2 dark:bg-zinc-800">
      <option value="">Kapitel auswählen</option>
      {chapters.map(c => <option key={c.id} value={c.id}>{c.project.title} – {c.title}</option>)}
    </select>
    {error && <p role="alert" className="my-5 text-red-600">{error}</p>}
    {chapterId && !data && !error && <p className="my-5">Verknüpfungen werden geprüft …</p>}
    {data && <p className="my-5">{data.references.filter(r => r.orphaned).length} verwaiste von {data.references.length} Verknüpfungen.</p>}
    {data?.references.some(r => r.unavailable) && <p className="my-4" role="status">{data.references.filter(r => r.unavailable).length} vorhandene Ziele sind nicht sichtbar oder diesem Buch nicht zugeordnet. Diese Verknüpfungen sind nicht verwaist und werden hier nicht verändert.</p>}
    {data?.references.filter(r => r.orphaned).map(ref => <section key={ref.key} className="my-4 rounded border p-4">
      <h2 className="font-semibold">{ref.kind} – {ref.label}</h2>
      <p className="my-2 break-all text-sm">Fehlendes Ziel: {ref.targetId || '(leer)'}</p>
      <label>Neues Ziel <select disabled={busy} value={targets[ref.key] ?? ''} onChange={e => setTargets({ ...targets, [ref.key]: e.target.value })} className="max-w-full rounded border bg-white p-2 dark:bg-zinc-800">
        <option value="">Ziel auswählen</option>
        {data.targets.filter(t => t.kind === ref.kind).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select></label>
      <div className="mt-3 flex flex-wrap gap-3">
        <button disabled={busy || !targets[ref.key]} onClick={() => void change(ref.key, targets[ref.key])} className="rounded border px-3 py-2 disabled:opacity-40">Reparieren</button>
        <button disabled={busy} onClick={() => void change(ref.key, null)} className="rounded border px-3 py-2 disabled:opacity-40">Nur Verknüpfung entfernen</button>
      </div>
    </section>)}
  </main>
}
