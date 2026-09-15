'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Chapter, Character, Place } from './types'
import { SURFACE, SURFACE_ALT, RADIUS, BORDER, HAIRLINE, TEXT_PRIMARY, TEXT_MUTED, ACCENT_TEXT, HOVER_SURFACE, ACTIVE_SURFACE, DIVIDER } from '@/lib/theme'
import { extractContent } from '../hooks/useChapters'
import { MonoLabel } from './MonoLabel'

type ReferenceMode = 'chapter' | 'character' | 'place'

interface ReferencePanelProps {
  chapters: Chapter[]
  characters: Character[]
  places: Place[]
  currentChapterId: string
  onClose: () => void
}

const MODE_LABELS: Record<ReferenceMode, string> = {
  chapter: 'Kapitel',
  character: 'Charakter',
  place: 'Ort',
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div>
      <MonoLabel className="block mb-1">{label}</MonoLabel>
      <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">{value}</p>
    </div>
  )
}

export function ReferencePanel({ chapters, characters, places, currentChapterId, onClose }: ReferencePanelProps) {
  const otherChapters = chapters.filter((c) => c.id !== currentChapterId)
  const [mode, setMode] = useState<ReferenceMode>('chapter')
  const [selectedId, setSelectedId] = useState<string>(otherChapters[0]?.id ?? '')

  const options: { id: string; label: string }[] =
    mode === 'chapter'
      ? otherChapters.map((c) => ({ id: c.id, label: c.title || 'Ohne Titel' }))
      : mode === 'character'
      ? characters.map((c) => ({ id: c.id, label: c.name }))
      : places.map((p) => ({ id: p.id, label: p.name }))

  const handleModeChange = (next: ReferenceMode) => {
    setMode(next)
    const nextOptions = next === 'chapter' ? otherChapters : next === 'character' ? characters : places
    setSelectedId(nextOptions[0]?.id ?? '')
  }

  const effectiveId = options.some(option => option.id === selectedId) ? selectedId : options[0]?.id ?? ''
  const selectedChapter = mode === 'chapter' ? otherChapters.find((c) => c.id === effectiveId) : null
  const selectedCharacter = mode === 'character' ? characters.find((c) => c.id === effectiveId) : null
  const selectedPlace = mode === 'place' ? places.find((p) => p.id === effectiveId) : null

  const [chapterResult, setChapterResult] = useState<{ id: string; html?: string; error?: string } | null>(null)
  const [retry, setRetry] = useState(0)
  const chapterId = selectedChapter?.id
  useEffect(() => {
    if (!chapterId) return
    let cancelled = false
    const controller = new AbortController()
    setChapterResult(null)
    const load = async () => {
      try {
        const response = await fetch(`/api/chapters/${encodeURIComponent(chapterId)}`, {
          cache: 'no-store', signal: controller.signal,
        })
        if (!response.ok) throw new Error('Kapitel konnte nicht geladen werden.')
        const chapter = await response.json()
        if (!chapter || chapter.id !== chapterId || !Object.prototype.hasOwnProperty.call(chapter, 'content')) {
          throw new Error('Kapitelinhalt fehlt.')
        }
        if (!cancelled) setChapterResult({ id: chapterId, html: extractContent(chapter.content) })
      } catch {
        if (!cancelled) setChapterResult({ id: chapterId, error: 'Kapitel konnte nicht geladen werden.' })
      }
    }
    void load()
    return () => { cancelled = true; controller.abort() }
  }, [chapterId, retry])
  const loadedChapter = chapterResult?.id === chapterId ? chapterResult : null

  return (
    <div className={`w-[380px] shrink-0 ${BORDER} ${RADIUS} ${SURFACE} overflow-hidden sticky top-6 max-h-[calc(100vh-6rem)] flex flex-col`}>
      <div className={`flex items-center gap-1 p-2 border-b ${HAIRLINE} ${SURFACE_ALT}`}>
        {(['chapter', 'character', 'place'] as ReferenceMode[]).map((m) => (
          <button
            key={m}
            onClick={() => handleModeChange(m)}
            className={`px-2 py-1 text-xs font-medium ${RADIUS} ${HOVER_SURFACE} transition-colors ${mode === m ? `${ACTIVE_SURFACE} ${ACCENT_TEXT}` : TEXT_MUTED}`}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={onClose} className={`p-1.5 ${RADIUS} ${HOVER_SURFACE} transition-colors`} title="Referenz schließen">
          <X size={16} />
        </button>
      </div>

      <div className={`px-3 py-2 border-b ${HAIRLINE}`}>
        <select
          value={effectiveId}
          aria-label="Referenz auswählen"
          onChange={(e) => setSelectedId(e.target.value)}
          className={`w-full text-sm bg-transparent ${TEXT_PRIMARY} border-none outline-none`}
        >
          {options.length === 0 && <option value="">Keine Einträge</option>}
          {options.map((o) => (
            <option key={o.id} value={o.id} className="dark:bg-zinc-900">
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="p-4 overflow-y-auto space-y-3">
        {mode === 'chapter' && selectedChapter && (
          !loadedChapter ? <p role="status" className={`text-sm ${TEXT_MUTED}`}>Kapitel wird geladen…</p> :
          loadedChapter.error ? <div role="alert" className={`text-sm ${TEXT_MUTED}`}>
            <p>{loadedChapter.error}</p>
            <button onClick={() => setRetry(value => value + 1)} className={`mt-2 ${ACCENT_TEXT}`}>Erneut versuchen</button>
          </div> : loadedChapter.html ? <div
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: loadedChapter.html }}
          /> : <p className={`text-sm ${TEXT_MUTED}`}>Dieses Kapitel enthält noch keinen Text.</p>
        )}
        {mode === 'chapter' && !selectedChapter && (
          <p className={`text-sm ${TEXT_MUTED}`}>Kein weiteres Kapitel vorhanden.</p>
        )}

        {mode === 'character' && selectedCharacter && (
          <>
            <h3 className={`font-display font-light text-lg ${TEXT_PRIMARY}`}>{selectedCharacter.name}</h3>
            <Field label="Äußeres" value={selectedCharacter.appearance} />
            <Field label="Persönlichkeit" value={selectedCharacter.personality} />
            <Field label="Hintergrund" value={selectedCharacter.backstory} />
            <Field label="Motivation" value={selectedCharacter.motivation} />
          </>
        )}
        {mode === 'character' && !selectedCharacter && (
          <p className={`text-sm ${TEXT_MUTED}`}>Kein Charakter vorhanden.</p>
        )}

        {mode === 'place' && selectedPlace && (
          <>
            <h3 className={`font-display font-light text-lg ${TEXT_PRIMARY}`}>{selectedPlace.name}</h3>
            <Field label="Beschreibung" value={selectedPlace.description} />
            <Field label="Lage" value={selectedPlace.location} />
            <Field label="Klima" value={selectedPlace.climate} />
            <Field label="Bedeutung" value={selectedPlace.importance} />
          </>
        )}
        {mode === 'place' && !selectedPlace && (
          <p className={`text-sm ${TEXT_MUTED}`}>Kein Ort vorhanden.</p>
        )}
      </div>
    </div>
  )
}
