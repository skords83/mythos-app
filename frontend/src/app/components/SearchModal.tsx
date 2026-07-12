'use client'

import React, { useEffect, useRef } from 'react'
import { Book, MapPin, Search, StickyNote, Users, X } from 'lucide-react'
import { SearchResultItem, SearchResults } from '../hooks/useSearch'

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
  ]

  const hasQuery = query.trim().length >= 2
  const totalResults = sections.reduce((sum, section) => sum + results[section.key].length, 0)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-24 z-50 animate-fade-in" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#262626] rounded-xl shadow-xl w-full max-w-lg max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
          <Search size={20} className="text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suche in Kapiteln, Charakteren, Orten, Notizen..."
            className="flex-1 bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
          />
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {!hasQuery && (
            <p className="text-center text-sm text-gray-400 py-8">
              Mindestens 2 Zeichen eingeben, um zu suchen.
            </p>
          )}

          {hasQuery && isSearching && (
            <p className="text-center text-sm text-gray-400 py-8">Suche läuft...</p>
          )}

          {hasQuery && !isSearching && totalResults === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">
              Keine Ergebnisse für &quot;{query}&quot;.
            </p>
          )}

          {hasQuery && !isSearching && sections.map(({ key, label, icon: Icon, onSelect }) => {
            const items = results[key]
            if (items.length === 0) return null
            return (
              <div key={key} className="mb-3">
                <div className="px-2 py-1 text-xs font-medium text-gray-400 uppercase tracking-wide">
                  {label}
                </div>
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelect(item)
                      onClose()
                    }}
                    className="w-full flex items-start gap-3 px-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-left transition-colors"
                  >
                    <Icon size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {item.title}
                      </div>
                      {item.snippet && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
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
