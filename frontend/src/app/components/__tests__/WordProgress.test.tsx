import { render, screen } from '@testing-library/react'
import { WordProgress, FloatingToolbar } from '../WordProgress'

describe('WordProgress', () => {
  it('renders the current/goal word count', () => {
    render(<WordProgress current={500} goal={1000} />)
    expect(screen.getByText('500/1000 Wörter')).toBeInTheDocument()
  })

  it('rounds the percentage for display', () => {
    render(<WordProgress current={333} goal={1000} />)
    expect(screen.getByText('33%')).toBeInTheDocument()
  })

  it('clamps the percentage at 100% when the goal is exceeded', () => {
    render(<WordProgress current={1500} goal={1000} />)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })
})

describe('FloatingToolbar', () => {
  it('renders nothing when not visible', () => {
    const { container } = render(<FloatingToolbar visible={false} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders formatting buttons when visible', () => {
    render(<FloatingToolbar visible={true} />)
    expect(screen.getByTitle('Bold')).toBeInTheDocument()
    expect(screen.getByTitle('Italic')).toBeInTheDocument()
    expect(screen.getByTitle('List')).toBeInTheDocument()
    expect(screen.getByTitle('Quote')).toBeInTheDocument()
  })
})
