import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { IntroBanner } from './IntroBanner'

describe('IntroBanner', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(<IntroBanner isOpen={false} onDismiss={() => {}} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('explains the rings, quadrants, and click-for-detail interaction when open', () => {
    render(<IntroBanner isOpen onDismiss={() => {}} />)

    const note = screen.getByRole('note', { name: 'How to read this radar' })
    expect(note).toHaveTextContent(/4 rings/i)
    expect(note).toHaveTextContent(/adopt/i)
    expect(note).toHaveTextContent(/hold/i)
    expect(note).toHaveTextContent(/4 quadrants/i)
    expect(note).toHaveTextContent(/click any dot or list row/i)
  })

  it('calls onDismiss when the close button is clicked', () => {
    const onDismiss = vi.fn()
    render(<IntroBanner isOpen onDismiss={onDismiss} />)

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss how-to-read intro' }))

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
