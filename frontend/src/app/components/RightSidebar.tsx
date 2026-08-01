'use client'

import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { ChapterItem } from './ChapterItem'
import { CharacterListItem } from './CharacterListItem'
import { SectionHeader } from './SectionHeader'
import { ToolButton } from './ToolButton'
import { Chapter, Character } from './types'
import { SURFACE_ALT, TEXT_MUTED, RADIUS, HAIRLINE, PANEL_BORDER_L, ICON_PROPS } from '@/lib/theme'

interface RightSidebarProps {
  focusMode: boolean
  rightSidebarOpen: boolean
  setRightSidebarOpen: (open: boolean) => void
  chapters: Chapter[]
  selectedChapter: Chapter | null
  onSelectChapter: (chapter: Chapter) => void
  onDeleteChapter: (id: string) => void
  onCreateChapter: () => void
  characters: Character[]
  onSelectCharacter: (character: Character) => void
  onAddCharacterClick: () => void
}

export function RightSidebar({
  focusMode,
  rightSidebarOpen,
  setRightSidebarOpen,
  chapters,
  selectedChapter,
  onSelectChapter,
  onDeleteChapter,
  onCreateChapter,
  characters,
  onSelectCharacter,
  onAddCharacterClick,
}: RightSidebarProps) {
  return (
    <>
      <aside
        className={`${focusMode ? 'w-0 opacity-0 overflow-hidden' : rightSidebarOpen ? 'w-80' : 'w-0'} ${SURFACE_ALT} ${PANEL_BORDER_L} overflow-hidden transition-all duration-300 flex flex-col`}
      >
        {!focusMode && rightSidebarOpen && (
          <>
            <button
              onClick={() => setRightSidebarOpen(false)}
              className={`absolute left-0 top-1/2 transform -translate-x-full -translate-y-1/2 ${SURFACE_ALT} p-2 ${RADIUS} border border-r-0 ${HAIRLINE}`}
            >
              <ChevronRight {...ICON_PROPS} />
            </button>
            <div className="flex-1 overflow-auto p-4 space-y-6">
              <section>
                <SectionHeader
                  label="Kapitel"
                  action={
                    <ToolButton onClick={onCreateChapter} title="Neues Kapitel">
                      <Plus {...ICON_PROPS} />
                    </ToolButton>
                  }
                />
                <div className="space-y-1">
                  {chapters.map((chapter) => (
                    <ChapterItem
                      key={chapter.id}
                      chapter={chapter}
                      active={selectedChapter?.id === chapter.id}
                      onClick={() => onSelectChapter(chapter)}
                      onDelete={(e) => {
                        e.stopPropagation()
                        onDeleteChapter(chapter.id)
                      }}
                    />
                  ))}
                  {chapters.length === 0 && (
                    <p className={`text-sm ${TEXT_MUTED} text-center py-4`}>Noch keine Kapitel</p>
                  )}
                </div>
              </section>

              <section>
                <SectionHeader
                  label="Charaktere"
                  action={
                    <ToolButton onClick={onAddCharacterClick} title="Neuer Charakter">
                      <Plus {...ICON_PROPS} />
                    </ToolButton>
                  }
                />
                <div className="space-y-1">
                  {characters.map((char) => (
                    <CharacterListItem key={char.id} character={char} onClick={() => onSelectCharacter(char)} />
                  ))}
                  {characters.length === 0 && (
                    <p className={`text-sm ${TEXT_MUTED} text-center py-4`}>Noch keine Charaktere</p>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </aside>

      {!focusMode && !rightSidebarOpen && (
        <button
          onClick={() => setRightSidebarOpen(true)}
          className={`fixed right-0 top-1/2 transform -translate-y-1/2 ${SURFACE_ALT} p-2 ${RADIUS} border border-r-0 ${HAIRLINE} z-50`}
        >
          <ChevronLeft {...ICON_PROPS} />
        </button>
      )}
    </>
  )
}
