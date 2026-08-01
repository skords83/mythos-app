'use client'

import { ChevronDown, ChevronRight, LayoutList, Plus, Trash2 } from 'lucide-react'
import { Chapter, Scene } from './types'
import { SURFACE_ALT, TEXT_PRIMARY, TEXT_MUTED, RADIUS, HAIRLINE, HOVER_SURFACE, ICON_PROPS, MONO_LABEL_MUTED } from '@/lib/theme'
import { SectionHeader } from './SectionHeader'
import { ToolButton } from './ToolButton'

interface ChapterSceneTreeProps {
  visible: boolean
  chapters: Chapter[]
  selectedChapter: Chapter | null
  selectedScene: Scene | null
  expandedChapterIds: Set<string>
  scenesByChapter: Record<string, Scene[]>
  loadingChapterIds: Set<string>
  onToggleChapter: (chapterId: string) => void
  onSelectChapter: (chapter: Chapter) => void
  onSelectScene: (chapter: Chapter, scene: Scene) => void
  onDeleteChapter: (id: string) => void
  onCreateChapter: () => void
  onCreateScene: (chapterId: string) => void
  onDeleteScene: (scene: Scene) => void
  onExpandAll: () => void
}

export function ChapterSceneTree({
  visible,
  chapters,
  selectedChapter,
  selectedScene,
  expandedChapterIds,
  scenesByChapter,
  loadingChapterIds,
  onToggleChapter,
  onSelectChapter,
  onSelectScene,
  onDeleteChapter,
  onCreateChapter,
  onCreateScene,
  onDeleteScene,
  onExpandAll,
}: ChapterSceneTreeProps) {
  return (
    <aside
      className={`${visible ? 'w-72' : 'w-0 opacity-0 overflow-hidden'} ${SURFACE_ALT} border-r ${HAIRLINE} overflow-hidden transition-all duration-200 flex flex-col flex-shrink-0`}
    >
      <div className="p-4">
        <SectionHeader label="Szenen" />
      </div>
      <div className="flex-1 overflow-auto px-2 pb-2 space-y-0.5">
        {chapters.map((chapter) => {
          const isExpanded = expandedChapterIds.has(chapter.id)
          const isLoading = loadingChapterIds.has(chapter.id)
          const scenes = scenesByChapter[chapter.id] ?? []
          const chapterActive = selectedChapter?.id === chapter.id && !selectedScene

          return (
            <div key={chapter.id}>
              <div
                className={`group flex items-center gap-1 pr-1 ${RADIUS} ${
                  chapterActive ? `${TEXT_PRIMARY} border-l-2 border-indigo-600` : `${TEXT_MUTED} border-l-2 border-transparent`
                }`}
              >
                <button
                  type="button"
                  onClick={() => onToggleChapter(chapter.id)}
                  className={`p-1.5 ${RADIUS} ${HOVER_SURFACE} flex-shrink-0`}
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                <button
                  type="button"
                  onClick={() => onSelectChapter(chapter)}
                  className="flex-1 min-w-0 text-left py-2"
                >
                  <div className={`text-sm font-medium truncate ${TEXT_PRIMARY}`}>{chapter.title}</div>
                  <div className={`text-xs ${TEXT_MUTED}`}>{chapter.wordCount} Wörter</div>
                </button>
                <button
                  type="button"
                  onClick={() => onCreateScene(chapter.id)}
                  title="Neue Szene"
                  className={`p-1 ${TEXT_MUTED} hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0`}
                >
                  <Plus size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteChapter(chapter.id)}
                  title="Kapitel löschen"
                  className={`p-1 ${TEXT_MUTED} hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0`}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {isExpanded && (
                <div className="ml-5 space-y-0.5 mb-1">
                  {isLoading && <div className={`text-xs ${TEXT_MUTED} px-3 py-1.5`}>Lädt…</div>}
                  {!isLoading && scenes.length === 0 && (
                    <div className={`text-xs ${TEXT_MUTED} px-3 py-1.5`}>Keine Szenen</div>
                  )}
                  {scenes.map((scene) => {
                    const sceneActive = selectedScene?.id === scene.id
                    return (
                      <div
                        key={scene.id}
                        className={`group flex items-center gap-1 pr-1 ${RADIUS} ${
                          sceneActive ? `${TEXT_PRIMARY} border-l-2 border-indigo-600` : `${TEXT_MUTED} border-l-2 border-transparent`
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onSelectScene(chapter, scene)}
                          className="flex-1 min-w-0 text-left px-3 py-1.5 text-sm truncate"
                        >
                          {scene.name}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteScene(scene)}
                          title="Szene löschen"
                          className={`p-1 ${TEXT_MUTED} hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0`}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
        {chapters.length === 0 && (
          <p className={`text-sm ${TEXT_MUTED} text-center py-4`}>Noch keine Kapitel</p>
        )}
      </div>

      <div className={`p-2 border-t ${HAIRLINE} flex items-center gap-1`}>
        <ToolButton onClick={onCreateChapter} title="Neues Kapitel">
          <Plus {...ICON_PROPS} />
        </ToolButton>
        <ToolButton onClick={onExpandAll} title="Gliederungsübersicht">
          <LayoutList {...ICON_PROPS} />
        </ToolButton>
        <span className={`${MONO_LABEL_MUTED} ml-1`}>Gliederung</span>
      </div>
    </aside>
  )
}
