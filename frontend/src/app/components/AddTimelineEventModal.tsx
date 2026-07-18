'use client'

import React, { useState } from 'react'
import { OVERLAY, MODAL_PANEL, INPUT, BUTTON_SECONDARY, ACCENT, RADIUS, TEXT_PRIMARY, TEXT_SECONDARY } from '@/lib/theme'

interface AddTimelineEventModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (title: string, description: string, date: string, type: 'LORE' | 'PLOT', visibility: 'PRIVATE' | 'FAMILY') => void
}

export function AddTimelineEventModal({ isOpen, onClose, onAdd }: AddTimelineEventModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [type, setType] = useState<'LORE' | 'PLOT'>('PLOT')
  const [visibility, setVisibility] = useState<'PRIVATE' | 'FAMILY'>('PRIVATE')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAdd(title, description, date, type, visibility)
    setTitle('')
    setDescription('')
    setDate('')
    setType('PLOT')
    setVisibility('PRIVATE')
    onClose()
  }

  return (
    <div className={OVERLAY}>
      <div className={`${MODAL_PANEL} p-6 w-full max-w-md`}>
        <h2 className={`text-2xl font-serif font-bold mb-4 ${TEXT_PRIMARY}`}>
          Neues Ereignis
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium ${TEXT_SECONDARY} mb-1`}>
              Titel *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={INPUT}
              placeholder="Titel des Ereignisses"
              required
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${TEXT_SECONDARY} mb-1`}>
              Datum
            </label>
            <input
              type="text"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={INPUT}
              placeholder="z.B. Jahr 312 der dritten Ära"
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
              placeholder="Was ist passiert?"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${TEXT_SECONDARY} mb-1`}>
              Art
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'LORE' | 'PLOT')}
              className={INPUT}
            >
              <option value="PLOT">Plot (Handlung)</option>
              <option value="LORE">Lore (Hintergrundgeschichte)</option>
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
