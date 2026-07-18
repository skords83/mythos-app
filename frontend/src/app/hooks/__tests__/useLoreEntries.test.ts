import { renderHook, act } from '@testing-library/react'
import { useLoreEntries } from '../useLoreEntries'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

function renderLoreEntriesHook(selectedProject: { id: string } | null = { id: 'proj-1' }) {
  return renderHook(() =>
    useLoreEntries({
      selectedProject: selectedProject as any,
      showError: jest.fn(),
      requestConfirm: jest.fn(),
      onConfirmed: jest.fn(),
    })
  )
}

async function flush() {
  for (let i = 0; i < 5; i++) {
    await act(async () => { await Promise.resolve() })
  }
}

describe('useLoreEntries — load error handling', () => {
  it('does not set loreEntries to a non-array error body when the request fails (e.g. 401)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Nicht autorisiert' }),
    } as Response)

    const { result } = renderLoreEntriesHook()
    await flush()

    expect(Array.isArray(result.current.loreEntries)).toBe(true)
    expect(result.current.loreEntries).toEqual([])
  })

  it('does not fetch when no project is selected', async () => {
    global.fetch = jest.fn()

    renderLoreEntriesHook(null)
    await flush()

    expect(global.fetch).not.toHaveBeenCalled()
  })
})
