'use client'

import React, { useState } from 'react'
import { Character } from './types'
import { OVERLAY, MODAL_PANEL, INPUT, BUTTON_SECONDARY, ACCENT, RADIUS, TEXT_PRIMARY, TEXT_SECONDARY } from '@/lib/theme'
import CharacterFieldTabs, { CharacterFieldKey } from './CharacterFieldTabs'

interface EditCharacterModalProps {
  isOpen: boolean
  onClose: () => void
  character: Character | null
  onUpdate: (id: string, name: string, appearance: string, personality: string, backstory: string, motivation: string, visibility: 'PRIVATE' | 'FAMILY') => void
}

export function EditCharacterModal({ isOpen, onClose, character, onUpdate }: EditCharacterModalProps) {
  const [name, setName] = useState('')
  const [activeFieldTab, setActiveFieldTab] = useState<CharacterFieldKey>('appearance')
  const [appearance, setAppearance] = useState('')
  const [personality, setPersonality] = useState('')
  const [backstory, setBackstory] = useState('')
  const [motivation, setMotivation] = useState('')
  const [visibility, setVisibility] = useState<'PRIVATE' | 'FAMILY'>('PRIVATE')

  const fieldSetters: Record<CharacterFieldKey, (value: string) => void> = {
    appearance: setAppearance,
    personality: setPersonality,
    backstory: setBackstory,
  }

  React.useEffect(() => {
    if (character) {
      setName(character.name)
      setAppearance(character.appearance || '')
      setPersonality(character.personality || '')
      setBackstory(character.backstory || '')
      setMotivation(character.motivation || '')
      setVisibility(character.visibility)
      setActiveFieldTab('appearance')
    }
  }, [character])

  if (!isOpen || !character) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onUpdate(character.id, name, appearance, personality, backstory, motivation, visibility)
    onClose()
  }

  return (
    <div className={OVERLAY}>
      <div className={`${MODAL_PANEL} p-6 w-full max-w-md`}>
        <h2 className={`text-2xl font-serif font-bold mb-4 ${TEXT_PRIMARY}`}>
          Charakter bearbeiten
        </h2>
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
              placeholder="Name des Charakters"
              required
            />
          </div>
          <CharacterFieldTabs
            activeTab={activeFieldTab}
            onTabChange={setActiveFieldTab}
            values={{ appearance, personality, backstory }}
            onChange={(tab, value) => fieldSetters[tab](value)}
          />
          <div>
            <label className={`block text-sm font-medium ${TEXT_SECONDARY} mb-1`}>
              Motivation
            </label>
            <input
              type="text"
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              className={INPUT}
              placeholder="Was treibt den Charakter an?"
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