import type { CustomNodeElementProps } from 'react-d3-tree'
import type { FamilyMember } from '../types'

interface MemberNodeProps extends CustomNodeElementProps {
  membersMap: Map<string, FamilyMember>
  onSelect: (id: string) => void
}

const COLORS = [
  '#d97706', '#e11d48', '#0284c7', '#059669',
  '#7c3aed', '#ea580c', '#0f766e', '#db2777',
]

function colorForName(name: string): string {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffff
  return COLORS[Math.abs(hash) % COLORS.length]
}

export default function MemberNode({ nodeDatum, onSelect, toggleNode, membersMap }: MemberNodeProps) {
  const id = (nodeDatum as { __memberId?: string }).__memberId ?? ''
  const member = membersMap.get(id)
  const initials = nodeDatum.name
    .split(' ')
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const size = 54
  const hasChildren = !!nodeDatum.children && nodeDatum.children.length > 0
  const collapsed = !!nodeDatum.__rd3t?.collapsed

  return (
    <g style={{ cursor: 'pointer' }} onClick={() => onSelect(id)}>
      <rect
        x={-92}
        y={-72}
        width={184}
        height={162}
        rx={24}
        fill="#fffdf9"
        stroke="#e5d6be"
        strokeWidth={1.5}
        filter="drop-shadow(0 4px 10px rgba(92, 63, 33, 0.12))"
      />

      {member?.photoURL ? (
        <>
          <clipPath id={`clip-${id}`}>
            <circle r={size} cx="0" cy="-12" />
          </clipPath>
          <image
            href={member.photoURL}
            x={-size}
            y={-size - 16}
            width={size * 2}
            height={size * 2}
            clipPath={`url(#clip-${id})`}
            preserveAspectRatio="xMidYMid slice"
          />
          <circle r={size} cy={-12} fill="none" stroke="#d6a86b" strokeWidth={3} />
        </>
      ) : (
        <>
          <circle r={size} cy={-12} fill={colorForName(nodeDatum.name)} stroke="#fff" strokeWidth={3} />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            y={-12}
            fill="white"
            fontSize={20}
            fontWeight={700}
          >
            {initials}
          </text>
        </>
      )}

      <text
        textAnchor="middle"
        y={62}
        fontSize={14}
        fill="#3b2d1f"
        fontWeight={700}
        fontFamily="inherit"
      >
        {nodeDatum.name.length > 16 ? `${nodeDatum.name.slice(0, 15)}…` : nodeDatum.name}
      </text>

      {hasChildren && (
        <g
          onClick={(event) => {
            event.stopPropagation()
            toggleNode()
          }}
        >
          <circle cx={72} cy={-54} r={14} fill="#f59e0b" stroke="#fff" strokeWidth={2} />
          <text
            x={72}
            y={-49}
            textAnchor="middle"
            fontSize={14}
            fontWeight={700}
            fill="white"
          >
            {collapsed ? '+' : '−'}
          </text>
        </g>
      )}
    </g>
  )
}
