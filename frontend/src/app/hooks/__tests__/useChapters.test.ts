import { renderHook, act } from '@testing-library/react'
import { useChapters } from '../useChapters'
import { saveDraft, getDraft, deleteDraft } from '@/lib/chapterDraftStore'
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
  wordCountBaseline: 0,
  wordCountBaselineDate: null,
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

// URL/method-aware fetch mock (rather than an ordered mockResolvedValueOnce queue) so
// interleaved async calls from overlapping switchChapter() invocations resolve correctly
// regardless of exact call order.
function mockChapterFetch(chapters: Chapter[]) {
  const byId = new Map(chapters.map(c => [c.id, c]))
  global.fetch = jest.fn((url: string, init?: RequestInit) => {
    if (url.includes('/api/chapters?')) {
      return Promise.resolve({ ok: true, json: async () => ({ chapters }) } as Response)
    }
    const id = url.split('/').pop() as string
    const method = init?.method ?? 'GET'
    if (method === 'PUT') {
      const body = init?.body ? JSON.parse(init.body as string) : {}
      return Promise.resolve({ ok: true, json: async () => ({ ...byId.get(id), ...body }) } as Response)
    }
    return Promise.resolve({ ok: true, json: async () => byId.get(id) } as Response)
  }) as unknown as typeof fetch
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

describe('useChapters — draft recovery', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockSaveDraft.mockClear()
    mockDeleteDraft.mockClear()
    ;(getDraft as jest.Mock).mockReset()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('exposes pendingDraft when IndexedDB has a newer unsynced draft than the server chapter', async () => {
    ;(getDraft as jest.Mock).mockResolvedValue({
      chapterId: 'c1',
      content: '<p>Lokaler Entwurf</p>',
      updatedAt: new Date('2026-01-02T00:00:00.000Z').getTime(),
    })
    mockInitialLoadFetch()
    const { result } = renderChaptersHook()
    await flush()

    expect(result.current.pendingDraft?.chapterId).toBe('c1')
    expect(result.current.pendingDraft?.content).toBe('<p>Lokaler Entwurf</p>')
  })

  it('does not overwrite the pending local draft with server content before the user chooses restore/discard', async () => {
    ;(getDraft as jest.Mock).mockResolvedValue({
      chapterId: 'c1',
      content: '<p>Lokaler Entwurf</p>',
      updatedAt: new Date('2026-01-02T00:00:00.000Z').getTime(),
    })
    mockInitialLoadFetch()
    const { result } = renderChaptersHook()
    await flush()

    expect(result.current.pendingDraft?.content).toBe('<p>Lokaler Entwurf</p>')
    mockSaveDraft.mockClear()

    // The 400ms local-save effect fires on the server content that loadChapterContent
    // just set into editorContent. Without a guard, this would overwrite the newer
    // local draft in IndexedDB before the user gets a chance to restore or discard it.
    act(() => { jest.advanceTimersByTime(400) })
    await flush()

    expect(mockSaveDraft).not.toHaveBeenCalled()
  })

  it('does not expose pendingDraft when the local draft is older than the server chapter', async () => {
    ;(getDraft as jest.Mock).mockResolvedValue({
      chapterId: 'c1',
      content: '<p>Alter Entwurf</p>',
      updatedAt: new Date('2025-12-31T00:00:00.000Z').getTime(),
    })
    mockInitialLoadFetch()
    const { result } = renderChaptersHook()
    await flush()

    expect(result.current.pendingDraft).toBeNull()
    expect(mockDeleteDraft).toHaveBeenCalledWith('c1')
  })

  it('restoreDraft loads the draft content into the editor and clears pendingDraft', async () => {
    ;(getDraft as jest.Mock).mockResolvedValue({
      chapterId: 'c1',
      content: '<p>Lokaler Entwurf</p>',
      updatedAt: new Date('2026-01-02T00:00:00.000Z').getTime(),
    })
    mockInitialLoadFetch()
    const { result } = renderChaptersHook()
    await flush()

    act(() => { result.current.restoreDraft() })

    expect(result.current.editorContent).toBe('<p>Lokaler Entwurf</p>')
    expect(result.current.pendingDraft).toBeNull()
  })

  it('discardDraft deletes the IndexedDB entry and clears pendingDraft', async () => {
    ;(getDraft as jest.Mock).mockResolvedValue({
      chapterId: 'c1',
      content: '<p>Lokaler Entwurf</p>',
      updatedAt: new Date('2026-01-02T00:00:00.000Z').getTime(),
    })
    mockInitialLoadFetch()
    const { result } = renderChaptersHook()
    await flush()

    await act(async () => { await result.current.discardDraft() })

    expect(mockDeleteDraft).toHaveBeenCalledWith('c1')
    expect(result.current.pendingDraft).toBeNull()
  })

  it('does not let a stale chapter-switch resolution clobber pendingDraft after switching away (race guard)', async () => {
    const chapterC: Chapter = { ...chapter, id: 'c0', title: 'Kapitel C' }
    const chapterA: Chapter = { ...chapter, id: 'cA', title: 'Kapitel A' }
    const chapterB: Chapter = { ...chapter, id: 'cB', title: 'Kapitel B' }

    mockChapterFetch([chapterC, chapterA, chapterB])

    // Chapter A's getDraft resolution is held open (deferred) to simulate a slow
    // fetch+getDraft chain that is still in flight when the user switches away.
    let resolveDraftA!: (value: unknown) => void
    const draftAPromise = new Promise((resolve) => { resolveDraftA = resolve })
    ;(getDraft as jest.Mock).mockImplementation((id: string) => {
      if (id === 'cA') return draftAPromise
      return Promise.resolve(undefined)
    })

    const { result } = renderChaptersHook()
    await flush()
    expect(result.current.selectedChapter?.id).toBe('c0')
    expect(result.current.pendingDraft).toBeNull()

    // Switch to A, then immediately to B before A's getDraft has resolved.
    act(() => { result.current.switchChapter(chapterA) })
    act(() => { result.current.switchChapter(chapterB) })

    // Let B's switch (whose fetch + getDraft both resolve immediately) fully settle
    // while A's switch remains suspended on the still-pending draftAPromise.
    for (let i = 0; i < 10; i++) {
      await flush()
    }
    expect(result.current.pendingDraft).toBeNull()

    // Now A's slow getDraft finally resolves with a "newer than server" draft. Before the
    // guard, this unconditionally called setPendingDraft(draftA) even though the user had
    // long since switched to chapter B — offering to restore A's content into B's editor.
    resolveDraftA({
      chapterId: 'cA',
      content: '<p>Verwaister Entwurf von A</p>',
      updatedAt: new Date('2027-01-01T00:00:00.000Z').getTime(),
    })
    await flush()

    expect(result.current.pendingDraft).toBeNull()
  })
})

describe('useChapters — editor content stability across autosave', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('does not push content back into the editor when the same chapter is autosaved', async () => {
    mockInitialLoadFetch()
    const { result } = renderChaptersHook()
    await flush()
    expect(result.current.selectedChapter?.id).toBe('c1')

    const setContentMock = jest.fn()
    act(() => { result.current.editorSetContentRef.current = setContentMock })

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => chapter } as Response)
    await act(async () => {
      await result.current.saveChapter(undefined, '<p>Text mit Leerzeichen am Ende </p>')
    })

    // Re-pushing content into the editor here (via setSelectedChapter -> the [selectedChapter]
    // effect) would force TipTap's editor.commands.setContent to re-parse the HTML.
    // ProseMirror's default HTML parsing normalizes whitespace, silently dropping a trailing
    // space at the end of a line on every autosave. For the same chapter, the editor already
    // has the correct live content — it must not be touched.
    expect(setContentMock).not.toHaveBeenCalled()
  })
})

describe('useChapters — never save unloaded chapter content', () => {
  const second = { ...chapter, id: 'c2', title: 'Kapitel 2', content: '<p>Wichtiger Text</p>' }
  const metadata = { ...second, content: undefined } as unknown as Chapter
  let showError: jest.Mock
  let confirm: () => void | Promise<void>

  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    ;(getDraft as jest.Mock).mockResolvedValue(undefined)
    showError = jest.fn()
    confirm = () => {}
  })
  afterEach(() => { jest.useRealTimers() })

  function setup(secondResponse: object) {
    global.fetch = jest.fn((url: string, init?: RequestInit) => {
      if (url.includes('?')) return Promise.resolve({ ok: true, json: async () => ({ chapters: [chapter, metadata] }) })
      if (init?.method) return Promise.resolve({ ok: true })
      return Promise.resolve(url.endsWith('/c1') ? { ok: true, json: async () => chapter } : secondResponse)
    }) as unknown as typeof fetch
    return renderHook(() => useChapters({ selectedProject: project, showError,
      requestConfirm: (_title, _message, callback) => { confirm = callback }, onConfirmed: jest.fn() }))
  }

  it.each([
    ['HTTP failure', { ok: false }],
    ['incomplete response', { ok: true, json: async () => ({ id: 'c2', title: 'Kapitel 2' }) }],
  ])('keeps the current text on %s and never writes the unloaded target', async (_name, response) => {
    const { result } = setup(response)
    await flush()
    act(() => { result.current.setEditorContent('<p>Aktueller Text</p>') })
    await act(async () => { await result.current.switchChapter(metadata) })
    expect(result.current.selectedChapter?.id).toBe('c1')
    expect(result.current.editorContent).toBe('<p>Aktueller Text</p>')
    expect(showError).toHaveBeenCalled()
    act(() => { jest.advanceTimersByTime(2500) })
    await flush()
    expect(global.fetch).not.toHaveBeenCalledWith('/api/chapters/c2', expect.objectContaining({ method: 'PUT' }))
    expect(mockSaveDraft).not.toHaveBeenCalledWith('c2', '')
  })

  it('loads the remaining chapter before editing or autosaving after deletion', async () => {
    let resolve!: (value: object) => void
    const loading = new Promise<object>(done => { resolve = done })
    const { result } = setup(loading)
    await flush()
    act(() => { result.current.deleteChapter('c1') })
    let deletion!: Promise<void>
    act(() => { deletion = Promise.resolve(confirm()) })
    await flush()
    expect(result.current.selectedChapter).toBeNull()
    act(() => { jest.advanceTimersByTime(2500) })
    await flush()
    expect(global.fetch).not.toHaveBeenCalledWith('/api/chapters/c2', expect.objectContaining({ method: 'PUT' }))
    await act(async () => { resolve({ ok: true, json: async () => second }); await deletion })
    expect(result.current.editorContent).toBe(second.content)
    act(() => { jest.advanceTimersByTime(2500) })
    await flush()
    expect(global.fetch).toHaveBeenCalledWith('/api/chapters/c2', expect.objectContaining({ method: 'PUT', body: JSON.stringify({ title: second.title, content: second.content, wordCount: 2 }) }))
  })

  it('leaves no editable chapter if loading after deletion fails, and permits retry', async () => {
    const { result } = setup({ ok: false })
    await flush()
    act(() => { result.current.deleteChapter('c1') })
    await act(async () => { await confirm() })
    expect(result.current.selectedChapter).toBeNull()
    expect(showError).toHaveBeenCalled()
    act(() => { jest.advanceTimersByTime(2500) })
    await flush()
    expect(global.fetch).not.toHaveBeenCalledWith('/api/chapters/c2', expect.objectContaining({ method: 'PUT' }))
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => second })
    await act(async () => { await result.current.switchChapter(metadata) })
    expect(result.current.selectedChapter?.id).toBe('c2')
    expect(result.current.editorContent).toBe(second.content)
  })
})

describe('useChapters — initial chapter render', () => {
  it('provides the loaded text in the first render with a selected chapter', async () => {
    ;(getDraft as jest.Mock).mockResolvedValue(undefined)
    mockInitialLoadFetch()
    const renders: { id: string; content: string }[] = []
    const { unmount } = renderHook(() => {
      const state = useChapters({ selectedProject: project, showError: jest.fn(), requestConfirm: jest.fn(), onConfirmed: jest.fn() })
      if (state.selectedChapter) renders.push({ id: state.selectedChapter.id, content: state.editorContent })
      return state
    })
    await flush()
    expect(renders[0]).toEqual({ id: chapter.id, content: chapter.content })
    unmount()
  })
})
