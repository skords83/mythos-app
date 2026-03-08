'use client'

import React, { useState } from 'react'

interface Character {
  id: string
  name: string
  description: string | null
  motivation: string | null
  projectId: string
  createdAt: string
  updatedAt: string
}

interface EditCharacterModalProps {
  isOpen: boolean
  onClose: () => void
  character: Character | null
  onUpdate: (id: string, name: string, description: string, motivation: string) => void
}

export function EditCharacterModal({ isOpen, onClose, character, onUpdate }: EditCharacterModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [motivation, setMotivation] = useState('')

  React.useEffect(() => {
    if (character) {
      setName(character.name)
      setDescription(character.description || '')
      setMotivation(character.motivation || '')
    }
  }, [character])

  if (!isOpen || !character) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onUpdate(character.id, name, description, motivation)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white dark:bg-[#262626] rounded-xl shadow-xl p-6 w-full max-w-md">
        <h2 className="text-2xl font-serif font-bold mb-4 text-gray-900 dark:text-gray-100">
          Charakter bearbeiten
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1A1B] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#4A7C59] outline-none"
              placeholder="Name des Charakters"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Beschreibung
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1A1B] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#4A7C59] outline-none resize-none"
              placeholder="Aussehen, Hintergrund, etc."
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Motivation
            </label>
            <input
              type="text"
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1A1B] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#4A7C59] outline-none"
              placeholder="Was treibt den Charakter an?"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[#4A7C59] text-white rounded-lg hover:bg-[#3d6349] transition-colors"
            >
              Speichern
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}