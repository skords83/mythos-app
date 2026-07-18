'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Book, Plus, Save } from 'lucide-react'
import { ACCENT, RADIUS, SURFACE, SURFACE_ALT, TEXT_PRIMARY, TEXT_MUTED } from '@/lib/theme'
import {
  QuickCardState,
  PlaceQuickCardState,
  ItemQuickCardState,
  ThemeToggle,
  FocusToggle,
  CreateProjectModal,
  AddCharacterModal,
  EditCharacterModal,
  AddPlaceModal,
  AddItemModal,
  EditItemModal,
  AddFactionModal,
  EditFactionModal,
  AddTimelineEventModal,
  EditTimelineEventModal,
  AddLoreEntryModal,
  EditLoreEntryModal,
  EditProjectModal,
  ExportModal,
  CharacterQuickCard,
  PlaceQuickCard,
  ItemQuickCard,
  ConfirmDialog,
  Toast,
  LeftSidebar,
  RightSidebar,
  ManuscriptView,
  CharactersView,
  PlacesView,
  ItemsView,
  FactionsView,
  TimelineView,
  LoreView,
  NotesView,
  SearchModal,
} from './components'
import { useAuth } from './hooks/useAuth'
import { useNotifications } from './hooks/useNotifications'
import { useProjects } from './hooks/useProjects'
import { useChapters } from './hooks/useChapters'
import { useCharacters } from './hooks/useCharacters'
import { usePlaces } from './hooks/usePlaces'
import { useItems } from './hooks/useItems'
import { useFactions } from './hooks/useFactions'
import { useTimelineEvents } from './hooks/useTimelineEvents'
import { useLoreEntries } from './hooks/useLoreEntries'
import { useNotes } from './hooks/useNotes'
import { useSearch } from './hooks/useSearch'
import { ActiveTab } from './components/LeftSidebar'

// Main Page Component
export default function Page() {
  const router = useRouter()
  const { isCheckingAuth } = useAuth()
  const { errorToast, setErrorToast, confirmDialog, setConfirmDialog, showError, requestConfirm } = useNotifications()
  const onConfirmed = () => setConfirmDialog(null)

  const { projects, selectedProject, setSelectedProject, isLoading, createProject, updateProject, deleteProject } =
    useProjects({ isCheckingAuth, showError })

  const {
    chapters,
    selectedChapter,
    setSelectedChapter,
    editorContent,
    setEditorContent,
    isSaving,
    autoSaveStatus,
    editorSetContentRef,
    setChapterTitle,
    createChapter,
    saveChapter,
    deleteChapter,
    switchChapter,
    pendingDraft,
    restoreDraft,
    discardDraft,
  } = useChapters({ selectedProject, showError, requestConfirm, onConfirmed })

  const { characters, editingCharacter, setEditingCharacter, addCharacter, updateCharacter, deleteCharacter } =
    useCharacters({ selectedProject, showError, requestConfirm, onConfirmed })

  const { places, addPlace, deletePlace, updatePlaceParent, addPlaceImage, deletePlaceImage } = usePlaces({ selectedProject, showError, requestConfirm, onConfirmed })

  const { items, editingItem, setEditingItem, addItem, updateItem, deleteItem } =
    useItems({ selectedProject, showError, requestConfirm, onConfirmed })

  const { factions, editingFaction, setEditingFaction, addFaction, updateFaction, deleteFaction } =
    useFactions({ selectedProject, showError, requestConfirm, onConfirmed })

  const { timelineEvents, editingTimelineEvent, setEditingTimelineEvent, addTimelineEvent, updateTimelineEvent, deleteTimelineEvent } =
    useTimelineEvents({ selectedProject, showError, requestConfirm, onConfirmed })

  const { loreEntries, editingLoreEntry, setEditingLoreEntry, addLoreEntry, updateLoreEntry, deleteLoreEntry } =
    useLoreEntries({ selectedProject, showError, requestConfirm, onConfirmed })

  const { notes, addNote, updateNote, deleteNote } =
    useNotes({ selectedChapterId: selectedChapter?.id, showError, requestConfirm, onConfirmed })

  const { query: searchQuery, setQuery: setSearchQuery, results: searchResults, isSearching } =
    useSearch(selectedProject?.id)

  const [activeTab, setActiveTab] = useState<ActiveTab>('manuscript')
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true)
  const [focusMode, setFocusMode] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCharacterModal, setShowCharacterModal] = useState(false)
  const [showPlaceModal, setShowPlaceModal] = useState(false)
  const [showItemModal, setShowItemModal] = useState(false)
  const [showFactionModal, setShowFactionModal] = useState(false)
  const [showTimelineEventModal, setShowTimelineEventModal] = useState(false)
  const [showLoreEntryModal, setShowLoreEntryModal] = useState(false)
  const [showEditProjectModal, setShowEditProjectModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [quickCard, setQuickCard] = useState<QuickCardState>({
    character: null,
    position: { x: 0, y: 0 },
    visible: false
  })
  const [placeQuickCard, setPlaceQuickCard] = useState<PlaceQuickCardState>({
    place: null,
    position: { x: 0, y: 0 },
    visible: false
  })
  const [itemQuickCard, setItemQuickCard] = useState<ItemQuickCardState>({
    item: null,
    position: { x: 0, y: 0 },
    visible: false
  })

  const totalWordCount = Array.isArray(chapters) ? chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0) : 0

  useEffect(() => {
    if (!selectedProject) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearchModal(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedProject])

  const handleSelectSearchChapter = (chapterId: string) => {
    const chapter = chapters.find(ch => ch.id === chapterId)
    if (chapter) {
      switchChapter(chapter)
      setActiveTab('manuscript')
    }
  }

  const handleSelectSearchCharacter = (characterId: string) => {
    const character = characters.find(c => c.id === characterId)
    if (character) {
      setEditingCharacter(character)
      setActiveTab('characters')
    }
  }

  const handleSelectSearchNote = (chapterId: string) => {
    const chapter = chapters.find(ch => ch.id === chapterId)
    if (chapter) {
      switchChapter(chapter)
      setActiveTab('notes')
    }
  }

  if (isLoading) {
    return (
      <div className={`min-h-screen ${SURFACE} flex items-center justify-center`}>
        <div className={TEXT_MUTED}>Laden...</div>
      </div>
    )
  }

  if (!selectedProject) {
    return (
      <div className={`min-h-screen ${SURFACE} p-8`}>
        <div className="max-w-6xl mx-auto">
          <header className="flex items-center justify-between mb-8">
            <h1 className={`text-3xl font-serif font-bold ${TEXT_PRIMARY}`}>
              Mythos
            </h1>
            <ThemeToggle />
          </header>
          <div className="text-center py-12">
            <Book size={64} className={`mx-auto ${TEXT_MUTED} mb-4`} />
            <h2 className={`text-2xl font-serif ${TEXT_PRIMARY} mb-2`}>
              Willkommen bei Mythos
            </h2>
            <p className={`${TEXT_MUTED} mb-6`}>
              Erstelle dein erstes Projekt und beginne zu schreiben.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className={`px-6 py-3 ${ACCENT} text-white ${RADIUS} transition-colors flex items-center gap-2 mx-auto`}
            >
              <Plus size={20} />
              Neues Projekt erstellen
            </button>
          </div>
        </div>
        <CreateProjectModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={createProject}
        />
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${SURFACE} flex`}>
      <LeftSidebar
        focusMode={focusMode}
        leftSidebarOpen={leftSidebarOpen}
        setLeftSidebarOpen={setLeftSidebarOpen}
        selectedProject={selectedProject}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalWordCount={totalWordCount}
        onGoToDashboard={() => router.push('/dashboard')}
        onOpenEditProject={() => setShowEditProjectModal(true)}
        onOpenExport={() => setShowExportModal(true)}
        onOpenSearch={() => setShowSearchModal(true)}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className={`h-16 ${SURFACE_ALT} border-b border-zinc-300 dark:border-zinc-700 flex items-center justify-between px-6`}>
          <div className="flex items-center gap-4">
            {activeTab === 'manuscript' && selectedChapter && (
              <>
                <h2 className={`text-lg font-serif ${TEXT_PRIMARY}`}>{selectedChapter.title}</h2>
                <span className={`text-sm ${TEXT_MUTED}`}>{selectedChapter.wordCount || 0} Wörter</span>
              </>
            )}
            {activeTab === 'manuscript' && !selectedChapter && (
              <span className={TEXT_MUTED}>Kein Kapitel ausgewählt</span>
            )}
            {activeTab === 'characters' && <h2 className={`text-lg font-serif ${TEXT_PRIMARY}`}>Charakter-Verwaltung</h2>}
            {activeTab === 'places' && <h2 className={`text-lg font-serif ${TEXT_PRIMARY}`}>Orte</h2>}
            {activeTab === 'items' && <h2 className={`text-lg font-serif ${TEXT_PRIMARY}`}>Items & Artefakte</h2>}
            {activeTab === 'factions' && <h2 className={`text-lg font-serif ${TEXT_PRIMARY}`}>Fraktionen & Organisationen</h2>}
            {activeTab === 'timeline' && <h2 className={`text-lg font-serif ${TEXT_PRIMARY}`}>Der Zeitstrahl</h2>}
            {activeTab === 'lore' && <h2 className={`text-lg font-serif ${TEXT_PRIMARY}`}>Lore-Bibel</h2>}
            {activeTab === 'notes' && <h2 className={`text-lg font-serif ${TEXT_PRIMARY}`}>Notizen</h2>}
          </div>
          <div className="flex items-center gap-3">
            {activeTab === 'manuscript' && (
              <FocusToggle isFocusMode={focusMode} onToggle={() => setFocusMode(!focusMode)} />
            )}
            <ThemeToggle />
            {activeTab === 'manuscript' && (
              <button
                onClick={() => saveChapter()}
                disabled={isSaving || !selectedChapter}
                className={`px-4 py-2 ${ACCENT} text-white ${RADIUS} transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Save size={16} />
                {isSaving ? 'Speichern...' : autoSaveStatus === 'saved' ? '✓ Gespeichert' : 'Speichern'}
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          {activeTab === 'manuscript' && (
            <ManuscriptView
              selectedChapter={selectedChapter}
              chapters={chapters}
              places={places}
              items={items}
              editorContent={editorContent}
              setEditorContent={setEditorContent}
              onTitleChange={setChapterTitle}
              onCreateChapter={createChapter}
              editorSetContentRef={editorSetContentRef}
              pendingDraft={pendingDraft}
              onRestoreDraft={restoreDraft}
              onDiscardDraft={discardDraft}
              characters={characters}
              onMentionClick={(result) => {
                if (result.kind === 'CHARACTER') {
                  setQuickCard({
                    character: characters.find(c => c.id === result.id) ?? null,
                    position: result.position,
                    visible: true,
                  })
                } else if (result.kind === 'PLACE') {
                  setPlaceQuickCard({
                    place: places.find(p => p.id === result.id) ?? null,
                    position: result.position,
                    visible: true,
                  })
                } else {
                  setItemQuickCard({
                    item: items.find(i => i.id === result.id) ?? null,
                    position: result.position,
                    visible: true,
                  })
                }
              }}
              focusMode={focusMode}
              showError={showError}
              requestConfirm={requestConfirm}
              onConfirmed={onConfirmed}
            />
          )}

          {activeTab === 'characters' && (
            <CharactersView
              characters={characters}
              onAddClick={() => setShowCharacterModal(true)}
              onEdit={setEditingCharacter}
              onDelete={deleteCharacter}
            />
          )}

          {activeTab === 'places' && (
            <PlacesView
              places={places}
              characters={characters}
              onAddClick={() => setShowPlaceModal(true)}
              onDelete={deletePlace}
              onUpdateParent={updatePlaceParent}
              onAddImage={addPlaceImage}
              onDeleteImage={deletePlaceImage}
            />
          )}

          {activeTab === 'items' && (
            <ItemsView
              items={items}
              onAddClick={() => setShowItemModal(true)}
              onEdit={setEditingItem}
              onDelete={deleteItem}
            />
          )}

          {activeTab === 'factions' && (
            <FactionsView
              factions={factions}
              onAddClick={() => setShowFactionModal(true)}
              onEdit={setEditingFaction}
              onDelete={deleteFaction}
            />
          )}

          {activeTab === 'timeline' && (
            <TimelineView
              timelineEvents={timelineEvents}
              onAddClick={() => setShowTimelineEventModal(true)}
              onEdit={setEditingTimelineEvent}
              onDelete={deleteTimelineEvent}
            />
          )}

          {activeTab === 'lore' && (
            <LoreView
              loreEntries={loreEntries}
              onAddClick={() => setShowLoreEntryModal(true)}
              onEdit={setEditingLoreEntry}
              onDelete={deleteLoreEntry}
            />
          )}

          {activeTab === 'notes' && (
            <NotesView
              notes={notes}
              selectedChapter={selectedChapter}
              onAddClick={() => {
                if (selectedChapter) {
                  addNote('Neue Notiz', '', selectedChapter.id)
                } else {
                  showError('Bitte wähle zuerst ein Kapitel aus.')
                }
              }}
              onUpdate={updateNote}
              onDelete={deleteNote}
            />
          )}
        </div>
      </main>

      <RightSidebar
        focusMode={focusMode}
        rightSidebarOpen={rightSidebarOpen}
        setRightSidebarOpen={setRightSidebarOpen}
        chapters={chapters}
        selectedChapter={selectedChapter}
        onSelectChapter={switchChapter}
        onDeleteChapter={deleteChapter}
        onCreateChapter={createChapter}
        characters={characters}
        onSelectCharacter={setEditingCharacter}
        onAddCharacterClick={() => setShowCharacterModal(true)}
      />

      <CreateProjectModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onCreate={createProject} />
      <AddCharacterModal isOpen={showCharacterModal} onClose={() => setShowCharacterModal(false)} onAdd={addCharacter} />
      <EditCharacterModal isOpen={!!editingCharacter} onClose={() => setEditingCharacter(null)} character={editingCharacter} characters={characters} places={places} onUpdate={updateCharacter} />
      <AddPlaceModal isOpen={showPlaceModal} places={places} onClose={() => setShowPlaceModal(false)} onAdd={addPlace} />
      <AddItemModal isOpen={showItemModal} onClose={() => setShowItemModal(false)} onAdd={addItem} />
      <EditItemModal isOpen={!!editingItem} onClose={() => setEditingItem(null)} item={editingItem} onUpdate={updateItem} />
      <AddFactionModal isOpen={showFactionModal} onClose={() => setShowFactionModal(false)} onAdd={addFaction} />
      <EditFactionModal
        isOpen={!!editingFaction}
        onClose={() => setEditingFaction(null)}
        faction={editingFaction}
        characters={characters}
        onUpdate={updateFaction}
      />
      <AddTimelineEventModal isOpen={showTimelineEventModal} onClose={() => setShowTimelineEventModal(false)} onAdd={addTimelineEvent} />
      <EditTimelineEventModal
        isOpen={!!editingTimelineEvent}
        onClose={() => setEditingTimelineEvent(null)}
        timelineEvent={editingTimelineEvent}
        characters={characters}
        places={places}
        items={items}
        factions={factions}
        onUpdate={updateTimelineEvent}
      />
      <AddLoreEntryModal isOpen={showLoreEntryModal} onClose={() => setShowLoreEntryModal(false)} onAdd={addLoreEntry} />
      <EditLoreEntryModal
        isOpen={!!editingLoreEntry}
        onClose={() => setEditingLoreEntry(null)}
        loreEntry={editingLoreEntry}
        characters={characters}
        places={places}
        items={items}
        factions={factions}
        onUpdate={updateLoreEntry}
      />
      <CharacterQuickCard state={quickCard} onClose={() => setQuickCard(prev => ({ ...prev, visible: false }))} />
      <PlaceQuickCard state={placeQuickCard} onClose={() => setPlaceQuickCard(prev => ({ ...prev, visible: false }))} />
      <ItemQuickCard state={itemQuickCard} onClose={() => setItemQuickCard(prev => ({ ...prev, visible: false }))} />
      <EditProjectModal
        isOpen={showEditProjectModal}
        onClose={() => setShowEditProjectModal(false)}
        project={selectedProject}
        onUpdate={updateProject}
        onDelete={deleteProject}
      />
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        project={selectedProject}
        chapters={chapters}
        selectedChapter={selectedChapter}
      />
      <ConfirmDialog
        isOpen={!!confirmDialog}
        title={confirmDialog?.title ?? ''}
        message={confirmDialog?.message ?? ''}
        onConfirm={() => confirmDialog?.onConfirm()}
        onCancel={() => setConfirmDialog(null)}
      />
      <Toast message={errorToast} onDismiss={() => setErrorToast(null)} />
      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        query={searchQuery}
        setQuery={setSearchQuery}
        results={searchResults}
        isSearching={isSearching}
        onSelectChapter={handleSelectSearchChapter}
        onSelectCharacter={handleSelectSearchCharacter}
        onSelectPlace={() => setActiveTab('places')}
        onSelectNote={handleSelectSearchNote}
      />
    </div>
  )
}
