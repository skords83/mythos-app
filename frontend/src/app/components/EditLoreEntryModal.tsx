'use client'

import React, { useState } from 'react'
import { Character, Place, Item, Faction, LoreEntry } from './types'
import { OVERLAY, MODAL_PANEL, INPUT, BUTTON_SECONDARY, ACCENT, RADIUS, TEXT_PRIMARY, TEXT_SECONDARY } from '@/lib/theme'
import { LoreEntryEntityTags } from './LoreEntryEntityTags'

interface EditLoreEntryModalProps {
  isOpen: boolean
  onClose: () => void
  loreEntry: LoreEntry | null
  characters: Character[]
  places: Place[]
  items: Item[]
  factions: Faction[]
  onUpdate: (
    id: string,
    title: string,
    content: string,
    category: string,
    visibility: 'PRIVATE' | 'FAMILY'
  ) => void
}

export function EditLoreEntryModal({
  isOpen,
  onClose,
  loreEntry,
  characters,
  places,
  items,
  factions,
  onUpdate,
}: EditLoreEntryModalProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('')
  const [visibility, setVisibility] = useState<'PRIVATE' | 'FAMILY'>('PRIVATE')

  React.useEffect(() => {
    if (loreEntry) {
      setTitle(loreEntry.title)
      setContent(loreEntry.content || '')
      setCategory(loreEntry.category || '')
      setVisibility(loreEntry.visibility)
    }
  }, [loreEntry])

  if (!isOpen || !loreEntry) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onUpdate(loreEntry.id, title, content, category, visibility)
    onClose()
  }

  return (
    <div className={OVERLAY}>
      <div className={`${MODAL_PANEL} p-6 w-full max-w-md max-h-[90vh] overflow-y-auto`}>
        <h2 className={`text-2xl font-serif font-bold mb-4 ${TEXT_PRIMARY}`}>
          Weltenregel bearbeiten
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium ${TEXT_SECONDARY} mb-1`}>
              Titel *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={INPUT}
              placeholder="z.B. Magie kostet Lebenskraft"
              required
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${TEXT_SECONDARY} mb-1`}>
              Kategorie
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={INPUT}
              placeholder="z.B. Magie, Politik, Religion"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${TEXT_SECONDARY} mb-1`}>
              Regel / Lore-Text
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className={INPUT}
              rows={4}
              placeholder="Beschreibe die Regel oder das Weltwissen"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${TEXT_SECONDARY} mb-1`}>
              Sichtbarkeit
            </label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as 'PRIVATE' | 'FAMILY')}
              className={INPUT}
            >
              <option value="PRIVATE">Privat (nur ich)</option>
              <option value="FAMILY">Familie (alle Familienmitglieder)</option>
            </select>
          </div>
          <div className="space-y-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <LoreEntryEntityTags loreEntry={loreEntry} entityType="CHARACTER" label="Charaktere" entities={characters} />
            <LoreEntryEntityTags loreEntry={loreEntry} entityType="PLACE" label="Orte" entities={places} />
            <LoreEntryEntityTags loreEntry={loreEntry} entityType="ITEM" label="Items" entities={items} />
            <LoreEntryEntityTags loreEntry={loreEntry} entityType="FACTION" label="Fraktionen" entities={factions} />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 px-4 py-2 ${BUTTON_SECONDARY} ${RADIUS}`}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className={`flex-1 px-4 py-2 ${ACCENT} text-white ${RADIUS} transition-colors`}
            >
              Speichern
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
