'use client'

import { Card, EmptyState, ToggleButton, ToggleButtonGroup } from '@heroui/react'
import { useMemo, useState } from 'react'

import { MemberAvatar } from '@/entities/member'
import { applyFilters, NONE, useFilters } from '@/features/filter'
import type { Snapshot } from '@/shared/api/linear'
import {
  addDays,
  daysBetween,
  formatMonthDay,
  kstDate,
  weekdayOf,
  type DateString,
} from '@/shared/lib/date'

import {
  FINAL_PRESENTATION,
  groupRows,
  markOf,
  timelineRange,
  type DatedIssue,
  type GroupBy,
} from '../lib/timeline'

/** 하루 칸의 폭(px). 휴대폰에서는 차트 영역만 가로로 스크롤한다. */
const DAY_PX = 28
const LABEL_W = 'w-36 md:w-56'

export function Timeline({ snapshot, now }: { snapshot: Snapshot; now: number }) {
  const { filters } = useFilters()
  const [groupBy, setGroupBy] = useState<GroupBy>('assignee')
  const today = kstDate(now)

  const issues = useMemo(() => applyFilters(snapshot.issues, filters), [snapshot.issues, filters])
  const dated = issues.filter((i): i is DatedIssue => i.dueDate !== null)
  const noDue = issues.length - dated.length
  const range = timelineRange(dated, today)
  const days = daysBetween(range.start, range.end) + 1
  const x = (date: DateString) => daysBetween(range.start, date) * DAY_PX

  return (
    <Card>
      <Card.Header className="flex-row flex-wrap items-center justify-between gap-3">
        <Card.Title>타임라인</Card.Title>
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted">기한 없음 {noDue}건</p>
          <ToggleButtonGroup
            aria-label="줄 묶음"
            size="sm"
            selectionMode="single"
            disallowEmptySelection
            selectedKeys={[groupBy]}
            onSelectionChange={(keys) => setGroupBy([...keys][0] as GroupBy)}
          >
            <ToggleButton id="assignee">담당자별</ToggleButton>
            <ToggleButton id="milestone">마일스톤별</ToggleButton>
          </ToggleButtonGroup>
        </div>
      </Card.Header>
      <Card.Content>
        {dated.length === 0 ? (
          <EmptyState className="py-12">
            <p className="font-medium">기한이 있는 티켓이 없어요</p>
            <p className="text-sm text-muted">필터를 바꾸거나 Linear에서 기한을 정해 주세요.</p>
          </EmptyState>
        ) : (
          <section aria-label="타임라인 차트" className="overflow-x-auto">
            <div role="table" aria-label="티켓 일정" className="relative w-max text-sm">
              <div role="row" className="flex h-12 items-end border-b border-separator">
                <span
                  role="columnheader"
                  className={`sticky left-0 z-20 flex shrink-0 items-end self-stretch bg-surface pb-1 ${LABEL_W}`}
                >
                  티켓
                </span>
                <span role="columnheader" className="relative" style={{ width: days * DAY_PX }}>
                  {/* 월요일마다 날짜를 적는다. */}
                  {Array.from({ length: days }, (_, d) => addDays(range.start, d))
                    .filter((date) => weekdayOf(date) === 1)
                    .map((date) => (
                      <span
                        key={date}
                        className="absolute bottom-1 text-xs text-muted"
                        style={{ left: x(date) }}
                      >
                        {formatMonthDay(date)}
                      </span>
                    ))}
                </span>
              </div>

              {groupRows(dated, groupBy).map((row) => (
                <div key={row.id} role="rowgroup" aria-label={row.name}>
                  <div role="row" className="flex h-9 items-center border-b border-separator">
                    <span
                      role="rowheader"
                      className={`sticky left-0 z-20 flex shrink-0 items-center gap-2 self-stretch bg-surface font-medium ${LABEL_W}`}
                    >
                      {groupBy === 'assignee' && row.id !== NONE && (
                        <MemberAvatar name={row.name} avatarUrl={row.avatarUrl} />
                      )}
                      <span className="truncate">{row.name}</span>
                    </span>
                  </div>
                  {row.issues.map((issue) => (
                    <IssueRow
                      key={issue.id}
                      issue={issue}
                      today={today}
                      rangeStart={range.start}
                      x={x}
                    />
                  ))}
                </div>
              ))}

              <DayLine left={x(today)} label="오늘" />
              <DayLine left={x(FINAL_PRESENTATION)} label="최종 발표" />
            </div>
          </section>
        )}
      </Card.Content>
    </Card>
  )
}

function IssueRow({
  issue,
  today,
  rangeStart,
  x,
}: {
  issue: DatedIssue
  today: DateString
  rangeStart: DateString
  x: (date: DateString) => number
}) {
  const mark = markOf(issue, rangeStart)
  if (!mark) return null
  const overdue = issue.dueDate < today
  const when =
    mark.started === null
      ? `시작 전, 기한 ${formatMonthDay(issue.dueDate)}`
      : `${formatMonthDay(mark.started)}부터 ${formatMonthDay(issue.dueDate)}까지`
  const label = `${issue.identifier} ${issue.title}: ${when}${overdue ? ', 기한 지남' : ''}`
  const color = overdue ? 'bg-danger' : 'bg-accent'

  return (
    <div role="row" className="flex h-8 items-center">
      <span
        role="rowheader"
        className={`sticky left-0 z-20 shrink-0 self-stretch truncate bg-surface pr-2 pl-8 leading-8 ${LABEL_W}`}
      >
        <span className="text-muted">{issue.identifier}</span> {issue.title}
      </span>
      <span role="cell" className="relative h-full flex-1">
        <a
          href={issue.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          title={label}
          className={`absolute top-1/2 -translate-y-1/2 outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${color} ${
            mark.kind === 'bar' ? 'h-4 rounded-full' : 'size-3 rounded-full'
          }`}
          style={
            mark.kind === 'bar'
              ? {
                  left: x(mark.from) + 2,
                  width: (daysBetween(mark.from, mark.to) + 1) * DAY_PX - 4,
                }
              : { left: x(mark.to) + (DAY_PX - 12) / 2 }
          }
        />
      </span>
    </div>
  )
}

/** 날짜 칸 가운데에 세로선을 긋는다. 왼쪽 이름 칸 폭만큼 밀어서 그린다. */
function DayLine({ left, label }: { left: number; label: string }) {
  return (
    <div className="pointer-events-none absolute inset-y-0 left-36 md:left-56">
      <div
        className="absolute inset-y-0 border-l border-dashed border-foreground/40"
        style={{ left: left + DAY_PX / 2 }}
      >
        <span className="absolute top-0 left-1 text-xs whitespace-nowrap text-muted">{label}</span>
      </div>
    </div>
  )
}
