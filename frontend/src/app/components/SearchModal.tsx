'use client'

import React, { useEffect, useRef } from 'react'
import { Book, Clapperboard, Clock, Gem, Lightbulb, MapPin, Scroll, Search, Shield, StickyNote, Users, X } from 'lucide-react'
import { SearchResultItem, SearchResults } from '../hooks/useSearch'
import { MODAL_PANEL, RADIUS, TEXT_PRIMARY, TEXT_MUTED } from '@/lib/theme'
import { MastheadDivider } from './MastheadDivider'

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  query: string
  setQuery: (query: string) => void
  results: SearchResults
  isSearching: boolean
  onSelectChapter: (id: string) => void
  onSelectCharacter: (id: string) => void
  onSelectPlace: (id: string) => void
  onSelectNote: (chapterId: string) => void
  onSelectItem: (id: string) => void
  onSelectFaction: (id: string) => void
  onSelectScene: (chapterId: string) => void
  onSelectTimelineEvent: (id: string) => void
  onSelectLoreEntry: (id: string) => void
  onSelectIdea: (id: string) => void
}

interface Section {
  key: keyof SearchResults
  label: string
  icon: typeof Book
  onSelect: (item: SearchResultItem) => void
}

export function SearchModal({
  isOpen,
  onClose,
  query,
  setQuery,
  results,
  isSearching,
  onSelectChapter,
  onSelectCharacter,
  onSelectPlace,
  onSelectNote,
  onSelectItem,
  onSelectFaction,
  onSelectScene,
  onSelectTimelineEvent,
  onSelectLoreEntry,
  onSelectIdea,
}: SearchModalProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  const sections: Section[] = [
    { key: 'chapters', label: 'Kapitel', icon: Book, onSelect: (item) => onSelectChapter(item.id) },
    { key: 'characters', label: 'Charaktere', icon: Users, onSelect: (item) => onSelectCharacter(item.id) },
    { key: 'places', label: 'Orte', icon: MapPin, onSelect: (item) => onSelectPlace(item.id) },
    { key: 'notes', label: 'Notizen', icon: StickyNote, onSelect: (item) => item.chapterId && onSelectNote(item.chapterId) },
    { key: 'items', label: 'Items', icon: Gem, onSelect: (item) => onSelectItem(item.id) },
    { key: 'factions', label: 'Fraktionen', icon: Shield, onSelect: (item) => onSelectFaction(item.id) },
    { key: 'scenes', label: 'Szenen', icon: Clapperboard, onSelect: (item) => item.chapterId && onSelectScene(item.chapterId) },
    { key: 'timelineEvents', label: 'Zeitstrahl', icon: Clock, onSelect: (item) => onSelectTimelineEvent(item.id) },
    { key: 'loreEntries', label: 'Lore-Bibel', icon: Scroll, onSelect: (item) => onSelectLoreEntry(item.id) },
    { key: 'ideas', label: 'Ideen', icon: Lightbulb, onSelect: (item) => onSelectIdea(item.id) },
  ]

  const hasQuery = query.trim().length >= 2
  const totalResults = sections.reduce((sum, section) => sum + results[section.key].length, 0)

  return (
    <div className="fixed inset-0 bg-zinc-950/60 flex items-start justify-center pt-24 z-50 animate-fade-in" onClick={onClose}>
      <div
        className={`${MODAL_PANEL} w-full max-w-lg max-h-[70vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 p-4">
          <Search size={20} className={`${TEXT_MUTED} flex-shrink-0`} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suche über alle Entitäten..."
            className={`flex-1 bg-transparent outline-none ${TEXT_PRIMARY} placeholder-zinc-400`}
          />
          <button onClick={onClose} className={`${TEXT_MUTED} hover:text-zinc-600 dark:hover:text-zinc-300 flex-shrink-0`}>
            <X size={20} />
          </button>
        </div>
        <MastheadDivider surface="bg-stone-50 dark:bg-zinc-900" />

        <div className="flex-1 overflow-y-auto p-2">
          {!hasQuery && (
            <p className={`text-center text-sm ${TEXT_MUTED} py-8`}>
              Mindestens 2 Zeichen eingeben, um zu suchen.
            </p>
          )}

          {hasQuery && isSearching && (
            <p className={`text-center text-sm ${TEXT_MUTED} py-8`}>Suche läuft...</p>
          )}

          {hasQuery && !isSearching && totalResults === 0 && (
            <p className={`text-center text-sm ${TEXT_MUTED} py-8`}>
              Keine Ergebnisse für &quot;{query}&quot;.
            </p>
          )}

          {hasQuery && !isSearching && sections.map(({ key, label, icon: Icon, onSelect }) => {
            const items = results[key]
            if (items.length === 0) return null
            return (
              <div key={key} className="mb-3">
                <div className={`px-2 py-1 text-xs font-medium ${TEXT_MUTED} uppercase tracking-wide`}>
                  {label}
                </div>
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelect(item)
                      onClose()
                    }}
                    className={`w-full flex items-start gap-3 px-2 py-2 ${RADIUS} hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left transition-colors`}
                  >
                    <Icon size={16} className={`${TEXT_MUTED} mt-0.5 flex-shrink-0`} />
                    <div className="min-w-0">
                      <div className={`text-sm font-medium ${TEXT_PRIMARY} truncate`}>
                        {item.title}
                      </div>
                      {item.snippet && (
                        <div className={`text-xs ${TEXT_MUTED} line-clamp-2`}>
                          {item.snippet}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
