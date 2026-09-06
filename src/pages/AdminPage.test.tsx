import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppUser } from '../types'

const { getAllUsers, setUserRole, navigate, authValue } = vi.hoisted(() => ({
  getAllUsers: vi.fn(),
  setUserRole: vi.fn(),
  navigate: vi.fn(),
  authValue: {
    role: 'admin' as 'admin' | 'editor' | 'viewer',
    logOut: vi.fn(),
  },
}))

vi.mock('../services/firestoreService', () => ({ getAllUsers, setUserRole }))
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => authValue }))
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }))

import AdminPage from './AdminPage'

afterEach(() => {
  cleanup()
})

const users: AppUser[] = [
  {
    uid: 'u1',
    email: 'editor@example.com',
    displayName: 'Ed Itor',
    photoURL: '',
    role: 'editor',
    firstVisit: '2024-01-01T00:00:00.000Z',
    lastVisit: '2024-02-01T00:00:00.000Z',
  },
  {
    uid: 'u2',
    email: 'view@example.com',
    displayName: 'Vi Ewer',
    photoURL: '',
    role: 'viewer',
    firstVisit: '2024-01-05T00:00:00.000Z',
    lastVisit: '2024-02-05T00:00:00.000Z',
  },
  {
    uid: 'u3',
    email: 'admin@example.com',
    displayName: 'Ad Min',
    photoURL: '',
    role: 'admin',
    firstVisit: '2024-01-06T00:00:00.000Z',
    lastVisit: '2024-02-06T00:00:00.000Z',
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  authValue.role = 'admin'
  getAllUsers.mockResolvedValue(users)
  setUserRole.mockResolvedValue(undefined)
})

describe('AdminPage', () => {
  it('redirects to / when the current user is not an admin', () => {
    authValue.role = 'editor'
    render(<AdminPage />)

    expect(navigate).toHaveBeenCalledWith('/')
    expect(getAllUsers).not.toHaveBeenCalled()
  })

  it('lists users returned by getAllUsers for an admin', async () => {
    render(<AdminPage />)

    await waitFor(() => expect(screen.getByText('Ed Itor')).toBeInTheDocument())
    expect(screen.getByText('Vi Ewer')).toBeInTheDocument()
    expect(screen.getByText('Ad Min')).toBeInTheDocument()
  })

  it('shows an error message when getAllUsers fails', async () => {
    getAllUsers.mockRejectedValue(new Error('offline'))
    render(<AdminPage />)

    await waitFor(() =>
      expect(screen.getByText('Could not load users. Check your connection and try again.')).toBeInTheDocument(),
    )
  })

  it('does not show a role-change button for an admin user', async () => {
    render(<AdminPage />)

    await waitFor(() => expect(screen.getByText('Ad Min')).toBeInTheDocument())
    const adminRow = screen.getByText('Ad Min').closest('tr') as HTMLElement
    expect(adminRow.querySelector('button')).toBeNull()
  })

  it('clicking "Make editor" for a viewer calls setUserRole with editor', async () => {
    const user = userEvent.setup()
    render(<AdminPage />)

    await waitFor(() => expect(screen.getByText('Vi Ewer')).toBeInTheDocument())
    const viewerRow = screen.getByText('Vi Ewer').closest('tr') as HTMLElement
    await user.click(viewerRow.querySelector('button') as HTMLElement)

    expect(setUserRole).toHaveBeenCalledWith('u2', 'editor')
  })

  it('clicking "Revoke editor" for an editor calls setUserRole with viewer', async () => {
    const user = userEvent.setup()
    render(<AdminPage />)

    await waitFor(() => expect(screen.getByText('Ed Itor')).toBeInTheDocument())
    const editorRow = screen.getByText('Ed Itor').closest('tr') as HTMLElement
    expect(editorRow.querySelector('button')).toHaveTextContent('Revoke editor')
    await user.click(editorRow.querySelector('button') as HTMLElement)

    expect(setUserRole).toHaveBeenCalledWith('u1', 'viewer')
  })

  it('navigates to the tree and signs out via the header buttons', async () => {
    const user = userEvent.setup()
    render(<AdminPage />)

    await waitFor(() => expect(screen.getByText('Ed Itor')).toBeInTheDocument())
    await user.click(screen.getByText('← Back to tree'))
    expect(navigate).toHaveBeenCalledWith('/')

    await user.click(screen.getByText('Sign out'))
    expect(authValue.logOut).toHaveBeenCalledTimes(1)
  })
})
