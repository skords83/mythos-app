import { useEffect, useState } from 'react'
import { UserSettings } from '../components/types'

interface UseSettingsArgs {
  showError: (message: string) => void
}

const DEFAULT_SETTINGS: UserSettings = {
  focusModeEnabled: false,
  spellcheckEnabled: true,
  spellcheckLocale: null,
}

export function useSettings({ showError }: UseSettingsArgs) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS)

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      if (!response.ok) {
        showError('Einstellungen konnten nicht geladen werden.')
        return
      }
      const data = await response.json()
      setSettings(data)
    } catch (error) {
      console.error('Error loading settings:', error)
      showError('Einstellungen konnten nicht geladen werden.')
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const updateSettings = async (partial: Partial<UserSettings>) => {
    const previous = settings
    setSettings({ ...settings, ...partial })
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partial),
      })
      if (!response.ok) {
        setSettings(previous)
        showError('Einstellungen konnten nicht gespeichert werden.')
        return
      }
      const updated = await response.json()
      setSettings(updated)
    } catch (error) {
      console.error('Error updating settings:', error)
      setSettings(previous)
      showError('Einstellungen konnten nicht gespeichert werden.')
    }
  }

  return {
    settings,
    updateSettings,
  }
}
