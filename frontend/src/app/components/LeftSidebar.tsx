'use client'

import { Book, ChevronLeft, ChevronRight, Download, MapPin, Search, Settings, StickyNote, Users, Home as HomeIcon } from 'lucide-react'
import { NavItem } from './ThemeToggle'
import { WordProgress } from './WordProgress'
import { Project } from './types'
import { SURFACE_ALT, TEXT_PRIMARY, TEXT_SECONDARY, RADIUS, HOVER_SURFACE } from '@/lib/theme'

export type ActiveTab = 'manuscript' | 'characters' | 'places' | 'notes'

interface LeftSidebarProps {
  focusMode: boolean
  leftSidebarOpen: boolean
  setLeftSidebarOpen: (open: boolean) => void
  selectedProject: Project
  activeTab: ActiveTab
  setActiveTab: (tab: ActiveTab) => void
  totalWordCount: number
  onGoToDashboard: () => void
  onOpenEditProject: () => void
  onOpenExport: () => void
  onOpenSearch: () => void
}

export function LeftSidebar({
  focusMode,
  leftSidebarOpen,
  setLeftSidebarOpen,
  selectedProject,
  activeTab,
  setActiveTab,
  totalWordCount,
  onGoToDashboard,
  onOpenEditProject,
  onOpenExport,
  onOpenSearch,
}: LeftSidebarProps) {
  return (
    <aside
      className={`${focusMode ? 'w-0 opacity-0 overflow-hidden' : leftSidebarOpen ? 'w-64' : 'w-16'} ${SURFACE_ALT} border-r border-zinc-700 flex flex-col transition-all duration-300`}
    >
      <div className="p-4 border-b border-zinc-700">
        {leftSidebarOpen ? (
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-serif font-bold text-gray-800 dark:text-gray-100 truncate flex-1 min-w-0">
              {selectedProject.title}
            </h1>
            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
              <button
                onClick={onGoToDashboard}
                className={`p-2 ${RADIUS} ${HOVER_SURFACE} transition-colors ${TEXT_SECONDARY}`}
                title="Zurück zum Dashboard"
              >
                <HomeIcon size={20} />
              </button>
              <button
                onClick={onOpenSearch}
                className={`p-2 ${RADIUS} ${HOVER_SURFACE} transition-colors ${TEXT_SECONDARY}`}
                title="Suchen (Strg+K)"
              >
                <Search size={20} />
              </button>
              <button
                onClick={onOpenEditProject}
                className={`p-2 ${RADIUS} ${HOVER_SURFACE} transition-colors ${TEXT_SECONDARY}`}
                title="Projekteinstellungen"
              >
                <Settings size={20} />
              </button>
              <button
                onClick={onOpenExport}
                className={`p-2 ${RADIUS} ${HOVER_SURFACE} transition-colors ${TEXT_SECONDARY}`}
                title="Exportieren"
              >
                <Download size={20} />
              </button>
              <button
                onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
                className={`p-1 ${RADIUS} ${HOVER_SURFACE} transition-colors`}
              >
                <ChevronLeft size={20} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
              className={`p-1 ${RADIUS} ${HOVER_SURFACE} transition-colors`}
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
        <div className="p-4 border-t border-zinc-700">
          <WordProgress current={totalWordCount} goal={selectedProject.wordGoal} />
        </div>
      )}
    </aside>
  )
}
