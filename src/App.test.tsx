import { forwardRef, useImperativeHandle } from 'react'
import type { ReactNode, Ref } from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FamilyMember } from './types'

const { getMembers, authValue, treeHandle } = vi.hoisted(() => ({
  getMembers: vi.fn(),
  authValue: {
    user: null as null | { uid: string; email: string; displayName: string; photoURL: string },
    role: null as null | 'viewer' | 'editor' | 'admin',
    loading: false,
    authError: null as string | null,
    signIn: vi.fn(),
    logOut: vi.fn(),
  },
  treeHandle: {
    expandAll: vi.fn(),
    collapseDeep: vi.fn(),
    fitView: vi.fn(),
    focusMember: vi.fn(),
  },
}))

vi.mock('./services/firestoreService', () => ({ getMembers }))

vi.mock('./firebase', () => ({ IS_ADMIN_CONFIGURED: true }))

vi.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => authValue,
}))

vi.mock('./components/TreeView', () => {
  const StubTreeView = forwardRef((props: { members: FamilyMember[] }, ref: Ref<unknown>) => {
    useImperativeHandle(ref, () => treeHandle)
    return <div data-testid="tree-view">{props.members.length} members</div>
  })
  StubTreeView.displayName = 'StubTreeView'
  return { default: StubTreeView }
})

import App from './App'

afterEach(() => {
  cleanup()
})

const members: FamilyMember[] = [
  { id: '1', name: 'Movses', parentId: null },
  { id: '1.1', name: 'Thomas', parentId: '1' },
  { id: '1.2', name: 'Alice', parentId: '1' },
]

beforeEach(() => {
  vi.clearAllMocks()
  authValue.user = null
  authValue.role = null
  authValue.loading = false
  authValue.authError = null
  getMembers.mockResolvedValue(members)
})

describe('App auth-gated rendering', () => {
  it('shows a loading state while auth is resolving', () => {
    authValue.loading = true
    render(<App />)

    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('shows the login page when there is no signed-in user', () => {
    authValue.loading = false
    authValue.user = null
    render(<App />)

    expect(screen.getByText('Continue with Google')).toBeInTheDocument()
  })

  it('shows the tree view when a user is signed in', async () => {
    authValue.user = { uid: 'u1', email: 'u1@example.com', displayName: 'User One', photoURL: '' }
    authValue.role = 'viewer'
    render(<App />)

    await waitFor(() => expect(screen.getByTestId('tree-view')).toBeInTheDocument())
  })

  it('shows the admin nav button only for role === admin', async () => {
    authValue.user = { uid: 'u1', email: 'u1@example.com', displayName: 'User One', photoURL: '' }
    authValue.role = 'editor'
    render(<App />)

    await waitFor(() => expect(screen.getByTestId('tree-view')).toBeInTheDocument())
    expect(screen.queryByTitle('Admin dashboard')).not.toBeInTheDocument()
  })

  it('renders the admin nav button for an admin user', async () => {
    authValue.user = { uid: 'u1', email: 'u1@example.com', displayName: 'User One', photoURL: '' }
    authValue.role = 'admin'
    render(<App />)

    await waitFor(() => expect(screen.getByTestId('tree-view')).toBeInTheDocument())
    expect(screen.getByTitle('Admin dashboard')).toBeInTheDocument()
  })
})

describe('App search box', () => {
  beforeEach(() => {
    authValue.user = { uid: 'u1', email: 'u1@example.com', displayName: 'User One', photoURL: '' }
    authValue.role = 'viewer'
  })

  it('filters members by name as the user types and shows matching results', async () => {
    const user = userEvent.setup()
    render(<App />)

    await waitFor(() => expect(screen.getByTestId('tree-view')).toBeInTheDocument())
    // Wait for the cloud fetch to replace the built-in dataset with our fixture members.
    await waitFor(() => expect(screen.getByText('3 members')).toBeInTheDocument())

    const input = screen.getByPlaceholderText('Search a family member…')
    await user.type(input, 'thom')

    expect(screen.getByText('Thomas')).toBeInTheDocument()
    expect(screen.queryByText('Alice')).not.toBeInTheDocument()
  })

  it('clicking a search result calls the tree view focusMember via the ref', async () => {
    const user = userEvent.setup()
    render(<App />)

    await waitFor(() => expect(screen.getByText('3 members')).toBeInTheDocument())

    const input = screen.getByPlaceholderText('Search a family member…')
    await user.type(input, 'alice')
    await user.click(screen.getByText('Alice'))

    expect(treeHandle.focusMember).toHaveBeenCalledWith('1.2')
  })

  it('shows "No matches" when nothing matches the query', async () => {
    const user = userEvent.setup()
    render(<App />)

    await waitFor(() => expect(screen.getByText('3 members')).toBeInTheDocument())

    const input = screen.getByPlaceholderText('Search a family member…')
    await user.type(input, 'zzzzzz')

    expect(screen.getByText('No matches')).toBeInTheDocument()
  })
})
