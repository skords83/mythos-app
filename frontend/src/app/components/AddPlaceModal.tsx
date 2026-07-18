'use client'

import React, { useState } from 'react'
import { OVERLAY, MODAL_PANEL, INPUT, BUTTON_SECONDARY, ACCENT, RADIUS, TEXT_PRIMARY, TEXT_SECONDARY } from '@/lib/theme'
import { Place } from './types'

interface AddPlaceModalProps {
  isOpen: boolean
  places: Place[]
  onClose: () => void
  onAdd: (name: string, description: string, location: string, climate: string, importance: string, visibility: 'PRIVATE' | 'FAMILY', parentId: string | null) => void
}

export function AddPlaceModal({ isOpen, places, onClose, onAdd }: AddPlaceModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [climate, setClimate] = useState('')
  const [importance, setImportance] = useState('')
  const [visibility, setVisibility] = useState<'PRIVATE' | 'FAMILY'>('PRIVATE')
  const [parentId, setParentId] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAdd(name, description, location, climate, importance, visibility, parentId || null)
    setName('')
    setDescription('')
    setLocation('')
    setClimate('')
    setImportance('')
    setVisibility('PRIVATE')
    setParentId('')
    onClose()
  }

  return (
    <div className={OVERLAY}>
      <div className={`${MODAL_PANEL} p-6 w-full max-w-md`}>
        <h2 className={`text-2xl font-serif font-bold mb-4 ${TEXT_PRIMARY}`}>
          Neuer Ort
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
              placeholder="z.B. Eldoria, die Hauptstadt"
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
              className={`${INPUT} resize-none`}
              placeholder="Beschreibung des Ortes..."
              rows={3}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${TEXT_SECONDARY} mb-1`}>
              Standort
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className={INPUT}
              placeholder="z.B. Nördlich der Berge"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${TEXT_SECONDARY} mb-1`}>
              Klima
            </label>
            <input
              type="text"
              value={climate}
              onChange={(e) => setClimate(e.target.value)}
              className={INPUT}
              placeholder="z.B. Gemäßigt, warm"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${TEXT_SECONDARY} mb-1`}>
              Bedeutung
            </label>
            <select
              value={importance}
              onChange={(e) => setImportance(e.target.value)}
              className={INPUT}
            >
              <option value="">Bedeutung wählen</option>
              <option value="Hauptstadt">Hauptstadt</option>
              <option value="Stadt">Stadt</option>
              <option value="Dorf">Dorf</option>
              <option value="Tempel">Tempel</option>
              <option value="Festung">Festung</option>
              <option value="Wald">Wald</option>
              <option value="Berg">Berg</option>
              <option value="Höhle">Höhle</option>
            </select>
          </div>
          <div>
            <label className={`block text-sm font-medium ${TEXT_SECONDARY} mb-1`}>
              Übergeordneter Ort
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className={INPUT}
            >
              <option value="">Kein übergeordneter Ort</option>
              {places.map((place) => (
                <option key={place.id} value={place.id}>{place.name}</option>
              ))}
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
