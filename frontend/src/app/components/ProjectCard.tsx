'use client'

import React from 'react'
import { Trash2 } from 'lucide-react'
import { Project } from './types'

interface ProjectCardProps {
  project: Project
  onClick: () => void
  onDelete: (e: React.MouseEvent) => void
}

export function ProjectCard({ project, onClick, onDelete }: ProjectCardProps) {
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
