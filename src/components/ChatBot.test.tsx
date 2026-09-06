import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChatBot from './ChatBot'
import type { FamilyMember } from '../types'

const mockCallable = vi.fn()

vi.mock('firebase/functions', () => ({
  httpsCallable: () => mockCallable,
}))

vi.mock('../firebase', () => ({
  functions: {},
}))

function renderChatBot(onNavigate = vi.fn()) {
  const members: FamilyMember[] = [
    { id: 'm1', name: 'Alice Gorguissian', parentId: null },
  ]
  const membersMap = new Map(members.map(m => [m.id, m]))
  return { onNavigate, ...render(<ChatBot membersMap={membersMap} onNavigate={onNavigate} />) }
}

beforeEach(() => {
  mockCallable.mockReset()
})

afterEach(() => {
  cleanup()
})

describe('ChatBot', () => {
  it('opens the panel on button click and closes it on close button click', async () => {
    const user = userEvent.setup()
    renderChatBot()

    expect(screen.queryByText('Ask about the family')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /ask about the family/i }))
    expect(screen.getByText('Ask about the family')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /close/i }))
    expect(screen.queryByText('Ask about the family')).not.toBeInTheDocument()
  })

  it('sends a message and renders the assistant reply', async () => {
    mockCallable.mockResolvedValueOnce({ data: { reply: 'Hello there!', mentionedMemberIds: [] } })
    const user = userEvent.setup()
    renderChatBot()

    await user.click(screen.getByRole('button', { name: /ask about the family/i }))
    await user.type(screen.getByPlaceholderText('Ask a question…'), 'Who is the founder?')
    await user.click(screen.getByRole('button', { name: /send/i }))

    expect(screen.getByText('Who is the founder?')).toBeInTheDocument()
    expect(mockCallable).toHaveBeenCalledWith({
      messages: [{ role: 'user', content: 'Who is the founder?' }],
    })

    await waitFor(() => expect(screen.getByText('Hello there!')).toBeInTheDocument())
  })

  it('renders a clickable chip for mentioned members and navigates on click', async () => {
    mockCallable.mockResolvedValueOnce({
      data: { reply: 'Alice was the founder.', mentionedMemberIds: ['m1'] },
    })
    const user = userEvent.setup()
    const { onNavigate } = renderChatBot()

    await user.click(screen.getByRole('button', { name: /ask about the family/i }))
    await user.type(screen.getByPlaceholderText('Ask a question…'), 'Tell me about Alice')
    await user.click(screen.getByRole('button', { name: /send/i }))

    const chip = await screen.findByRole('button', { name: 'Alice Gorguissian' })
    await user.click(chip)
    expect(onNavigate).toHaveBeenCalledWith('m1')
  })

  it('shows a friendly rate-limit message on a resource-exhausted rejection', async () => {
    mockCallable.mockRejectedValueOnce({ code: 'functions/resource-exhausted', message: 'quota exceeded' })
    const user = userEvent.setup()
    renderChatBot()

    await user.click(screen.getByRole('button', { name: /ask about the family/i }))
    await user.type(screen.getByPlaceholderText('Ask a question…'), 'Hello?')
    await user.click(screen.getByRole('button', { name: /send/i }))

    expect(
      await screen.findByText("You've reached today's question limit — try again tomorrow."),
    ).toBeInTheDocument()
    expect(screen.queryByText('quota exceeded')).not.toBeInTheDocument()
  })
})
