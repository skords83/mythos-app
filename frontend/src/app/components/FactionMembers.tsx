'use client'

import React, { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Character, Faction } from './types'
import { TEXT_MUTED, ACCENT_TEXT, INPUT, BADGE_RADIUS, RADIUS, BUTTON_SECONDARY } from '@/lib/theme'
import { FACTION_MEMBERSHIP_RELATION_TYPES, CUSTOM_TYPE } from './factionMembershipRelations'

function factionLabel(relationType: string): string {
  return FACTION_MEMBERSHIP_RELATION_TYPES.find((r) => r.value === relationType)?.factionLabel ?? relationType
}

interface Relation {
  id: string
  sourceType: 'CHARACTER' | 'FACTION'
  sourceId: string
  targetType: 'CHARACTER' | 'FACTION'
  targetId: string
  relationType: string
  label: string | null
  counterpart: { type: 'CHARACTER' | 'FACTION'; id: string }
}

interface FactionMembersProps {
  faction: Faction
  characters: Character[]
}

export function FactionMembers({ faction, characters }: FactionMembersProps) {
  const [expanded, setExpanded] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [relations, setRelations] = useState<Relation[]>([])
  const [error, setError] = useState('')
  const [sourceId, setSourceId] = useState('')
  const [relationType, setRelationType] = useState<string>(FACTION_MEMBERSHIP_RELATION_TYPES[0].value)
  const [customType, setCustomType] = useState('')

  const memberRelations = relations.filter((r) => r.counterpart.type === 'CHARACTER')

  useEffect(() => {
    if (!expanded || loaded) return
    let cancelled = false
    setError('')
    fetch(`/api/relations?entityType=FACTION&entityId=${faction.id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => { if (!cancelled) { setRelations(data); setLoaded(true) } })
      .catch(() => { if (!cancelled) setError('Mitglieder konnten nicht geladen werden.') })
    return () => { cancelled = true }
  }, [expanded, loaded, faction.id])

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
          targetType: 'FACTION',
          targetId: faction.id,
          relationType: type,
        }),
      })
      if (!response.ok) {
        setError('Mitgliedschaft konnte nicht erstellt werden.')
        return
      }
      const created = await response.json()
      setRelations([{ ...created, counterpart: { type: 'CHARACTER', id: sourceId } }, ...relations])
      setSourceId('')
      setCustomType('')
    } catch {
      setError('Mitgliedschaft konnte nicht erstellt werden.')
    }
  }

  const handleDelete = async (relationId: string) => {
    try {
      const response = await fetch(`/api/relations/${relationId}`, { method: 'DELETE' })
      if (!response.ok) {
        setError('Mitgliedschaft konnte nicht gelöscht werden.')
        return
      }
      setRelations(relations.filter((r) => r.id !== relationId))
    } catch {
      setError('Mitgliedschaft konnte nicht gelöscht werden.')
    }
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className={`text-xs ${TEXT_MUTED} hover:${ACCENT_TEXT} transition-colors`}
      >
        Mitglieder verwalten
      </button>
    )
  }

  return (
    <div className="mt-1">
      {error && <p className="text-xs text-red-600 dark:text-red-400 mb-1">{error}</p>}
      <div className="space-y-1 mb-2">
        {memberRelations.map((r) => {
          const character = characters.find((c) => c.id === r.counterpart.id)
          return (
            <div
              key={r.id}
              className={`flex items-center justify-between text-xs px-2 py-1 bg-zinc-100 dark:bg-zinc-800 ${BADGE_RADIUS}`}
            >
              <span className={TEXT_MUTED}>
                {character?.name ?? '?'} {factionLabel(r.relationType)}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(r.id)}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )
        })}
        {loaded && memberRelations.length === 0 && (
          <p className={`text-xs ${TEXT_MUTED}`}>Noch keine Mitglieder.</p>
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
            {FACTION_MEMBERSHIP_RELATION_TYPES.map((r) => (
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
