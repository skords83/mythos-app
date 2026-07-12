'use client'

import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { ChapterItem } from './ChapterItem'
import { CharacterListItem } from './CharacterListItem'
import { Chapter, Character } from './types'

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
        className={`${focusMode ? 'w-0 opacity-0 overflow-hidden' : rightSidebarOpen ? 'w-80' : 'w-0'} bg-white/80 dark:bg-[#262626]/80 backdrop-blur-md border-l border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 flex flex-col`}
      >
        {!focusMode && rightSidebarOpen && (
          <>
            <button
              onClick={() => setRightSidebarOpen(false)}
              className="absolute left-0 top-1/2 transform -translate-x-full -translate-y-1/2 bg-white dark:bg-[#262626] p-2 rounded-l-lg shadow-md border border-r-0 border-gray-200 dark:border-gray-700"
            >
              <ChevronRight size={20} />
            </button>
            <div className="flex-1 overflow-auto p-4 space-y-6">
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kapitel</h3>
                  <button onClick={onCreateChapter} className="p-1.5 text-[#4A7C59] hover:bg-[#4A7C59]/10 rounded transition-colors" title="Neues Kapitel">
                    <Plus size={18} />
                  </button>
                </div>
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
                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Noch keine Kapitel</p>
                  )}
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Charaktere</h3>
                  <button onClick={onAddCharacterClick} className="p-1.5 text-[#4A7C59] hover:bg-[#4A7C59]/10 rounded transition-colors" title="Neuer Charakter">
                    <Plus size={18} />
                  </button>
                </div>
                <div className="space-y-1">
                  {characters.map((char) => (
                    <CharacterListItem key={char.id} character={char} onClick={() => onSelectCharacter(char)} />
                  ))}
                  {characters.length === 0 && (
                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Noch keine Charaktere</p>
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
          className="fixed right-0 top-1/2 transform -translate-y-1/2 bg-white dark:bg-[#262626] p-2 rounded-l-lg shadow-md border border-r-0 border-gray-200 dark:border-gray-700 z-50"
        >
          <ChevronLeft size={20} />
        </button>
      )}
    </>
  )
}
