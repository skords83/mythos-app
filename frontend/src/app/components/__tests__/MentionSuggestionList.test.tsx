import { createRef } from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MentionSuggestionList, MentionSuggestionListHandle, MentionSuggestionItem } from '../MentionSuggestionList'

const items: MentionSuggestionItem[] = [
  { kind: 'CHARACTER', id: 'c1', label: 'Frodo' },
  { kind: 'PLACE', id: 'p1', label: 'Bruchtal' },
  { kind: 'ITEM', id: 'i1', label: 'Der Eine Ring' },
]

describe('MentionSuggestionList', () => {
  it('renders one entry per item', () => {
    render(<MentionSuggestionList items={items} command={jest.fn()} />)
    expect(screen.getByText('Frodo')).toBeInTheDocument()
    expect(screen.getByText('Bruchtal')).toBeInTheDocument()
    expect(screen.getByText('Der Eine Ring')).toBeInTheDocument()
  })

  it('shows an empty state when there are no items', () => {
    render(<MentionSuggestionList items={[]} command={jest.fn()} />)
    expect(screen.getByText('Keine Treffer gefunden')).toBeInTheDocument()
  })

  it('calls command with the clicked item', () => {
    const command = jest.fn()
    render(<MentionSuggestionList items={items} command={command} />)
    fireEvent.click(screen.getByText('Bruchtal'))
    expect(command).toHaveBeenCalledWith({ kind: 'PLACE', id: 'p1', label: 'Bruchtal' })
  })

  it('ArrowDown moves the selection and Enter selects the currently highlighted item', () => {
    const command = jest.fn()
    const ref = createRef<MentionSuggestionListHandle>()
    render(<MentionSuggestionList ref={ref} items={items} command={command} />)

    act(() => { ref.current!.onKeyDown({ event: { key: 'ArrowDown' } as KeyboardEvent }) })
    act(() => { ref.current!.onKeyDown({ event: { key: 'Enter' } as KeyboardEvent }) })

    expect(command).toHaveBeenCalledWith({ kind: 'PLACE', id: 'p1', label: 'Bruchtal' })
  })

  it('ArrowUp wraps around to the last item', () => {
    const command = jest.fn()
    const ref = createRef<MentionSuggestionListHandle>()
    render(<MentionSuggestionList ref={ref} items={items} command={command} />)

    act(() => { ref.current!.onKeyDown({ event: { key: 'ArrowUp' } as KeyboardEvent }) })
    act(() => { ref.current!.onKeyDown({ event: { key: 'Enter' } as KeyboardEvent }) })

    expect(command).toHaveBeenCalledWith({ kind: 'ITEM', id: 'i1', label: 'Der Eine Ring' })
  })

  it('returns false for unhandled keys', () => {
    const ref = createRef<MentionSuggestionListHandle>()
    render(<MentionSuggestionList ref={ref} items={items} command={jest.fn()} />)
    expect(ref.current!.onKeyDown({ event: { key: 'Tab' } as KeyboardEvent })).toBe(false)
  })
})
