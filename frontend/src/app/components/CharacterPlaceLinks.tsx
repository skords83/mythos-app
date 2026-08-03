'use client'

import React, { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Character, Place } from './types'
import { TEXT_SECONDARY, TEXT_PRIMARY, TEXT_MUTED, INPUT, RADIUS, BUTTON_SECONDARY } from '@/lib/theme'
import { CHARACTER_PLACE_RELATION_TYPES, CUSTOM_TYPE } from './characterPlaceRelations'

function characterLabel(relationType: string): string {
  return CHARACTER_PLACE_RELATION_TYPES.find((r) => r.value === relationType)?.characterLabel ?? relationType
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

interface CharacterPlaceLinksProps {
  character: Character
  places: Place[]
}

export function CharacterPlaceLinks({ character, places }: CharacterPlaceLinksProps) {
  const [relations, setRelations] = useState<Relation[]>([])
  const [error, setError] = useState('')
  const [targetId, setTargetId] = useState('')
  const [relationType, setRelationType] = useState<string>(CHARACTER_PLACE_RELATION_TYPES[0].value)
  const [customType, setCustomType] = useState('')

  const placeRelations = relations.filter((r) => r.counterpart.type === 'PLACE')

  useEffect(() => {
    let cancelled = false
    setError('')
    fetch(`/api/relations?entityType=CHARACTER&entityId=${character.id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => { if (!cancelled) setRelations(data) })
      .catch(() => { if (!cancelled) setError('Ortsverknüpfungen konnten nicht geladen werden.') })
    return () => { cancelled = true }
  }, [character.id])

  const handleAdd = async () => {
    if (!targetId) return
    const type = relationType === CUSTOM_TYPE ? customType.trim() : relationType
    if (!type) return
    try {
      const response = await fetch('/api/relations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType: 'CHARACTER',
          sourceId: character.id,
          targetType: 'PLACE',
          targetId,
          relationType: type,
        }),
      })
      if (!response.ok) {
        setError('Ortsverknüpfung konnte nicht erstellt werden.')
        return
      }
      const created = await response.json()
      setRelations([{ ...created, counterpart: { type: 'PLACE', id: targetId } }, ...relations])
      setTargetId('')
      setCustomType('')
    } catch {
      setError('Ortsverknüpfung konnte nicht erstellt werden.')
    }
  }

  const handleDelete = async (relationId: string) => {
    try {
      const response = await fetch(`/api/relations/${relationId}`, { method: 'DELETE' })
      if (!response.ok) {
        setError('Ortsverknüpfung konnte nicht gelöscht werden.')
        return
      }
      setRelations(relations.filter((r) => r.id !== relationId))
    } catch {
      setError('Ortsverknüpfung konnte nicht gelöscht werden.')
    }
  }

  return (
    <div>
      <label className={`block text-sm font-medium ${TEXT_SECONDARY} mb-1`}>
        Ortsverknüpfungen
      </label>
      {error && <p className="text-xs text-red-600 dark:text-red-400 mb-1">{error}</p>}
      <div className="space-y-1 mb-2">
        {placeRelations.map((r) => {
          const place = places.find((p) => p.id === r.counterpart.id)
          const isSource = r.sourceId === character.id
          return (
            <div
              key={r.id}
              className={`flex items-center justify-between gap-2 text-sm px-2 py-1 bg-zinc-100 dark:bg-zinc-800 ${RADIUS}`}
            >
              <span className={`${TEXT_PRIMARY} truncate min-w-0`}>
                {isSource ? '' : '← '}{characterLabel(r.relationType)} {place?.name ?? '?'}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(r.id)}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )
        })}
        {placeRelations.length === 0 && (
          <p className={`text-xs ${TEXT_MUTED}`}>Noch keine Ortsverknüpfungen.</p>
        )}
      </div>
      {places.length > 0 && (
        <div className="flex flex-wrap gap-2 items-start">
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className={`${INPUT} text-xs flex-1 min-w-[8rem]`}
          >
            <option value="">Ort wählen...</option>
            {places.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
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
            disabled={!targetId || (relationType === CUSTOM_TYPE && !customType.trim())}
            className={`px-3 py-2 text-xs ${BUTTON_SECONDARY} ${RADIUS} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Hinzufügen
          </button>
        </div>
      )}
    </div>
  )
}
