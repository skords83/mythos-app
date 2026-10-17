'use client'

import { useEffect, useRef, useState } from 'react'
import type { Chapter } from './types'
import type { NameGroup, AmbiguousName } from '@/lib/bulkNameLinks'
import { ACCENT, HAIRLINE, RADIUS, SURFACE, TEXT_PRIMARY } from '@/lib/theme'

type PreviewChapter = { id: string; title: string; updatedAt: string; groups?: NameGroup[]; ambiguous?: AmbiguousName[]; error?: string }
type Preview = { fingerprint: string; chapters: PreviewChapter[] }
type Result = { id: string; title: string; message: string; added: number; skipped: number }

export function NameLinkingDialog({ chapter, begin, end, onClose }: {
  chapter: Chapter
  begin: () => Promise<Chapter | null>
  end: (chapter?: Chapter) => void
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(true)
  const [scope, setScope] = useState('chapter')
  const [kinds, setKinds] = useState(['CHARACTER', 'PLACE'])
  const [preview, setPreview] = useState<Preview | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [error, setError] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const updatedChapter = useRef<Chapter | undefined>(undefined)
  const started = useRef(false)
  useEffect(() => {
    dialog.current?.showModal()
    if (started.current) return
    started.current = true
    begin().then(saved => {
      setReady(!!saved)
      if (!saved) setError('Der aktuelle Text konnte nicht sicher gespeichert werden. Bitte zuerst den Speicherkonflikt oder die Entwurfswiederherstellung klären.')
    }).catch(() => setError('Vorbereitung fehlgeschlagen.')).finally(() => setBusy(false))
  }, [])
  const close = () => { if (!busy) { end(updatedChapter.current); onClose() } }
  const request = async (body: object) => {
    const response = await fetch('/api/name-links', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: chapter.projectId, kinds, ...body }) })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error ?? 'Verarbeitung fehlgeschlagen')
    return data
  }
  const load = async () => {
    setBusy(true); setError(''); setResults([]); setPreview(null)
    try {
      const data: Preview = await request({ action: 'preview', ...(scope === 'chapter' ? { chapterId: chapter.id } : {}) })
      setPreview(data)
      setSelected([...new Set(data.chapters.flatMap(c => c.groups?.map(g => g.key) ?? []))])
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  const apply = async () => {
    if (!preview) return
    setBusy(true); setError(''); setResults([])
    for (const c of preview.chapters) {
      let result: Result
      if (c.error) result = { id: c.id, title: c.title, message: `Fehlgeschlagen: ${c.error}`, added: 0, skipped: 0 }
      else {
        try {
          const data = await request({ action: 'apply', chapterId: c.id, updatedAt: c.updatedAt, fingerprint: preview.fingerprint, selected })
          if (data.chapter?.id === chapter.id) updatedChapter.current = data.chapter
          result = { id: c.id, title: c.title, message: data.status === 'processed' ? 'Verarbeitet' : `Übersprungen: ${data.reason}`, added: data.added ?? 0, skipped: data.skipped ?? ((c.groups ?? []).reduce((n, g) => n + g.count, 0) + (c.ambiguous ?? []).reduce((n, g) => n + g.count, 0)) }
        } catch (e) {
          result = { id: c.id, title: c.title, message: `Fehlgeschlagen / Ergebnis unbestätigt: ${(e as Error).message}`, added: 0, skipped: 0 }
        }
      }
      setResults(prev => [...prev, result])
    }
    setPreview(null); setBusy(false)
  }
  const groups = new Map<string, NameGroup>()
  for (const c of preview?.chapters ?? []) for (const g of c.groups ?? []) {
    const old = groups.get(g.key)
    groups.set(g.key, { ...g, count: g.count + (old?.count ?? 0) })
  }
  const invalid = () => { setPreview(null); setResults([]) }
  return <dialog ref={dialog} onCancel={e => { e.preventDefault(); close() }} aria-labelledby="name-linking-title" className={`w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 ${SURFACE} ${TEXT_PRIMARY} ${RADIUS} backdrop:bg-black/40`}>
    <h2 id="name-linking-title" className="text-xl font-medium mb-3">Erkannte Namen verknüpfen</h2>
    <p className="text-sm mb-4">Eindeutige Namen und Aliase werden mit Figuren und Orten verknüpft. Vor jeder Änderung wird ein Entwurf zur Wiederherstellung gespeichert. Während der Vorschau ist der Editor gesperrt.</p>
    <fieldset disabled={busy || !ready} className="space-y-3 disabled:opacity-50">
      <label className="block">Umfang <select aria-label="Umfang" value={scope} onChange={e => { setScope(e.target.value); invalid() }} className={`ml-2 p-2 bg-transparent border ${HAIRLINE} ${RADIUS}`}>
        <option value="chapter">Aktuelles Kapitel</option><option value="project">Gesamtes Projekt</option>
      </select></label>
      <div className="flex gap-5">{[['CHARACTER', 'Figuren'], ['PLACE', 'Orte']].map(([kind, label]) => <label key={kind}><input type="checkbox" checked={kinds.includes(kind)} onChange={e => { setKinds(e.target.checked ? [...kinds, kind] : kinds.filter(k => k !== kind)); invalid() }} /> {label}</label>)}</div>
      <button type="button" className="underline" disabled={!kinds.length} onClick={load}>Vorschau erstellen</button>
    </fieldset>
    {preview && <section className="mt-5 space-y-3">
      <h3 className="font-medium">Eindeutige Treffer</h3>
      {!groups.size && <p>Keine eindeutigen Treffer.</p>}
      {[...groups.values()].map(g => <label key={g.key} className="flex gap-2 items-center"><input type="checkbox" disabled={busy} checked={selected.includes(g.key)} onChange={e => setSelected(e.target.checked ? [...selected, g.key] : selected.filter(k => k !== g.key))} /><span>{g.kind === 'CHARACTER' ? 'Figur' : 'Ort'}: {g.name} · {g.count} Treffer</span></label>)}
      <h3 className="font-medium pt-2">Mehrdeutige Treffer – werden übersprungen</h3>
      {!preview.chapters.some(c => c.ambiguous?.length) && <p>Keine mehrdeutigen Treffer.</p>}
      {preview.chapters.map(c => <div key={c.id}>{c.error && <p role="alert">{c.title}: {c.error}</p>}{c.ambiguous?.map((a, i) => <p key={i} className="text-sm">{c.title}: „{a.text}“ · {a.count} Treffer · {a.candidates.join(' / ')}</p>)}</div>)}
      <p className="text-sm">{preview.chapters.length} Kapitel in der Vorschau. Bereits verknüpfte Stellen bleiben unverändert.</p>
      <button disabled={busy || !selected.length} onClick={apply} className={`px-4 py-2 text-white ${ACCENT} ${RADIUS} disabled:opacity-50`}>Ausgewählte Treffer verknüpfen</button>
    </section>}
    {results.length > 0 && <section aria-live="polite" className="mt-5 space-y-2"><p className="font-medium">{results.reduce((n, r) => n + r.added, 0)} Verknüpfungen ergänzt · {results.reduce((n, r) => n + r.skipped, 0)} Fundstellen übersprungen</p>{results.map(r => <p key={r.id} className="text-sm">{r.title}: {r.message} · {r.added} ergänzt · {r.skipped} übersprungen</p>)}</section>}
    {error && <p role="alert" className="mt-4 text-red-600">{error}</p>}
    {busy && <p role="status" className="mt-4">{ready ? 'Kapitel werden verarbeitet …' : 'Aktueller Text wird gesichert …'}</p>}
    <button type="button" disabled={busy} onClick={close} className="mt-5 underline disabled:opacity-50">Schließen</button>
  </dialog>
}
