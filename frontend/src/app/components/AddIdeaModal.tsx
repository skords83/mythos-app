'use client'

import React, { useState } from 'react'
import { X } from 'lucide-react'
import { OVERLAY, MODAL_PANEL, INPUT, BUTTON_SECONDARY, ACCENT, RADIUS, HAIRLINE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED } from '@/lib/theme'
import { MastheadDivider } from './MastheadDivider'

interface AddIdeaModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (title: string, content: string, tags: string[], visibility: 'PRIVATE' | 'FAMILY') => void
}

export function AddIdeaModal({ isOpen, onClose, onAdd }: AddIdeaModalProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagDraft, setTagDraft] = useState('')
  const [visibility, setVisibility] = useState<'PRIVATE' | 'FAMILY'>('PRIVATE')

  if (!isOpen) return null

  const addTag = () => {
    const tag = tagDraft.trim()
    if (!tag || tags.includes(tag)) {
      setTagDraft('')
      return
    }
    setTags([...tags, tag])
    setTagDraft('')
  }

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAdd(title, content, tags, visibility)
    setTitle('')
    setContent('')
    setTags([])
    setTagDraft('')
    setVisibility('PRIVATE')
    onClose()
  }

  return (
    <div className={OVERLAY}>
      <div className={`${MODAL_PANEL} p-6 w-full max-w-md`}>
        <h2 className={`text-2xl font-display font-light ${TEXT_PRIMARY}`}>
          Neue Idee
        </h2>
        <MastheadDivider />
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
              placeholder="z.B. Ein Zwilling taucht auf"
              required
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${TEXT_SECONDARY} mb-1`}>
              Idee
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className={INPUT}
              rows={4}
              placeholder="Beschreibe die Idee"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${TEXT_SECONDARY} mb-1`}>
              Tags
            </label>
            <div className="flex flex-wrap gap-1 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className={`flex items-center gap-1 text-xs px-2 py-1 bg-zinc-100 dark:bg-zinc-800 ${RADIUS}`}
                >
                  <span className={TEXT_PRIMARY}>#{tag}</span>
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              {tags.length === 0 && (
                <p className={`text-xs ${TEXT_MUTED}`}>Noch keine Tags.</p>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag()
                  }
                }}
                placeholder="Tag hinzufügen"
                className={`${INPUT} text-xs flex-1`}
              />
              <button
                type="button"
                onClick={addTag}
                disabled={!tagDraft.trim()}
                className={`px-3 py-2 text-xs border ${HAIRLINE} ${TEXT_SECONDARY} ${RADIUS} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                +
              </button>
            </div>
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
