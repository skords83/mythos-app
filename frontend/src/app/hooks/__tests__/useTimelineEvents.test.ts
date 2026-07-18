import { renderHook, act } from '@testing-library/react'
import { useTimelineEvents } from '../useTimelineEvents'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

function renderTimelineEventsHook(selectedProject: { id: string } | null = { id: 'proj-1' }) {
  return renderHook(() =>
    useTimelineEvents({
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

describe('useTimelineEvents — load error handling', () => {
  it('does not set timelineEvents to a non-array error body when the request fails (e.g. 401)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Nicht autorisiert' }),
    } as Response)

    const { result } = renderTimelineEventsHook()
    await flush()

    expect(Array.isArray(result.current.timelineEvents)).toBe(true)
    expect(result.current.timelineEvents).toEqual([])
  })

  it('does not fetch when no project is selected', async () => {
    global.fetch = jest.fn()

    renderTimelineEventsHook(null)
    await flush()

    expect(global.fetch).not.toHaveBeenCalled()
  })
})
