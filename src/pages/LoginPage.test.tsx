import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { authValue } = vi.hoisted(() => ({
  authValue: {
    signIn: vi.fn(),
    authError: null as string | null,
  },
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => authValue,
}))

import LoginPage from './LoginPage'

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  vi.clearAllMocks()
  authValue.authError = null
})

describe('LoginPage', () => {
  it('renders the sign-in call to action', () => {
    render(<LoginPage />)

    expect(screen.getByText('The Gorguissian Family')).toBeInTheDocument()
    expect(screen.getByText('Continue with Google')).toBeInTheDocument()
  })

  it('calls signIn from the auth context when the button is clicked', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.click(screen.getByText('Continue with Google'))

    expect(authValue.signIn).toHaveBeenCalledTimes(1)
  })

  it('shows the auth error message when present', () => {
    authValue.authError = 'Something went wrong.'
    render(<LoginPage />)

    expect(screen.getByText('Something went wrong.')).toBeInTheDocument()
  })

  it('does not show an error note when there is no auth error', () => {
    render(<LoginPage />)

    expect(screen.queryByText('Something went wrong.')).not.toBeInTheDocument()
  })
})
