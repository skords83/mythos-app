import { act, fireEvent, render, screen } from '@testing-library/react'
import { ReferencePanel } from '../ReferencePanel'
import type { Chapter } from '../types'

const chapters = [
  { id: 'current', title: 'Aktuell' }, { id: 'a', title: 'Kapitel A' }, { id: 'b', title: 'Kapitel B' },
] as Chapter[]
const props = { chapters, characters: [], places: [], currentChapterId: 'current', onClose: jest.fn() }
const originalFetch = global.fetch
afterEach(() => { global.fetch = originalFetch })
const response = (id: string, content: unknown) => ({ ok: true, json: async () => ({ id, content }) })

it.each(['<p>Geladener Text</p>', { content: '<p>Geladener Text</p>' }])('loads unopened chapter text from the API (%p)', async content => {
  global.fetch = jest.fn().mockResolvedValue(response('a', content))
  render(<ReferencePanel {...props} />)
  expect(screen.getByRole('status')).toHaveTextContent('Kapitel wird geladen')
  expect(await screen.findByText('Geladener Text')).toBeInTheDocument()
  expect(global.fetch).toHaveBeenCalledWith('/api/chapters/a', expect.objectContaining({ cache: 'no-store' }))
})
it('ignores a late response after a different reference was selected', async () => {
  let resolve!: (value: unknown) => void
  global.fetch = jest.fn().mockImplementationOnce(() => new Promise(done => { resolve = done }))
    .mockResolvedValueOnce(response('b', '<p>Text B</p>'))
  render(<ReferencePanel {...props} />)
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'b' } })
  expect(await screen.findByText('Text B')).toBeInTheDocument()
  await act(async () => { resolve(response('a', '<p>Text A</p>')) })
  expect(screen.queryByText('Text A')).not.toBeInTheDocument()
  expect(screen.getByText('Text B')).toBeInTheDocument()
})
it('shows a retry option when loading fails', async () => {
  global.fetch = jest.fn().mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce(response('a', '<p>Nach Retry</p>'))
  render(<ReferencePanel {...props} />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Kapitel konnte nicht geladen werden')
  fireEvent.click(screen.getByText('Erneut versuchen'))
  expect(await screen.findByText('Nach Retry')).toBeInTheDocument()
})
it('selects another reference when the reference becomes the active editor chapter', async () => {
  global.fetch = jest.fn().mockResolvedValueOnce(response('a', '<p>Text A</p>')).mockResolvedValueOnce(response('b', '<p>Text B</p>'))
  const { rerender } = render(<ReferencePanel {...props} />)
  await screen.findByText('Text A')
  rerender(<ReferencePanel {...props} chapters={chapters.slice(1)} currentChapterId="a" />)
  expect(await screen.findByText('Text B')).toBeInTheDocument()
  expect(screen.getByRole('combobox')).toHaveValue('b')
})
