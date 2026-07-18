'use client'

import { Book, ChevronLeft, ChevronRight, Clock, Download, Gem, MapPin, Scroll, Search, Settings, Shield, StickyNote, Users, Home as HomeIcon } from 'lucide-react'
import { NavItem } from './ThemeToggle'
import { WordProgress } from './WordProgress'
import { Project } from './types'
import { SURFACE_ALT, TEXT_PRIMARY, RADIUS, HOVER_SURFACE } from '@/lib/theme'

export type ActiveTab = 'manuscript' | 'characters' | 'places' | 'items' | 'factions' | 'notes' | 'timeline' | 'lore'

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
      className={`${focusMode ? 'w-0 opacity-0 overflow-hidden' : leftSidebarOpen ? 'w-64' : 'w-16'} ${SURFACE_ALT} border-r-2 border-zinc-900 dark:border-zinc-700 flex flex-col transition-all duration-300`}
    >
      <div className="p-4 border-b border-zinc-300 dark:border-zinc-700">
        {leftSidebarOpen ? (
          <div className="flex items-center justify-between">
            <h1 className={`text-xl font-serif font-bold ${TEXT_PRIMARY} truncate flex-1 min-w-0`}>
              {selectedProject.title}
            </h1>
            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
              <button
                onClick={onGoToDashboard}
                className={`p-2 ${RADIUS} ${HOVER_SURFACE} transition-colors text-zinc-500 dark:text-zinc-400`}
                title="Zurück zum Dashboard"
              >
                <HomeIcon size={20} />
              </button>
              <button
                onClick={onOpenSearch}
                className={`p-2 ${RADIUS} ${HOVER_SURFACE} transition-colors text-zinc-500 dark:text-zinc-400`}
                title="Suchen (Strg+K)"
              >
                <Search size={20} />
              </button>
              <button
                onClick={onOpenEditProject}
                className={`p-2 ${RADIUS} ${HOVER_SURFACE} transition-colors text-zinc-500 dark:text-zinc-400`}
                title="Projekteinstellungen"
              >
                <Settings size={20} />
              </button>
              <button
                onClick={onOpenExport}
                className={`p-2 ${RADIUS} ${HOVER_SURFACE} transition-colors text-zinc-500 dark:text-zinc-400`}
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
        <NavItem icon={Gem} label="Items" active={activeTab === 'items'} onClick={() => setActiveTab('items')} collapsed={!leftSidebarOpen} />
        <NavItem icon={Shield} label="Fraktionen" active={activeTab === 'factions'} onClick={() => setActiveTab('factions')} collapsed={!leftSidebarOpen} />
        <NavItem icon={Clock} label="Zeitstrahl" active={activeTab === 'timeline'} onClick={() => setActiveTab('timeline')} collapsed={!leftSidebarOpen} />
        <NavItem icon={Scroll} label="Lore-Bibel" active={activeTab === 'lore'} onClick={() => setActiveTab('lore')} collapsed={!leftSidebarOpen} />
        <NavItem icon={StickyNote} label="Notizen" active={activeTab === 'notes'} onClick={() => setActiveTab('notes')} collapsed={!leftSidebarOpen} />
      </nav>

      {leftSidebarOpen && selectedProject && (
        <div className="p-4 border-t border-zinc-300 dark:border-zinc-700">
          <WordProgress current={totalWordCount} goal={selectedProject.wordGoal} />
        </div>
      )}
    </aside>
  )
}
