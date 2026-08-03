'use client'

import { Book, ChevronLeft, ChevronRight, Clock, Download, Flame, Gem, MapPin, Scroll, Search, Settings, Shield, StickyNote, Users, Home as HomeIcon } from 'lucide-react'
import { NavItem } from './ThemeToggle'
import { WordProgress } from './WordProgress'
import { Project } from './types'
import { SURFACE_ALT, TEXT_PRIMARY, TEXT_MUTED, RADIUS, HOVER_SURFACE, HAIRLINE, EASE_STANDARD, ICON_PROPS } from '@/lib/theme'

export type ActiveTab = 'manuscript' | 'characters' | 'places' | 'items' | 'factions' | 'notes' | 'timeline' | 'lore'

interface LeftSidebarProps {
  focusMode: boolean
  leftSidebarOpen: boolean
  setLeftSidebarOpen: (open: boolean) => void
  selectedProject: Project
  activeTab: ActiveTab
  setActiveTab: (tab: ActiveTab) => void
  todayWordCount: number
  onGoToDashboard: () => void
  onOpenEditProject: () => void
  onOpenExport: () => void
  onOpenSearch: () => void
  onOpenStats: () => void
}

export function LeftSidebar({
  focusMode,
  leftSidebarOpen,
  setLeftSidebarOpen,
  selectedProject,
  activeTab,
  setActiveTab,
  todayWordCount,
  onGoToDashboard,
  onOpenEditProject,
  onOpenExport,
  onOpenSearch,
  onOpenStats,
}: LeftSidebarProps) {
  return (
    <aside
      className={`${focusMode ? 'w-0 opacity-0 overflow-hidden' : leftSidebarOpen ? 'w-44' : 'w-[72px]'} ${SURFACE_ALT} border-r ${HAIRLINE} flex flex-col transition-[width] duration-200 ${EASE_STANDARD}`}
    >
      <div className={`p-4 border-b ${HAIRLINE}`}>
        {leftSidebarOpen ? (
          <div className="flex items-center justify-between">
            <h1 className={`text-xl font-display font-light ${TEXT_PRIMARY} truncate flex-1 min-w-0`}>
              {selectedProject.title}
            </h1>
            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
              <button
                onClick={onGoToDashboard}
                className={`p-2 ${RADIUS} ${HOVER_SURFACE} transition-colors text-zinc-500 dark:text-zinc-400`}
                title="Zurück zum Dashboard"
              >
                <HomeIcon {...ICON_PROPS} />
              </button>
              <button
                onClick={onOpenSearch}
                className={`p-2 ${RADIUS} ${HOVER_SURFACE} transition-colors text-zinc-500 dark:text-zinc-400`}
                title="Suchen (Strg+K)"
              >
                <Search {...ICON_PROPS} />
              </button>
              <button
                onClick={onOpenEditProject}
                className={`p-2 ${RADIUS} ${HOVER_SURFACE} transition-colors text-zinc-500 dark:text-zinc-400`}
                title="Projekteinstellungen"
              >
                <Settings {...ICON_PROPS} />
              </button>
              <button
                onClick={onOpenExport}
                className={`p-2 ${RADIUS} ${HOVER_SURFACE} transition-colors text-zinc-500 dark:text-zinc-400`}
                title="Exportieren"
              >
                <Download {...ICON_PROPS} />
              </button>
              <button
                onClick={onOpenStats}
                className={`p-2 ${RADIUS} ${HOVER_SURFACE} transition-colors text-zinc-500 dark:text-zinc-400`}
                title="Schreib-Statistik"
              >
                <Flame {...ICON_PROPS} />
              </button>
              <button
                onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
                className={`p-1 ${RADIUS} ${HOVER_SURFACE} transition-colors`}
              >
                <ChevronLeft {...ICON_PROPS} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
              className={`p-1 ${RADIUS} ${HOVER_SURFACE} transition-colors`}
            >
              <ChevronRight {...ICON_PROPS} />
            </button>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <NavItem icon={Book} label="Manuskript" shortLabel="MANU" active={activeTab === 'manuscript'} onClick={() => setActiveTab('manuscript')} collapsed={!leftSidebarOpen} />
        <NavItem icon={Users} label="Charaktere" shortLabel="CHAR" active={activeTab === 'characters'} onClick={() => setActiveTab('characters')} collapsed={!leftSidebarOpen} />
        <NavItem icon={MapPin} label="Orte" shortLabel="ORTE" active={activeTab === 'places'} onClick={() => setActiveTab('places')} collapsed={!leftSidebarOpen} />
        <NavItem icon={Gem} label="Items" shortLabel="ITEM" active={activeTab === 'items'} onClick={() => setActiveTab('items')} collapsed={!leftSidebarOpen} />
        <NavItem icon={Shield} label="Fraktionen" shortLabel="FRAK" active={activeTab === 'factions'} onClick={() => setActiveTab('factions')} collapsed={!leftSidebarOpen} />
        <NavItem icon={Clock} label="Zeitstrahl" shortLabel="ZEIT" active={activeTab === 'timeline'} onClick={() => setActiveTab('timeline')} collapsed={!leftSidebarOpen} />
        <NavItem icon={Scroll} label="Lore-Bibel" shortLabel="LORE" active={activeTab === 'lore'} onClick={() => setActiveTab('lore')} collapsed={!leftSidebarOpen} />
        <NavItem icon={StickyNote} label="Notizen" shortLabel="NOTE" active={activeTab === 'notes'} onClick={() => setActiveTab('notes')} collapsed={!leftSidebarOpen} />
      </nav>

      {leftSidebarOpen && selectedProject && (
        <button
          onClick={onOpenStats}
          className={`p-4 border-t ${HAIRLINE} w-full ${HOVER_SURFACE} transition-colors`}
          title="Schreib-Statistik öffnen"
        >
          <p className={`text-xs ${TEXT_MUTED} text-center uppercase tracking-wide`}>Heute</p>
          <WordProgress current={todayWordCount} goal={selectedProject.wordGoal} />
        </button>
      )}
    </aside>
  )
}
