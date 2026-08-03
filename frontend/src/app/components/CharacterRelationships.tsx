'use client'

import React, { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Character } from './types'
import { TEXT_SECONDARY, TEXT_PRIMARY, TEXT_MUTED, INPUT, RADIUS, BUTTON_SECONDARY } from '@/lib/theme'

const RELATION_TYPES: { value: string; label: string }[] = [
  { value: 'PARENT_OF', label: 'Elternteil von' },
  { value: 'CHILD_OF', label: 'Kind von' },
  { value: 'SIBLING_OF', label: 'Geschwister von' },
  { value: 'PARTNER_OF', label: 'Partner*in von' },
  { value: 'FRIEND_OF', label: 'Freund*in von' },
  { value: 'RIVAL_OF', label: 'Rivale/Rivalin von' },
  { value: 'ENEMY_OF', label: 'Feind*in von' },
  { value: 'MENTOR_OF', label: 'Mentor*in von' },
]
const CUSTOM_TYPE = 'CUSTOM'

function relationLabel(relationType: string): string {
  return RELATION_TYPES.find((r) => r.value === relationType)?.label ?? relationType
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

interface CharacterRelationshipsProps {
  character: Character
  characters: Character[]
}

export function CharacterRelationships({ character, characters }: CharacterRelationshipsProps) {
  const [relations, setRelations] = useState<Relation[]>([])
  const [error, setError] = useState('')
  const [targetId, setTargetId] = useState('')
  const [relationType, setRelationType] = useState<string>(RELATION_TYPES[0].value)
  const [customType, setCustomType] = useState('')

  const otherCharacters = characters.filter((c) => c.id !== character.id)
  const characterRelations = relations.filter((r) => r.counterpart.type === 'CHARACTER')

  useEffect(() => {
    let cancelled = false
    setError('')
    fetch(`/api/relations?entityType=CHARACTER&entityId=${character.id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => { if (!cancelled) setRelations(data) })
      .catch(() => { if (!cancelled) setError('Beziehungen konnten nicht geladen werden.') })
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
          targetType: 'CHARACTER',
          targetId,
          relationType: type,
        }),
      })
      if (!response.ok) {
        setError('Beziehung konnte nicht erstellt werden.')
        return
      }
      const created = await response.json()
      setRelations([{ ...created, counterpart: { type: 'CHARACTER', id: targetId } }, ...relations])
      setTargetId('')
      setCustomType('')
    } catch {
      setError('Beziehung konnte nicht erstellt werden.')
    }
  }

  const handleDelete = async (relationId: string) => {
    try {
      const response = await fetch(`/api/relations/${relationId}`, { method: 'DELETE' })
      if (!response.ok) {
        setError('Beziehung konnte nicht gelöscht werden.')
        return
      }
      setRelations(relations.filter((r) => r.id !== relationId))
    } catch {
      setError('Beziehung konnte nicht gelöscht werden.')
    }
  }

  return (
    <div>
      <label className={`block text-sm font-medium ${TEXT_SECONDARY} mb-1`}>
        Beziehungen
      </label>
      {error && <p className="text-xs text-red-600 dark:text-red-400 mb-1">{error}</p>}
      <div className="space-y-1 mb-2">
        {characterRelations.map((r) => {
          const counterpart = characters.find((c) => c.id === r.counterpart.id)
          const isSource = r.sourceId === character.id
          return (
            <div
              key={r.id}
              className={`flex items-center justify-between gap-2 text-sm px-2 py-1 bg-zinc-100 dark:bg-zinc-800 ${RADIUS}`}
            >
              <span className={`${TEXT_PRIMARY} truncate min-w-0`}>
                {isSource ? '' : '← '}{relationLabel(r.relationType)} {counterpart?.name ?? '?'}
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
        {characterRelations.length === 0 && (
          <p className={`text-xs ${TEXT_MUTED}`}>Noch keine Beziehungen.</p>
        )}
      </div>
      {otherCharacters.length > 0 && (
        <div className="flex flex-wrap gap-2 items-start">
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className={`${INPUT} text-xs flex-1 min-w-[8rem]`}
          >
            <option value="">Charakter wählen...</option>
            {otherCharacters.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={relationType}
            onChange={(e) => setRelationType(e.target.value)}
            className={`${INPUT} text-xs flex-1 min-w-[8rem]`}
          >
            {RELATION_TYPES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
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
