'use client'

import React, { useState } from 'react'
import { OVERLAY, MODAL_PANEL, INPUT, BUTTON_SECONDARY, ACCENT, RADIUS, TEXT_PRIMARY, TEXT_SECONDARY } from '@/lib/theme'
import CharacterFieldTabs, { CharacterFieldKey } from './CharacterFieldTabs'
import { MastheadDivider } from './MastheadDivider'

interface AddCharacterModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (name: string, appearance: string, personality: string, backstory: string, motivation: string, flaw: string, secrets: string, role: '' | 'PROTAGONIST' | 'ANTAGONIST' | 'MENTOR', visibility: 'PRIVATE' | 'FAMILY') => void
}

export function AddCharacterModal({ isOpen, onClose, onAdd }: AddCharacterModalProps) {
  const [name, setName] = useState('')
  const [activeFieldTab, setActiveFieldTab] = useState<CharacterFieldKey>('appearance')
  const [appearance, setAppearance] = useState('')
  const [personality, setPersonality] = useState('')
  const [backstory, setBackstory] = useState('')
  const [motivation, setMotivation] = useState('')
  const [flaw, setFlaw] = useState('')
  const [secrets, setSecrets] = useState('')
  const [role, setRole] = useState<'' | 'PROTAGONIST' | 'ANTAGONIST' | 'MENTOR'>('')
  const [visibility, setVisibility] = useState<'PRIVATE' | 'FAMILY'>('PRIVATE')

  if (!isOpen) return null

  const fieldSetters: Record<CharacterFieldKey, (value: string) => void> = {
    appearance: setAppearance,
    personality: setPersonality,
    backstory: setBackstory,
    flaw: setFlaw,
    secrets: setSecrets,
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAdd(name, appearance, personality, backstory, motivation, flaw, secrets, role, visibility)
    setName('')
    setAppearance('')
    setPersonality('')
    setBackstory('')
    setMotivation('')
    setFlaw('')
    setSecrets('')
    setRole('')
    setVisibility('PRIVATE')
    onClose()
  }

  return (
    <div className={OVERLAY}>
      <div className={`${MODAL_PANEL} p-6 w-full max-w-md`}>
        <h2 className={`text-2xl font-display font-light ${TEXT_PRIMARY}`}>
          Neuer Charakter
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
              placeholder="Name des Charakters"
              required
            />
          </div>
          <CharacterFieldTabs
            activeTab={activeFieldTab}
            onTabChange={setActiveFieldTab}
            values={{ appearance, personality, backstory, flaw, secrets }}
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
              Rolle
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as '' | 'PROTAGONIST' | 'ANTAGONIST' | 'MENTOR')}
              className={INPUT}
            >
              <option value="">Keine Rolle</option>
              <option value="PROTAGONIST">Protagonist:in</option>
              <option value="ANTAGONIST">Antagonist:in</option>
              <option value="MENTOR">Mentor:in</option>
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
              Hinzufügen
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
