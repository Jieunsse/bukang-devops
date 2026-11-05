'use client'

import { Card, Tooltip } from '@heroui/react'

import { MemberAvatar } from '@/entities/member'
import { NONE } from '@/features/filter'

import { SEGMENT_LABEL, segmentText, type AssigneeLoad, type Segment } from '../lib/summary'

const SEGMENTS: { key: Segment; className: string; meaning: string }[] = [
  {
    key: 'overdue',
    className: 'bg-danger text-danger-foreground',
    meaning: '기한이 어제까지였던 티켓',
  },
  {
    key: 'thisWeek',
    className: 'bg-accent text-accent-foreground',
    meaning: '오늘부터 이번 주 끝까지 기한',
  },
  { key: 'later', className: 'bg-accent/40 text-foreground', meaning: '다음 주 이후가 기한' },
  { key: 'noDue', className: 'bg-default text-foreground', meaning: '기한을 정하지 않은 티켓' },
]
/** 가장 긴 막대는 줄 폭의 70%까지만 써서, 오른쪽에 구간 글자 자리를 남긴다. */
const BAR_MAX = 70
/** 가장 많은 사람 대비 이 비율보다 좁은 구간은 숫자가 안 들어가서 오른쪽 글자로 적는다. */
const LABEL_MIN_SHARE = 0.12

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
      <Card.Header className="flex flex-col gap-2">
        <Card.Title>사람별 남은 티켓(끝나지 않은 티켓)</Card.Title>
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
          {SEGMENTS.map((s) => (
            <li key={s.key} className="flex items-center gap-1">
              <span aria-hidden className={`size-2 rounded-full ${s.className}`} />
              {SEGMENT_LABEL[s.key]}
            </li>
          ))}
        </ul>
      </Card.Header>
      <Card.Content className="flex flex-col gap-1">
        {rows.length === 0 && <p className="text-sm text-muted">보여 줄 티켓이 없어요</p>}
        {rows.map((row) => {
          const narrow = SEGMENTS.filter(
            (s) => row[s.key] > 0 && row[s.key] / max < LABEL_MIN_SHARE,
          )
          const narrowText = segmentText({
            ...row,
            ...Object.fromEntries(
              SEGMENTS.filter((s) => !narrow.includes(s)).map((s) => [s.key, 0]),
            ),
          })
          return (
            <Tooltip key={row.id} delay={300} closeDelay={0}>
              <Tooltip.Trigger
                render={({ ref, ...props }) => (
                  <button
                    {...(props as React.ComponentProps<'button'>)}
                    ref={ref as React.Ref<HTMLButtonElement>}
                    type="button"
                    onClick={() => onSelect(row.id)}
                    aria-label={`${row.name} ${row.total}건: ${segmentText(row)}`}
                    className="grid w-full grid-cols-[7rem_1fr_auto] items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm outline-none hover:bg-default focus-visible:ring-2 focus-visible:ring-accent"
                  />
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  {row.id === NONE ? (
                    <span aria-hidden className="size-6 shrink-0" />
                  ) : (
                    <MemberAvatar name={row.name} avatarUrl={row.avatarUrl} />
                  )}
                  <span className="truncate">{row.name}</span>
                </span>
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden
                    className="flex h-5 shrink-0 overflow-hidden rounded-full text-[11px] leading-5 font-medium tabular-nums"
                    style={{ width: `${(row.total / max) * BAR_MAX}%` }}
                  >
                    {SEGMENTS.map((s) =>
                      row[s.key] > 0 ? (
                        <span
                          key={s.key}
                          className={`text-center ${s.className}`}
                          style={{ flexGrow: row[s.key] }}
                        >
                          {narrow.includes(s) ? '' : row[s.key]}
                        </span>
                      ) : null,
                    )}
                  </span>
                  {narrowText && (
                    <span aria-hidden className="truncate text-xs text-muted">
                      {narrowText}
                    </span>
                  )}
                </span>
                <span className="text-right text-muted tabular-nums">{row.total}건</span>
              </Tooltip.Trigger>
              <Tooltip.Content className="flex flex-col gap-0.5 text-xs">
                <p className="font-medium">
                  {row.name} · 끝나지 않은 티켓 {row.total}건
                </p>
                {SEGMENTS.map((s) => (
                  <p key={s.key}>
                    {SEGMENT_LABEL[s.key]} {row[s.key]}건 · {s.meaning}
                  </p>
                ))}
              </Tooltip.Content>
            </Tooltip>
          )
        })}
      </Card.Content>
    </Card>
  )
}
