import { createRef } from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MentionSuggestionList, MentionSuggestionListHandle } from '../MentionSuggestionList'
import type { Character } from '../types'

function makeCharacter(id: string, name: string): Character {
  return {
    id,
    name,
    appearance: null,
    personality: null,
    backstory: null,
    motivation: null,
    avatarUrl: null,
    visibility: 'PRIVATE',
    projectId: 'proj-1',
    familyId: 'fam-1',
    authorId: 'user-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

const items = [makeCharacter('c1', 'Frodo'), makeCharacter('c2', 'Sam')]

describe('MentionSuggestionList', () => {
  it('renders one entry per item', () => {
    render(<MentionSuggestionList items={items} command={jest.fn()} />)
    expect(screen.getByText('Frodo')).toBeInTheDocument()
    expect(screen.getByText('Sam')).toBeInTheDocument()
  })

  it('shows an empty state when there are no items', () => {
    render(<MentionSuggestionList items={[]} command={jest.fn()} />)
    expect(screen.getByText('Keine Charaktere gefunden')).toBeInTheDocument()
  })

  it('calls command with the clicked item', () => {
    const command = jest.fn()
    render(<MentionSuggestionList items={items} command={command} />)
    fireEvent.click(screen.getByText('Sam'))
    expect(command).toHaveBeenCalledWith({ characterId: 'c2', label: 'Sam' })
  })

  it('ArrowDown moves the selection and Enter selects the currently highlighted item', () => {
    const command = jest.fn()
    const ref = createRef<MentionSuggestionListHandle>()
    render(<MentionSuggestionList ref={ref} items={items} command={command} />)

    act(() => { ref.current!.onKeyDown({ event: { key: 'ArrowDown' } as KeyboardEvent }) })
    act(() => { ref.current!.onKeyDown({ event: { key: 'Enter' } as KeyboardEvent }) })

    expect(command).toHaveBeenCalledWith({ characterId: 'c2', label: 'Sam' })
  })

  it('ArrowUp wraps around to the last item', () => {
    const command = jest.fn()
    const ref = createRef<MentionSuggestionListHandle>()
    render(<MentionSuggestionList ref={ref} items={items} command={command} />)

    act(() => { ref.current!.onKeyDown({ event: { key: 'ArrowUp' } as KeyboardEvent }) })
    act(() => { ref.current!.onKeyDown({ event: { key: 'Enter' } as KeyboardEvent }) })

    expect(command).toHaveBeenCalledWith({ characterId: 'c2', label: 'Sam' })
  })

  it('returns false for unhandled keys', () => {
    const ref = createRef<MentionSuggestionListHandle>()
    render(<MentionSuggestionList ref={ref} items={items} command={jest.fn()} />)
    expect(ref.current!.onKeyDown({ event: { key: 'Tab' } as KeyboardEvent })).toBe(false)
  })
})
