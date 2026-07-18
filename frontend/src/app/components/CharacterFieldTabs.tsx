'use client'

import { TEXT_SECONDARY, TEXT_PRIMARY, INPUT } from '@/lib/theme'

export type CharacterFieldKey = 'appearance' | 'personality' | 'backstory'

const TABS: { key: CharacterFieldKey; label: string; placeholder: string }[] = [
  { key: 'appearance', label: 'Äußeres', placeholder: 'Größe, Haarfarbe, markante Merkmale...' },
  { key: 'personality', label: 'Persönlichkeit', placeholder: 'Charakterzüge, Stärken, Schwächen...' },
  { key: 'backstory', label: 'Vergangenheit', placeholder: 'Herkunft, prägende Ereignisse...' },
]

interface CharacterFieldTabsProps {
  activeTab: CharacterFieldKey
  onTabChange: (tab: CharacterFieldKey) => void
  values: Record<CharacterFieldKey, string>
  onChange: (tab: CharacterFieldKey, value: string) => void
}

export default function CharacterFieldTabs({ activeTab, onTabChange, values, onChange }: CharacterFieldTabsProps) {
  return (
    <div>
      <div className="flex border-b-2 border-zinc-300 dark:border-zinc-700">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? `${TEXT_PRIMARY} border-b-2 -mb-0.5 border-indigo-600 dark:border-indigo-400`
                : TEXT_SECONDARY
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {TABS.map((tab) => (
        <textarea
          key={tab.key}
          hidden={activeTab !== tab.key}
          value={values[tab.key]}
          onChange={(e) => onChange(tab.key, e.target.value)}
          className={`${INPUT} resize-none mt-3`}
          placeholder={tab.placeholder}
          rows={3}
        />
      ))}
    </div>
  )
}
