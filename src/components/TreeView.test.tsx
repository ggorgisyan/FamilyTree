import { createRef } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TreeView, { type TreeViewHandle } from './TreeView'
import type { FamilyMember } from '../types'

// TreeView renders each member as a real DOM node (a ".card" inside a ".node" div)
// positioned with inline styles — it is not a <canvas> drawing, so per-member DOM
// assertions are valid here.

afterEach(() => {
  cleanup()
})

const members: FamilyMember[] = [
  { id: 'root', name: 'Founder Root', parentId: null },
  { id: 'child-a', name: 'Child A', parentId: 'root' },
  { id: 'child-b', name: 'Child B', parentId: 'root' },
  { id: 'grand-a', name: 'Grandchild A', parentId: 'child-a' },
]

// jsdom does not implement layout, so getBoundingClientRect() returns all-zero
// rects. TreeView guards on `!rect` only when the element is missing, so the
// fit/focus math still runs (against a zero-size rect) without throwing.

describe('TreeView', () => {
  it('renders a card for every member', () => {
    render(<TreeView members={members} selectedId={null} onSelect={() => {}} />)

    expect(screen.getByText('Founder Root')).toBeInTheDocument()
    expect(screen.getByText('Child A')).toBeInTheDocument()
    expect(screen.getByText('Child B')).toBeInTheDocument()
  })

  it('calls onSelect with the member id when a card is clicked', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<TreeView members={members} selectedId={null} onSelect={onSelect} />)

    await user.click(screen.getByText('Child A'))

    expect(onSelect).toHaveBeenCalledWith('child-a')
  })

  it('shows the empty state when there is no root member', () => {
    render(<TreeView members={[]} selectedId={null} onSelect={() => {}} />)

    expect(screen.getByText('No family data found yet.')).toBeInTheDocument()
  })

  it('toggling a node hides its descendants, and toggling again reveals them', async () => {
    const user = userEvent.setup()
    render(<TreeView members={members} selectedId={null} onSelect={() => {}} />)

    // Grandchild is initially visible (depth 2, below the depth>=3 auto-collapse threshold).
    expect(screen.getByText('Grandchild A')).toBeInTheDocument()

    // Collapse "Child A" via its toggle button.
    const childCard = screen.getByText('Child A').closest('.node') as HTMLElement
    const toggleBtn = childCard.querySelector('.toggle') as HTMLElement
    expect(toggleBtn).toBeTruthy()
    await user.click(toggleBtn)

    expect(screen.queryByText('Grandchild A')).not.toBeInTheDocument()

    // Expand again.
    await user.click(screen.getByText('Child A').closest('.node')!.querySelector('.toggle')!)
    expect(screen.getByText('Grandchild A')).toBeInTheDocument()
  })

  it('exposes imperative handle methods that do not throw', () => {
    const ref = createRef<TreeViewHandle>()
    render(<TreeView members={members} selectedId={null} onSelect={() => {}} ref={ref} />)

    expect(ref.current).toBeTruthy()
    expect(() => act(() => ref.current?.fitView())).not.toThrow()
    expect(() => act(() => ref.current?.expandAll())).not.toThrow()
    expect(() => act(() => ref.current?.collapseDeep())).not.toThrow()
    expect(() => act(() => ref.current?.focusMember('grand-a'))).not.toThrow()
  })

  it('expandAll reveals nodes collapsed by the default depth>=3 rule', () => {
    // root(0) -> child-a(1) -> grand-a(2) -> ggrand-a(3, has a child so it
    // auto-collapses) -> gggrand-a(4, hidden by default).
    const deepMembers: FamilyMember[] = [
      ...members,
      { id: 'ggrand-a', name: 'Great-grandchild A', parentId: 'grand-a' },
      { id: 'gggrand-a', name: 'Great-great-grandchild A', parentId: 'ggrand-a' },
    ]
    const ref = createRef<TreeViewHandle>()
    render(<TreeView members={deepMembers} selectedId={null} onSelect={() => {}} ref={ref} />)

    // depth 3 node ("Great-grandchild A") is auto-collapsed by the initial-view
    // effect, hiding its depth-4 child.
    expect(screen.getByText('Great-grandchild A')).toBeInTheDocument()
    expect(screen.queryByText('Great-great-grandchild A')).not.toBeInTheDocument()

    fireEvent(window, new Event('resize')) // no-op, just ensures no stale timers
    act(() => {
      ref.current?.expandAll()
    })

    expect(screen.getByText('Great-great-grandchild A')).toBeInTheDocument()
  })
})
