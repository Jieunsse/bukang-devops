'use client'

import '@xyflow/react/dist/style.css'

import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import { useTheme } from 'next-themes'
import { useMemo } from 'react'

import {
  ERD_ROW_HEIGHT,
  ERD_TABLE_WIDTH,
  layoutErd,
  type DbTable,
  type DbTableGroup,
} from '@/entities/db-schema'

type TableNode = Node<{ table: DbTable }, 'table'>
type LabelNode = Node<{ label: string; count: number }, 'label'>

const nodeTypes = { table: TableBox, label: GroupLabel }
const line = { stroke: 'var(--muted)', strokeWidth: 1.25 }

/** ERDCloud처럼 테이블 상자와 외래 키 선을 한 캔버스에 그린다. 끌어서 옮기고 휠로 확대할 수 있다. */
export function DbErdView({ groups }: { groups: DbTableGroup[] }) {
  const { resolvedTheme } = useTheme()
  const { nodes, edges } = useMemo(() => {
    const layout = layoutErd(groups)
    const nodes: (TableNode | LabelNode)[] = [
      ...layout.labels.map((l): LabelNode => ({
        id: `label:${l.label}`,
        type: 'label',
        position: { x: l.x, y: l.y },
        data: {
          label: l.label,
          count: groups.find((g) => g.label === l.label)?.tables.length ?? 0,
        },
        draggable: false,
        selectable: false,
      })),
      ...layout.tables.map((t): TableNode => ({
        id: t.table.name,
        type: 'table',
        position: { x: t.x, y: t.y },
        data: { table: t.table },
      })),
    ]
    const edges: Edge[] = layout.links.map((l) => ({
      id: l.id,
      source: l.from,
      sourceHandle: `${l.fromColumn}:out`,
      target: l.to,
      targetHandle: `${l.toColumn}:in`,
      type: 'smoothstep',
      style: line,
      markerStart: 'erd-many',
      markerEnd: 'erd-one',
    }))
    return { nodes, edges }
  }, [groups])

  return (
    <div className="h-[70dvh] min-h-96 overflow-hidden rounded-2xl border border-border xl:h-[calc(100dvh-13rem)]">
      <ErdMarkers />
      <ReactFlow
        defaultNodes={nodes}
        defaultEdges={edges}
        nodeTypes={nodeTypes}
        colorMode={resolvedTheme === 'dark' ? 'dark' : 'light'}
        nodesConnectable={false}
        minZoom={0.05}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  )
}

/** 자식 쪽 끝은 여러 개(까마귀 발), 부모 쪽 끝은 하나(두 줄)로 그린다. */
function ErdMarkers() {
  const common = {
    viewBox: '0 0 12 12',
    markerWidth: 12,
    markerHeight: 12,
    refX: 12,
    refY: 6,
    markerUnits: 'userSpaceOnUse',
  } as const
  return (
    <svg aria-hidden className="absolute size-0">
      <defs>
        <marker id="erd-many" orient="auto-start-reverse" {...common}>
          <path d="M0 6 L12 0 M0 6 L12 6 M0 6 L12 12 M2 1 L2 11" fill="none" style={line} />
        </marker>
        <marker id="erd-one" orient="auto" {...common}>
          <path d="M5 1 L5 11 M9 1 L9 11" fill="none" style={line} />
        </marker>
      </defs>
    </svg>
  )
}

function GroupLabel({ data }: NodeProps<LabelNode>) {
  return (
    <p className="text-lg font-semibold whitespace-nowrap text-foreground">
      {data.label} <span className="text-muted">{data.count}</span>
    </p>
  )
}

function TableBox({ data: { table } }: NodeProps<TableNode>) {
  const fk = new Set(table.foreignKeys.map((f) => f.column))
  return (
    <div
      style={{ width: ERD_TABLE_WIDTH }}
      className="overflow-hidden rounded-xl border border-border bg-surface font-mono text-xs text-foreground shadow-sm"
    >
      {/* 높이(36px, 줄마다 24px)는 layoutErd 계산과 같아야 상자가 겹치지 않는다. */}
      <div
        title={table.comment || table.name}
        className="flex h-9 items-center bg-default px-3 font-semibold"
      >
        <span className="truncate">{table.name}</span>
      </div>
      {table.columns.map((c) => (
        <div
          key={c.name}
          style={{ height: ERD_ROW_HEIGHT }}
          className="relative flex items-center gap-2 border-t border-border px-3"
        >
          <Handle
            type="target"
            id={`${c.name}:in`}
            position={Position.Left}
            className="!opacity-0"
          />
          <span className="w-5 shrink-0 text-[10px] font-semibold text-muted">
            {c.key === 'PRI' ? (
              <abbr title="기본 키">PK</abbr>
            ) : fk.has(c.name) ? (
              <abbr title="외래 키">FK</abbr>
            ) : null}
          </span>
          <span className="flex-1 truncate" title={c.name}>
            {c.name}
          </span>
          <span className="max-w-24 shrink-0 truncate text-muted" title={c.type}>
            {c.type}
          </span>
          <Handle
            type="source"
            id={`${c.name}:out`}
            position={Position.Right}
            className="!opacity-0"
          />
        </div>
      ))}
    </div>
  )
}
