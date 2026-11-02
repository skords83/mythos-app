import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import UniversesPage from '../page'
import { NavItem } from '../../components/ThemeToggle'
import { Orbit } from 'lucide-react'
const push = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }), usePathname: () => '/universes' }))
const universe = { id: 'world-1', title: 'Nordlande', description: 'Eine gemeinsame Welt', visibility: 'PRIVATE', updatedAt: 'version-1' }
let rows: typeof universe[]
let failSave: boolean
beforeEach(() => {
  rows = [universe]; failSave = false; push.mockClear()
  window.history.replaceState({}, '', '/universes?projectId=book-1')
  global.fetch = jest.fn(async (url, init) => {
    if (url !== '/api/story') return { ok: true, json: async () => ({ projects: [], pagination: { totalPages: 1 } }) } as Response
    const { action, args } = JSON.parse(init!.body as string)
    if (action === 'create_universe' && failSave) return { ok: false, json: async () => ({ error: 'Speichern fehlgeschlagen' }) } as Response
    let data: unknown = { entries: [], hasMore: false }
    if (action === 'universes') data = { entries: rows, hasMore: false }
    if (action === 'universe') data = rows.find(r => r.id === args.universeId)
    if (action === 'create_universe') { const created = { ...universe, ...args, id: 'new-world' }; rows.push(created); data = created }
    return { ok: true, json: async () => ({ data }) } as Response
  })
})
it('separates selection from creation and saves a labelled form with Enter submission', async () => {
  render(<UniversesPage />)
  const entry = await screen.findByRole('button', { name: /Nordlande/ })
  expect(screen.queryByLabelText('Titel')).not.toBeInTheDocument()
  fireEvent.click(entry)
  await waitFor(() => expect(entry).toHaveAttribute('aria-pressed', 'true'))
  fireEvent.click(screen.getByRole('button', { name: 'Neues Universum' }))
  const title = screen.getByLabelText('Titel')
  expect(title).toHaveFocus()
  expect(screen.getByRole('button', { name: 'Universum speichern' })).toBeDisabled()
  fireEvent.change(title, { target: { value: 'Südlande' } })
  fireEvent.submit(title.closest('form')!)
  await screen.findByText('Universum gespeichert.')
  expect(screen.getByRole('button', { name: /Südlande/ })).toHaveAttribute('aria-pressed', 'true')
  expect(fetch).toHaveBeenCalledWith('/api/story', expect.objectContaining({ body: JSON.stringify({ action: 'create_universe', args: { title: 'Südlande', description: '', visibility: 'PRIVATE' } }) }))
})
it('retains the draft after a failed save and supports cancelling', async () => {
  failSave = true
  render(<UniversesPage />)
  await screen.findByRole('button', { name: /Nordlande/ })
  fireEvent.click(screen.getByRole('button', { name: 'Neues Universum' }))
  fireEvent.change(screen.getByLabelText('Titel'), { target: { value: 'Entwurf' } })
  fireEvent.click(screen.getByRole('button', { name: 'Universum speichern' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Speichern fehlgeschlagen')
  expect(screen.getByLabelText('Titel')).toHaveValue('Entwurf')
  fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }))
  expect(screen.queryByLabelText('Titel')).not.toBeInTheDocument()
})
it('shows the empty state and uses deterministic book and dashboard destinations', async () => {
  rows = []
  render(<UniversesPage />)
  await screen.findByText('Noch keine Universen')
  fireEvent.click(screen.getByRole('button', { name: 'Zum geöffneten Buch' }))
  expect(localStorage.getItem('selectedProjectId')).toBe('book-1')
  expect(push).toHaveBeenLastCalledWith('/')
  fireEvent.click(screen.getByRole('button', { name: 'Zur Buchübersicht' }))
  expect(push).toHaveBeenLastCalledWith('/dashboard')
})
it('renders navigable NavItems as links with accessible names even when collapsed', () => {
  render(<NavItem icon={Orbit} label="Universen" shortLabel="UNIV" collapsed active href="/universes?projectId=book-1" />)
  expect(screen.getByRole('link', { name: 'Universen' })).toHaveAttribute('href', '/universes?projectId=book-1')
  expect(screen.getByRole('link')).toHaveAttribute('aria-current', 'page')
})
