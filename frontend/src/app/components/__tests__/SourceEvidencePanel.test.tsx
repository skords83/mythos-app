import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SourceEvidencePanel } from '../SourceEvidencePanel'
const response = (data: unknown, ok = true) => Promise.resolve({ ok, json: async () => data } as Response)
beforeEach(() => {
  global.fetch = jest.fn((url, options) => {
    if (url === '/api/story') {
      const body = JSON.parse(options?.body as string)
      if (body.action === 'evidence') return response({ data: { entries: [{ id: 'e', updatedAt: '2026-10-17T00:00:00Z', statement: 'Augenfarbe', field: 'Aussehen', quote: 'grün', chapterId: 'c', chapterTitle: 'Ankunft', status: 'STALE', excerpt: 'Sie sind grün.', prefix: '', suffix: '' }], hasMore: false } })
      return response({ error: 'Zwischenzeitlich geändert. Bitte erneut lesen.' }, false)
    }
    if (String(url).startsWith('/api/chapters?')) return response({ chapters: [], pagination: { totalPages: 0 } })
    return response({ projects: [], pagination: { totalPages: 0 } })
  }) as jest.Mock
})
test('shows source, stale warning and context and sends version for targeted changes', async () => {
  render(<SourceEvidencePanel entityType="CHARACTER" entityId="a" projectId="p" />)
  fireEvent.click(screen.getByText('Quellenbelege anzeigen und pflegen'))
  await screen.findByText(/Möglicherweise veraltet/)
  expect(screen.getByText('„grün“')).toBeInTheDocument()
  fireEvent.click(screen.getByText('Prüfbedarf markieren'))
  await screen.findByRole('alert')
  expect(fetch).toHaveBeenCalledWith('/api/story', expect.objectContaining({ body: JSON.stringify({ action: 'update_evidence', args: { id: 'e', expectedUpdatedAt: '2026-10-17T00:00:00Z', flagged: true } }) }))
  expect(screen.getByText('„grün“')).toBeInTheDocument()
})
test('empty form cannot create speculative evidence', async () => {
  render(<SourceEvidencePanel entityType="CHARACTER" entityId="a" projectId={null} />)
  fireEvent.click(screen.getByText('Quellenbelege anzeigen und pflegen'))
  await waitFor(() => expect(screen.getByText('Quellenbeleg speichern')).toBeDisabled())
})
