import { render, screen, fireEvent } from '@testing-library/react'
import { DraftRecoveryBanner } from '../DraftRecoveryBanner'

const draft = {
  chapterId: 'c1',
  content: '<p>Draft</p>',
  updatedAt: new Date('2026-01-02T10:30:00.000Z').getTime(),
}

describe('DraftRecoveryBanner', () => {
  it('renders the recovery message', () => {
    render(<DraftRecoveryBanner draft={draft} onRestore={jest.fn()} onDiscard={jest.fn()} />)
    expect(screen.getByText(/Ungesicherter lokaler Entwurf/)).toBeInTheDocument()
  })

  it('calls onRestore when "Wiederherstellen" is clicked', () => {
    const onRestore = jest.fn()
    render(<DraftRecoveryBanner draft={draft} onRestore={onRestore} onDiscard={jest.fn()} />)
    fireEvent.click(screen.getByText('Wiederherstellen'))
    expect(onRestore).toHaveBeenCalledTimes(1)
  })

  it('calls onDiscard when "Verwerfen" is clicked', () => {
    const onDiscard = jest.fn()
    render(<DraftRecoveryBanner draft={draft} onRestore={jest.fn()} onDiscard={onDiscard} />)
    fireEvent.click(screen.getByText('Verwerfen'))
    expect(onDiscard).toHaveBeenCalledTimes(1)
  })
})
