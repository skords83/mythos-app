'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Chapter, Character, Item, Place, Scene } from './types'
import { SceneEntityTags } from './SceneEntityTags'
import { SectionHeader } from './SectionHeader'
import {
  SURFACE_ALT,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_MUTED,
  INPUT,
  RADIUS,
  HAIRLINE,
  PANEL_BORDER_L,
  MONO_LABEL_MUTED,
} from '@/lib/theme'

interface SceneMetadataPanelProps {
  visible: boolean
  selectedChapter: Chapter | null
  selectedScene: Scene | null
  characters: Character[]
  places: Place[]
  items: Item[]
  onUpdateScene: (scene: Scene, updates: Partial<Pick<Scene, 'name' | 'description' | 'outline' | 'tags' | 'visibility'>>) => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })
}

export function SceneMetadataPanel({
  visible,
  selectedChapter,
  selectedScene,
  characters,
  places,
  items,
  onUpdateScene,
}: SceneMetadataPanelProps) {
  const [title, setTitle] = useState('')
  const [outline, setOutline] = useState('')
  const [notes, setNotes] = useState('')
  const [tagDraft, setTagDraft] = useState('')

  useEffect(() => {
    setTitle(selectedScene?.name ?? '')
    setOutline(selectedScene?.outline ?? '')
    setNotes(selectedScene?.description ?? '')
    setTagDraft('')
  }, [selectedScene?.id])

  const commitTitle = () => {
    if (!selectedScene) return
    const trimmed = title.trim()
    if (trimmed && trimmed !== selectedScene.name) {
      onUpdateScene(selectedScene, { name: trimmed })
    } else {
      setTitle(selectedScene.name)
    }
  }

  const commitOutline = () => {
    if (!selectedScene) return
    if (outline !== (selectedScene.outline ?? '')) {
      onUpdateScene(selectedScene, { outline })
    }
  }

  const commitNotes = () => {
    if (!selectedScene) return
    if (notes !== (selectedScene.description ?? '')) {
      onUpdateScene(selectedScene, { description: notes })
    }
  }

  const addTag = () => {
    if (!selectedScene) return
    const tag = tagDraft.trim().replace(/^#/, '')
    if (!tag || selectedScene.tags.includes(tag)) {
      setTagDraft('')
      return
    }
    onUpdateScene(selectedScene, { tags: [...selectedScene.tags, tag] })
    setTagDraft('')
  }

  const removeTag = (tag: string) => {
    if (!selectedScene) return
    onUpdateScene(selectedScene, { tags: selectedScene.tags.filter((t) => t !== tag) })
  }

  return (
    <aside
      className={`${visible ? 'w-80' : 'w-0 opacity-0 overflow-hidden'} ${SURFACE_ALT} ${PANEL_BORDER_L} overflow-hidden transition-all duration-200 flex flex-col flex-shrink-0`}
    >
      {!selectedChapter && (
        <div className={`flex-1 flex items-center justify-center p-6 text-center text-sm ${TEXT_MUTED}`}>
          Kein Kapitel ausgewählt
        </div>
      )}

      {selectedChapter && !selectedScene && (
        <div className="flex-1 overflow-auto p-4 space-y-4">
          <SectionHeader label="Metadaten" />
          <div>
            <div className={`text-lg font-display font-light ${TEXT_PRIMARY}`}>{selectedChapter.title}</div>
            <div className={`text-sm ${TEXT_MUTED} mt-1`}>{selectedChapter.wordCount} Wörter</div>
          </div>
          <p className={`text-sm ${TEXT_MUTED}`}>
            Wähle eine Szene in der linken Spalte, um Gliederung, Notizen, Verweise und Tags zu bearbeiten.
          </p>
        </div>
      )}

      {selectedChapter && selectedScene && (
        <div className="flex-1 overflow-auto p-4 space-y-6">
          <section className="space-y-2">
            <SectionHeader label="Metadaten" />
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={commitTitle}
              className={`${INPUT} text-sm font-medium`}
              placeholder="Szenen-Titel"
            />
            <div className={`text-sm ${TEXT_MUTED}`}>Wörter (Kapitel): {selectedChapter.wordCount}</div>
            <div className={MONO_LABEL_MUTED}>Erstellt: {formatDate(selectedScene.createdAt)}</div>
            <div className={MONO_LABEL_MUTED}>Bearbeitet: {formatDate(selectedScene.updatedAt)}</div>
          </section>

          <section className="space-y-2">
            <SectionHeader label="Gliederung" />
            <textarea
              value={outline}
              onChange={(e) => setOutline(e.target.value)}
              onBlur={commitOutline}
              rows={4}
              placeholder="Geplanter Ablauf / Zusammenfassung der Szene"
              className={`${INPUT} text-sm`}
            />
          </section>

          <section className="space-y-2">
            <SectionHeader label="Notizen" />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={commitNotes}
              rows={4}
              placeholder="Freie Schreibnotizen"
              className={`${INPUT} text-sm`}
            />
          </section>

          <section className="space-y-3">
            <SectionHeader label="Verweise" />
            <SceneEntityTags scene={selectedScene} entityType="CHARACTER" label="Figuren" entities={characters} />
            <SceneEntityTags scene={selectedScene} entityType="PLACE" label="Orte" entities={places} />
            <SceneEntityTags scene={selectedScene} entityType="ITEM" label="Items" entities={items} />
          </section>

          <section className="space-y-2">
            <SectionHeader label="Tags" />
            <div className="flex flex-wrap gap-1">
              {selectedScene.tags.map((tag) => (
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
              {selectedScene.tags.length === 0 && (
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
          </section>
        </div>
      )}
    </aside>
  )
}
