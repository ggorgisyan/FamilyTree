import { useEffect, useRef, useState } from 'react'
import Tree from 'react-d3-tree'
import type { CustomNodeElementProps } from 'react-d3-tree'
import type { FamilyMember, TreeNodeDatum } from '../types'
import MemberNode from './MemberNode'

interface TreeViewProps {
  treeData: TreeNodeDatum
  membersMap: Map<string, FamilyMember>
  onSelectMember: (id: string) => void
}

export default function TreeView({ treeData, membersMap, onSelectMember }: TreeViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [translate, setTranslate] = useState({ x: 400, y: 80 })

  useEffect(() => {
    const updateTranslate = () => {
      const width = containerRef.current?.clientWidth ?? window.innerWidth
      setTranslate({ x: width / 2, y: 90 })
    }

    updateTranslate()
    window.addEventListener('resize', updateTranslate)
    return () => window.removeEventListener('resize', updateTranslate)
  }, [])

  const renderNode = (props: CustomNodeElementProps) => (
    <MemberNode {...props} membersMap={membersMap} onSelect={onSelectMember} />
  )

  return (
    <div ref={containerRef} className="w-full h-full px-3 pb-3 pt-2 bg-transparent">
      <div className="w-full h-full rounded-[24px] border border-amber-100 bg-white/60 shadow-[0_10px_40px_rgba(120,88,44,0.08)] overflow-hidden soft-panel">
        <Tree
          data={treeData}
          renderCustomNodeElement={renderNode}
          orientation="vertical"
          pathFunc="step"
          separation={{ siblings: 1.35, nonSiblings: 1.45 }}
          translate={translate}
          nodeSize={{ x: 230, y: 200 }}
          zoom={0.62}
          initialDepth={2}
          zoomable
          draggable
          collapsible
          pathClassFunc={() => 'rd3t-link'}
        />
      </div>
    </div>
  )
}
