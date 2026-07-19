'use client'

import React, { useState, useRef } from 'react'
import { Character, Place } from './types'
import { OVERLAY, MODAL_PANEL, INPUT, BUTTON_SECONDARY, ACCENT, RADIUS, TEXT_PRIMARY, TEXT_SECONDARY } from '@/lib/theme'
import CharacterFieldTabs, { CharacterFieldKey } from './CharacterFieldTabs'
import { CharacterRelationships } from './CharacterRelationships'
import { CharacterPlaceLinks } from './CharacterPlaceLinks'

interface EditCharacterModalProps {
  isOpen: boolean
  onClose: () => void
  character: Character | null
  characters: Character[]
  places: Place[]
  onUpdate: (id: string, name: string, appearance: string, personality: string, backstory: string, motivation: string, flaw: string, secrets: string, visibility: 'PRIVATE' | 'FAMILY', avatarUrl?: string | null) => void
}

export function EditCharacterModal({ isOpen, onClose, character, characters, places, onUpdate }: EditCharacterModalProps) {
  const [name, setName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [activeFieldTab, setActiveFieldTab] = useState<CharacterFieldKey>('appearance')
  const [appearance, setAppearance] = useState('')
  const [personality, setPersonality] = useState('')
  const [backstory, setBackstory] = useState('')
  const [motivation, setMotivation] = useState('')
  const [flaw, setFlaw] = useState('')
  const [secrets, setSecrets] = useState('')
  const [visibility, setVisibility] = useState<'PRIVATE' | 'FAMILY'>('PRIVATE')

  const fieldSetters: Record<CharacterFieldKey, (value: string) => void> = {
    appearance: setAppearance,
    personality: setPersonality,
    backstory: setBackstory,
    flaw: setFlaw,
    secrets: setSecrets,
  }

  React.useEffect(() => {
    if (character) {
      setName(character.name)
      setAppearance(character.appearance || '')
      setPersonality(character.personality || '')
      setBackstory(character.backstory || '')
      setMotivation(character.motivation || '')
      setFlaw(character.flaw || '')
      setSecrets(character.secrets || '')
      setVisibility(character.visibility)
      setAvatarUrl(character.avatarUrl || null)
      setActiveFieldTab('appearance')
    }
  }, [character])

  if (!isOpen || !character) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onUpdate(character.id, name, appearance, personality, backstory, motivation, flaw, secrets, visibility, avatarUrl)
    onClose()
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    setUploadingAvatar(true)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) {
        setAvatarUrl(data.url)
      }
    } catch (err) {
      console.error('Avatar-Upload fehlgeschlagen:', err)
    } finally {
      setUploadingAvatar(false)
      e.target.value = ''
    }
  }

  return (
    <div className={OVERLAY}>
      <div className={`${MODAL_PANEL} p-6 w-full max-w-md max-h-[90vh] overflow-y-auto`}>
        <h2 className={`text-2xl font-serif font-bold mb-4 ${TEXT_PRIMARY}`}>
          Charakter bearbeiten
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 ${RADIUS} ${ACCENT} flex items-center justify-center text-white font-semibold text-xl flex-shrink-0 overflow-hidden`}>
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
              ) : (
                name.charAt(0)
              )}
            </div>
            <div>
              <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className={`px-3 py-1.5 text-sm ${BUTTON_SECONDARY} ${RADIUS} disabled:opacity-50`}
              >
                {uploadingAvatar ? 'Lädt hoch…' : avatarUrl ? 'Avatar ändern' : 'Avatar hochladen'}
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl(null)}
                  className={`ml-2 px-3 py-1.5 text-sm ${TEXT_SECONDARY} hover:underline`}
                >
                  Entfernen
                </button>
              )}
            </div>
          </div>
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
          <CharacterRelationships character={character} characters={characters} />
          <CharacterPlaceLinks character={character} places={places} />
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