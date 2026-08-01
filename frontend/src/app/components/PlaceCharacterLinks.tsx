'use client'

import React, { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Character, Place } from './types'
import { TEXT_MUTED, ACCENT_TEXT, INPUT, RADIUS, BUTTON_SECONDARY } from '@/lib/theme'
import { CHARACTER_PLACE_RELATION_TYPES, CUSTOM_TYPE } from './characterPlaceRelations'

function placeLabel(relationType: string): string {
  return CHARACTER_PLACE_RELATION_TYPES.find((r) => r.value === relationType)?.placeLabel ?? relationType
}

interface Relation {
  id: string
  sourceType: 'CHARACTER' | 'PLACE'
  sourceId: string
  targetType: 'CHARACTER' | 'PLACE'
  targetId: string
  relationType: string
  label: string | null
  counterpart: { type: 'CHARACTER' | 'PLACE'; id: string }
}

interface PlaceCharacterLinksProps {
  place: Place
  characters: Character[]
}

export function PlaceCharacterLinks({ place, characters }: PlaceCharacterLinksProps) {
  const [expanded, setExpanded] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [relations, setRelations] = useState<Relation[]>([])
  const [error, setError] = useState('')
  const [sourceId, setSourceId] = useState('')
  const [relationType, setRelationType] = useState<string>(CHARACTER_PLACE_RELATION_TYPES[0].value)
  const [customType, setCustomType] = useState('')

  const characterRelations = relations.filter((r) => r.counterpart.type === 'CHARACTER')

  useEffect(() => {
    if (!expanded || loaded) return
    let cancelled = false
    setError('')
    fetch(`/api/relations?entityType=PLACE&entityId=${place.id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => { if (!cancelled) { setRelations(data); setLoaded(true) } })
      .catch(() => { if (!cancelled) setError('Charaktere konnten nicht geladen werden.') })
    return () => { cancelled = true }
  }, [expanded, loaded, place.id])

  const handleAdd = async () => {
    if (!sourceId) return
    const type = relationType === CUSTOM_TYPE ? customType.trim() : relationType
    if (!type) return
    try {
      const response = await fetch('/api/relations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType: 'CHARACTER',
          sourceId,
          targetType: 'PLACE',
          targetId: place.id,
          relationType: type,
        }),
      })
      if (!response.ok) {
        setError('Verknüpfung konnte nicht erstellt werden.')
        return
      }
      const created = await response.json()
      setRelations([{ ...created, counterpart: { type: 'CHARACTER', id: sourceId } }, ...relations])
      setSourceId('')
      setCustomType('')
    } catch {
      setError('Verknüpfung konnte nicht erstellt werden.')
    }
  }

  const handleDelete = async (relationId: string) => {
    try {
      const response = await fetch(`/api/relations/${relationId}`, { method: 'DELETE' })
      if (!response.ok) {
        setError('Verknüpfung konnte nicht gelöscht werden.')
        return
      }
      setRelations(relations.filter((r) => r.id !== relationId))
    } catch {
      setError('Verknüpfung konnte nicht gelöscht werden.')
    }
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className={`text-xs ${TEXT_MUTED} hover:${ACCENT_TEXT} transition-colors`}
      >
        Charaktere hier verwalten
      </button>
    )
  }

  return (
    <div className="mt-1">
      {error && <p className="text-xs text-red-600 dark:text-red-400 mb-1">{error}</p>}
      <div className="space-y-1 mb-2">
        {characterRelations.map((r) => {
          const character = characters.find((c) => c.id === r.counterpart.id)
          return (
            <div
              key={r.id}
              className={`flex items-center justify-between text-xs px-2 py-1 bg-zinc-100 dark:bg-zinc-800 ${RADIUS}`}
            >
              <span className={TEXT_MUTED}>
                {character?.name ?? '?'} {placeLabel(r.relationType)}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(r.id)}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )
        })}
        {loaded && characterRelations.length === 0 && (
          <p className={`text-xs ${TEXT_MUTED}`}>Noch keine Charaktere hier.</p>
        )}
      </div>
      {characters.length > 0 && (
        <div className="flex flex-wrap gap-2 items-start">
          <select
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            className={`${INPUT} text-xs flex-1 min-w-[8rem]`}
          >
            <option value="">Charakter wählen...</option>
            {characters.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={relationType}
            onChange={(e) => setRelationType(e.target.value)}
            className={`${INPUT} text-xs flex-1 min-w-[8rem]`}
          >
            {CHARACTER_PLACE_RELATION_TYPES.map((r) => (
              <option key={r.value} value={r.value}>{r.characterLabel}</option>
            ))}
            <option value={CUSTOM_TYPE}>Sonstige...</option>
          </select>
          {relationType === CUSTOM_TYPE && (
            <input
              type="text"
              value={customType}
              onChange={(e) => setCustomType(e.target.value)}
              placeholder="Beziehungsart"
              className={`${INPUT} text-xs flex-1 min-w-[8rem]`}
            />
          )}
          <button
            type="button"
            onClick={handleAdd}
            disabled={!sourceId || (relationType === CUSTOM_TYPE && !customType.trim())}
            className={`px-2 py-1 text-xs ${BUTTON_SECONDARY} ${RADIUS} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Hinzufügen
          </button>
        </div>
      )}
    </div>
  )
}
