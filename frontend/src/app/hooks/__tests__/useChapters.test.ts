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
    .mockResolvedValueOnce({ ok: true, json: async () => ({ pagination: { totalPages: 1 }, chapters: [chapter] }) } as Response)
    .mockResolvedValueOnce({ ok: true, json: async () => chapter } as Response)
}

// URL/method-aware fetch mock (rather than an ordered mockResolvedValueOnce queue) so
// interleaved async calls from overlapping switchChapter() invocations resolve correctly
// regardless of exact call order.
function mockChapterFetch(chapters: Chapter[]) {
  const byId = new Map(chapters.map(c => [c.id, c]))
  global.fetch = jest.fn((url: string, init?: RequestInit) => {
    if (url.includes('/api/chapters?')) {
      return Promise.resolve({ ok: true, json: async () => ({ chapters, pagination: { totalPages: 1 } }) } as Response)
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

    expect(mockDeleteDraft).toHaveBeenCalledWith('c1', chapter.content)
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
      if (url.includes('?')) return Promise.resolve({ ok: true, json: async () => ({ pagination: { totalPages: 1 }, chapters: [chapter, metadata] }) })
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

describe('useChapters — preserve recovery drafts until a decision', () => {
  const recovery = { chapterId: 'c1', content: '<p>Ungespeicherter Entwurf</p>', updatedAt: Date.parse('2026-01-02') }
  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    ;(getDraft as jest.Mock).mockResolvedValue(recovery)
    mockChapterFetch([chapter])
  })
  afterEach(() => { jest.useRealTimers() })

  it('does not save or delete a pending draft on autosave, manual save, or switching away', async () => {
    const second = { ...chapter, id: 'c2' }
    mockChapterFetch([chapter, second])
    ;(getDraft as jest.Mock).mockImplementation(async (id: string) => id === 'c1' ? recovery : undefined)
    const { result } = renderChaptersHook()
    await flush()
    act(() => { jest.advanceTimersByTime(5000) })
    await flush()
    await act(async () => { await result.current.saveChapter() })
    await act(async () => { await result.current.switchChapter(second) })
    const writes = (global.fetch as jest.Mock).mock.calls.filter(([, options]) => options?.method === 'PUT')
    expect(writes).toHaveLength(0)
    expect(mockDeleteDraft).not.toHaveBeenCalled()
    expect(mockSaveDraft).not.toHaveBeenCalled()
    expect(result.current.selectedChapter?.id).toBe('c2')
    expect(result.current.pendingDraft).toBeNull()
  })

  it('still offers the draft after closing and reopening the hook', async () => {
    const first = renderChaptersHook()
    await flush()
    act(() => { jest.advanceTimersByTime(5000) })
    await flush()
    first.unmount()
    const reopened = renderChaptersHook()
    await flush()
    expect(reopened.result.current.pendingDraft).toEqual(recovery)
    expect(mockDeleteDraft).not.toHaveBeenCalled()
    reopened.unmount()
  })

  it.each(['restore', 'discard'])('resumes autosave after explicit %s', async (decision) => {
    const { result } = renderChaptersHook()
    await flush()
    await act(async () => {
      if (decision === 'restore') result.current.restoreDraft()
      else await result.current.discardDraft()
    })
    const expected = decision === 'restore' ? recovery.content : chapter.content
    expect(result.current.pendingDraft).toBeNull()
    act(() => { jest.advanceTimersByTime(2000) })
    await flush()
    const writes = (global.fetch as jest.Mock).mock.calls.filter(([, options]) => options?.method === 'PUT')
    expect(writes).toHaveLength(1)
    expect(JSON.parse(writes[0][1].body).content).toBe(expected)
    expect(mockDeleteDraft).toHaveBeenCalledWith('c1', expected)
  })

  it('cleans up only the submitted text when a save response arrives after a newer edit', async () => {
    ;(getDraft as jest.Mock).mockResolvedValue(undefined)
    const { result } = renderChaptersHook()
    await flush()
    let resolve!: (response: object) => void
    ;(global.fetch as jest.Mock).mockImplementationOnce(() => new Promise(done => { resolve = done }))
    let saving!: Promise<void>
    act(() => { saving = result.current.saveChapter() })
    act(() => { result.current.setEditorContent('<p>Neuere Eingabe</p>') })
    act(() => { jest.advanceTimersByTime(400) })
    await flush()
    expect(mockSaveDraft).toHaveBeenCalledWith('c1', '<p>Neuere Eingabe</p>')
    await act(async () => { resolve({ ok: true }); await saving })
    expect(mockDeleteDraft).toHaveBeenCalledWith('c1', chapter.content)
    expect(result.current.editorContent).toBe('<p>Neuere Eingabe</p>')
  })
})

describe('useChapters — project isolation', () => {
  const otherProject = { ...project, id: 'p2' }
  const otherChapter = { ...chapter, id: 'c2', projectId: 'p2', content: '<p>Text aus Projekt 2</p>' }
  const ok = (data: unknown) => ({ ok: true, json: async () => data })
  const showError = jest.fn()
  function setup() {
    return renderHook(({ selectedProject }: { selectedProject: Project | null }) => useChapters({
      selectedProject, showError, requestConfirm: jest.fn(), onConfirmed: jest.fn(),
    }), { initialProps: { selectedProject: project as Project | null } })
  }
  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    ;(getDraft as jest.Mock).mockResolvedValue(undefined)
    global.fetch = jest.fn((url: string, init?: RequestInit) => {
      if (init?.method === 'PUT') return Promise.resolve(ok({}))
      if (url.includes('?')) return Promise.resolve(ok({ pagination: { totalPages: 1 }, chapters: [url.includes('p2') ? otherChapter : chapter] }))
      return Promise.resolve(ok(url.endsWith('c2') ? otherChapter : chapter))
    }) as unknown as typeof fetch
  })
  afterEach(() => { jest.useRealTimers() })

  it('clears the old editor while loading, then selects the new project chapter', async () => {
    const { result, rerender } = setup()
    await flush()
    act(() => { result.current.setEditorContent('<p>Letzte Eingabe</p>') })
    let resolve!: (value: object) => void
    ;(global.fetch as jest.Mock).mockImplementationOnce(() => new Promise(done => { resolve = done }))
    rerender({ selectedProject: otherProject })
    expect(result.current.selectedChapter).toBeNull()
    expect(result.current.editorContent).toBe('')
    expect(result.current.chapters).toEqual([])
    expect(mockSaveDraft).toHaveBeenCalledWith('c1', '<p>Letzte Eingabe</p>')
    act(() => { jest.advanceTimersByTime(2500) })
    await flush()
    expect((global.fetch as jest.Mock).mock.calls.filter(([, options]) => options?.method === 'PUT')).toHaveLength(0)
    await act(async () => { resolve(ok({ pagination: { totalPages: 1 }, chapters: [otherChapter] })) })
    await flush()
    expect(result.current.selectedChapter?.projectId).toBe('p2')
    expect(result.current.editorContent).toBe(otherChapter.content)
  })

  it.each(['list', 'content'])('ignores a delayed old project %s response', async (stage) => {
    const normalFetch = global.fetch
    let resolve!: (value: object) => void
    const delayed = new Promise(done => { resolve = done })
    global.fetch = jest.fn((url: string, init?: RequestInit) => {
      if ((stage === 'list' && url.includes('projectId=p1')) || (stage === 'content' && url === '/api/chapters/c1')) return delayed
      return normalFetch(url, init)
    }) as typeof fetch
    const { result, rerender } = setup()
    await flush()
    rerender({ selectedProject: otherProject })
    await flush()
    await act(async () => { resolve(ok(stage === 'list' ? { pagination: { totalPages: 1 }, chapters: [chapter] } : chapter)) })
    await flush()
    expect(result.current.chapters).toEqual([otherChapter])
    expect(result.current.selectedChapter?.id).toBe('c2')
    expect(result.current.editorContent).toBe(otherChapter.content)
    expect(result.current.chaptersLoaded).toBe(true)
  })

  it('does not reset the editor when only project settings change', async () => {
    const { result, rerender } = setup()
    await flush()
    act(() => { result.current.setEditorContent('<p>Aktueller Text </p>') })
    ;(global.fetch as jest.Mock).mockClear()
    rerender({ selectedProject: { ...project, title: 'Neuer Projekttitel' } })
    await flush()
    expect(result.current.editorContent).toBe('<p>Aktueller Text </p>')
    expect(result.current.selectedChapter?.id).toBe('c1')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('clears an old recovery prompt without overwriting its draft when moving to an empty project', async () => {
    ;(getDraft as jest.Mock).mockResolvedValue({ chapterId: 'c1', content: 'Entwurf', updatedAt: Date.parse('2027-01-01') })
    const { result, rerender } = setup()
    await flush()
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(ok({ pagination: { totalPages: 1 }, chapters: [] }))
    rerender({ selectedProject: otherProject })
    await flush()
    expect(result.current.selectedChapter).toBeNull()
    expect(result.current.editorContent).toBe('')
    expect(result.current.pendingDraft).toBeNull()
    expect(result.current.chaptersLoaded).toBe(true)
    expect(mockSaveDraft).not.toHaveBeenCalled()
    expect(mockDeleteDraft).not.toHaveBeenCalled()
  })
})

it('loads chapters beyond the 200 chapter page limit', async () => {
  ;(getDraft as jest.Mock).mockResolvedValue(undefined)
  const firstPage = Array.from({ length: 200 }, (_, index) => ({ ...chapter, id: `c${index}`, order: index }))
  const last = { ...chapter, id: 'last', order: 200 }
  global.fetch = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ chapters: firstPage, pagination: { totalPages: 2 } }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ chapters: [last], pagination: { totalPages: 2 } }) })
    .mockResolvedValueOnce({ ok: true, json: async () => firstPage[0] })
  const { result, unmount } = renderChaptersHook()
  await flush()
  expect(result.current.chapters).toHaveLength(201)
  expect(result.current.chapters[200].id).toBe('last')
  expect(result.current.selectedChapter?.id).toBe('c0')
  expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/chapters?projectId=p1&limit=200&page=2', { cache: 'no-store' })
  unmount()
})
