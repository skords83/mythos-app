'use client'

import React, { useState } from 'react'
import { OVERLAY, MODAL_PANEL, INPUT, BUTTON_SECONDARY, ACCENT, RADIUS, TEXT_PRIMARY, TEXT_SECONDARY } from '@/lib/theme'
import { MastheadDivider } from './MastheadDivider'

interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (title: string, description: string, wordGoal: number) => void
}

export function CreateProjectModal({ isOpen, onClose, onCreate }: CreateProjectModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [wordGoal, setWordGoal] = useState(500)

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCreate(title, description, wordGoal)
    setTitle('')
    setDescription('')
    setWordGoal(500)
    onClose()
  }

  return (
    <div className={OVERLAY}>
      <div className={`${MODAL_PANEL} p-6 w-full max-w-md`}>
        <h2 className={`text-2xl font-display font-light ${TEXT_PRIMARY}`}>
          Neues Projekt
        </h2>
        <MastheadDivider surface="bg-stone-50 dark:bg-zinc-900" className="mb-4" />
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium ${TEXT_SECONDARY} mb-1`}>
              Titel
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={INPUT}
              placeholder="Name deines Projekts"
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
              placeholder="Kurze Beschreibung..."
              rows={3}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${TEXT_SECONDARY} mb-1`}>
              Tagesziel (Wörter)
            </label>
            <input
              type="number"
              value={wordGoal}
              onChange={(e) => setWordGoal(parseInt(e.target.value) || 500)}
              className={INPUT}
              min={100}
              max={10000}
              step={100}
            />
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
              Erstellen
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
