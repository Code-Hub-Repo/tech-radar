import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('test toolchain', () => {
  it('renders via RTL and asserts via jest-dom matchers', () => {
    render(<div data-testid="smoke">ok</div>)
    expect(screen.getByTestId('smoke')).toBeInTheDocument()
  })
})
