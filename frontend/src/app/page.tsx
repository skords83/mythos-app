'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Book, 
  Users, 
  MapPin, 
  StickyNote, 
  Moon, 
  Sun,
  ChevronLeft,
  ChevronRight,
  Bold,
  Italic,
  List,
  Quote,
  Plus,
  Trash2,
  Save,
  MoreVertical,
  Settings,
  AlertTriangle,
  Home as HomeIcon
} from 'lucide-react'

// Types
interface Project {
  id: string
  title: string
  description: string | null
  wordGoal: number
  createdAt: string
  updatedAt: string
  _count?: {
    chapters: number
    characters: number
  }
}

interface Chapter {
  id: string
  title: string
  content: any
  order: number
  wordCount: number
  projectId: string
  createdAt: string
  updatedAt: string
}

interface Character {
  id: string
  name: string
  description: string | null
  motivation: string | null
  projectId: string
  createdAt: string
  updatedAt: string
}

interface Place {
  id: string
  name: string
  description: string | null
  location: string | null
  climate: string | null
  importance: string | null
  projectId: string
  createdAt: string
  updatedAt: string
}

interface Note {
  id: string
  title: string
  content: string
  chapterId: string
  createdAt: string
  updatedAt: string
}

// Theme Toggle Component
function ThemeToggle() {
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark')
    setDarkMode(isDark)
  }, [])

  const toggleTheme = () => {
    setDarkMode(!darkMode)
    document.documentElement.classList.toggle('dark')
  }

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      aria-label="Theme wechseln"
    >
      {darkMode ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  )
}

// Focus Mode Toggle Component
function FocusToggle({ isFocusMode, onToggle }: { isFocusMode: boolean, onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
      title={isFocusMode ? "Fokus Modus beenden" : "Fokus Modus"}
      aria-label={isFocusMode ? "Fokus Modus beenden" : "Fokus Modus"}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {isFocusMode ? (
          <>
            <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/>
          </>
        ) : (
          <>
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
          </>
        )}
      </svg>
    </button>
  )
}

// Navigation Item
function NavItem({ icon: Icon, label, active, onClick, collapsed }: { 
  icon: React.ElementType, 
  label: string, 
  active: boolean,
  onClick: () => void,
  collapsed?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'} py-3 rounded-lg transition-all duration-200 ${
        active 
          ? 'bg-[#4A7C59] text-white shadow-md' 
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
      title={collapsed ? label : undefined}
    >
      <Icon size={20} />
      {!collapsed && <span className="text-sm font-medium">{label}</span>}
    </button>
  )
}

// Project Card
function ProjectCard({ project, onClick, onDelete }: { 
  project: Project, 
  onClick: () => void,
  onDelete: (e: React.MouseEvent) => void
}) {
  return (
    <div 
      onClick={onClick}
      className="bg-white dark:bg-[#262626] rounded-lg p-5 shadow-sm border border-gray-200 dark:border-gray-700 card-hover cursor-pointer relative group"
    >
      <button
        onClick={onDelete}
        className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Projekt löschen"
      >
        <Trash2 size={16} />
      </button>
      <h3 className="font-serif font-bold text-xl text-gray-900 dark:text-gray-100 mb-2 pr-8">
        {project.title}
      </h3>
      {project.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
          {project.description}
        </p>
      )}
      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span>{project._count?.chapters || 0} Kapitel</span>
        <span>{project._count?.characters || 0} Charaktere</span>
      </div>
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
        <span className="text-xs text-[#4A7C59]">Tagesziel: {project.wordGoal} Wörter</span>
      </div>
    </div>
  )
}

// Chapter List Item
function ChapterItem({ chapter, active, onClick }: { 
  chapter: Chapter, 
  active: boolean,
  onClick: () => void 
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
        active 
          ? 'bg-[#4A7C59]/10 text-[#4A7C59] border-l-4 border-[#4A7C59]' 
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
    >
      <div className="font-medium truncate">{chapter.title}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {chapter.wordCount} Wörter
      </div>
    </button>
  )
}

// Character Card
function CharacterCard({ character, onDelete }: { 
  character: Character,
  onDelete: () => void 
}) {
  return (
    <div className="bg-white dark:bg-[#262626] rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 card-hover group">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4A7C59] to-[#6B9E7C] flex items-center justify-center text-white font-semibold flex-shrink-0">
          {character.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{character.name}</h4>
            <button
              onClick={onDelete}
              className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={14} />
            </button>
          </div>
          {character.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{character.description}</p>
          )}
          {character.motivation && (
            <p className="text-xs text-[#4A7C59] mt-2 italic">„{character.motivation}"</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Word Count Progress
function WordProgress({ current, goal }: { current: number, goal: number }) {
  const percentage = Math.min((current / goal) * 100, 100)
  const radius = 50
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="flex flex-col items-center p-4">
      <div className="relative w-32 h-32">
        <svg className="w-32 h-32 transform -rotate-90">
          <circle
            cx="64"
            cy="64"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-gray-100 dark:text-gray-800"
          />
          <circle
            cx="64"
            cy="64"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="text-[#6B9E7C] dark:text-[#6B9E7C] transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
            {Math.round(percentage)}%
          </span>
        </div>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
        {current}/{goal} Wörter
      </p>
    </div>
  )
}

// Floating Toolbar
function FloatingToolbar({ visible }: { visible: boolean }) {
  if (!visible) return null

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white dark:bg-[#262626] rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 px-2 py-1 flex gap-1 z-50 animate-fade-in">
      <button className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Bold">
        <Bold size={16} />
      </button>
      <button className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Italic">
        <Italic size={16} />
      </button>
      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
      <button className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="List">
        <List size={16} />
      </button>
      <button className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Quote">
        <Quote size={16} />
      </button>
    </div>
  )
}

// Create Project Modal
function CreateProjectModal({ isOpen, onClose, onCreate }: { 
  isOpen: boolean, 
  onClose: () => void, 
  onCreate: (title: string, description: string, wordGoal: number) => void 
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [wordGoal, setWordGoal] = useState(500)

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCreate(title, description, wordGoal)
    setTitle('')
    setDescription('')
    setWordGoal(500)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white dark:bg-[#262626] rounded-xl shadow-xl p-6 w-full max-w-md">
        <h2 className="text-2xl font-serif font-bold mb-4 text-gray-900 dark:text-gray-100">
          Neues Projekt
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Titel
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1A1B] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#4A7C59] outline-none"
              placeholder="Name deines Projekts"
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
              placeholder="Kurze Beschreibung..."
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tagesziel (Wörter)
            </label>
            <input
              type="number"
              value={wordGoal}
              onChange={(e) => setWordGoal(parseInt(e.target.value) || 500)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1A1B] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#4A7C59] outline-none"
              min={100}
              max={10000}
              step={100}
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
              Erstellen
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Add Character Modal
function AddCharacterModal({ isOpen, onClose, onAdd }: { 
  isOpen: boolean, 
  onClose: () => void, 
  onAdd: (name: string, description: string, motivation: string) => void 
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [motivation, setMotivation] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAdd(name, description, motivation)
    setName('')
    setDescription('')
    setMotivation('')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white dark:bg-[#262626] rounded-xl shadow-xl p-6 w-full max-w-md">
        <h2 className="text-2xl font-serif font-bold mb-4 text-gray-900 dark:text-gray-100">
          Neuer Charakter
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
              Hinzufügen
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Place Card
function PlaceCard({ place, onDelete }: {
  place: Place,
  onDelete: () => void
}) {
  return (
    <div className="bg-white dark:bg-[#262626] rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 card-hover group">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#4A7C59] to-[#6B9E7C] flex items-center justify-center text-white font-semibold flex-shrink-0">
          <MapPin size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{place.name}</h4>
            <button
              onClick={onDelete}
              className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={14} />
            </button>
          </div>
          {place.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{place.description}</p>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            {place.location && (
              <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                {place.location}
              </span>
            )}
            {place.climate && (
              <span className="text-xs px-2 py-0.5 bg-[#4A7C59]/10 text-[#4A7C59] rounded">
                {place.climate}
              </span>
            )}
            {place.importance && (
              <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded">
                {place.importance}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Note Card
function NoteCard({ note, onUpdate, onDelete }: {
  note: Note
  onUpdate: (title: string, content: string) => void
  onDelete: () => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(note.title)
  const [editContent, setEditContent] = useState(note.content)

  const handleSave = () => {
    onUpdate(editTitle, editContent)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditTitle(note.title)
    setEditContent(note.content)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="bg-white dark:bg-[#262626] rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="w-full text-lg font-semibold bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 mb-2"
          placeholder="Titel..."
        />
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="w-full min-h-[100px] bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-[#4A7C59]"
          placeholder="Notiz..."
        />
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleSave}
            className="px-3 py-1.5 bg-[#4A7C59] text-white rounded-lg hover:bg-[#3d6349] text-sm"
          >
            Speichern
          </button>
          <button
            onClick={handleCancel}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
          >
            Abbrechen
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-[#262626] rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 card-hover group">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100">{note.title}</h4>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setIsEditing(true)}
            className="p-1 text-gray-400 hover:text-[#4A7C59] transition-colors"
            title="Bearbeiten"
          >
            <MoreVertical size={14} />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
            title="Löschen"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {note.content ? (
        <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{note.content}</p>
      ) : (
        <p className="text-sm text-gray-400 italic">Kein Inhalt</p>
      )}
      <p className="text-xs text-gray-400 mt-2">
        {new Date(note.createdAt).toLocaleDateString('de-DE')}
      </p>
    </div>
  )
}

// Character Quick-Card Component
interface QuickCardState {
  character: Character | null
  position: { x: number, y: number }
  visible: boolean
}

function CharacterQuickCard({ state, onClose }: {
  state: QuickCardState
  onClose: () => void
}) {
  if (!state.visible || !state.character) return null

  return (
    <>
      {/* Backdrop to close on click outside */}
      <div 
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      
      {/* Quick Card */}
      <div
        className="fixed z-50 bg-white dark:bg-[#262626] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 w-72 animate-fade-in"
        style={{
          left: Math.min(state.position.x, window.innerWidth - 300),
          top: Math.min(state.position.y, window.innerHeight - 250)
        }}
      >
        {/* Header with Avatar */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#4A7C59] to-[#6B9E7C] flex items-center justify-center text-white text-xl font-bold flex-shrink-0 shadow-md">
            {state.character.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-serif font-bold text-lg text-gray-900 dark:text-gray-100 truncate">
              {state.character.name}
            </h3>
            <span className="text-xs text-[#4A7C59] font-medium">Charakter</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="space-y-3">
          {state.character.description && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                Beschreibung
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {state.character.description}
              </p>
            </div>
          )}
          
          {state.character.motivation && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                Motivation
              </h4>
              <p className="text-sm text-[#4A7C59] italic leading-relaxed">
                "{state.character.motivation}"
              </p>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-400 text-center">
            Klicke auf "Charaktere" für mehr Details
          </p>
        </div>
      </div>
    </>
  )
}

// Add Place Modal
function AddPlaceModal({ isOpen, onClose, onAdd }: {
  isOpen: boolean,
  onClose: () => void,
  onAdd: (name: string, description: string, location: string, climate: string, importance: string) => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [climate, setClimate] = useState('')
  const [importance, setImportance] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAdd(name, description, location, climate, importance)
    setName('')
    setDescription('')
    setLocation('')
    setClimate('')
    setImportance('')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white dark:bg-[#262626] rounded-xl shadow-xl p-6 w-full max-w-md">
        <h2 className="text-2xl font-serif font-bold mb-4 text-gray-900 dark:text-gray-100">
          Neuer Ort
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
              placeholder="z.B. Eldoria, die Hauptstadt"
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
              placeholder="Wie sieht dieser Ort aus? Was macht ihn besonders?"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Region/Lage
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1A1B] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#4A7C59] outline-none"
              placeholder="z.B. Nördliche Reiche, Küstenregion"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Klima
              </label>
              <select
                value={climate}
                onChange={(e) => setClimate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1A1B] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#4A7C59] outline-none"
              >
                <option value="">Klima wählen</option>
                <option value="Gemäßigt">Gemäßigt</option>
                <option value="Tropisch">Tropisch</option>
                <option value="Wüstenhaft">Wüstenhaft</option>
                <option value="Eisig">Eisig</option>
                <option value="Gebirgig">Gebirgig</option>
                <option value="Küstennahe">Küstennahe</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bedeutung
              </label>
              <select
                value={importance}
                onChange={(e) => setImportance(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1A1B] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#4A7C59] outline-none"
              >
                <option value="">Bedeutung wählen</option>
                <option value="Hauptstadt">Hauptstadt</option>
                <option value="Stadt">Stadt</option>
                <option value="Dorf">Dorf</option>
                <option value="Tempel">Tempel</option>
                <option value="Festung">Festung</option>
                <option value="Wald">Wald</option>
                <option value="Berg">Berg</option>
                <option value="Höhle">Höhle</option>
              </select>
            </div>
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
              Hinzufügen
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Edit Project Modal
function EditProjectModal({ isOpen, onClose, project, onUpdate, onDelete }: {
  isOpen: boolean
  onClose: () => void
  project: Project | null
  onUpdate: (id: string, title: string, description: string, wordGoal: number) => void
  onDelete: (id: string) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [wordGoal, setWordGoal] = useState(500)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'danger'>('general')

  useEffect(() => {
    if (project) {
      setTitle(project.title)
      setDescription(project.description || '')
      setWordGoal(project.wordGoal)
    }
  }, [project])

  if (!isOpen || !project) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onUpdate(project.id, title, description, wordGoal)
    onClose()
  }

  const handleDelete = () => {
    onDelete(project.id)
    setShowDeleteConfirm(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white dark:bg-[#262626] rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-serif font-bold text-gray-900 dark:text-gray-100">
            Projekteinstellungen
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'general'
                ? 'text-[#4A7C59] border-b-2 border-[#4A7C59]'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Allgemein
          </button>
          <button
            onClick={() => setActiveTab('danger')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'danger'
                ? 'text-red-500 border-b-2 border-red-500'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Gefahrenzone
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'general' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Projekttitel
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1A1B] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#4A7C59] outline-none"
                  placeholder="Name deines Projekts"
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
                  placeholder="Kurze Beschreibung..."
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tagesziel (Wörter)
                </label>
                <input
                  type="number"
                  value={wordGoal}
                  onChange={(e) => setWordGoal(parseInt(e.target.value) || 500)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1A1A1B] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#4A7C59] outline-none"
                  min={100}
                  max={10000}
                  step={100}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Aktuell: {project.wordGoal} Wörter
                </p>
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
          ) : (
            <div className="space-y-4">
              {!showDeleteConfirm ? (
                <>
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                      <div>
                        <h3 className="font-semibold text-red-900 dark:text-red-400">
                          Projekt löschen
                        </h3>
                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                          Diese Aktion kann nicht rückgängig gemacht werden. Alle Kapitel, Charaktere und Orte werden permanent gelöscht.
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 size={18} />
                    Projekt löschen
                  </button>
                </>
              ) : (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 space-y-4">
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Bist du sicher, dass du das Projekt <strong>"{project.title}"</strong> löschen möchtest?
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={handleDelete}
                      className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      Ja, löschen
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Main Page Component
export default function Home() {
  const router = useRouter()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth')
        const data = await res.json()
        
        if (data.user) {
          // User is logged in, check for selected project
          const storedProjectId = localStorage.getItem('selectedProjectId')
          if (storedProjectId) {
            // Stay on this page, the project will be loaded
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
  const [showPlaceModal, setShowPlaceModal] = useState(false)
  const [showEditProjectModal, setShowEditProjectModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [places, setPlaces] = useState<Place[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  
  // Character Quick-Card state
  const [quickCard, setQuickCard] = useState<QuickCardState>({
    character: null,
    position: { x: 0, y: 0 },
    visible: false
  })

  // Load projects after auth check
  useEffect(() => {
    if (!isCheckingAuth) {
      loadProjects()
    }
  }, [isCheckingAuth])

  // Load chapters, characters and places when project is selected
  useEffect(() => {
    if (selectedProject) {
      loadChapters(selectedProject.id)
      loadCharacters(selectedProject.id)
      loadPlaces(selectedProject.id)
    }
  }, [selectedProject])

  // Load chapter content and notes when chapter is selected
  useEffect(() => {
    if (selectedChapter) {
      setEditorContent(typeof selectedChapter.content === 'string' ? selectedChapter.content : '')
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
      
      // Check if a project was selected from dashboard
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
        // Auto-select first project if available
        setSelectedProject(data[0])
      }
      setIsLoading(false)
    } catch (error) {
      console.error('Error loading projects:', error)
      setIsLoading(false)
      setIsLoading(false)
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
          setSelectedChapter(data[0])
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
      
      // Create first chapter automatically
      await fetch('/api/chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: 'Kapitel 1', 
          projectId: newProject.id 
        })
      })
      
      loadChapters(newProject.id)
    } catch (error) {
      console.error('Error creating project:', error)
    }
  }

  const updateProject = async (id: string, title: string, description: string, wordGoal: number) => {
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, wordGoal })
      })
      const updatedProject = await response.json()
      
      // Update projects list
      setProjects(projects.map(p => p.id === id ? updatedProject : p))
      
      // Update selected project if it's the current one
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

  const saveChapter = async () => {
    if (!selectedChapter) return
    
    setIsSaving(true)
    try {
      const wordCount = editorContent.trim().split(/\s+/).filter(w => w.length > 0).length
      
      await fetch(`/api/chapters/${selectedChapter.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: editorContent,
          wordCount 
        })
      })
      
      // Update local state
      setChapters(chapters.map(ch => 
        ch.id === selectedChapter.id 
          ? { ...ch, content: editorContent, wordCount }
          : ch
      ))
      setSelectedChapter({ ...selectedChapter, content: editorContent, wordCount })
    } catch (error) {
      console.error('Error saving chapter:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const addCharacter = async (name: string, description: string, motivation: string) => {
    if (!selectedProject) return
    
    try {
      const response = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          description, 
          motivation,
          projectId: selectedProject.id 
        })
      })
      const newCharacter = await response.json()
      setCharacters([newCharacter, ...characters])
    } catch (error) {
      console.error('Error adding character:', error)
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
        body: JSON.stringify({
          name,
          description,
          location,
          climate,
          importance,
          projectId: selectedProject.id
        })
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

  // Handle editor click to detect character names
  const handleEditorClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget
    const text = textarea.value
    
    // Get cursor position from click
    const rect = textarea.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Calculate approximate character position (simplified)
    const lines = text.substring(0, textarea.selectionStart).split('\n')
    const currentLine = lines.length - 1
    const currentChar = lines[lines.length - 1].length
    
    // Get word at cursor position
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
      // Check if clicked word matches any character name (case-insensitive)
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
        // Close quick card if clicking elsewhere
        setQuickCard(prev => ({ ...prev, visible: false }))
      }
    } else {
      setQuickCard(prev => ({ ...prev, visible: false }))
    }
  }

  // Calculate total word count for current project
  const totalWordCount = Array.isArray(chapters) ? chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0) : 0

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] dark:bg-[#1A1A1B] flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Laden...</div>
      </div>
    )
  }

  // Project selection view
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
        {/* Header */}
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

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-2">
          <NavItem 
            icon={Book} 
            label="Manuskript" 
            active={activeTab === 'manuscript'} 
            onClick={() => setActiveTab('manuscript')}
            collapsed={!leftSidebarOpen}
          />
          <NavItem 
            icon={Users} 
            label="Charaktere" 
            active={activeTab === 'characters'} 
            onClick={() => setActiveTab('characters')}
            collapsed={!leftSidebarOpen}
          />
          <NavItem 
            icon={MapPin} 
            label="Orte" 
            active={activeTab === 'places'} 
            onClick={() => setActiveTab('places')}
            collapsed={!leftSidebarOpen}
          />
          <NavItem
            icon={StickyNote}
            label="Notizen"
            active={activeTab === 'notes'}
            onClick={() => setActiveTab('notes')}
            collapsed={!leftSidebarOpen}
          />
        </nav>

        {/* Word Progress */}
        {leftSidebarOpen && selectedProject && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <WordProgress 
              current={totalWordCount} 
              goal={selectedProject.wordGoal} 
            />
          </div>
        )}
      </aside>

      {/* Main Content - Editor */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 bg-white/50 dark:bg-[#262626]/50 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            {activeTab === 'manuscript' && selectedChapter && (
              <>
                <h2 className="text-lg font-serif text-gray-800 dark:text-gray-200">
                  {selectedChapter.title}
                </h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedChapter.wordCount || 0} Wörter
                </span>
              </>
            )}
            {activeTab === 'manuscript' && !selectedChapter && (
              <span className="text-gray-500 dark:text-gray-400">
                Kein Kapitel ausgewählt
              </span>
            )}
            {activeTab === 'characters' && (
              <h2 className="text-lg font-serif text-gray-800 dark:text-gray-200">
                Charakter-Verwaltung
              </h2>
            )}
            {activeTab === 'places' && (
              <h2 className="text-lg font-serif text-gray-800 dark:text-gray-200">
                Orte
              </h2>
            )}
            {activeTab === 'notes' && (
              <h2 className="text-lg font-serif text-gray-800 dark:text-gray-200">
                Notizen
              </h2>
            )}
          </div>
          <div className="flex items-center gap-3">
            {activeTab === 'manuscript' && (
              <FocusToggle isFocusMode={focusMode} onToggle={() => setFocusMode(!focusMode)} />
            )}
            <ThemeToggle />
            {activeTab === 'manuscript' && (
              <button
                onClick={saveChapter}
                disabled={isSaving || !selectedChapter}
                className="px-4 py-2 bg-[#4A7C59] text-white rounded-lg hover:bg-[#3d6349] transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={16} />
                {isSaving ? 'Speichern...' : 'Speichern'}
              </button>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {activeTab === 'manuscript' && (
            <div className="max-w-3xl mx-auto px-8 py-12 relative">
              {/* Floating Toolbar */}
              <FloatingToolbar visible={showToolbar} />

              {selectedChapter ? (
                <>
                  {/* Title Input */}
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

                  {/* Editor Content */}
                  <textarea
                    placeholder="Beginne zu schreiben... (Klicke auf Charakternamen für Quick-Card)"
                    value={editorContent}
                    onMouseUp={handleTextSelection}
                    onKeyUp={handleTextSelection}
                    onChange={(e) => setEditorContent(e.target.value)}
                    onClick={handleEditorClick}
                    className="editor-content w-full min-h-[600px] bg-transparent border-none outline-none resize-none placeholder-gray-400 dark:placeholder-gray-600 text-gray-800 dark:text-gray-100"
                    spellCheck={false}
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
                <h2 className="text-3xl font-serif font-bold text-gray-800 dark:text-gray-100">
                  Charaktere
                </h2>
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
                  <CharacterCard
                    key={char.id}
                    character={char}
                    onDelete={() => deleteCharacter(char.id)}
                  />
                ))}
                {characters.length === 0 && (
                  <div className="col-span-2 text-center py-12 text-gray-500 dark:text-gray-400">
                    <Users size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                    <p>Noch keine Charaktere vorhanden.</p>
                    <button
                      onClick={() => setShowCharacterModal(true)}
                      className="mt-4 px-4 py-2 bg-[#4A7C59] text-white rounded-lg hover:bg-[#3d6349] transition-colors"
                    >
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
                <h2 className="text-3xl font-serif font-bold text-gray-800 dark:text-gray-100">
                  Orte
                </h2>
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
                  <PlaceCard
                    key={place.id}
                    place={place}
                    onDelete={() => deletePlace(place.id)}
                  />
                ))}
                {places.length === 0 && (
                  <div className="col-span-2 text-center py-12 text-gray-500 dark:text-gray-400">
                    <MapPin size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                    <p>Noch keine Orte vorhanden.</p>
                    <button
                      onClick={() => setShowPlaceModal(true)}
                      className="mt-4 px-4 py-2 bg-[#4A7C59] text-white rounded-lg hover:bg-[#3d6349] transition-colors"
                    >
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
                <h2 className="text-3xl font-serif font-bold text-gray-800 dark:text-gray-100">
                  Notizen
                </h2>
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
            {/* Toggle Button */}
            <button
              onClick={() => setRightSidebarOpen(false)}
              className="absolute left-0 top-1/2 transform -translate-x-full -translate-y-1/2 bg-white dark:bg-[#262626] p-2 rounded-l-lg shadow-md border border-r-0 border-gray-200 dark:border-gray-700"
            >
              <ChevronRight size={20} />
            </button>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 space-y-6">
              {/* Chapters Section */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Kapitel
                  </h3>
                  <button
                    onClick={createChapter}
                    className="p-1.5 text-[#4A7C59] hover:bg-[#4A7C59]/10 rounded transition-colors"
                    title="Neues Kapitel"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <div className="space-y-1">
                  {chapters.map((chapter) => (
                    <ChapterItem
                      key={chapter.id}
                      chapter={chapter}
                      active={selectedChapter?.id === chapter.id}
                      onClick={() => {
                        if (selectedChapter && selectedChapter.id !== chapter.id) {
                          saveChapter()
                        }
                        setSelectedChapter(chapter)
                      }}
                    />
                  ))}
                  {chapters.length === 0 && (
                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                      Noch keine Kapitel
                    </p>
                  )}
                </div>
              </section>

              {/* Characters Section */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Charaktere
                  </h3>
                  <button
                    onClick={() => setShowCharacterModal(true)}
                    className="p-1.5 text-[#4A7C59] hover:bg-[#4A7C59]/10 rounded transition-colors"
                    title="Neuer Charakter"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <div className="space-y-3">
                  {characters.map((char) => (
                    <CharacterCard
                      key={char.id}
                      character={char}
                      onDelete={() => deleteCharacter(char.id)}
                    />
                  ))}
                  {characters.length === 0 && (
                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                      Noch keine Charaktere
                    </p>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </aside>

      {/* Right Sidebar Toggle (when closed and not in focus mode) */}
      {!focusMode && !rightSidebarOpen && (
        <button
          onClick={() => setRightSidebarOpen(true)}
          className="fixed right-0 top-1/2 transform -translate-y-1/2 bg-white dark:bg-[#262626] p-2 rounded-l-lg shadow-md border border-r-0 border-gray-200 dark:border-gray-700 z-50"
        >
          <ChevronLeft size={20} />
        </button>
      )}

      {/* Modals */}
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={createProject}
      />

      <AddCharacterModal
        isOpen={showCharacterModal}
        onClose={() => setShowCharacterModal(false)}
        onAdd={addCharacter}
      />

      <AddPlaceModal
        isOpen={showPlaceModal}
        onClose={() => setShowPlaceModal(false)}
        onAdd={addPlace}
      />

      {/* Character Quick-Card */}
      <CharacterQuickCard
        state={quickCard}
        onClose={() => setQuickCard(prev => ({ ...prev, visible: false }))}
      />

      {/* Edit Project Modal */}
      <EditProjectModal
        isOpen={showEditProjectModal}
        onClose={() => setShowEditProjectModal(false)}
        project={selectedProject}
        onUpdate={updateProject}
        onDelete={deleteProject}
      />
    </div>
  )
}
