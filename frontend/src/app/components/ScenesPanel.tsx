'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronRight, FileText, Pencil, Plus, Trash2 } from 'lucide-react'
import { Character, Item, Place, Scene } from './types'
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
  const { scenes, addScene, updateScene, deleteScene } = useScenes({ chapterId, showError, requestConfirm, onConfirmed })
  const [expandedSceneId, setExpandedSceneId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newOutline, setNewOutline] = useState('')
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editOutline, setEditOutline] = useState('')

  const handleAdd = async () => {
    if (!newName.trim()) return
    await addScene(newName.trim(), newDescription.trim(), 'PRIVATE', newOutline.trim())
    setNewName('')
    setNewDescription('')
    setNewOutline('')
    setShowAddForm(false)
  }

  const startEdit = (scene: Scene) => {
    setEditingSceneId(scene.id)
    setEditName(scene.name)
    setEditDescription(scene.description || '')
    setEditOutline(scene.outline || '')
  }

  const cancelEdit = () => {
    setEditingSceneId(null)
    setEditName('')
    setEditDescription('')
    setEditOutline('')
  }

  const handleSaveEdit = async (scene: Scene) => {
    if (!editName.trim()) return
    await updateScene(scene.id, editName.trim(), editDescription.trim(), scene.visibility, editOutline.trim())
    cancelEdit()
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
                {editingSceneId !== scene.id && (
                  <button
                    type="button"
                    onClick={() => { setExpandedSceneId(scene.id); startEdit(scene) }}
                    className="p-1 text-gray-400 hover:text-indigo-500 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                )}
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
                  {editingSceneId === scene.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Name der Szene"
                        className={`${INPUT} text-sm`}
                      />
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Beschreibung (optional)"
                        rows={2}
                        className={`${INPUT} text-sm`}
                      />
                      <div>
                        <span className={MONO_LABEL_MUTED}>Outline</span>
                        <textarea
                          value={editOutline}
                          onChange={(e) => setEditOutline(e.target.value)}
                          placeholder="Geplanter Ablauf der Szene (optional)"
                          rows={3}
                          className={`${INPUT} text-sm mt-1`}
                        />
                      </div>
                      <div className="flex gap-2">
                        <HairlineButton
                          type="button"
                          emphasised
                          onClick={() => handleSaveEdit(scene)}
                          disabled={!editName.trim()}
                          className="text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Speichern
                        </HairlineButton>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className={`px-3 py-1.5 text-xs ${BUTTON_SECONDARY} ${RADIUS}`}
                        >
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {scene.description && (
                        <p className={`text-xs ${TEXT_SECONDARY}`}>{scene.description}</p>
                      )}
                      {scene.outline && (
                        <div>
                          <span className={MONO_LABEL_MUTED}>Outline</span>
                          <p className={`text-xs ${TEXT_SECONDARY} mt-1 whitespace-pre-wrap`}>{scene.outline}</p>
                        </div>
                      )}
                      <SceneEntityTags scene={scene} entityType="CHARACTER" label="Charaktere" entities={characters} />
                      <SceneEntityTags scene={scene} entityType="PLACE" label="Orte" entities={places} />
                      <SceneEntityTags scene={scene} entityType="ITEM" label="Items" entities={items} />
                    </>
                  )}
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
          <textarea
            value={newOutline}
            onChange={(e) => setNewOutline(e.target.value)}
            placeholder="Outline: geplanter Ablauf der Szene (optional)"
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
              onClick={() => { setShowAddForm(false); setNewName(''); setNewDescription(''); setNewOutline('') }}
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
