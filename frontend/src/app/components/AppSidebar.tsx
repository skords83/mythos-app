'use client'

import { useState } from 'react'
import { Book, ChevronLeft, ChevronRight, Lightbulb, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { NavItem } from './ThemeToggle'
import { SURFACE_ALT, TEXT_PRIMARY, RADIUS, HOVER_SURFACE, HAIRLINE, EASE_STANDARD, ICON_PROPS } from '@/lib/theme'

interface AppSidebarProps {
  onIdeenboardClick: () => void
}

// App-level sidebar for screens outside a project (dashboard). Mirrors
// LeftSidebar's visual language (width/collapse/hairline/NavItem) but with
// account-level nav instead of per-project entity tabs, since those routes
// only exist once a project is selected.
export function AppSidebar({ onIdeenboardClick }: AppSidebarProps) {
  const [open, setOpen] = useState(true)
  const router = useRouter()

  return (
    <aside
      className={`${open ? 'w-44' : 'w-[72px]'} ${SURFACE_ALT} border-r ${HAIRLINE} flex flex-col transition-[width] duration-200 ${EASE_STANDARD}`}
    >
      <div className={`p-4 border-b ${HAIRLINE}`}>
        {open ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-8 h-8 ${RADIUS} bg-indigo-600 flex items-center justify-center flex-shrink-0`}>
                <Book size={18} className="text-white" />
              </div>
              <span className={`text-lg font-display font-light ${TEXT_PRIMARY} truncate`}>Mythos</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className={`p-1 ${RADIUS} ${HOVER_SURFACE} transition-colors flex-shrink-0`}
            >
              <ChevronLeft {...ICON_PROPS} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className={`w-8 h-8 ${RADIUS} bg-indigo-600 flex items-center justify-center`}>
              <Book size={18} className="text-white" />
            </div>
            <button
              onClick={() => setOpen(true)}
              className={`p-1 ${RADIUS} ${HOVER_SURFACE} transition-colors`}
            >
              <ChevronRight {...ICON_PROPS} />
            </button>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <NavItem icon={Book} label="Projekte" shortLabel="PROJ" active onClick={() => {}} collapsed={!open} />
        <NavItem icon={Lightbulb} label="Ideenboard" shortLabel="IDEE" active={false} onClick={onIdeenboardClick} collapsed={!open} />
        <NavItem icon={Users} label="Familie" shortLabel="FAM" active={false} onClick={() => router.push('/family')} collapsed={!open} />
      </nav>
    </aside>
  )
}
