'use client'

import React, { useState, useEffect } from 'react'
import { Trash2, AlertTriangle } from 'lucide-react'
import { Project } from './types'

interface EditProjectModalProps {
  isOpen: boolean
  onClose: () => void
  project: Project | null
  onUpdate: (id: string, title: string, description: string, wordGoal: number, coverImage?: string) => void
  onDelete: (id: string) => void
}

export function EditProjectModal({ isOpen, onClose, project, onUpdate, onDelete }: EditProjectModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [wordGoal, setWordGoal] = useState(500)
  const [coverImage, setCoverImage] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'danger'>('general')
  const coverInputRef = React.useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (project) {
      setTitle(project.title)
      setDescription(project.description || '')
      setWordGoal(project.wordGoal)
      setCoverImage(project.coverImage || '')
    }
  }, [project])

  if (!isOpen || !project) return null

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setCoverImage(reader.result as string)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onUpdate(project.id, title, description, wordGoal, coverImage)
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
              Titelbild (für ePub)
            </label>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <div className="flex items-center gap-3">
              {coverImage ? (
                <div className="relative">
                  <img src={coverImage} alt="Cover" className="w-16 h-20 object-cover rounded" />
                  <button
                    type="button"
                    onClick={() => setCoverImage('')}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="w-16 h-20 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-gray-400">
                  <span className="text-xs">Keins</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
              >
Bild auswählen
</button>
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
