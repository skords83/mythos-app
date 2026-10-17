import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NameLinkingDialog } from '../NameLinkingDialog'
import type { Chapter } from '../types'
const chapter = { id: 'c1', projectId: 'p', title: 'Erstes Kapitel' } as Chapter
const preview = { fingerprint: 'hash', chapters: [
  { id: 'c1', title: 'Erstes Kapitel', updatedAt: 'v1', groups: [{ key: 'CHARACTER:f', name: 'Fabian', kind: 'CHARACTER', count: 2 }], ambiguous: [{ text: 'Alex', candidates: ['Figur: Alex', 'Ort: Alex'], count: 1 }] },
  { id: 'c2', title: 'Zweites Kapitel', updatedAt: 'v2', groups: [{ key: 'PLACE:b', name: 'Berlin', kind: 'PLACE', count: 1 }], ambiguous: [] },
  { id: 'c3', title: 'Drittes Kapitel', updatedAt: 'v3', groups: [], ambiguous: [] },
] }
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = jest.fn(function(this: HTMLDialogElement) { this.setAttribute('open', '') })
  global.fetch = jest.fn()
})
test('previews grouped hits, applies only selected groups and reports each chapter outcome', async () => {
  const applied = { ...chapter, content: '<p>@Fabian</p>' }
  const end = jest.fn(), onClose = jest.fn()
  ;(global.fetch as jest.Mock)
    .mockResolvedValueOnce({ ok: true, json: async () => preview })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'processed', added: 2, skipped: 1, chapter: applied }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'skipped', added: 0, reason: 'Kapitel geändert' }) })
    .mockRejectedValueOnce(new Error('Netzwerkfehler'))
  render(<NameLinkingDialog chapter={chapter} begin={jest.fn().mockResolvedValue(chapter)} end={end} onClose={onClose} />)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Vorschau erstellen' })).toBeEnabled())
  fireEvent.change(screen.getByLabelText('Umfang'), { target: { value: 'project' } })
  fireEvent.click(screen.getByRole('button', { name: 'Vorschau erstellen' }))
  await screen.findByText('Figur: Fabian · 2 Treffer')
  expect(screen.getByText(/„Alex“/)).toBeInTheDocument()
  fireEvent.click(screen.getByLabelText('Ort: Berlin · 1 Treffer'))
  fireEvent.click(screen.getByRole('button', { name: 'Ausgewählte Treffer verknüpfen' }))
  await screen.findByText(/Drittes Kapitel: Fehlgeschlagen/)
  expect(screen.getByText(/Erstes Kapitel: Verarbeitet/)).toBeInTheDocument()
  expect(screen.getByText(/Zweites Kapitel: Übersprungen/)).toBeInTheDocument()
  expect(JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body)).toMatchObject({ selected: ['CHARACTER:f'], fingerprint: 'hash', updatedAt: 'v1' })
  fireEvent.click(screen.getByRole('button', { name: 'Schließen' }))
  expect(end).toHaveBeenCalledWith(applied)
  expect(onClose).toHaveBeenCalled()
})
test('scope and type changes invalidate the preview', async () => {
  ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => preview })
  render(<NameLinkingDialog chapter={chapter} begin={jest.fn().mockResolvedValue(chapter)} end={jest.fn()} onClose={jest.fn()} />)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Vorschau erstellen' })).toBeEnabled())
  fireEvent.click(screen.getByRole('button', { name: 'Vorschau erstellen' }))
  await screen.findByText('Figur: Fabian · 2 Treffer')
  fireEvent.click(screen.getByLabelText('Orte'))
  expect(screen.queryByRole('button', { name: 'Ausgewählte Treffer verknüpfen' })).not.toBeInTheDocument()
})
