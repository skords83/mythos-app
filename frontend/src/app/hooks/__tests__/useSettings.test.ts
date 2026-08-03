import { renderHook, act } from '@testing-library/react'
import { useSettings } from '../useSettings'

async function flush() {
  for (let i = 0; i < 5; i++) {
    await act(async () => { await Promise.resolve() })
  }
}

describe('useSettings', () => {
  it('falls back to defaults when the load request fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false } as Response)

    const { result } = renderHook(() => useSettings({ showError: jest.fn() }))
    await flush()

    expect(result.current.settings).toEqual({
      focusModeEnabled: false,
      spellcheckEnabled: true,
      spellcheckLocale: null,
    })
  })

  it('applies the loaded settings from the server', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ focusModeEnabled: true, spellcheckEnabled: false, spellcheckLocale: 'de-DE' }),
    } as Response)

    const { result } = renderHook(() => useSettings({ showError: jest.fn() }))
    await flush()

    expect(result.current.settings).toEqual({
      focusModeEnabled: true,
      spellcheckEnabled: false,
      spellcheckLocale: 'de-DE',
    })
  })

  it('rolls back an optimistic update if the PUT request fails', async () => {
    const showError = jest.fn()
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ focusModeEnabled: false, spellcheckEnabled: true, spellcheckLocale: null }) } as Response)
      .mockResolvedValueOnce({ ok: false } as Response)

    const { result } = renderHook(() => useSettings({ showError }))
    await flush()

    await act(async () => {
      await result.current.updateSettings({ spellcheckEnabled: false })
    })

    expect(result.current.settings.spellcheckEnabled).toBe(true)
    expect(showError).toHaveBeenCalled()
  })
})
