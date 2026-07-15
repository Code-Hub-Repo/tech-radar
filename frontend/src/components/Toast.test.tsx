import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from './Toast'
import { useToast } from './ToastContext'

function ToastTrigger() {
  const { showToast } = useToast()
  return (
    <div>
      <button type="button" onClick={() => showToast('success', 'Entry created')}>
        trigger success
      </button>
      <button type="button" onClick={() => showToast('error', 'Failed to create entry')}>
        trigger error
      </button>
    </div>
  )
}

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders a success toast with role="status" when shown', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    )

    act(() => {
      screen.getByRole('button', { name: 'trigger success' }).click()
    })

    expect(screen.getByRole('status')).toHaveTextContent('Entry created')
  })

  it('never steals focus when a toast appears', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    )

    const triggerButton = screen.getByRole('button', { name: 'trigger success' })
    triggerButton.focus()
    act(() => {
      triggerButton.click()
    })

    expect(triggerButton).toHaveFocus()
  })

  it('stacks multiple toasts, most recent last in DOM order (closest to the corner)', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    )

    act(() => {
      screen.getByRole('button', { name: 'trigger success' }).click()
    })
    act(() => {
      screen.getByRole('button', { name: 'trigger error' }).click()
    })

    const toasts = screen.getAllByRole('status')
    expect(toasts).toHaveLength(2)
    expect(toasts[0]).toHaveTextContent('Entry created')
    expect(toasts[1]).toHaveTextContent('Failed to create entry')
  })

  it('auto-dismisses a toast after its timeout', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    )

    act(() => {
      screen.getByRole('button', { name: 'trigger success' }).click()
    })
    expect(screen.getByRole('status')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(4000)
    })

    expect(screen.queryByRole('status')).toBeNull()
  })

  it('useToast throws when used outside a ToastProvider', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => render(<ToastTrigger />)).toThrow('useToast must be used within a ToastProvider')

    consoleErrorSpy.mockRestore()
  })
})
