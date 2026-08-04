'use client'

import React, { useState, useEffect } from 'react'
import {
  Book,
  Plus,
  Trash2,
  LogOut,
  FileText,
  Users,
  ArrowRight,
  Loader2,
  Lightbulb,
  X
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Toast } from '../components/Toast'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { HairlineButton } from '../components/HairlineButton'
import { IdeaCard } from '../components/IdeaCard'
import { AddIdeaModal } from '../components/AddIdeaModal'
import { EditIdeaModal } from '../components/EditIdeaModal'
import { ThemeToggle } from '../components/ThemeToggle'
import { AppSidebar } from '../components/AppSidebar'
import { Idea } from '../components/types'
import { OVERLAY, MODAL_PANEL, INPUT, ACCENT_TEXT, RADIUS, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, HAIRLINE, HOVER_SURFACE, SURFACE, SURFACE_ALT, MONO_LABEL_MUTED } from '@/lib/theme'

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
    <div className={OVERLAY}>
      <div className={`${MODAL_PANEL} p-6 w-full max-w-md`}>
        <h2 className={`text-2xl font-display font-light mb-4 ${TEXT_PRIMARY}`}>
          Neues Projekt
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium ${TEXT_SECONDARY} mb-1`}>
              Titel
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={INPUT}
              placeholder="Name deines Projekts"
              required
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${TEXT_SECONDARY} mb-1`}>
              Beschreibung
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${INPUT} resize-none`}
              placeholder="Kurze Beschreibung..."
              rows={3}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${TEXT_SECONDARY} mb-1`}>
              Tagesziel (Wörter)
            </label>
            <input
              type="number"
              value={wordGoal}
              onChange={(e) => setWordGoal(parseInt(e.target.value) || 500)}
              className={INPUT}
              min={100}
              max={10000}
              step={100}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <HairlineButton type="button" onClick={onClose} className="flex-1 justify-center">
              Abbrechen
            </HairlineButton>
            <HairlineButton type="submit" emphasised className="flex-1 justify-center">
              Erstellen
            </HairlineButton>
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
    <Card
      onClick={onOpen}
      className="hover:border-zinc-400 dark:hover:border-zinc-500 flex flex-col"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 ${RADIUS} bg-indigo-600 flex items-center justify-center text-white`}>
          <Book size={24} />
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className={`p-2 ${TEXT_MUTED} hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity`}
          title="Projekt löschen"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <h3 className={`text-xl font-display font-light ${TEXT_PRIMARY} mb-2`}>
        {project.title}
      </h3>

      {project.description && (
        <p className={`text-sm ${TEXT_SECONDARY} mb-4 line-clamp-2`}>
          {project.description}
        </p>
      )}

      {/* Stats */}
      <div className={`flex items-center gap-4 mb-4 text-sm ${TEXT_MUTED}`}>
        <div className="flex items-center gap-1">
          <FileText size={16} />
          <span>{project._count?.chapters || 0} Kapitel</span>
        </div>
        <div className="flex items-center gap-1">
          <Users size={16} />
          <span>{project._count?.characters || 0} Charaktere</span>
        </div>
      </div>

      {/* Open affordance */}
      <div className={`mt-auto flex items-center gap-1.5 text-sm ${ACCENT_TEXT}`}>
        Öffnen
        <ArrowRight size={16} />
      </div>
    </Card>
  )
}

// Ideenboard Drawer — slides in from the right when opened via the sidebar link,
// rather than sitting permanently next to the projects grid.
function IdeaBoardDrawer({ isOpen, onClose, ideas, onAddClick, onEdit, onDelete }: {
  isOpen: boolean
  onClose: () => void
  ideas: Idea[]
  onAddClick: () => void
  onEdit: (idea: Idea) => void
  onDelete: (id: string) => void
}) {
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-zinc-950/60 z-50 flex justify-end animate-fade-in" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md h-full ${SURFACE_ALT} border-l ${HAIRLINE} p-5 overflow-y-auto`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-lg font-display font-light ${TEXT_PRIMARY}`}>
            Ideenboard
          </h2>
          <div className="flex items-center gap-2">
            <HairlineButton emphasised onClick={onAddClick}>
              <Plus size={16} />
              <span className="hidden sm:inline">Neue Idee</span>
            </HairlineButton>
            <button
              onClick={onClose}
              className={`p-2 ${RADIUS} ${HOVER_SURFACE} transition-colors ${TEXT_SECONDARY}`}
              title="Schließen"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        {ideas.length > 0 ? (
          <div className="space-y-3">
            {ideas.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                onEdit={() => onEdit(idea)}
                onDelete={() => onDelete(idea.id)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Lightbulb}
            iconSize={56}
            label="Noch keine Ideen"
            description="Halte spontane Ideen fest, bevor sie einem Projekt zugeordnet sind."
            className="py-10"
            action={
              <HairlineButton emphasised onClick={onAddClick}>
                <Plus size={16} />
                Idee festhalten
              </HairlineButton>
            }
          />
        )}
      </div>
    </div>
  )
}

// Main Dashboard Component
export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [errorToast, setErrorToast] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ title: string, message: string, onConfirm: () => void } | null>(null)
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [showAddIdeaModal, setShowAddIdeaModal] = useState(false)
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null)
  const [showIdeaBoard, setShowIdeaBoard] = useState(false)
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
      loadIdeas()
    } catch (error) {
      console.error('Auth check error:', error)
      router.push('/login')
    }
  }

  // Ideas without a projectId form the family-wide Ideenboard, for quickly
  // jotting something down before it belongs to any particular Geschichte.
  const loadIdeas = async () => {
    try {
      const response = await fetch('/api/ideas')
      if (!response.ok) return
      const data = await response.json()
      setIdeas(data.filter((idea: Idea) => !idea.projectId))
    } catch (error) {
      console.error('Error loading ideas:', error)
    }
  }

  const addIdea = async (title: string, content: string, tags: string[], visibility: 'PRIVATE' | 'FAMILY') => {
    try {
      const response = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, tags, visibility })
      })
      if (!response.ok) {
        setErrorToast('Idee konnte nicht erstellt werden.')
        return
      }
      const newIdea = await response.json()
      setIdeas([newIdea, ...ideas])
    } catch (error) {
      console.error('Error adding idea:', error)
      setErrorToast('Idee konnte nicht erstellt werden.')
    }
  }

  const updateIdea = async (id: string, title: string, content: string, tags: string[], visibility: 'PRIVATE' | 'FAMILY') => {
    try {
      const response = await fetch(`/api/ideas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, tags, visibility })
      })
      if (!response.ok) {
        setErrorToast('Idee konnte nicht gespeichert werden.')
        return
      }
      const updated = await response.json()
      setIdeas(ideas.map(i => i.id === id ? updated : i))
    } catch (error) {
      console.error('Error updating idea:', error)
      setErrorToast('Idee konnte nicht gespeichert werden.')
    }
  }

  const deleteIdea = (ideaId: string) => {
    setConfirmDialog({
      title: 'Idee löschen',
      message: 'Möchtest du diese Idee wirklich löschen?',
      onConfirm: async () => {
        setConfirmDialog(null)
        try {
          const response = await fetch(`/api/ideas/${ideaId}`, { method: 'DELETE' })
          if (!response.ok) {
            setErrorToast('Idee konnte nicht gelöscht werden.')
            return
          }
          setIdeas(ideas.filter(i => i.id !== ideaId))
        } catch (error) {
          console.error('Error deleting idea:', error)
          setErrorToast('Idee konnte nicht gelöscht werden.')
        }
      }
    })
  }

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/projects')
      if (response.status === 401) {
        router.push('/login')
        return
      }
      if (!response.ok) {
        setErrorToast('Projekte konnten nicht geladen werden.')
        return
      }
      const data = await response.json()
      setProjects(data.projects)
    } catch (error) {
      console.error('Error loading projects:', error)
      setErrorToast('Projekte konnten nicht geladen werden.')
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

      if (!response.ok) {
        setErrorToast('Projekt konnte nicht erstellt werden.')
        return
      }

      const newProject = await response.json()
      setProjects([newProject, ...projects])
    } catch (error) {
      console.error('Error creating project:', error)
      setErrorToast('Projekt konnte nicht erstellt werden.')
    }
  }

  const deleteProject = (projectId: string) => {
    setConfirmDialog({
      title: 'Projekt löschen',
      message: 'Möchtest du dieses Projekt wirklich löschen?',
      onConfirm: async () => {
        setConfirmDialog(null)
        try {
          const response = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
          if (!response.ok) {
            setErrorToast('Projekt konnte nicht gelöscht werden.')
            return
          }
          setProjects(projects.filter(p => p.id !== projectId))
        } catch (error) {
          console.error('Error deleting project:', error)
          setErrorToast('Projekt konnte nicht gelöscht werden.')
        }
      }
    })
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
      <div className={`min-h-screen ${SURFACE} flex items-center justify-center`}>
        <Loader2 size={32} className={`animate-spin ${ACCENT_TEXT}`} />
      </div>
    )
  }

  return (
    <div className={`h-screen overflow-hidden ${SURFACE} flex`}>
      <AppSidebar onIdeenboardClick={() => setShowIdeaBoard(true)} />

      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className={`h-16 ${SURFACE_ALT} border-b ${HAIRLINE} flex items-center justify-between px-6 flex-shrink-0`}>
          <span className={MONO_LABEL_MUTED}>
            {projects.length} {projects.length === 1 ? 'Projekt' : 'Projekte'} · {ideas.length} {ideas.length === 1 ? 'Idee' : 'Ideen'}
          </span>
          <div className="flex items-center gap-3">
            {user && (
              <span className={`text-sm ${TEXT_SECONDARY} hidden sm:block`}>
                {user.name || user.email}
              </span>
            )}
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className={`p-2 ${RADIUS} ${HOVER_SURFACE} transition-colors ${TEXT_SECONDARY}`}
              title="Abmelden"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <h1 className={`text-3xl font-display font-light ${TEXT_PRIMARY}`}>
                Deine Projekte
              </h1>
              <span className={`px-2 py-0.5 ${RADIUS} border ${HAIRLINE} ${MONO_LABEL_MUTED}`}>
                {projects.length} {projects.length === 1 ? 'Projekt' : 'Projekte'}
              </span>
            </div>
            <HairlineButton emphasised onClick={() => setShowCreateModal(true)}>
              <Plus size={20} />
              <span className="hidden sm:inline">Neues Projekt</span>
            </HairlineButton>
          </div>

          {/* Projects Grid */}
          {projects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
            <EmptyState
              icon={Book}
              label="Noch keine Projekte"
              description="Erstelle dein erstes Projekt und beginne mit deinem nächsten Meisterwerk."
              action={
                <HairlineButton emphasised onClick={() => setShowCreateModal(true)}>
                  <Plus size={20} />
                  Erstes Projekt erstellen
                </HairlineButton>
              }
            />
          )}
        </div>
      </main>

      {/* Create Modal */}
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={createProject}
      />
      <IdeaBoardDrawer
        isOpen={showIdeaBoard}
        onClose={() => setShowIdeaBoard(false)}
        ideas={ideas}
        onAddClick={() => setShowAddIdeaModal(true)}
        onEdit={setEditingIdea}
        onDelete={deleteIdea}
      />
      <AddIdeaModal
        isOpen={showAddIdeaModal}
        onClose={() => setShowAddIdeaModal(false)}
        onAdd={addIdea}
      />
      <EditIdeaModal
        isOpen={!!editingIdea}
        idea={editingIdea}
        onClose={() => setEditingIdea(null)}
        onUpdate={updateIdea}
      />
      <ConfirmDialog
        isOpen={!!confirmDialog}
        title={confirmDialog?.title ?? ''}
        message={confirmDialog?.message ?? ''}
        onConfirm={() => confirmDialog?.onConfirm()}
        onCancel={() => setConfirmDialog(null)}
      />
      <Toast message={errorToast} onDismiss={() => setErrorToast(null)} />
    </div>
  )
}
