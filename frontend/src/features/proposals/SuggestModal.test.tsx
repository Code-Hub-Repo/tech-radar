import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SuggestModal } from './SuggestModal'

const submittedProposal = {
  id: 1,
  name: 'Ktor Client',
  quadrant: 'TOOLS',
  ring: 'ASSESS',
  description: 'A lightweight HTTP client.',
  submitterName: null,
  status: 'PENDING',
  entryId: null,
  createdAt: '2026-07-16T00:00:00Z',
  reviewedAt: null,
}

function renderModal(onClose = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return {
    onClose,
    ...render(
      <QueryClientProvider client={queryClient}>
        <SuggestModal isOpen onClose={onClose} />
      </QueryClientProvider>,
    ),
  }
}

function fillValidForm() {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ktor Client' } })
  fireEvent.change(screen.getByLabelText('Quadrant'), { target: { value: 'TOOLS' } })
  fireEvent.change(screen.getByLabelText('Where do you think it belongs?'), { target: { value: 'ASSESS' } })
  fireEvent.change(screen.getByLabelText('What is it, and why should Code.Hub look at it?'), {
    target: { value: 'A lightweight HTTP client.' },
  })
}

describe('SuggestModal', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders nothing when closed', () => {
    const queryClient = new QueryClient()
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <SuggestModal isOpen={false} onClose={() => {}} />
      </QueryClientProvider>,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('renders the form with name, quadrant, ring, description, and optional submitter fields', () => {
    renderModal()

    expect(screen.getByRole('dialog', { name: 'Suggest a technology' })).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveValue('')
    expect(screen.getByLabelText('Quadrant')).toBeInTheDocument()
    expect(screen.getByLabelText('Where do you think it belongs?')).toBeInTheDocument()
    expect(screen.getByLabelText('What is it, and why should Code.Hub look at it?')).toHaveValue('')
    expect(screen.getByLabelText('Your name (optional)')).toHaveValue('')
  })

  it('shows a field error on blur once the name is cleared', () => {
    renderModal()

    const nameInput = screen.getByLabelText('Name')
    fireEvent.change(nameInput, { target: { value: 'x' } })
    fireEvent.change(nameInput, { target: { value: '' } })
    fireEvent.blur(nameInput)

    expect(screen.getByText('Name is required')).toBeInTheDocument()
    expect(nameInput).toHaveAttribute('aria-invalid', 'true')
  })

  it('blocks submission and surfaces every error when required fields are blank', () => {
    renderModal()

    fireEvent.click(screen.getByRole('button', { name: 'Submit suggestion' }))

    expect(screen.getByText('Name is required')).toBeInTheDocument()
    expect(screen.getByText('Description is required')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('submits the exact ProposalRequest shape and shows the thank-you state on success', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 201, json: () => Promise.resolve(submittedProposal) })

    renderModal()
    fillValidForm()
    fireEvent.click(screen.getByRole('button', { name: 'Submit suggestion' }))

    expect(await screen.findByText('Thanks — the Code.Hub team will review it.')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [calledUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(calledUrl.endsWith('/api/proposals')).toBe(true)
    expect(JSON.parse(init.body as string)).toEqual({
      name: 'Ktor Client',
      quadrant: 'TOOLS',
      ring: 'ASSESS',
      description: 'A lightweight HTTP client.',
    })
  })

  it('includes a trimmed submitterName only when the optional field is filled in', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 201, json: () => Promise.resolve(submittedProposal) })

    renderModal()
    fillValidForm()
    fireEvent.change(screen.getByLabelText('Your name (optional)'), { target: { value: '  Jane  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Submit suggestion' }))

    await screen.findByText('Thanks — the Code.Hub team will review it.')
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(init.body as string).submitterName).toBe('Jane')
  })

  it('fakes success without calling the API when the honeypot field is filled', () => {
    renderModal()
    fillValidForm()

    fireEvent.change(screen.getByLabelText('Leave this field blank'), { target: { value: 'http://spam.example' } })
    fireEvent.click(screen.getByRole('button', { name: 'Submit suggestion' }))

    expect(screen.getByText('Thanks — the Code.Hub team will review it.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('the honeypot field is excluded from the Tab order', () => {
    renderModal()

    expect(screen.getByLabelText('Leave this field blank')).toHaveAttribute('tabindex', '-1')
  })

  it('maps a 400 field-validation response onto the matching field', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({
          error: { code: 'VALIDATION_FAILED', message: 'Validation failed', details: { name: 'Name is required' } },
        }),
    })

    renderModal()
    fillValidForm()
    fireEvent.click(screen.getByRole('button', { name: 'Submit suggestion' }))

    expect(await screen.findByText('Name is required')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument() // stays open
  })

  it('shows a friendly message on 429 without blaming a specific field', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429, json: () => Promise.reject(new SyntaxError('no body')) })

    renderModal()
    fillValidForm()
    fireEvent.click(screen.getByRole('button', { name: 'Submit suggestion' }))

    expect(
      await screen.findByText("We've received a lot of suggestions — please try again in a few minutes."),
    ).toBeInTheDocument()
  })

  it('calls onClose when Cancel is clicked', () => {
    const { onClose } = renderModal()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose from the thank-you state Close button', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 201, json: () => Promise.resolve(submittedProposal) })
    const { onClose } = renderModal()
    fillValidForm()
    fireEvent.click(screen.getByRole('button', { name: 'Submit suggestion' }))
    await screen.findByText('Thanks — the Code.Hub team will review it.')

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
