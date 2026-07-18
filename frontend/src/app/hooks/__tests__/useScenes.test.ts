import { renderHook, act } from '@testing-library/react'
import { useScenes } from '../useScenes'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

function renderScenesHook(chapterId: string | null = 'chap-1') {
  return renderHook(() =>
    useScenes({
      chapterId,
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

describe('useScenes — load error handling', () => {
  it('does not set scenes to a non-array error body when the request fails (e.g. 401)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Nicht autorisiert' }),
    } as Response)

    const { result } = renderScenesHook()
    await flush()

    expect(Array.isArray(result.current.scenes)).toBe(true)
    expect(result.current.scenes).toEqual([])
  })

  it('does not fetch when chapterId is null', async () => {
    global.fetch = jest.fn()

    renderScenesHook(null)
    await flush()

    expect(global.fetch).not.toHaveBeenCalled()
  })
})
