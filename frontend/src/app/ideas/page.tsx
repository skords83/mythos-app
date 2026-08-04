'use client'

import React, { useState, useEffect } from 'react'
import { Plus, LogOut, Lightbulb, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Toast } from '../components/Toast'
import { EmptyState } from '../components/EmptyState'
import { HairlineButton } from '../components/HairlineButton'
import { IdeaCard } from '../components/IdeaCard'
import { AddIdeaModal } from '../components/AddIdeaModal'
import { EditIdeaModal } from '../components/EditIdeaModal'
import { AppSidebar } from '../components/AppSidebar'
import { Idea } from '../components/types'
import { ACCENT_TEXT, RADIUS, TEXT_PRIMARY, TEXT_SECONDARY, HAIRLINE, HOVER_SURFACE, SURFACE, SURFACE_ALT, MONO_LABEL_MUTED } from '@/lib/theme'

interface User {
  id: string
  email: string
  name: string | null
}

export default function IdeasPage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [showAddIdeaModal, setShowAddIdeaModal] = useState(false)
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null)
  const [errorToast, setErrorToast] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ title: string, message: string, onConfirm: () => void } | null>(null)
  const router = useRouter()

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
      await loadIdeas()
    } catch (error) {
      console.error('Auth check error:', error)
      router.push('/login')
    } finally {
      setIsLoading(false)
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
      <AppSidebar />

      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className={`h-16 ${SURFACE_ALT} border-b ${HAIRLINE} flex items-center justify-between px-6 flex-shrink-0`}>
          <span className={MONO_LABEL_MUTED}>
            {ideas.length} {ideas.length === 1 ? 'Idee' : 'Ideen'}
          </span>
          <div className="flex items-center gap-3">
            {user && (
              <span className={`text-sm ${TEXT_SECONDARY} hidden sm:block`}>
                {user.name || user.email}
              </span>
            )}
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
                Ideenboard
              </h1>
              <span className={`px-2 py-0.5 ${RADIUS} border ${HAIRLINE} ${MONO_LABEL_MUTED}`}>
                {ideas.length} {ideas.length === 1 ? 'Idee' : 'Ideen'}
              </span>
            </div>
            <HairlineButton emphasised onClick={() => setShowAddIdeaModal(true)}>
              <Plus size={20} />
              <span className="hidden sm:inline">Neue Idee</span>
            </HairlineButton>
          </div>

          {/* Ideas Grid */}
          {ideas.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ideas.map((idea) => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  onEdit={() => setEditingIdea(idea)}
                  onDelete={() => deleteIdea(idea.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Lightbulb}
              label="Noch keine Ideen"
              description="Halte spontane Ideen fest, bevor sie einem Projekt zugeordnet sind."
              action={
                <HairlineButton emphasised onClick={() => setShowAddIdeaModal(true)}>
                  <Plus size={20} />
                  Idee festhalten
                </HairlineButton>
              }
            />
          )}
        </div>
      </main>

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
