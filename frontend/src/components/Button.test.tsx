import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('renders its children as a button with type="button" by default', () => {
    render(<Button>Add technology</Button>)

    const button = screen.getByRole('button', { name: 'Add technology' })
    expect(button).toHaveAttribute('type', 'button')
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Save</Button>)

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('supports type="submit" for form submission', () => {
    render(<Button type="submit">Save changes</Button>)

    expect(screen.getByRole('button', { name: 'Save changes' })).toHaveAttribute('type', 'submit')
  })

  it('is disabled and aria-busy while isLoading, and does not fire onClick', () => {
    const onClick = vi.fn()
    render(
      <Button isLoading onClick={onClick}>
        Save
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')

    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('respects an explicit disabled prop independent of isLoading', () => {
    render(<Button disabled>Delete</Button>)

    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled()
  })
})
