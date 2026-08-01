'use client'

import React, { useState, useEffect } from 'react'
import { Moon, Sun } from 'lucide-react'
import { RADIUS, HOVER_SURFACE, EASE_STANDARD, ICON_PROPS } from '@/lib/theme'
import { MonoLabel } from './MonoLabel'

export function ThemeToggle() {
  const [darkMode, setDarkMode] = useState(true)

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark')
    setDarkMode(isDark)
  }, [])

  const toggleTheme = () => {
    const next = !darkMode
    setDarkMode(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 ${RADIUS} ${HOVER_SURFACE} transition-colors`}
      aria-label="Theme wechseln"
    >
      {darkMode ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  )
}

export function FocusToggle({ isFocusMode, onToggle }: { isFocusMode: boolean, onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`p-2 ${RADIUS} ${HOVER_SURFACE} transition-colors`}
      title={isFocusMode ? "Fokusmodus beenden" : "Fokusmodus"}
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="20" 
        height="20" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    </button>
  )
}

interface NavItemProps {
  icon: React.ComponentType<any>
  label: string
  shortLabel: string
  active?: boolean
  onClick?: () => void
  collapsed?: boolean
}

export function NavItem({ icon: Icon, label, shortLabel, active, onClick, collapsed }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`relative w-full flex items-center ${collapsed ? 'flex-col gap-1 px-2 py-3' : 'gap-3 px-4 py-2.5'} ${RADIUS} transition-colors ${
        active ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
      }`}
    >
      <span
        className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-indigo-600 origin-center transition-transform duration-200 ${EASE_STANDARD} ${
          active ? 'scale-y-100' : 'scale-y-0'
        }`}
      />
      <Icon {...ICON_PROPS} />
      {collapsed ? <MonoLabel muted={!active}>{shortLabel}</MonoLabel> : <span>{label}</span>}
    </button>
  )
}
