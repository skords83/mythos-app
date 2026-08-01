'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronRight, FileText, Plus, Trash2 } from 'lucide-react'
import { Character, Item, Place } from './types'
import { useScenes } from '../hooks/useScenes'
import { SceneEntityTags } from './SceneEntityTags'
import { TEXT_SECONDARY, TEXT_PRIMARY, TEXT_MUTED, MONO_LABEL_MUTED, INPUT, RADIUS, BUTTON_SECONDARY, BORDER, HAIRLINE } from '@/lib/theme'
import { SectionHeader } from './SectionHeader'
import { HairlineButton } from './HairlineButton'

interface ScenesPanelProps {
  chapterId: string
  characters: Character[]
  places: Place[]
  items: Item[]
  showError: (message: string) => void
  requestConfirm: (title: string, message: string, onConfirm: () => void) => void
  onConfirmed: () => void
}

export function ScenesPanel({ chapterId, characters, places, items, showError, requestConfirm, onConfirmed }: ScenesPanelProps) {
  const { scenes, addScene, deleteScene } = useScenes({ chapterId, showError, requestConfirm, onConfirmed })
  const [expandedSceneId, setExpandedSceneId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')

  const handleAdd = async () => {
    if (!newName.trim()) return
    await addScene(newName.trim(), newDescription.trim(), 'PRIVATE')
    setNewName('')
    setNewDescription('')
    setShowAddForm(false)
  }

  return (
    <div className={`mt-10 pt-6 border-t ${HAIRLINE}`}>
      <SectionHeader
        label="Szenen"
        action={
          <button
            type="button"
            onClick={() => setShowAddForm((open) => !open)}
            className={`flex items-center gap-1 px-2 py-1 text-xs ${BUTTON_SECONDARY} ${RADIUS}`}
          >
            <Plus size={14} />
            Szene hinzufügen
          </button>
        }
      />

      {scenes.length === 0 && !showAddForm && (
        <div className="flex flex-col items-center gap-3 py-10">
          <FileText size={96} strokeWidth={1} className="text-zinc-300 dark:text-zinc-700" />
          <span className={MONO_LABEL_MUTED}>Noch keine Szenen in diesem Kapitel</span>
        </div>
      )}

      <div className="space-y-2">
        {scenes.map((scene) => {
          const isExpanded = expandedSceneId === scene.id
          return (
            <div key={scene.id} className={`${BORDER} ${RADIUS}`}>
              <div className="flex items-center gap-2 px-3 py-2">
                <button
                  type="button"
                  onClick={() => setExpandedSceneId(isExpanded ? null : scene.id)}
                  className="flex items-center gap-2 flex-1 min-w-0 text-left"
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span className={`text-xs ${TEXT_MUTED}`}>{scene.order + 1}.</span>
                  <span className={`text-sm font-medium ${TEXT_PRIMARY} truncate`}>{scene.name}</span>
                </button>
                <button
                  type="button"
                  onClick={() => deleteScene(scene.id)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              {isExpanded && (
                <div className="px-3 pb-3 space-y-3">
                  {scene.description && (
                    <p className={`text-xs ${TEXT_SECONDARY}`}>{scene.description}</p>
                  )}
                  <SceneEntityTags scene={scene} entityType="CHARACTER" label="Charaktere" entities={characters} />
                  <SceneEntityTags scene={scene} entityType="PLACE" label="Orte" entities={places} />
                  <SceneEntityTags scene={scene} entityType="ITEM" label="Items" entities={items} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showAddForm && (
        <div className={`mt-3 p-3 ${BORDER} ${RADIUS} space-y-2`}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name der Szene"
            className={`${INPUT} text-sm`}
            autoFocus
          />
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Beschreibung (optional)"
            rows={2}
            className={`${INPUT} text-sm`}
          />
          <div className="flex gap-2">
            <HairlineButton
              type="button"
              emphasised
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Hinzufügen
            </HairlineButton>
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setNewName(''); setNewDescription('') }}
              className={`px-3 py-1.5 text-xs ${BUTTON_SECONDARY} ${RADIUS}`}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
