'use client'

import React, { useState } from 'react'
import { Place } from './types'
import { OVERLAY, MODAL_PANEL, INPUT, BUTTON_SECONDARY, ACCENT, RADIUS, TEXT_PRIMARY, TEXT_SECONDARY } from '@/lib/theme'
import PlaceFieldTabs, { PlaceFieldKey } from './PlaceFieldTabs'
import { MastheadDivider } from './MastheadDivider'

interface EditPlaceModalProps {
  isOpen: boolean
  onClose: () => void
  place: Place | null
  onUpdate: (id: string, name: string, description: string, location: string, climate: string, importance: string, history: string, politics: string, sensoryDetails: string, visibility: 'PRIVATE' | 'FAMILY') => void
}

export function EditPlaceModal({ isOpen, onClose, place, onUpdate }: EditPlaceModalProps) {
  const [name, setName] = useState('')
  const [activeFieldTab, setActiveFieldTab] = useState<PlaceFieldKey>('description')
  const [description, setDescription] = useState('')
  const [history, setHistory] = useState('')
  const [politics, setPolitics] = useState('')
  const [sensoryDetails, setSensoryDetails] = useState('')
  const [location, setLocation] = useState('')
  const [climate, setClimate] = useState('')
  const [importance, setImportance] = useState('')
  const [visibility, setVisibility] = useState<'PRIVATE' | 'FAMILY'>('PRIVATE')

  const fieldSetters: Record<PlaceFieldKey, (value: string) => void> = {
    description: setDescription,
    history: setHistory,
    politics: setPolitics,
    sensoryDetails: setSensoryDetails,
  }

  React.useEffect(() => {
    if (place) {
      setName(place.name)
      setDescription(place.description || '')
      setHistory(place.history || '')
      setPolitics(place.politics || '')
      setSensoryDetails(place.sensoryDetails || '')
      setLocation(place.location || '')
      setClimate(place.climate || '')
      setImportance(place.importance || '')
      setVisibility(place.visibility)
      setActiveFieldTab('description')
    }
  }, [place])

  if (!isOpen || !place) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onUpdate(place.id, name, description, location, climate, importance, history, politics, sensoryDetails, visibility)
    onClose()
  }

  return (
    <div className={OVERLAY}>
      <div className={`${MODAL_PANEL} p-6 w-full max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden`}>
        <h2 className={`text-2xl font-display font-light ${TEXT_PRIMARY}`}>
          Ort bearbeiten
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
              placeholder="Name des Ortes"
              required
            />
          </div>
          <PlaceFieldTabs
            activeTab={activeFieldTab}
            onTabChange={setActiveFieldTab}
            values={{ description, history, politics, sensoryDetails }}
            onChange={(tab, value) => fieldSetters[tab](value)}
          />
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
