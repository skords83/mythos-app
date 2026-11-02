import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ExportModal } from '../ExportModal'
import { buildEpubArchive } from '@/lib/exportEpub'
import { loadProjectExportChapters } from '@/lib/exportContent'
import type { Chapter, Project } from '../types'

jest.mock('@/lib/exportEpub', () => ({ buildEpubArchive: jest.fn() }))
jest.mock('@/lib/exportContent', () => ({ loadProjectExportChapters: jest.fn() }))

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(buildEpubArchive).mockResolvedValue({ generateAsync: jest.fn().mockResolvedValue(new Blob()) } as any)
  jest.mocked(loadProjectExportChapters).mockResolvedValue([{ title: 'Projektkapitel', content: '<p>Text</p>' }])
  URL.createObjectURL = jest.fn().mockReturnValue('blob:test')
  URL.revokeObjectURL = jest.fn()
  jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
})
afterEach(() => jest.restoreAllMocks())

test.each([true, false])('EPUB checkbox defaults on and forwards its value (%s)', async enabled => {
  render(<ExportModal isOpen onClose={() => {}} project={{ id: 'p', title: 'Buch', coverImage: '/cover.png' } as Project} chapters={[]} />)
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'ePub' }))
  const checkbox = screen.getByRole('checkbox', { name: 'Inhaltsverzeichnis einfügen' })
  expect(checkbox).toBeChecked()
  if (!enabled) fireEvent.click(checkbox)
  fireEvent.click(screen.getByRole('button', { name: 'Herunterladen' }))
  await waitFor(() => expect(buildEpubArchive).toHaveBeenCalledWith('Buch', [{ title: 'Projektkapitel', content: '<p>Text</p>' }], '/cover.png', { includeTableOfContents: enabled }))
})

test('current chapter uses unsaved editor content without loading other chapters', async () => {
  render(<ExportModal isOpen onClose={() => {}} project={{ id: 'p', title: 'Buch' } as Project} chapters={[]} selectedChapter={{ id: 'c', title: 'Kapitel', content: '<p>Alt</p>' } as Chapter} editorContent="<p>Neu</p>" />)
  fireEvent.click(screen.getByRole('button', { name: 'ePub' }))
  fireEvent.click(screen.getByRole('button', { name: 'Herunterladen' }))
  await waitFor(() => expect(buildEpubArchive).toHaveBeenCalledWith('Kapitel', [{ id: 'c', title: 'Kapitel', content: '<p>Neu</p>' }], undefined, { includeTableOfContents: true }))
  expect(loadProjectExportChapters).not.toHaveBeenCalled()
})
