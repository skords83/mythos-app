'use client'

import React, { useState, useEffect } from 'react'
import { 
  Book, 
  Plus, 
  Trash2, 
  Moon, 
  Sun,
  LogOut,
  FileText,
  Users,
  ArrowRight,
  Loader2
} from 'lucide-react'
import { useRouter } from 'next/navigation'

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

interface User {
  id: string
  email: string
  name: string | null
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

// Project Card Component
function ProjectCard({ project, onDelete, onOpen }: { 
  project: Project
  onDelete: () => void
  onOpen: () => void
}) {
  return (
    <div className="bg-white dark:bg-[#262626] rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4A7C59] to-[#6B9E7C] flex items-center justify-center text-white">
          <Book size={24} />
        </div>
        <button
          onClick={onDelete}
          className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Projekt löschen"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <h3 className="text-xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-2">
        {project.title}
      </h3>
      
      {project.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
          {project.description}
        </p>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4 text-sm text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <FileText size={16} />
          <span>{project._count?.chapters || 0} Kapitel</span>
        </div>
        <div className="flex items-center gap-1">
          <Users size={16} />
          <span>{project._count?.characters || 0} Charaktere</span>
        </div>
      </div>

      {/* Open Button */}
      <button
        onClick={onOpen}
        className="w-full py-2 px-4 bg-[#4A7C59]/10 hover:bg-[#4A7C59]/20 text-[#4A7C59] rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
      >
        Öffnen
        <ArrowRight size={18} />
      </button>
    </div>
  )
}

// Main Dashboard Component
export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const router = useRouter()

  // Check auth and load projects
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth')
      const data = await res.json()
      
      if (!data.user) {
        router.push('/login')
        return
      }
      
      setUser(data.user)
      loadProjects()
    } catch (error) {
      console.error('Auth check error:', error)
      router.push('/login')
    }
  }

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/projects')
      if (response.status === 401) {
        router.push('/login')
        return
      }
      const data = await response.json()
      setProjects(data)
    } catch (error) {
      console.error('Error loading projects:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const createProject = async (title: string, description: string, wordGoal: number) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, wordGoal })
      })
      
      if (response.status === 401) {
        router.push('/login')
        return
      }
      
      const newProject = await response.json()
      setProjects([newProject, ...projects])
    } catch (error) {
      console.error('Error creating project:', error)
    }
  }

  const deleteProject = async (projectId: string) => {
    if (!confirm('Möchtest du dieses Projekt wirklich löschen?')) return
    
    try {
      await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
      setProjects(projects.filter(p => p.id !== projectId))
    } catch (error) {
      console.error('Error deleting project:', error)
    }
  }

  const openProject = (projectId: string) => {
    localStorage.setItem('selectedProjectId', projectId)
    router.push('/')
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' })
      })
    } catch (error) {
      console.error('Logout error:', error)
    }
    router.push('/login')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] dark:bg-[#1A1A1B] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#4A7C59]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] dark:bg-[#1A1A1B]">
      {/* Header */}
      <header className="bg-white/80 dark:bg-[#262626]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4A7C59] to-[#6B9E7C] flex items-center justify-center">
                <Book size={20} className="text-white" />
              </div>
              <span className="text-xl font-serif font-bold text-gray-900 dark:text-gray-100">
                Mythos
              </span>
            </div>

            {/* User info & Actions */}
            <div className="flex items-center gap-3">
              {user && (
                <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:block">
                  {user.name || user.email}
                </span>
              )}
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
                title="Abmelden"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-2">
              Deine Projekte
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              {projects.length} {projects.length === 1 ? 'Projekt' : 'Projekte'}
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-[#4A7C59] text-white rounded-lg hover:bg-[#3d6349] transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Neues Projekt</span>
          </button>
        </div>

        {/* Projects Grid */}
        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onDelete={() => deleteProject(project.id)}
                onOpen={() => openProject(project.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Book size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h2 className="text-xl font-serif text-gray-700 dark:text-gray-300 mb-2">
              Noch keine Projekte
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Erstelle dein erstes Projekt und beginne mit deinem nächsten Meisterwerk.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-[#4A7C59] text-white rounded-lg hover:bg-[#3d6349] transition-colors inline-flex items-center gap-2"
            >
              <Plus size={20} />
              Erstes Projekt erstellen
            </button>
          </div>
        )}
      </main>

      {/* Create Modal */}
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={createProject}
      />
    </div>
  )
}
