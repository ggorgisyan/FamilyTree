import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MemberPanel from './MemberPanel'
import type { FamilyMember } from '../types'

const { updateMember } = vi.hoisted(() => ({ updateMember: vi.fn() }))

vi.mock('../services/firestoreService', () => ({ updateMember }))
vi.mock('../services/storageService', () => ({
  uploadMemberPhoto: vi.fn(),
  uploadEventPhoto: vi.fn(),
}))

afterEach(() => {
  cleanup()
})

const founder: FamilyMember = {
  id: 'root',
  name: 'Founder Root',
  parentId: null,
  location: 'Yerevan',
  birthYear: 1930,
  bio: 'Started it all.',
  isPublicFigure: false,
}

const child: FamilyMember = {
  id: 'child-a',
  name: 'Child A',
  parentId: 'root',
}

function buildMembersMap(...members: FamilyMember[]) {
  return new Map(members.map(m => [m.id, m]))
}

beforeEach(() => {
  vi.clearAllMocks()
  updateMember.mockResolvedValue(undefined)
})

describe('MemberPanel — viewer role', () => {
  it('renders no edit controls and shows the view-only badge', () => {
    render(
      <MemberPanel
        member={founder}
        role="viewer"
        membersMap={buildMembersMap(founder, child)}
        onClose={() => {}}
        onUpdated={() => {}}
        onNavigate={() => {}}
      />,
    )

    expect(screen.getByText('View only')).toBeInTheDocument()
    expect(screen.queryByText('Edit details')).not.toBeInTheDocument()
    expect(screen.queryByText('Public figure')).not.toBeInTheDocument()
  })
})

describe('MemberPanel — editor role', () => {
  it('shows the Editable badge and an Edit details button', () => {
    render(
      <MemberPanel
        member={founder}
        role="editor"
        membersMap={buildMembersMap(founder, child)}
        onClose={() => {}}
        onUpdated={() => {}}
        onNavigate={() => {}}
      />,
    )

    expect(screen.getByText('Editable')).toBeInTheDocument()
    expect(screen.getByText('Edit details')).toBeInTheDocument()
  })

  it('lets an editor change fields and save, calling updateMember with the new values', async () => {
    const user = userEvent.setup()
    const onUpdated = vi.fn()

    render(
      <MemberPanel
        member={founder}
        role="editor"
        membersMap={buildMembersMap(founder, child)}
        onClose={() => {}}
        onUpdated={onUpdated}
        onNavigate={() => {}}
      />,
    )

    await user.click(screen.getByText('Edit details'))

    const locationInput = screen.getByPlaceholderText('Yerevan, Armenia')
    await user.clear(locationInput)
    await user.type(locationInput, 'Beirut')

    const birthYearInput = screen.getByPlaceholderText('1958')
    await user.clear(birthYearInput)
    await user.type(birthYearInput, '1932')

    const bioInput = screen.getByPlaceholderText('Add a memory about this person…')
    await user.clear(bioInput)
    await user.type(bioInput, 'Updated memory.')

    const publicFigureCheckbox = screen.getByRole('checkbox')
    expect(publicFigureCheckbox).not.toBeChecked()
    await user.click(publicFigureCheckbox)
    expect(publicFigureCheckbox).toBeChecked()

    await user.click(screen.getByText('Save changes'))

    expect(updateMember).toHaveBeenCalledTimes(1)
    const saved = updateMember.mock.calls[0][0]
    expect(saved).toMatchObject({
      id: 'root',
      location: 'Beirut',
      birthYear: 1932,
      bio: 'Updated memory.',
      isPublicFigure: true,
    })
    expect(onUpdated).toHaveBeenCalledWith(expect.objectContaining({ isPublicFigure: true }))
  })

  it('toggling isPublicFigure off and saving sends isPublicFigure: false', async () => {
    const user = userEvent.setup()
    const publicFigureMember = { ...founder, isPublicFigure: true }

    render(
      <MemberPanel
        member={publicFigureMember}
        role="admin"
        membersMap={buildMembersMap(publicFigureMember, child)}
        onClose={() => {}}
        onUpdated={() => {}}
        onNavigate={() => {}}
      />,
    )

    await user.click(screen.getByText('Edit details'))
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeChecked()
    await user.click(checkbox)
    await user.click(screen.getByText('Save changes'))

    expect(updateMember).toHaveBeenCalledWith(expect.objectContaining({ isPublicFigure: false }))
  })

  it('Cancel resets fields without calling updateMember', async () => {
    const user = userEvent.setup()

    render(
      <MemberPanel
        member={founder}
        role="editor"
        membersMap={buildMembersMap(founder, child)}
        onClose={() => {}}
        onUpdated={() => {}}
        onNavigate={() => {}}
      />,
    )

    await user.click(screen.getByText('Edit details'))
    const locationInput = screen.getByPlaceholderText('Yerevan, Armenia')
    await user.clear(locationInput)
    await user.type(locationInput, 'Somewhere else')

    await user.click(screen.getByText('Cancel'))

    expect(updateMember).not.toHaveBeenCalled()
    // Back in read-only mode, showing the original (unchanged) value.
    expect(screen.getByText('Yerevan')).toBeInTheDocument()
    expect(screen.queryByText('Somewhere else')).not.toBeInTheDocument()
  })

  it('renders the children list and clicking a child calls onNavigate', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()

    render(
      <MemberPanel
        member={founder}
        role="editor"
        membersMap={buildMembersMap(founder, child)}
        onClose={() => {}}
        onUpdated={() => {}}
        onNavigate={onNavigate}
      />,
    )

    expect(screen.getByText('Child A')).toBeInTheDocument()
    await user.click(screen.getByText('Child A'))

    expect(onNavigate).toHaveBeenCalledWith('child-a')
  })
})
