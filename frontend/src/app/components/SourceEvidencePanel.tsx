'use client'
import React, { useEffect, useState } from 'react'
import { INPUT, BUTTON_SECONDARY, TEXT_SECONDARY, TEXT_MUTED } from '@/lib/theme'
import { sourceText } from '@/lib/evidence-text'

type Evidence = { id: string; updatedAt: string; field: string | null; statement: string; chapterId: string; chapterTitle: string; sceneId: string | null; quote: string; prefix: string; suffix: string; commentId: string | null; flagged: boolean; status: string; excerpt: string | null }
type Entry = { id: string; title?: string; name?: string }
const statuses: Record<string, string> = { VALID: 'Textstelle bestätigt', STALE: 'Möglicherweise veraltet – bitte prüfen', MISSING: 'Textstelle nicht mehr auffindbar', AMBIGUOUS: 'Textstelle mehrdeutig – Kontext ergänzen' }
const empty = { field: '', statement: '', quote: '', prefix: '', suffix: '', commentId: '', sceneId: '' }
async function request(action: string, args: unknown) {
  const res = await fetch('/api/story', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, args }) })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error ?? 'Quellenbelege konnten nicht gespeichert werden.')
  return body.data
}
async function get(url: string) { const res = await fetch(url); if (!res.ok) throw new Error('Quelle konnte nicht geladen werden.'); return res.json() }
async function allPages(url: string, key: string): Promise<Entry[]> {
  const entries: Entry[] = []
  for (let page = 1; ; page++) { const data = await get(`${url}&page=${page}`); entries.push(...data[key]); if (page >= data.pagination.totalPages) return entries }
}
export function SourceEvidencePanel({ entityType, entityId, projectId }: { entityType: string; entityId: string; projectId: string | null }) {
  const [open, setOpen] = useState(false), [rows, setRows] = useState<Evidence[]>([]), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const [projects, setProjects] = useState<Entry[]>([]), [project, setProject] = useState(projectId ?? ''), [chapters, setChapters] = useState<Entry[]>([])
  const [chapterId, setChapterId] = useState(''), [chapter, setChapter] = useState<{ content: unknown; updatedAt: string } | null>(null), [scenes, setScenes] = useState<Entry[]>([])
  const [editing, setEditing] = useState<Evidence | null>(null), [draft, setDraft] = useState(empty), [reanchor, setReanchor] = useState(false)
  const load = async () => {
    const result: Evidence[] = []
    for (let page = 1; ; page++) { const data = await request('evidence', { entityType, entityId, page, limit: 100 }); result.push(...data.entries); if (!data.hasMore) break }
    setRows(result)
  }
  useEffect(() => { if (!open) return; let active = true; load().catch(e => active && setError(e.message)); allPages('/api/projects?limit=100', 'projects').then(p => active && setProjects(p)).catch(e => active && setError(e.message)); return () => { active = false } }, [open, entityType, entityId])
  useEffect(() => { if (!open || !project) return; let active = true; setChapters([]); allPages(`/api/chapters?projectId=${encodeURIComponent(project)}&limit=200`, 'chapters').then(c => active && setChapters(c)).catch(e => active && setError(e.message)); return () => { active = false } }, [open, project])
  useEffect(() => { setChapter(null); setScenes([]); if (!chapterId) return; let active = true; Promise.all([get(`/api/chapters/${encodeURIComponent(chapterId)}`), get(`/api/scenes?chapterId=${encodeURIComponent(chapterId)}`)]).then(([c, s]) => { if (active) { setChapter(c); setScenes(s) } }).catch(e => active && setError(e.message)); return () => { active = false } }, [chapterId])
  const perform = async (fn: () => Promise<unknown>) => { setBusy(true); setError(''); try { await fn(); await load() } catch (e) { setError((e as Error).message) } finally { setBusy(false) } }
  const edit = (row: Evidence) => { setEditing(row); setChapterId(row.chapterId); setDraft({ field: row.field ?? '', statement: row.statement, quote: row.quote, prefix: row.prefix, suffix: row.suffix, commentId: row.commentId ?? '', sceneId: row.sceneId ?? '' }); setReanchor(false) }
  const save = () => perform(async () => {
    const metadata = { field: draft.field || null, statement: draft.statement }
    const anchor = { chapterId, quote: draft.quote, prefix: draft.prefix, suffix: draft.suffix, commentId: draft.commentId || null, sceneId: draft.sceneId || null, sourceExpectedUpdatedAt: chapter?.updatedAt }
    await request(editing ? 'update_evidence' : 'create_evidence', editing
      ? { id: editing.id, expectedUpdatedAt: editing.updatedAt, ...metadata, ...(reanchor ? anchor : {}) }
      : { entityType, entityId, ...metadata, ...anchor })
    setEditing(null); setDraft(empty); setChapterId(''); setReanchor(false)
  })
  const change = (key: keyof typeof empty, value: string) => { setDraft(d => ({ ...d, [key]: value })); if (!['field', 'statement'].includes(key)) setReanchor(true) }
  return <section className="mt-5 border-t border-zinc-200 dark:border-zinc-800 pt-4">
    <button type="button" className={BUTTON_SECONDARY} aria-expanded={open} onClick={() => setOpen(!open)}>Quellenbelege {open ? 'schließen' : 'anzeigen und pflegen'}</button>
    {open && <div className="space-y-4 mt-3">
      <p className={`text-xs ${TEXT_MUTED}`}>Belege werden separat gespeichert. Sie ändern keinen Kapiteltext. Quellen aus eigenen Kapiteln sind nur für deren Besitzer lesbar.</p>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error} <button type="button" disabled={busy} onClick={() => perform(load)}>Neu laden</button></p>}
      {rows.length === 0 && <p className={`text-sm ${TEXT_SECONDARY}`}>Noch keine zugänglichen Quellenbelege.</p>}
      {rows.map(row => <article key={row.id} className="border border-zinc-200 dark:border-zinc-700 rounded p-3 space-y-2">
        <p className="text-sm font-medium">{row.field ? `${row.field}: ` : ''}{row.statement}</p>
        <blockquote className={`text-sm ${TEXT_SECONDARY}`}>„{row.quote}“</blockquote>
        <p className={`text-xs ${TEXT_MUTED}`}>{row.chapterTitle} · {statuses[row.status]}</p>
        <details className="text-xs"><summary>Fundstelle und Kontext</summary><p className="whitespace-pre-wrap mt-2">{row.excerpt ?? 'Kein eindeutiger Fund im aktuellen Text.'}</p><p>Kapitel-ID: {row.chapterId}{row.sceneId ? ` · Szenen-ID: ${row.sceneId}` : ''}</p></details>
        <div className="flex flex-wrap gap-3 text-xs">
          <button type="button" disabled={busy} onClick={() => edit(row)}>Prüfen / Bearbeiten</button>
          <button type="button" disabled={busy} onClick={() => perform(() => request('update_evidence', { id: row.id, expectedUpdatedAt: row.updatedAt, flagged: true }))}>Prüfbedarf markieren</button>
          <button type="button" disabled={busy} onClick={() => { if (window.confirm('Diesen Quellenbeleg entfernen?')) void perform(() => request('delete_evidence', { id: row.id, expectedUpdatedAt: row.updatedAt })) }}>Entfernen</button>
        </div>
      </article>)}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">{editing ? 'Quellenbeleg bearbeiten' : 'Quellenbeleg hinzufügen'}</h3>
        <label className={`block text-sm ${TEXT_SECONDARY}`}>Belegtes Feld (optional)<input className={INPUT} value={draft.field} maxLength={128} onChange={e => change('field', e.target.value)} placeholder="z. B. Aussehen oder Herkunft" /></label>
        <label className={`block text-sm ${TEXT_SECONDARY}`}>Konkrete Aussage<input className={INPUT} value={draft.statement} maxLength={2000} onChange={e => change('statement', e.target.value)} /></label>
        <label className={`block text-sm ${TEXT_SECONDARY}`}>Quellprojekt<select className={INPUT} value={project} onChange={e => { setProject(e.target.value); setChapterId(''); setReanchor(true) }}><option value="">Projekt wählen</option>{projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
        <label className={`block text-sm ${TEXT_SECONDARY}`}>Kapitel<select className={INPUT} value={chapterId} onChange={e => { setChapterId(e.target.value); change('sceneId', '') }}><option value="">Kapitel wählen</option>{chapterId && !chapters.some(c => c.id === chapterId) && <option value={chapterId}>{editing?.chapterTitle ?? chapterId}</option>}{chapters.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
        {chapter && <details className="text-sm"><summary>Aktuellen Kapiteltext zum Prüfen öffnen</summary><p className="max-h-56 overflow-auto whitespace-pre-wrap p-2 border border-zinc-200 dark:border-zinc-700 mt-2">{sourceText(chapter.content)}</p></details>}
        <label className={`block text-sm ${TEXT_SECONDARY}`}>Szene (optionale Planungszuordnung)<select className={INPUT} value={draft.sceneId} onChange={e => change('sceneId', e.target.value)}><option value="">Nur Kapitel</option>{scenes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label className={`block text-sm ${TEXT_SECONDARY}`}>Exaktes kurzes Zitat<textarea className={INPUT} value={draft.quote} maxLength={1000} onChange={e => change('quote', e.target.value)} rows={3} /></label>
        <details className="text-sm space-y-2"><summary>Anker präzisieren (bei mehrfach vorkommendem Text)</summary>
          <label className="block">Text direkt davor<input className={INPUT} value={draft.prefix} maxLength={200} onChange={e => change('prefix', e.target.value)} /></label>
          <label className="block">Text direkt danach<input className={INPUT} value={draft.suffix} maxLength={200} onChange={e => change('suffix', e.target.value)} /></label>
          <label className="block">Vorhandene Kommentar-ID (optional)<input className={INPUT} value={draft.commentId} maxLength={128} onChange={e => change('commentId', e.target.value)} /></label>
        </details>
        {editing && <label className="flex gap-2 text-sm"><input type="checkbox" checked={reanchor} onChange={e => setReanchor(e.target.checked)} />Textstelle am geladenen Kapitelstand erneut bestätigen</label>}
        <div className="flex gap-3"><button type="button" className={`${BUTTON_SECONDARY} px-3 py-2 text-sm`} disabled={busy || !draft.statement.trim() || ((!editing || reanchor) && (!chapter || !draft.quote.trim()))} onClick={save}>{busy ? 'Wird gespeichert …' : 'Quellenbeleg speichern'}</button>
          {editing && <button type="button" className="text-sm" onClick={() => { setEditing(null); setDraft(empty); setReanchor(false); setChapterId('') }}>Bearbeitung abbrechen</button>}
        </div>
      </div>
    </div>}
  </section>
}
