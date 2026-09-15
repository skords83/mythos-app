import { act, renderHook } from '@testing-library/react'
import { useProjects } from '../useProjects'

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))
const originalFetch = global.fetch
afterEach(() => { global.fetch = originalFetch })

it('creates and selects a project without creating a duplicate first chapter', async () => {
  const project = { id: 'new-project', title: 'Geschichte', _count: { chapters: 1 } }
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => project })
  const showError = jest.fn()
  const { result } = renderHook(() => useProjects({ isCheckingAuth: true, showError }))
  await act(async () => { await result.current.createProject('Geschichte', 'Beschreibung', 500) })
  expect(global.fetch).toHaveBeenCalledTimes(1)
  expect(global.fetch).toHaveBeenCalledWith('/api/projects', expect.objectContaining({
    method: 'POST', body: JSON.stringify({ title: 'Geschichte', description: 'Beschreibung', wordGoal: 500 }),
  }))
  expect(result.current.selectedProject).toEqual(project)
  expect(result.current.projects).toEqual([project])
  expect(showError).not.toHaveBeenCalled()
})

it('does not create chapters or select a project when creation fails', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false })
  const showError = jest.fn()
  const { result } = renderHook(() => useProjects({ isCheckingAuth: true, showError }))
  await act(async () => { await result.current.createProject('Geschichte', '', 500) })
  expect(global.fetch).toHaveBeenCalledTimes(1)
  expect(result.current.selectedProject).toBeNull()
  expect(result.current.projects).toEqual([])
  expect(showError).toHaveBeenCalled()
})

it('finds and selects a saved project beyond the first page', async () => {
  const firstPage = Array.from({ length: 100 }, (_, index) => ({ id: `p${index}`, title: `Projekt ${index}` }))
  const lastProject = { id: 'p100', title: 'Spätes Projekt' }
  localStorage.setItem('selectedProjectId', lastProject.id)
  global.fetch = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ projects: firstPage, pagination: { totalPages: 2 } }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ projects: [lastProject], pagination: { totalPages: 2 } }) })
  const { result } = renderHook(() => useProjects({ isCheckingAuth: true, showError: jest.fn() }))
  await act(async () => { await result.current.loadProjects() })
  expect(result.current.projects).toHaveLength(101)
  expect(result.current.selectedProject).toEqual(lastProject)
  expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/projects?limit=100&page=2', { cache: 'no-store' })
})
