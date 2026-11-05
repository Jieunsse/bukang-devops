'use client'

import { ChevronLeft, ChevronRight } from '@gravity-ui/icons'
import { Button, Card, Popover } from '@heroui/react'
import { useMemo, useState } from 'react'

import { dayTone, inCycle, type DueTone } from '@/entities/ticket'
import { applyFilters, useFilters } from '@/features/filter'
import type { Issue, Snapshot } from '@/shared/api/linear'
import { formatMonthDay, kstDate, weekdayOf, type DateString } from '@/shared/lib/date'

import {
  assigneeColors,
  FINAL_PRESENTATION,
  issuesByDate,
  monthLabel,
  monthWeeks,
  NO_ASSIGNEE_COLOR,
  shiftMonth,
  type Month,
} from '../lib/month'

/** 날짜 칸에 바로 보여 줄 티켓 줄 수. 넘치면 「n건 더」로 모은다. */
const MAX_ROWS = 3
const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일']
const TONE_TEXT: Record<DueTone, string> = {
  danger: 'text-danger',
  warning: 'text-warning',
  default: 'text-foreground',
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']
const cellLabel = (date: DateString) =>
  `${Number(date.slice(5, 7))}월 ${Number(date.slice(8))}일 ${DAY_NAMES[weekdayOf(date)]}요일`

export function MonthCalendar({ snapshot, now }: { snapshot: Snapshot; now: number }) {
  const { filters } = useFilters()
  const today = kstDate(now)
  const [month, setMonth] = useState<Month>(today.slice(0, 7))

  const issues = useMemo(() => applyFilters(snapshot.issues, filters), [snapshot.issues, filters])
  const byDate = useMemo(() => issuesByDate(issues), [issues])
  // 필터 전 전체 목록으로 색을 정해서 필터를 바꿔도 사람마다 색이 그대로다.
  const colors = useMemo(() => assigneeColors(snapshot.issues), [snapshot.issues])
  const days = monthWeeks(month).flat()
  // 앞뒤 달 칸에 보이는 티켓도 센다. 칸에 티켓이 보이는데 빈 달이라고 하지 않게 한다.
  const isEmpty = !days.some((date) => byDate.has(date))

  return (
    <Card>
      <Card.Header className="flex-row flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{monthLabel(month)}</h2>
        <div className="flex items-center gap-1">
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label="이전 달"
            className="cursor-pointer"
            onPress={() => setMonth((m) => shiftMonth(m, -1))}
          >
            <ChevronLeft aria-hidden className="size-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="cursor-pointer"
            onPress={() => setMonth(today.slice(0, 7))}
          >
            오늘
          </Button>
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label="다음 달"
            className="cursor-pointer"
            onPress={() => setMonth((m) => shiftMonth(m, 1))}
          >
            <ChevronRight aria-hidden className="size-4" />
          </Button>
        </div>
      </Card.Header>
      <Card.Content className="flex flex-col gap-3">
        {isEmpty && <p className="text-sm text-muted">이 달에 기한인 남은 티켓이 없어요</p>}
        <div>
          <div aria-hidden className="grid grid-cols-7 text-center text-xs text-muted">
            {WEEKDAYS.map((w) => (
              <span key={w} className="pb-1">
                {w}
              </span>
            ))}
          </div>
          <ol
            aria-label={`${monthLabel(month)} 달력`}
            className="grid grid-cols-7 border-t border-l border-separator"
          >
            {days.map((date) => (
              <DayCell
                key={date}
                date={date}
                today={today}
                outside={!date.startsWith(month)}
                cycle={inCycle(date, snapshot.cycles)}
                issues={byDate.get(date) ?? []}
                colors={colors}
              />
            ))}
          </ol>
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <li className="flex items-center gap-1">
            <span aria-hidden className="size-3 rounded bg-accent-soft" />
            사이클 기간
          </li>
          <li className="flex items-center gap-1">
            <span aria-hidden className="size-3 rounded ring-2 ring-accent ring-inset" />
            최종 발표 {formatMonthDay(FINAL_PRESENTATION)}
          </li>
          <li>앞의 색 막대는 담당자를 구분해요</li>
          <li>기한 지난 날은 빨강, 오늘은 주황이에요</li>
        </ul>
      </Card.Content>
    </Card>
  )
}

function DayCell({
  date,
  today,
  outside,
  cycle,
  issues,
  colors,
}: {
  date: DateString
  today: DateString
  outside: boolean
  cycle: boolean
  issues: Issue[]
  colors: Map<string, string>
}) {
  const isToday = date === today
  const tone = dayTone(date, today)
  const isFinal = date === FINAL_PRESENTATION
  return (
    <li
      aria-label={cellLabel(date)}
      aria-current={isToday ? 'date' : undefined}
      className={`flex min-h-16 min-w-0 flex-col gap-1 border-r border-b border-separator p-1 md:min-h-32 ${
        cycle ? 'bg-accent-soft/60' : ''
      } ${isFinal ? 'ring-2 ring-accent ring-inset' : ''}`}
    >
      {/* 휴대폰 폭에서는 칸이 좁아 「최종 발표」를 날짜 아래 줄에 작게 적는다. */}
      <div className="flex flex-col-reverse items-end gap-1 text-xs md:flex-row md:items-center">
        {isFinal && (
          <span className="text-[10px] font-semibold whitespace-nowrap text-accent md:mr-auto md:truncate md:text-xs">
            최종 발표
          </span>
        )}
        <span
          className={
            isToday
              ? 'grid size-6 place-items-center rounded-full bg-warning font-semibold text-warning-foreground'
              : `px-1 leading-6 ${outside ? 'text-muted' : ''}`
          }
        >
          {date.endsWith('-01') ? formatMonthDay(date) : Number(date.slice(8))}
        </span>
      </div>
      {issues.length > 0 && (
        <DayPopover
          date={date}
          issues={issues}
          today={today}
          colors={colors}
          label={`${issues.length}건`}
          className={`md:hidden ${TONE_TEXT[tone]}`}
        />
      )}
      <ul className="hidden min-w-0 flex-col gap-0.5 md:flex">
        {issues.slice(0, MAX_ROWS).map((issue) => (
          <li key={issue.id} className="min-w-0">
            <IssueChip issue={issue} tone={tone} colors={colors} />
          </li>
        ))}
      </ul>
      {issues.length > MAX_ROWS && (
        <DayPopover
          date={date}
          issues={issues}
          today={today}
          colors={colors}
          label={`${issues.length - MAX_ROWS}건 더`}
          className="hidden text-muted md:inline-flex"
        />
      )}
    </li>
  )
}

function IssueChip({
  issue,
  tone,
  colors,
}: {
  issue: Issue
  tone: DueTone
  colors: Map<string, string>
}) {
  const who = issue.assignee?.name ?? '담당 없음'
  const color = (issue.assignee && colors.get(issue.assignee.id)) ?? NO_ASSIGNEE_COLOR
  const label = `${issue.identifier} ${issue.title}, ${who}`
  return (
    <a
      href={issue.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className={`flex cursor-pointer items-center gap-1.5 rounded px-1 text-xs leading-5 outline-none hover:bg-default focus-visible:ring-2 focus-visible:ring-accent ${TONE_TEXT[tone]}`}
    >
      <span data-assignee-bar aria-hidden className={`h-3.5 w-1 shrink-0 rounded-full ${color}`} />
      <span className="truncate">
        <span className="font-medium">{issue.identifier}</span> {issue.title}
      </span>
    </a>
  )
}

/** 그날 기한 티켓 전체를 작은 창으로 보여 준다. */
function DayPopover({
  date,
  issues,
  today,
  colors,
  label,
  className,
}: {
  date: DateString
  issues: Issue[]
  today: DateString
  colors: Map<string, string>
  label: string
  className: string
}) {
  return (
    <Popover>
      <Button
        size="sm"
        variant="ghost"
        className={`h-6 min-w-0 cursor-pointer justify-start px-1 text-xs ${className}`}
      >
        {label}
      </Button>
      <Popover.Content placement="bottom" className="w-72 max-w-[calc(100vw-2rem)]">
        <Popover.Dialog>
          <Popover.Heading>
            {formatMonthDay(date)} 기한 {issues.length}건
          </Popover.Heading>
          <ul className="mt-2 flex max-h-80 flex-col gap-0.5 overflow-y-auto">
            {issues.map((issue) => (
              <li key={issue.id} className="min-w-0">
                <IssueChip issue={issue} tone={dayTone(date, today)} colors={colors} />
              </li>
            ))}
          </ul>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  )
}
