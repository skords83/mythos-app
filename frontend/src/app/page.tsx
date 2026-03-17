'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Book, 
  Users, 
  MapPin, 
  StickyNote, 
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Save,
  MoreVertical,
  Settings,
  Download,
  AlertTriangle,
  Home as HomeIcon
} from 'lucide-react'
import { 
  Project, Chapter, Character, Place, Note, QuickCardState,
  ThemeToggle, RichTextEditor, CharacterListItem, EditCharacterModal, ExportModal,
  FocusToggle,
  NavItem,
  ProjectCard,
  ChapterItem,
  CharacterCard,
  WordProgress,
  FloatingToolbar,
  CreateProjectModal,
  AddCharacterModal,
  NoteCard,
  PlaceCard,
  AddPlaceModal,
  EditProjectModal,
  CharacterQuickCard
} from './components'

// Main Page Component
export default function Page() {
  const router = useRouter()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth')
        const data = await res.json()
        
        if (data.user) {
          const storedProjectId = localStorage.getItem('selectedProjectId')
          if (storedProjectId) {
            setIsCheckingAuth(false)
          } else {
            router.replace('/dashboard')
          }
        } else {
          router.replace('/login')
        }
      } catch (error) {
        router.replace('/login')
      }
    }

    checkAuth()
  }, [])

  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [characters, setCharacters] = useState<Character[]>([])
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null)
  const [activeTab, setActiveTab] = useState('manuscript')
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true)
  const [focusMode, setFocusMode] = useState(false)
  const [showToolbar, setShowToolbar] = useState(false)
  const [editorContent, setEditorContent] = useState('')
  const [isLoading, setIsLoading] = useState(isCheckingAuth)
  const [showCreateModal, setShowCreateModal] = useState(false)
const [showCharacterModal, setShowCharacterModal] = useState(false)
const [editingCharacter, setEditingCharacter] = useState<Character | null>(null)
const [showPlaceModal, setShowPlaceModal] = useState(false)
const [showEditProjectModal, setShowEditProjectModal] = useState(false)
const [showExportModal, setShowExportModal] = useState(false)
const [isSaving, setIsSaving] = useState(false)
  const [places, setPlaces] = useState<Place[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [quickCard, setQuickCard] = useState<QuickCardState>({
    character: null,
    position: { x: 0, y: 0 },
    visible: false
  })
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  // Refs to always have current values in callbacks (stale closure fix)
  const editorContentRef = useRef(editorContent)
  const selectedChapterRef = useRef(selectedChapter)
  const chaptersRef = useRef(chapters)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { editorContentRef.current = editorContent }, [editorContent])
  useEffect(() => { selectedChapterRef.current = selectedChapter }, [selectedChapter])
  useEffect(() => { chaptersRef.current = chapters }, [chapters])

  useEffect(() => {
    if (!isCheckingAuth) {
      loadProjects()
    }
  }, [isCheckingAuth])

  useEffect(() => {
    if (selectedProject) {
      loadChapters(selectedProject.id)
      loadCharacters(selectedProject.id)
      loadPlaces(selectedProject.id)
    }
  }, [selectedProject])

  useEffect(() => {
    if (selectedChapter) {
      setEditorContent(extractContent(selectedChapter.content))
      loadNotes(selectedChapter.id)
    }
  }, [selectedChapter])

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/projects')
      if (response.status === 401) {
        router.push('/login')
        return
      }
      const data = await response.json()
      setProjects(data)
      const storedProjectId = localStorage.getItem('selectedProjectId')
      if (storedProjectId) {
        const selectedProj = data.find((p: Project) => p.id === storedProjectId)
        if (selectedProj) {
          setSelectedProject(selectedProj)
        } else if (data.length > 0) {
          setSelectedProject(data[0])
        }
        localStorage.removeItem('selectedProjectId')
      } else if (data.length > 0 && !selectedProject) {
        setSelectedProject(data[0])
      }
      setIsLoading(false)
    } catch (error) {
      console.error('Error loading projects:', error)
      setIsLoading(false)
    }
  }

  const loadChapterContent = async (chapterId: string) => {
    try {
      const response = await fetch(`/api/chapters/${chapterId}`)
      if (!response.ok) return null
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error loading chapter content:', error)
      return null
    }
  }

  const loadChapters = async (projectId: string) => {
    try {
      const response = await fetch(`/api/chapters?projectId=${projectId}`)
      if (response.status === 401) {
        router.push('/login')
        return
      }
      const data = await response.json()
      if (Array.isArray(data)) {
        setChapters(data)
        if (data.length > 0 && !selectedChapter) {
          const full = await loadChapterContent(data[0].id)
          if (full) setSelectedChapter(full)
        }
      } else {
        setChapters([])
      }
    } catch (error) {
      console.error('Error loading chapters:', error)
      setChapters([])
    }
  }

  const loadCharacters = async (projectId: string) => {
    try {
      const response = await fetch(`/api/characters?projectId=${projectId}`)
      const data = await response.json()
      setCharacters(data)
    } catch (error) {
      console.error('Error loading characters:', error)
    }
  }

  const createProject = async (title: string, description: string, wordGoal: number) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, wordGoal })
      })
      const newProject = await response.json()
      setProjects([newProject, ...projects])
      setSelectedProject(newProject)
      await fetch('/api/chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Kapitel 1', projectId: newProject.id })
      })
      loadChapters(newProject.id)
    } catch (error) {
      console.error('Error creating project:', error)
    }
  }

const updateProject = async (id: string, title: string, description: string, wordGoal: number, coverImage?: string) => {
  try {
    const response = await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, wordGoal, coverImage })
    })
    const updatedProject = await response.json()
    setProjects(projects.map(p => p.id === id ? updatedProject : p))
    if (selectedProject?.id === id) {
      setSelectedProject(updatedProject)
    }
  } catch (error) {
    console.error('Error updating project:', error)
  }
  }

  const deleteProject = async (projectId: string) => {
    try {
      await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
      setProjects(projects.filter(p => p.id !== projectId))
      if (selectedProject?.id === projectId) {
        setSelectedProject(null)
        setChapters([])
        setCharacters([])
        setPlaces([])
      }
    } catch (error) {
      console.error('Error deleting project:', error)
    }
  }

  const createChapter = async () => {
    if (!selectedProject) return
    try {
      const response = await fetch('/api/chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: `Kapitel ${chapters.length + 1}`, 
          projectId: selectedProject.id 
        })
      })
      const newChapter = await response.json()
      setChapters([...chapters, newChapter])
      setSelectedChapter(newChapter)
    } catch (error) {
      console.error('Error creating chapter:', error)
    }
  }

  // Helper to strip HTML tags for word count
  const stripHtml = (html: string) => {
    const tmp = document.createElement('div')
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ''
  }

  // saveChapter uses refs to always have fresh values (stale closure fix)
  const saveChapter = useCallback(async (chapterOverride?: Chapter) => {
    const chapter = chapterOverride ?? selectedChapterRef.current
    const content = editorContentRef.current
    if (!chapter) return

    setIsSaving(true)
    try {
      const textContent = stripHtml(content)
      const wordCount = textContent.trim().split(/\s+/).filter(w => w.length > 0).length
      await fetch(`/api/chapters/${chapter.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: chapter.title, content, wordCount })
      })
      setChapters(prev => prev.map(ch =>
        ch.id === chapter.id ? { ...ch, title: chapter.title, content, wordCount } : ch
      ))
      if (!chapterOverride) {
        setSelectedChapter(prev => prev ? { ...prev, content, wordCount } : prev)
      }
      setAutoSaveStatus('saved')
      setTimeout(() => setAutoSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('Error saving chapter:', error)
    } finally {
      setIsSaving(false)
    }
  }, [])

  // Autosave: debounce 2s after last change
  useEffect(() => {
    if (!selectedChapter) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    setAutoSaveStatus('idle')
    autoSaveTimer.current = setTimeout(() => {
      setAutoSaveStatus('saving')
      saveChapter()
    }, 2000)
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    }
  }, [editorContent, selectedChapter?.id])

  const deleteChapter = async (chapterId: string) => {
    if (!confirm('Möchtest du dieses Kapitel wirklich löschen?')) return
    try {
      await fetch(`/api/chapters/${chapterId}`, { method: 'DELETE' })
      const remaining = chapters.filter(ch => ch.id !== chapterId)
      setChapters(remaining)
      if (selectedChapter?.id === chapterId) {
        setSelectedChapter(remaining.length > 0 ? remaining[0] : null)
        setEditorContent(remaining.length > 0 ? extractContent(remaining[0].content) : '')
      }
    } catch (error) {
      console.error('Error deleting chapter:', error)
    }
  }

  const addCharacter = async (name: string, description: string, motivation: string) => {
    if (!selectedProject) return
    try {
      const response = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, motivation, projectId: selectedProject.id })
      })
      const newCharacter = await response.json()
      setCharacters([newCharacter, ...characters])
} catch (error) {
    console.error('Error adding character:', error)
  }
}

const updateCharacter = async (id: string, name: string, description: string, motivation: string) => {
  try {
    const response = await fetch(`/api/characters/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, motivation })
    })
    const updated = await response.json()
    setCharacters(characters.map(c => c.id === id ? updated : c))
  } catch (error) {
    console.error('Error updating character:', error)
  }
}

const deleteCharacter = async (characterId: string) => {
    if (!confirm('Möchtest du diesen Charakter wirklich löschen?')) return
    try {
      await fetch(`/api/characters/${characterId}`, { method: 'DELETE' })
      setCharacters(characters.filter(c => c.id !== characterId))
    } catch (error) {
      console.error('Error deleting character:', error)
    }
  }

  const loadPlaces = async (projectId: string) => {
    try {
      const response = await fetch(`/api/places?projectId=${projectId}`)
      const data = await response.json()
      setPlaces(data)
    } catch (error) {
      console.error('Error loading places:', error)
    }
  }

  const addPlace = async (name: string, description: string, location: string, climate: string, importance: string) => {
    if (!selectedProject) return
    try {
      const response = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, location, climate, importance, projectId: selectedProject.id })
      })
      const newPlace = await response.json()
      setPlaces([newPlace, ...places])
    } catch (error) {
      console.error('Error adding place:', error)
    }
  }

  const deletePlace = async (placeId: string) => {
    if (!confirm('Möchtest du diesen Ort wirklich löschen?')) return
    try {
      await fetch(`/api/places/${placeId}`, { method: 'DELETE' })
      setPlaces(places.filter(p => p.id !== placeId))
    } catch (error) {
      console.error('Error deleting place:', error)
    }
  }

  const loadNotes = async (chapterId: string) => {
    try {
      const response = await fetch(`/api/notes?chapterId=${chapterId}`)
      if (response.ok) {
        const data = await response.json()
        setNotes(data)
      }
    } catch (error) {
      console.error('Error loading notes:', error)
    }
  }

  const addNote = async (title: string, content: string, chapterId: string) => {
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, chapterId })
      })
      const newNote = await response.json()
      setNotes([newNote, ...notes])
    } catch (error) {
      console.error('Error adding note:', error)
    }
  }

  const updateNote = async (noteId: string, title: string, content: string) => {
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
      })
      const updatedNote = await response.json()
      setNotes(notes.map(n => n.id === noteId ? updatedNote : n))
    } catch (error) {
      console.error('Error updating note:', error)
    }
  }

  const deleteNote = async (noteId: string) => {
    if (!confirm('Möchtest du diese Notiz wirklich löschen?')) return
    try {
      await fetch(`/api/notes/${noteId}`, { method: 'DELETE' })
      setNotes(notes.filter(n => n.id !== noteId))
    } catch (error) {
      console.error('Error deleting note:', error)
    }
  }

  const handleTextSelection = () => {
    const selection = window.getSelection()
    setShowToolbar(!!(selection && selection.toString().length > 0))
  }

  const handleEditorClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget
    const text = textarea.value
    const wordRegex = /\b\w+\b/g
    let match
    let clickedWord: string | null = null
    while ((match = wordRegex.exec(text)) !== null) {
      const wordStart = match.index
      const wordEnd = match.index + match[0].length
      if (textarea.selectionStart >= wordStart && textarea.selectionStart <= wordEnd) {
        clickedWord = match[0]
        break
      }
    }
    if (clickedWord) {
      const matchedCharacter = characters.find(char => 
        char.name.toLowerCase() === clickedWord?.toLowerCase() ||
        char.name.split(' ').some(part => part.toLowerCase() === clickedWord?.toLowerCase())
      )
      if (matchedCharacter) {
        setQuickCard({
          character: matchedCharacter,
          position: { x: e.clientX, y: e.clientY + 20 },
          visible: true
        })
      } else {
        setQuickCard(prev => ({ ...prev, visible: false }))
      }
    } else {
      setQuickCard(prev => ({ ...prev, visible: false }))
    }
  }

  const extractContent = (content: any): string => {
    if (!content) return ''
    if (typeof content === 'string') return content
    if (typeof content === 'object' && typeof content.content === 'string') return content.content
    return ''
  }

  const totalWordCount = Array.isArray(chapters) ? chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0) : 0

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] dark:bg-[#1A1A1B] flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Laden...</div>
      </div>
    )
  }

  if (!selectedProject) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] dark:bg-[#1A1A1B] p-8">
        <div className="max-w-6xl mx-auto">
          <header className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-gray-100">
              Mythos
            </h1>
            <ThemeToggle />
          </header>
          <div className="text-center py-12">
            <Book size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h2 className="text-2xl font-serif text-gray-700 dark:text-gray-300 mb-2">
              Willkommen bei Mythos
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Erstelle dein erstes Projekt und beginne zu schreiben.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-[#4A7C59] text-white rounded-lg hover:bg-[#3d6349] transition-colors flex items-center gap-2 mx-auto"
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
    <div className="min-h-screen bg-[#F5F5F5] dark:bg-[#1A1A1B] flex">
      {/* Left Sidebar */}
      <aside 
        className={`${focusMode ? 'w-0 opacity-0 overflow-hidden' : leftSidebarOpen ? 'w-64' : 'w-16'} bg-white/80 dark:bg-[#262626]/80 backdrop-blur-md border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300`}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          {leftSidebarOpen ? (
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-serif font-bold text-gray-800 dark:text-gray-100 truncate flex-1 min-w-0">
                {selectedProject.title}
              </h1>
              <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
                  title="Zurück zum Dashboard"
                >
                  <HomeIcon size={20} />
                </button>
                <button
                  onClick={() => setShowEditProjectModal(true)}
                  className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
                  title="Projekteinstellungen"
                >
<Settings size={20} />
</button>
<button
  onClick={() => setShowExportModal(true)}
  className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
  title="Exportieren"
>
  <Download size={20} />
</button>
<button
  onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <button 
                onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-2">
          <NavItem icon={Book} label="Manuskript" active={activeTab === 'manuscript'} onClick={() => setActiveTab('manuscript')} collapsed={!leftSidebarOpen} />
          <NavItem icon={Users} label="Charaktere" active={activeTab === 'characters'} onClick={() => setActiveTab('characters')} collapsed={!leftSidebarOpen} />
          <NavItem icon={MapPin} label="Orte" active={activeTab === 'places'} onClick={() => setActiveTab('places')} collapsed={!leftSidebarOpen} />
          <NavItem icon={StickyNote} label="Notizen" active={activeTab === 'notes'} onClick={() => setActiveTab('notes')} collapsed={!leftSidebarOpen} />
        </nav>

        {leftSidebarOpen && selectedProject && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <WordProgress current={totalWordCount} goal={selectedProject.wordGoal} />
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white/50 dark:bg-[#262626]/50 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            {activeTab === 'manuscript' && selectedChapter && (
              <>
                <h2 className="text-lg font-serif text-gray-800 dark:text-gray-200">{selectedChapter.title}</h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">{selectedChapter.wordCount || 0} Wörter</span>
              </>
            )}
            {activeTab === 'manuscript' && !selectedChapter && (
              <span className="text-gray-500 dark:text-gray-400">Kein Kapitel ausgewählt</span>
            )}
            {activeTab === 'characters' && <h2 className="text-lg font-serif text-gray-800 dark:text-gray-200">Charakter-Verwaltung</h2>}
            {activeTab === 'places' && <h2 className="text-lg font-serif text-gray-800 dark:text-gray-200">Orte</h2>}
            {activeTab === 'notes' && <h2 className="text-lg font-serif text-gray-800 dark:text-gray-200">Notizen</h2>}
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
                className="px-4 py-2 bg-[#4A7C59] text-white rounded-lg hover:bg-[#3d6349] transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={16} />
                {isSaving ? 'Speichern...' : autoSaveStatus === 'saved' ? '✓ Gespeichert' : 'Speichern'}
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          {activeTab === 'manuscript' && (
            <div className="max-w-3xl mx-auto px-8 py-12 relative">
              <FloatingToolbar visible={showToolbar} />
              {selectedChapter ? (
                <>
                  <input
                    type="text"
                    placeholder="Kapiteltitel..."
                    value={selectedChapter.title}
                    onChange={(e) => {
                      const newTitle = e.target.value
                      setSelectedChapter({ ...selectedChapter, title: newTitle })
                      setChapters(chapters.map(ch =>
                        ch.id === selectedChapter.id ? { ...ch, title: newTitle } : ch
                      ))
                    }}
                    className="w-full text-3xl font-serif font-bold bg-transparent border-none outline-none placeholder-gray-400 dark:placeholder-gray-600 text-gray-800 dark:text-gray-100 mb-8"
                  />
                  <RichTextEditor
                    content={editorContent}
                    onChange={setEditorContent}
                    placeholder="Beginne zu schreiben... (Klicke auf Charakternamen für Quick-Card)"
                  />
                </>
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <p>Erstelle ein neues Kapitel, um zu beginnen.</p>
                  <button
                    onClick={createChapter}
                    className="mt-4 px-4 py-2 bg-[#4A7C59] text-white rounded-lg hover:bg-[#3d6349] transition-colors"
                  >
                    Kapitel erstellen
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'characters' && (
            <div className="max-w-4xl mx-auto px-8 py-12">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-serif font-bold text-gray-800 dark:text-gray-100">Charaktere</h2>
                <button
                  onClick={() => setShowCharacterModal(true)}
                  className="px-4 py-2 bg-[#4A7C59] text-white rounded-lg hover:bg-[#3d6349] transition-colors flex items-center gap-2"
                >
                  <Plus size={20} />
                  Neuer Charakter
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {characters.map((char) => (
                  <CharacterCard key={char.id} character={char} onDelete={() => deleteCharacter(char.id)} />
                ))}
                {characters.length === 0 && (
                  <div className="col-span-2 text-center py-12 text-gray-500 dark:text-gray-400">
                    <Users size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                    <p>Noch keine Charaktere vorhanden.</p>
                    <button onClick={() => setShowCharacterModal(true)} className="mt-4 px-4 py-2 bg-[#4A7C59] text-white rounded-lg hover:bg-[#3d6349] transition-colors">
                      Ersten Charakter erstellen
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'places' && (
            <div className="max-w-4xl mx-auto px-8 py-12">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-serif font-bold text-gray-800 dark:text-gray-100">Orte</h2>
                <button
                  onClick={() => setShowPlaceModal(true)}
                  className="px-4 py-2 bg-[#4A7C59] text-white rounded-lg hover:bg-[#3d6349] transition-colors flex items-center gap-2"
                >
                  <Plus size={20} />
                  Neuer Ort
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {places.map((place) => (
                  <PlaceCard key={place.id} place={place} onDelete={() => deletePlace(place.id)} />
                ))}
                {places.length === 0 && (
                  <div className="col-span-2 text-center py-12 text-gray-500 dark:text-gray-400">
                    <MapPin size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                    <p>Noch keine Orte vorhanden.</p>
                    <button onClick={() => setShowPlaceModal(true)} className="mt-4 px-4 py-2 bg-[#4A7C59] text-white rounded-lg hover:bg-[#3d6349] transition-colors">
                      Ersten Ort erstellen
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="max-w-4xl mx-auto px-8 py-12">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-serif font-bold text-gray-800 dark:text-gray-100">Notizen</h2>
                <button
                  onClick={() => {
                    if (selectedChapter) {
                      addNote('Neue Notiz', '', selectedChapter.id)
                    } else {
                      alert('Bitte wähle zuerst ein Kapitel aus.')
                    }
                  }}
                  disabled={!selectedChapter}
                  className="px-4 py-2 bg-[#4A7C59] text-white rounded-lg hover:bg-[#3d6349] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={20} />
                  Neue Notiz
                </button>
              </div>
              {!selectedChapter ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <StickyNote size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                  <p>Bitte wähle zuerst ein Kapitel aus, um Notizen anzuzeigen.</p>
                </div>
              ) : notes.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <StickyNote size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                  <p>Noch keine Notizen für dieses Kapitel.</p>
                  <p className="text-sm mt-2">Klicke auf "Neue Notiz" um eine zu erstellen.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onUpdate={(title, content) => updateNote(note.id, title, content)}
                      onDelete={() => deleteNote(note.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Right Sidebar */}
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
                  <button onClick={createChapter} className="p-1.5 text-[#4A7C59] hover:bg-[#4A7C59]/10 rounded transition-colors" title="Neues Kapitel">
                    <Plus size={18} />
                  </button>
                </div>
                <div className="space-y-1">
                  {chapters.map((chapter) => (
                    <ChapterItem
                      key={chapter.id}
                      chapter={chapter}
                      active={selectedChapter?.id === chapter.id}
                      onClick={async () => {
                        if (selectedChapterRef.current && selectedChapterRef.current.id !== chapter.id) {
                          await saveChapter(selectedChapterRef.current)
                        }
                        const full = await loadChapterContent(chapter.id)
                        const loaded = full ?? chapter
                        setSelectedChapter(loaded)
                        setEditorContent(extractContent(loaded.content))
                      }}
                      onDelete={(e) => {
                        e.stopPropagation()
                        deleteChapter(chapter.id)
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
                  <button onClick={() => setShowCharacterModal(true)} className="p-1.5 text-[#4A7C59] hover:bg-[#4A7C59]/10 rounded transition-colors" title="Neuer Charakter">
                    <Plus size={18} />
                  </button>
                </div>
                <div className="space-y-1">
                  {characters.map((char) => (
                    <CharacterListItem key={char.id} character={char} onClick={() => setEditingCharacter(char)} />
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

      <CreateProjectModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onCreate={createProject} />
      <AddCharacterModal isOpen={showCharacterModal} onClose={() => setShowCharacterModal(false)} onAdd={addCharacter} />
<EditCharacterModal isOpen={!!editingCharacter} onClose={() => setEditingCharacter(null)} character={editingCharacter} onUpdate={updateCharacter} />
      <AddPlaceModal isOpen={showPlaceModal} onClose={() => setShowPlaceModal(false)} onAdd={addPlace} />
      <CharacterQuickCard state={quickCard} onClose={() => setQuickCard(prev => ({ ...prev, visible: false }))} />
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
</div>
  )
}