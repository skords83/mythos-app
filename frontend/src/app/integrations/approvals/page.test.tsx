import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ApprovalsPage from './page'
const longText = 'Langes Kapitel '.repeat(5000) + 'KAPITELENDE'
const originalFetch = global.fetch
afterEach(() => { jest.restoreAllMocks(); global.fetch = originalFetch })
test('shows complete original, proposal and comparison; renews separately from approval', async () => {
  const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ proposals: [{
    id: 'p', title: 'Neu', expiresAt: '2020-01-01', canApply: false, canResubmit: true,
    content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: longText }] }] },
    chapter: { id: 'c', title: 'Alt', content: '<p>Originaltext</p>', project: { id: 'book', title: 'Buch' } },
  }] }) } as Response)
  global.fetch = fetchMock
  jest.spyOn(window, 'confirm').mockReturnValue(true)
  render(<ApprovalsPage />)
  await screen.findByText('Erneut einreichen')
  expect(screen.getByRole('button', { name: 'Übernehmen' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Vorgeschlagener Text' }))
  expect(screen.getByText(/KAPITELENDE/).textContent).toBe(longText)
  fireEvent.click(screen.getByRole('button', { name: 'Originaltext' }))
  expect(screen.getByText('Originaltext', { selector: 'div' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Änderungsvergleich' }))
  expect(screen.getByText('Entfernt')).toBeInTheDocument()
  expect(screen.getByText('Hinzugefügt')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Erneut einreichen' }))
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/integrations/approvals/p', expect.objectContaining({ method: 'POST', body: JSON.stringify({ decision: 'resubmit' }) })))
})
