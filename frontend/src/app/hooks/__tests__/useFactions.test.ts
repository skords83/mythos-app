import { renderHook, act } from '@testing-library/react'
import { useFactions } from '../useFactions'
import type { Project } from '../../components/types'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

const project: Project = {
  id: 'p1',
  title: 'Projekt',
  description: null,
  wordGoal: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function renderFactionsHook() {
  return renderHook(() =>
    useFactions({
      selectedProject: project,
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

describe('useFactions — load error handling', () => {
  it('does not set factions to a non-array error body when the request fails (e.g. 401)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Nicht autorisiert' }),
    } as Response)

    const { result } = renderFactionsHook()
    await flush()

    expect(Array.isArray(result.current.factions)).toBe(true)
    expect(result.current.factions).toEqual([])
  })
})
