import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Header } from './Header'

function renderHeader(onOpenIntro = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return {
    onOpenIntro,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Header onOpenIntro={onOpenIntro} />
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  }
}

describe('Header', () => {
  it('opens the Suggest a technology modal when its button is clicked, and closes on Cancel', () => {
    renderHeader()

    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Suggest a technology' }))
    expect(screen.getByRole('dialog', { name: 'Suggest a technology' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('calls onOpenIntro when "How to read this" is clicked', () => {
    const { onOpenIntro } = renderHeader()

    fireEvent.click(screen.getByRole('button', { name: 'How to read this' }))

    expect(onOpenIntro).toHaveBeenCalledTimes(1)
  })

  it('renders an Admin link pointing at /admin', () => {
    renderHeader()

    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin')
  })
})
