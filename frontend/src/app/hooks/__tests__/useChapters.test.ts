import { renderHook, act } from '@testing-library/react'
import { useChapters } from '../useChapters'
import { saveDraft, deleteDraft } from '@/lib/chapterDraftStore'
import type { Project, Chapter } from '../../components/types'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

jest.mock('@/lib/chapterDraftStore', () => ({
  saveDraft: jest.fn().mockResolvedValue(undefined),
  getDraft: jest.fn().mockResolvedValue(undefined),
  deleteDraft: jest.fn().mockResolvedValue(undefined),
}))

const mockSaveDraft = saveDraft as jest.Mock
const mockDeleteDraft = deleteDraft as jest.Mock

const project: Project = {
  id: 'p1',
  title: 'Projekt',
  description: null,
  wordGoal: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const chapter: Chapter = {
  id: 'c1',
  title: 'Kapitel 1',
  content: '<p>Server-Inhalt</p>',
  order: 0,
  wordCount: 2,
  projectId: 'p1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function mockInitialLoadFetch() {
  global.fetch = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ chapters: [chapter] }) } as Response)
    .mockResolvedValueOnce({ ok: true, json: async () => chapter } as Response)
}

async function flush() {
  for (let i = 0; i < 5; i++) {
    await act(async () => { await Promise.resolve() })
  }
}

function renderChaptersHook() {
  return renderHook(() =>
    useChapters({
      selectedProject: project,
      showError: jest.fn(),
      requestConfirm: jest.fn(),
      onConfirmed: jest.fn(),
    })
  )
}

describe('useChapters — local draft fallback', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockSaveDraft.mockClear()
    mockDeleteDraft.mockClear()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('writes a local draft 400ms after an edit, independent of the server save', async () => {
    mockInitialLoadFetch()
    const { result } = renderChaptersHook()
    await flush()
    mockSaveDraft.mockClear()

    act(() => { result.current.setEditorContent('<p>Neuer Inhalt</p>') })
    act(() => { jest.advanceTimersByTime(400) })
    await flush()

    expect(mockSaveDraft).toHaveBeenCalledWith('c1', '<p>Neuer Inhalt</p>')
  })

  it('deletes the local draft once saveChapter succeeds', async () => {
    mockInitialLoadFetch()
    const { result } = renderChaptersHook()
    await flush()

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => chapter } as Response)
    await act(async () => { await result.current.saveChapter() })

    expect(mockDeleteDraft).toHaveBeenCalledWith('c1')
  })
})
