'use client'

import { TEXT_SECONDARY, TEXT_PRIMARY, INPUT } from '@/lib/theme'

export type PlaceFieldKey = 'description' | 'history' | 'politics' | 'sensoryDetails'

const TABS: { key: PlaceFieldKey; label: string; placeholder: string }[] = [
  { key: 'description', label: 'Beschreibung', placeholder: 'Beschreibung des Ortes...' },
  { key: 'history', label: 'Geschichte', placeholder: 'Ursprung, Vergangenheit, prägende Ereignisse...' },
  { key: 'politics', label: 'Politik', placeholder: 'Herrschaft, Fraktionen, Gesetze, Konflikte...' },
  { key: 'sensoryDetails', label: 'Sinneseindrücke', placeholder: 'Gerüche, Geräusche, Atmosphäre...' },
]

interface PlaceFieldTabsProps {
  activeTab: PlaceFieldKey
  onTabChange: (tab: PlaceFieldKey) => void
  values: Record<PlaceFieldKey, string>
  onChange: (tab: PlaceFieldKey, value: string) => void
}

export default function PlaceFieldTabs({ activeTab, onTabChange, values, onChange }: PlaceFieldTabsProps) {
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
