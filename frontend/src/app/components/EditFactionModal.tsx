'use client'

import React, { useState } from 'react'
import { Character, Faction } from './types'
import { OVERLAY, MODAL_PANEL, INPUT, BUTTON_SECONDARY, ACCENT, RADIUS, TEXT_PRIMARY, TEXT_SECONDARY } from '@/lib/theme'
import { FactionMembers } from './FactionMembers'
import { MastheadDivider } from './MastheadDivider'

interface EditFactionModalProps {
  isOpen: boolean
  onClose: () => void
  faction: Faction | null
  characters: Character[]
  onUpdate: (id: string, name: string, description: string, goal: string, visibility: 'PRIVATE' | 'FAMILY') => void
}

export function EditFactionModal({ isOpen, onClose, faction, characters, onUpdate }: EditFactionModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [goal, setGoal] = useState('')
  const [visibility, setVisibility] = useState<'PRIVATE' | 'FAMILY'>('PRIVATE')

  React.useEffect(() => {
    if (faction) {
      setName(faction.name)
      setDescription(faction.description || '')
      setGoal(faction.goal || '')
      setVisibility(faction.visibility)
    }
  }, [faction])

  if (!isOpen || !faction) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onUpdate(faction.id, name, description, goal, visibility)
    onClose()
  }

  return (
    <div className={OVERLAY}>
      <div className={`${MODAL_PANEL} p-6 w-full max-w-md max-h-[90vh] overflow-y-auto`}>
        <h2 className={`text-2xl font-display font-light ${TEXT_PRIMARY}`}>
          Fraktion bearbeiten
        </h2>
        <MastheadDivider surface="bg-stone-50 dark:bg-zinc-900" className="mb-4" />
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium ${TEXT_SECONDARY} mb-1`}>
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={INPUT}
              placeholder="Name der Fraktion"
              required
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
              placeholder="Struktur, Geschichte, Kennzeichen"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${TEXT_SECONDARY} mb-1`}>
              Ziel
            </label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className={INPUT}
              rows={2}
              placeholder="Wofür setzt sich die Fraktion ein?"
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
          <div>
            <label className={`block text-sm font-medium ${TEXT_SECONDARY} mb-1`}>
              Mitglieder
            </label>
            <FactionMembers faction={faction} characters={characters} />
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
