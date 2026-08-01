'use client'

import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { TimelineEvent } from './types'
import { TEXT_SECONDARY, TEXT_PRIMARY, TEXT_MUTED, INPUT, RADIUS, BUTTON_SECONDARY, ICON_PROPS } from '@/lib/theme'
import { Chip } from './Chip'

const INVOLVES = 'INVOLVES'

interface Relation {
  id: string
  sourceType: 'EVENT' | 'CHARACTER' | 'PLACE' | 'ITEM' | 'FACTION'
  sourceId: string
  targetType: 'EVENT' | 'CHARACTER' | 'PLACE' | 'ITEM' | 'FACTION'
  targetId: string
  relationType: string
  label: string | null
  counterpart: { type: 'EVENT' | 'CHARACTER' | 'PLACE' | 'ITEM' | 'FACTION'; id: string }
}

interface EntityOption {
  id: string
  name: string
}

interface TimelineEventEntityTagsProps {
  timelineEvent: TimelineEvent
  entityType: 'CHARACTER' | 'PLACE' | 'ITEM' | 'FACTION'
  label: string
  entities: EntityOption[]
}

export function TimelineEventEntityTags({ timelineEvent, entityType, label, entities }: TimelineEventEntityTagsProps) {
  const [relations, setRelations] = useState<Relation[]>([])
  const [error, setError] = useState('')
  const [targetId, setTargetId] = useState('')

  const entityRelations = relations.filter((r) => r.counterpart.type === entityType)

  useEffect(() => {
    let cancelled = false
    setError('')
    fetch(`/api/relations?entityType=EVENT&entityId=${timelineEvent.id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => { if (!cancelled) setRelations(data) })
      .catch(() => { if (!cancelled) setError('Verknüpfungen konnten nicht geladen werden.') })
    return () => { cancelled = true }
  }, [timelineEvent.id])

  const handleAdd = async () => {
    if (!targetId) return
    try {
      const response = await fetch('/api/relations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType: 'EVENT',
          sourceId: timelineEvent.id,
          targetType: entityType,
          targetId,
          relationType: INVOLVES,
        }),
      })
      if (!response.ok) {
        setError('Verknüpfung konnte nicht erstellt werden.')
        return
      }
      const created = await response.json()
      setRelations([{ ...created, counterpart: { type: entityType, id: targetId } }, ...relations])
      setTargetId('')
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

  return (
    <div>
      <label className={`block text-xs font-medium ${TEXT_SECONDARY} mb-1`}>
        {label}
      </label>
      {error && <p className="text-xs text-red-600 dark:text-red-400 mb-1">{error}</p>}
      <div className="flex flex-wrap gap-1 mb-2">
        {entityRelations.map((r) => {
          const entity = entities.find((e) => e.id === r.counterpart.id)
          return (
            <Chip key={r.id} className={TEXT_PRIMARY}>
              {entity?.name ?? '?'}
              <button
                type="button"
                onClick={() => handleDelete(r.id)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={12} strokeWidth={ICON_PROPS.strokeWidth} />
              </button>
            </Chip>
          )
        })}
        {entityRelations.length === 0 && (
          <p className={`text-xs ${TEXT_MUTED}`}>Keine {label.toLowerCase()} verknüpft.</p>
        )}
      </div>
      {entities.length > 0 && (
        <div className="flex gap-2">
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className={`${INPUT} text-xs flex-1`}
          >
            <option value="">wählen...</option>
            {entities.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!targetId}
            className={`px-3 py-2 text-xs ${BUTTON_SECONDARY} ${RADIUS} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            +
          </button>
        </div>
      )}
    </div>
  )
}
