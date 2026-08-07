import {
  forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState,
} from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { FamilyMember } from '../types'
import { avatarGradient, genColor, initials } from '../utils/style'

export interface TreeViewHandle {
  expandAll: () => void
  collapseDeep: () => void
  fitView: () => void
  focusMember: (id: string) => void
}

interface TreeViewProps {
  members: FamilyMember[]
  selectedId: string | null
  onSelect: (id: string) => void
}

interface TNode {
  id: string
  name: string
  member: FamilyMember
  depth: number
  children: TNode[]
}

const NODE_W = 158
const X_GAP = 182
const LEVEL_H = 170

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

const TreeView = forwardRef<TreeViewHandle, TreeViewProps>(function TreeView(
  { members, selectedId, onSelect },
  ref,
) {
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [t, setT] = useState({ tx: 120, ty: 26, scale: 0.62 })
  const [pendingFit, setPendingFit] = useState(false)
  const [pendingFocus, setPendingFocus] = useState<string | null>(null)

  // Build the tree from the flat member list.
  const { root, nodeMap } = useMemo(() => {
    const map = new Map<string, TNode>()
    members.forEach(m =>
      map.set(m.id, { id: m.id, name: m.name, member: m, depth: 0, children: [] }),
    )
    let r: TNode | null = null
    members.forEach(m => {
      const node = map.get(m.id)!
      if (m.parentId === null) r = node
      else map.get(m.parentId)?.children.push(node)
    })
    if (r) {
      const setDepth = (n: TNode, d: number) => {
        n.depth = d
        n.children.forEach(c => setDepth(c, d + 1))
      }
      setDepth(r, 0)
    }
    return { root: r as TNode | null, nodeMap: map }
  }, [members])

  // Descendant counts (independent of collapse state) for the "+ n" badges.
  const descCount = useMemo(() => {
    const m = new Map<string, number>()
    const count = (n: TNode): number => {
      let c = 0
      n.children.forEach(k => {
        c += 1 + count(k)
      })
      m.set(n.id, c)
      return c
    }
    if (root) count(root)
    return m
  }, [root])

  // Tidy layout: leaves get sequential x, parents centre over children.
  const layout = useMemo(() => {
    const pos = new Map<string, { x: number; depth: number }>()
    let leaf = 0
    let maxDepth = 0
    const walk = (n: TNode) => {
      maxDepth = Math.max(maxDepth, n.depth)
      const kids = collapsed.has(n.id) ? [] : n.children
      if (kids.length === 0) {
        pos.set(n.id, { x: leaf++, depth: n.depth })
        return
      }
      kids.forEach(walk)
      const f = pos.get(kids[0].id)!.x
      const l = pos.get(kids[kids.length - 1].id)!.x
      pos.set(n.id, { x: (f + l) / 2, depth: n.depth })
    }
    if (root) walk(root)
    return { pos, leaf, maxDepth }
  }, [root, collapsed])

  const totalW = Math.max(0, layout.leaf - 1) * X_GAP + 180 + NODE_W
  const totalH = layout.maxDepth * LEVEL_H + 240

  const px = (p: { x: number; depth: number }) => ({
    left: p.x * X_GAP + 90,
    top: p.depth * LEVEL_H + 34,
  })

  const ancestors = useCallback(
    (id: string) => {
      const out: string[] = []
      let m = nodeMap.get(id)?.member
      while (m && m.parentId) {
        out.push(m.parentId)
        m = nodeMap.get(m.parentId)?.member
      }
      return out
    },
    [nodeMap],
  )

  const doFit = useCallback(() => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const scale = clamp((rect.width - 80) / totalW, 0.2, 1)
    setT({ scale, tx: (rect.width - totalW * scale) / 2, ty: 26 })
  }, [totalW])

  // Default view whenever the underlying data changes: collapse gen 4+ and fit.
  useEffect(() => {
    const s = new Set<string>()
    const walk = (n: TNode) => {
      if (n.depth >= 3 && n.children.length) s.add(n.id)
      n.children.forEach(walk)
    }
    if (root) walk(root)
    setCollapsed(s)
    setPendingFit(true)
  }, [root])

  useEffect(() => {
    if (!pendingFit) return
    doFit()
    setPendingFit(false)
  }, [pendingFit, layout, doFit])

  useEffect(() => {
    if (!pendingFocus) return
    const p = layout.pos.get(pendingFocus)
    if (!p) return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (rect) {
      const pt = px(p)
      const scale = Math.max(t.scale, 0.72)
      setT({ scale, tx: rect.width / 2 - pt.left * scale, ty: rect.height / 2 - (pt.top + 60) * scale })
    }
    setPendingFocus(null)
  }, [pendingFocus, layout]) // eslint-disable-line react-hooks/exhaustive-deps

  // Native wheel listener so we can preventDefault (passive: false).
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const f = e.deltaY < 0 ? 1.1 : 1 / 1.1
      setT(prev => {
        const ns = clamp(prev.scale * f, 0.2, 1.7)
        return {
          scale: ns,
          tx: mx - (mx - prev.tx) * (ns / prev.scale),
          ty: my - (my - prev.ty) * (ns / prev.scale),
        }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const toggle = (id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  useImperativeHandle(
    ref,
    () => ({
      expandAll: () => {
        setCollapsed(new Set())
        setPendingFit(true)
      },
      collapseDeep: () => {
        const s = new Set<string>()
        nodeMap.forEach(n => {
          if (n.depth >= 2 && n.children.length) s.add(n.id)
        })
        setCollapsed(s)
        setPendingFit(true)
      },
      fitView: () => doFit(),
      focusMember: (id: string) => {
        setCollapsed(prev => {
          const next = new Set(prev)
          ancestors(id).forEach(a => next.delete(a))
          return next
        })
        setPendingFocus(id)
      },
    }),
    [nodeMap, ancestors, doFit],
  )

  // Panning
  const drag = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null)
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.node')) return
    drag.current = { x: e.clientX, y: e.clientY, tx: t.tx, ty: t.ty }
    e.currentTarget.setPointerCapture(e.pointerId)
    e.currentTarget.classList.add('grabbing')
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    setT(prev => ({ ...prev, tx: d.tx + (e.clientX - d.x), ty: d.ty + (e.clientY - d.y) }))
  }
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    drag.current = null
    e.currentTarget.classList.remove('grabbing')
  }

  const selChain = useMemo(() => {
    if (!selectedId) return new Set<string>()
    return new Set<string>([selectedId, ...ancestors(selectedId)])
  }, [selectedId, ancestors])

  const nodes = [...layout.pos.entries()]
    .map(([id, p]) => ({ node: nodeMap.get(id)!, p }))
    .filter(x => x.node)

  const linkPaths: Array<{ d: string; hl: boolean }> = []
  nodes.forEach(({ node, p }) => {
    if (collapsed.has(node.id)) return
    const a = px(p)
    node.children.forEach(child => {
      const cp = layout.pos.get(child.id)
      if (!cp) return
      const b = px(cp)
      const x1 = a.left
      const y1 = a.top + 124
      const x2 = b.left
      const y2 = b.top
      const my = (y1 + y2) / 2
      linkPaths.push({
        d: `M${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`,
        hl: selChain.has(node.id) && selChain.has(child.id),
      })
    })
  })

  if (!root) {
    return (
      <div className="canvas" ref={canvasRef}>
        <div className="canvas-empty">No family data found yet.</div>
      </div>
    )
  }

  return (
    <div
      className="canvas"
      ref={canvasRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div
        className="viewport"
        style={{ transform: `translate(${t.tx}px, ${t.ty}px) scale(${t.scale})` }}
      >
        <svg className="links" width={totalW} height={totalH}>
          {linkPaths.map((l, i) => (
            <path key={i} d={l.d} className={l.hl ? 'hl' : undefined} />
          ))}
        </svg>

        {nodes.map(({ node, p }) => {
          const a = px(p)
          const isRoot = node.depth === 0
          const meta = isRoot
            ? 'Founder' + (node.member.birthYear ? ` · b. ${node.member.birthYear}` : '')
            : node.member.birthYear
              ? `b. ${node.member.birthYear}`
              : ''
          const isCollapsed = collapsed.has(node.id)
          const cls =
            'node' + (isRoot ? ' root' : '') + (node.id === selectedId ? ' sel' : '')
          return (
            <div key={node.id} className={cls} style={{ left: a.left, top: a.top }}>
              <div className="card" onClick={() => onSelect(node.id)}>
                <div className="genbar" style={{ background: genColor(node.depth) }} />
                <div className="ava" style={{ background: avatarGradient(node.name) }}>
                  {node.member.photoURL ? (
                    <img src={node.member.photoURL} alt="" />
                  ) : (
                    initials(node.name)
                  )}
                </div>
                <div className="nm">{node.name}</div>
                <div className="yr">{meta}</div>
                {node.children.length > 0 && (
                  <button
                    className="toggle"
                    onClick={e => {
                      e.stopPropagation()
                      toggle(node.id)
                    }}
                  >
                    {isCollapsed ? `+ ${descCount.get(node.id) ?? 0}` : '−'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="hint">
        Tip: tap <b>+ n</b> on a card to reveal that branch
      </div>
      <div className="legend">
        <div className="li"><span className="dot" style={{ background: 'var(--brass)' }} />Founder</div>
        <div className="li"><span className="dot" style={{ background: 'var(--pine-600)' }} />Selected line</div>
        <div className="li">+ n = hidden descendants</div>
      </div>
      <div className="zoom">
        <button onClick={() => setT(p => ({ ...p, scale: clamp(p.scale * 1.2, 0.2, 1.7) }))}>+</button>
        <div className="zpct">{Math.round(t.scale * 100)}%</div>
        <button onClick={() => setT(p => ({ ...p, scale: clamp(p.scale / 1.2, 0.2, 1.7) }))}>−</button>
      </div>
    </div>
  )
})

export default TreeView
