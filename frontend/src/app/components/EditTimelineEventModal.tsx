'use client'

import React, { useState } from 'react'
import { Character, Place, Item, Faction, TimelineEvent } from './types'
import { OVERLAY, MODAL_PANEL, INPUT, BUTTON_SECONDARY, ACCENT, RADIUS, TEXT_PRIMARY, TEXT_SECONDARY } from '@/lib/theme'
import { TimelineEventEntityTags } from './TimelineEventEntityTags'

interface EditTimelineEventModalProps {
  isOpen: boolean
  onClose: () => void
  timelineEvent: TimelineEvent | null
  characters: Character[]
  places: Place[]
  items: Item[]
  factions: Faction[]
  onUpdate: (
    id: string,
    title: string,
    description: string,
    date: string,
    type: 'LORE' | 'PLOT',
    visibility: 'PRIVATE' | 'FAMILY'
  ) => void
}

export function EditTimelineEventModal({
  isOpen,
  onClose,
  timelineEvent,
  characters,
  places,
  items,
  factions,
  onUpdate,
}: EditTimelineEventModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [type, setType] = useState<'LORE' | 'PLOT'>('PLOT')
  const [visibility, setVisibility] = useState<'PRIVATE' | 'FAMILY'>('PRIVATE')

  React.useEffect(() => {
    if (timelineEvent) {
      setTitle(timelineEvent.title)
      setDescription(timelineEvent.description || '')
      setDate(timelineEvent.date || '')
      setType(timelineEvent.type)
      setVisibility(timelineEvent.visibility)
    }
  }, [timelineEvent])

  if (!isOpen || !timelineEvent) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onUpdate(timelineEvent.id, title, description, date, type, visibility)
    onClose()
  }

  return (
    <div className={OVERLAY}>
      <div className={`${MODAL_PANEL} p-6 w-full max-w-md max-h-[90vh] overflow-y-auto`}>
        <h2 className={`text-2xl font-serif font-bold mb-4 ${TEXT_PRIMARY}`}>
          Ereignis bearbeiten
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
              placeholder="Titel des Ereignisses"
              required
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${TEXT_SECONDARY} mb-1`}>
              Datum
            </label>
            <input
              type="text"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={INPUT}
              placeholder="z.B. Jahr 312 der dritten Ära"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${TEXT_SECONDARY} mb-1`}>
              Beschreibung
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={INPUT}
              rows={3}
              placeholder="Was ist passiert?"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${TEXT_SECONDARY} mb-1`}>
              Art
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'LORE' | 'PLOT')}
              className={INPUT}
            >
              <option value="PLOT">Plot (Handlung)</option>
              <option value="LORE">Lore (Hintergrundgeschichte)</option>
            </select>
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
            <TimelineEventEntityTags timelineEvent={timelineEvent} entityType="CHARACTER" label="Charaktere" entities={characters} />
            <TimelineEventEntityTags timelineEvent={timelineEvent} entityType="PLACE" label="Orte" entities={places} />
            <TimelineEventEntityTags timelineEvent={timelineEvent} entityType="ITEM" label="Items" entities={items} />
            <TimelineEventEntityTags timelineEvent={timelineEvent} entityType="FACTION" label="Fraktionen" entities={factions} />
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
