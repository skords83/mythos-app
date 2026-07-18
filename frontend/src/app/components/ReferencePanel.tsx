'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Chapter, Character, Place } from './types'
import { SURFACE, SURFACE_ALT, RADIUS, BORDER, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, ACCENT_TEXT, HOVER_SURFACE, ACTIVE_SURFACE, DIVIDER } from '@/lib/theme'

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
      <h4 className={`text-xs font-semibold ${TEXT_SECONDARY} uppercase tracking-wider mb-1`}>{label}</h4>
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

  const selectedChapter = mode === 'chapter' ? otherChapters.find((c) => c.id === selectedId) : null
  const selectedCharacter = mode === 'character' ? characters.find((c) => c.id === selectedId) : null
  const selectedPlace = mode === 'place' ? places.find((p) => p.id === selectedId) : null

  return (
    <div className={`w-[380px] shrink-0 ${BORDER} ${RADIUS} ${SURFACE} overflow-hidden sticky top-6 max-h-[calc(100vh-6rem)] flex flex-col`}>
      <div className={`flex items-center gap-1 p-2 border-b border-zinc-300 dark:border-zinc-700 ${SURFACE_ALT}`}>
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

      <div className={`px-3 py-2 border-b border-zinc-300 dark:border-zinc-700`}>
        <select
          value={selectedId}
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
          <div
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: selectedChapter.content || '' }}
          />
        )}
        {mode === 'chapter' && !selectedChapter && (
          <p className={`text-sm ${TEXT_MUTED}`}>Kein weiteres Kapitel vorhanden.</p>
        )}

        {mode === 'character' && selectedCharacter && (
          <>
            <h3 className={`font-serif font-bold text-lg ${TEXT_PRIMARY}`}>{selectedCharacter.name}</h3>
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
            <h3 className={`font-serif font-bold text-lg ${TEXT_PRIMARY}`}>{selectedPlace.name}</h3>
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
