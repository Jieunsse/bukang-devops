'use client'

import { Card } from '@heroui/react'

import type { AssigneeLoad } from '../lib/summary'

const SEGMENTS = [
  { key: 'overdue', label: '기한 지남', className: 'bg-danger' },
  { key: 'thisWeek', label: '이번 주', className: 'bg-accent' },
  { key: 'later', label: '그 뒤·기한 없음', className: 'bg-accent-soft' },
] as const

export function AssigneeCard({
  rows,
  onSelect,
}: {
  rows: AssigneeLoad[]
  onSelect: (assigneeId: string) => void
}) {
  const max = Math.max(1, ...rows.map((r) => r.total))
  return (
    <Card>
      <Card.Header className="flex-row items-center justify-between gap-2">
        <Card.Title>사람별 남은 티켓</Card.Title>
        <ul className="flex gap-3 text-xs text-muted">
          {SEGMENTS.map((s) => (
            <li key={s.key} className="flex items-center gap-1">
              <span aria-hidden className={`size-2 rounded-full ${s.className}`} />
              {s.label}
            </li>
          ))}
        </ul>
      </Card.Header>
      <Card.Content className="flex flex-col gap-1">
        {rows.length === 0 && <p className="text-sm text-muted">보여 줄 티켓이 없어요</p>}
        {rows.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => onSelect(row.id)}
            aria-label={`${row.name} ${row.total}건: 기한 지남 ${row.overdue}, 이번 주 ${row.thisWeek}, 그 뒤·기한 없음 ${row.later}`}
            className="grid grid-cols-[5rem_1fr_2rem] items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm outline-none hover:bg-default focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span className="truncate">{row.name}</span>
            <span
              className="flex h-3 overflow-hidden rounded-full"
              style={{ width: `${(row.total / max) * 100}%` }}
            >
              {SEGMENTS.map((s) =>
                row[s.key] > 0 ? (
                  <span key={s.key} className={s.className} style={{ flexGrow: row[s.key] }} />
                ) : null,
              )}
            </span>
            <span className="text-right text-muted tabular-nums">{row.total}</span>
          </button>
        ))}
      </Card.Content>
    </Card>
  )
}
