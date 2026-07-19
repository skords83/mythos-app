import { renderHook, act } from '@testing-library/react'
import { useComments } from '../useComments'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

function renderCommentsHook(chapterId: string | null = 'chap-1') {
  return renderHook(() =>
    useComments({
      chapterId,
      showError: jest.fn(),
      requestConfirm: jest.fn((_title, _message, onConfirm) => onConfirm()),
      onConfirmed: jest.fn(),
    })
  )
}

async function flush() {
  for (let i = 0; i < 5; i++) {
    await act(async () => { await Promise.resolve() })
  }
}

describe('useComments — load error handling', () => {
  it('does not set comments to a non-array error body when the request fails (e.g. 401)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Nicht autorisiert' }),
    } as Response)

    const { result } = renderCommentsHook()
    await flush()

    expect(Array.isArray(result.current.comments)).toBe(true)
    expect(result.current.comments).toEqual([])
  })

  it('does not fetch when chapterId is null', async () => {
    global.fetch = jest.fn()

    renderCommentsHook(null)
    await flush()

    expect(global.fetch).not.toHaveBeenCalled()
  })
})

describe('useComments — mutations', () => {
  it('appends a newly created comment to state', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'c1', content: 'Hallo', resolved: false }) } as Response)

    const { result } = renderCommentsHook()
    await flush()

    await act(async () => {
      await result.current.addComment('Hallo', 'PRIVATE')
    })

    expect(result.current.comments).toEqual([{ id: 'c1', content: 'Hallo', resolved: false }])
  })

  it('replaces the comment in state after toggling resolved', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'c1', content: 'Hallo', resolved: false }] } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'c1', content: 'Hallo', resolved: true }) } as Response)

    const { result } = renderCommentsHook()
    await flush()

    await act(async () => {
      await result.current.toggleResolved('c1', true)
    })

    expect(result.current.comments).toEqual([{ id: 'c1', content: 'Hallo', resolved: true }])
  })

  it('removes a comment from state after confirmed deletion', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'c1', content: 'Hallo', resolved: false }] } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) } as Response)

    const { result } = renderCommentsHook()
    await flush()

    await act(async () => {
      result.current.deleteComment('c1')
    })
    await flush()

    expect(result.current.comments).toEqual([])
  })
})
