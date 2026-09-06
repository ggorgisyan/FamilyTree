import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider, getOrCreateUser } = vi.hoisted(() => ({
  onAuthStateChanged: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: vi.fn().mockImplementation(() => ({})),
  getOrCreateUser: vi.fn(),
}))

vi.mock('firebase/auth', () => ({
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
}))

vi.mock('../services/firestoreService', () => ({
  getOrCreateUser,
}))

vi.mock('../firebase', () => ({
  auth: {},
  ADMIN_EMAIL: 'admin@example.com',
  ADMIN_UID: 'admin-uid',
}))

import { AuthProvider, useAuth } from './AuthContext'

function Consumer() {
  const { user, role, loading, authError, signIn, logOut } = useAuth()
  return (
    <div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="user">{user ? user.uid : 'none'}</div>
      <div data-testid="role">{role ?? 'none'}</div>
      <div data-testid="error">{authError ?? 'none'}</div>
      <button onClick={signIn}>sign-in</button>
      <button onClick={logOut}>sign-out</button>
    </div>
  )
}

let authCallback: (user: unknown) => void

beforeEach(() => {
  vi.clearAllMocks()
  onAuthStateChanged.mockImplementation((_auth: unknown, cb: (user: unknown) => void) => {
    authCallback = cb
    return vi.fn()
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('AuthProvider / useAuth', () => {
  it('starts in a loading state', () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    )

    expect(screen.getByTestId('loading')).toHaveTextContent('true')
    expect(screen.getByTestId('user')).toHaveTextContent('none')
  })

  it('reflects signed-out state once auth resolves with no user', async () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    )

    await act(async () => {
      authCallback(null)
    })

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('user')).toHaveTextContent('none')
    expect(screen.getByTestId('role')).toHaveTextContent('none')
  })

  it('reflects signed-in state with the resolved role', async () => {
    getOrCreateUser.mockResolvedValue({
      uid: 'u1',
      email: 'user@example.com',
      displayName: 'User One',
      photoURL: '',
      role: 'editor',
      firstVisit: '',
      lastVisit: '',
    })

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    )

    await act(async () => {
      authCallback({ uid: 'u1', email: 'user@example.com', displayName: 'User One', photoURL: '' })
    })

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('user')).toHaveTextContent('u1')
    expect(screen.getByTestId('role')).toHaveTextContent('editor')
    expect(getOrCreateUser).toHaveBeenCalledWith('u1', 'user@example.com', 'User One', '', 'admin-uid', 'admin@example.com')
  })

  it('falls back to a locally-resolved admin role when getOrCreateUser throws for the admin uid', async () => {
    getOrCreateUser.mockRejectedValue(new Error('offline'))

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    )

    await act(async () => {
      authCallback({ uid: 'admin-uid', email: 'admin@example.com', displayName: 'Admin', photoURL: '' })
    })

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('user')).toHaveTextContent('admin-uid')
    expect(screen.getByTestId('role')).toHaveTextContent('admin')
    expect(screen.getByTestId('error')).not.toHaveTextContent('none')
  })

  it('falls back to viewer role on error for a non-admin user', async () => {
    getOrCreateUser.mockRejectedValue(new Error('offline'))

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    )

    await act(async () => {
      authCallback({ uid: 'someone', email: 'someone@example.com', displayName: 'Someone', photoURL: '' })
    })

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('role')).toHaveTextContent('viewer')
  })

  it('calls signInWithPopup when signIn is invoked', async () => {
    signInWithPopup.mockResolvedValue(undefined)
    const user = userEvent.setup()

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    )

    await act(async () => {
      authCallback(null)
    })

    await user.click(screen.getByText('sign-in'))

    expect(signInWithPopup).toHaveBeenCalledTimes(1)
  })

  it('sets authError when signInWithPopup rejects', async () => {
    signInWithPopup.mockRejectedValue({ code: 'auth/popup-closed-by-user' })
    const user = userEvent.setup()

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    )

    await act(async () => {
      authCallback(null)
    })

    await user.click(screen.getByText('sign-in'))

    await waitFor(() =>
      expect(screen.getByTestId('error')).toHaveTextContent('The Google sign-in popup was closed before completing login.'),
    )
  })

  it('calls signOut when logOut is invoked', async () => {
    signOut.mockResolvedValue(undefined)
    const user = userEvent.setup()

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    )

    await act(async () => {
      authCallback(null)
    })

    await user.click(screen.getByText('sign-out'))

    expect(signOut).toHaveBeenCalledTimes(1)
  })

  it('throws when useAuth is used outside an AuthProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Consumer />)).toThrow('useAuth must be used within AuthProvider')
    spy.mockRestore()
  })
})
