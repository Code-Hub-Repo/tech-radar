// RTL coverage for the Legend's ring-meaning cards and the New/Moved-in/Moved-out state keys,
// added alongside RadarChart's ring labels in the same comprehension pass -- the Legend is the
// second place (after the radar itself) a visitor learns what each ring means.
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Legend } from './Legend'

describe('Legend', () => {
  it('renders each ring name with its one-line meaning', () => {
    render(<Legend />)

    expect(screen.getByText('Adopt')).toBeInTheDocument()
    expect(screen.getByText('Proven — use with confidence.')).toBeInTheDocument()

    expect(screen.getByText('Trial')).toBeInTheDocument()
    expect(screen.getByText('Worth pursuing — use where you can handle some risk.')).toBeInTheDocument()

    expect(screen.getByText('Assess')).toBeInTheDocument()
    expect(screen.getByText('Promising — explore to understand its impact.')).toBeInTheDocument()

    expect(screen.getByText('Hold')).toBeInTheDocument()
    expect(screen.getByText('Proceed with caution, or phase out.')).toBeInTheDocument()
  })

  it('still renders the New, Moved in, and Moved out state keys', () => {
    render(<Legend />)

    expect(screen.getByText('New')).toBeInTheDocument()
    expect(screen.getByText('Moved in')).toBeInTheDocument()
    expect(screen.getByText('Moved out')).toBeInTheDocument()
  })

  it('exposes an accessible section labelled by the Legend heading', () => {
    render(<Legend />)

    expect(screen.getByRole('region', { name: 'Legend' })).toBeInTheDocument()
  })
})
