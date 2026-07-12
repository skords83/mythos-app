'use client'

import { Book, ChevronLeft, ChevronRight, Download, MapPin, Settings, StickyNote, Users, Home as HomeIcon } from 'lucide-react'
import { NavItem } from './ThemeToggle'
import { WordProgress } from './WordProgress'
import { Project } from './types'

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
}: LeftSidebarProps) {
  return (
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
                onClick={onGoToDashboard}
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
                title="Zurück zum Dashboard"
              >
                <HomeIcon size={20} />
              </button>
              <button
                onClick={onOpenEditProject}
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
                title="Projekteinstellungen"
              >
                <Settings size={20} />
              </button>
              <button
                onClick={onOpenExport}
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
  )
}
