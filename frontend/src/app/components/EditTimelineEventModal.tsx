'use client'

import React, { useState } from 'react'
import { Character, Place, Item, Faction, TimelineEvent } from './types'
import { OVERLAY, MODAL_PANEL, INPUT, BUTTON_SECONDARY, ACCENT, RADIUS, TEXT_PRIMARY, TEXT_SECONDARY } from '@/lib/theme'
import { TimelineEventEntityTags } from './TimelineEventEntityTags'
import { MastheadDivider } from './MastheadDivider'

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
    visibility: 'PRIVATE' | 'FAMILY',
    details?: {duration:string;order:number;chapterId:string|null}
  ) => Promise<boolean | void> | void
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
  const [chapterId, setChapterId] = useState('')
  const [chapterOptions, setChapterOptions] = useState<{id:string;title:string}[]>([])
  React.useEffect(() => {
    let cancelled = false
    setChapterOptions([])
    if (isOpen && timelineEvent?.projectId) fetch(`/api/projects/${timelineEvent.projectId}/story`).then(r => { if (!r.ok) throw new Error(); return r.json() }).then(d => { if (!cancelled) setChapterOptions(d.chapters) }).catch(() => { if (!cancelled) setSaveError('Kapitel konnten nicht geladen werden.') })
    return () => { cancelled = true }
  }, [isOpen, timelineEvent?.projectId])
  const [duration, setDuration] = useState('')
  const [order, setOrder] = useState(0)
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [type, setType] = useState<'LORE' | 'PLOT'>('PLOT')
  const [visibility, setVisibility] = useState<'PRIVATE' | 'FAMILY'>('PRIVATE')

  React.useEffect(() => {
    if (timelineEvent) {
      setChapterId(timelineEvent.chapterId || '')
      setDuration(timelineEvent.duration || '')
      setOrder(timelineEvent.order)
      setTitle(timelineEvent.title)
      setDescription(timelineEvent.description || '')
      setDate(timelineEvent.date || '')
      setType(timelineEvent.type)
      setVisibility(timelineEvent.visibility)
    }
  }, [timelineEvent])

  if (!isOpen || !timelineEvent) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setSaveError('')
    try { const ok = await onUpdate(timelineEvent.id, title, description, date, type, visibility, {duration,order,chapterId:chapterId || null}); if (ok === false) setSaveError('Ereignis konnte nicht gespeichert werden.'); else onClose() } catch { setSaveError('Ereignis konnte nicht gespeichert werden.') } finally { setSaving(false) }
  }

  return (
    <div className={OVERLAY}>
      <div className={`${MODAL_PANEL} p-6 w-full max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden`}>
        <h2 className={`text-2xl font-display font-light ${TEXT_PRIMARY}`}>
          Ereignis bearbeiten
        </h2>
        <MastheadDivider surface="bg-stone-50 dark:bg-zinc-900" className="mb-4" />
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm">Kapitel (optional)<select className={INPUT} value={chapterId} onChange={e=>setChapterId(e.target.value)}><option value="">Keine Zuordnung</option>{chapterId && !chapterOptions.some(c=>c.id===chapterId) && <option value={chapterId}>Zugeordnetes Kapitel</option>}{chapterOptions.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
          <label className="block text-sm">Dauer (optional)<input className={INPUT} value={duration} maxLength={100} onChange={e=>setDuration(e.target.value)} placeholder="z. B. drei Tage" /></label>
          <label className="block text-sm">Chronologische Position<input className={INPUT} type="number" min={0} max={1000000} value={order} onChange={e=>setOrder(Number(e.target.value))}/></label>
          {saveError && <p role="alert">{saveError}</p>}
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
              type="submit" disabled={saving}
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
