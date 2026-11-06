'use client'

import { Button, Card, Popover, Tooltip } from '@heroui/react'
import { buttonVariants } from '@heroui/styles'
import { useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'

import { MemberAvatar } from '@/entities/member'
import {
  dayTone,
  inCycle,
  LabelChip,
  MilestoneChip,
  stateLabel,
  type DueTone,
} from '@/entities/ticket'
import { applyFilters, FilterChips, useFilters } from '@/features/filter'
import type { Issue, Snapshot } from '@/shared/api/linear'
import { PageToolbar } from '@/shared/ui'
import { formatMonthDay, kstDate, weekdayOf, type DateString } from '@/shared/lib/date'

import { FINAL_PRESENTATION, issuesByDate, monthLabel, monthWeeks, type Month } from '../lib/month'
import { dayNumberColor, WEEKEND_TEXT } from '../lib/colors'
import { MonthNav } from './MonthNav'

/** 날짜 칸에 바로 보여 줄 티켓 줄 수. 넘치면 「n건 더」로 모은다. */
const MAX_ROWS = 3
export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const TONE_TEXT: Record<DueTone, string> = {
  danger: 'text-danger',
  warning: 'text-warning',
  default: 'text-foreground',
}

export const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']
export const cellLabel = (date: DateString) =>
  `${Number(date.slice(5, 7))}월 ${Number(date.slice(8))}일 ${DAY_NAMES[weekdayOf(date)]}요일`
/** '2026-11-12' → '2026년 11월 12일 (목)' */
const fullDate = (date: DateString) =>
  `${date.slice(0, 4)}년 ${Number(date.slice(5, 7))}월 ${Number(date.slice(8))}일 (${DAY_NAMES[weekdayOf(date)]})`

// 마우스를 올릴 수 있는 기기인지. 휴대폰은 올릴 수 없어서 누르면 상세를 보여 준다.
const HOVER_QUERY = '(hover: hover)'
const subscribeHover = (onChange: () => void) => {
  const query = window.matchMedia?.(HOVER_QUERY)
  query?.addEventListener('change', onChange)
  return () => query?.removeEventListener('change', onChange)
}
const useCanHover = () =>
  useSyncExternalStore(
    subscribeHover,
    () => window.matchMedia?.(HOVER_QUERY).matches ?? true,
    () => true,
  )

export function MonthCalendar({
  snapshot,
  now,
  actions,
}: {
  snapshot: Snapshot
  now: number
  /** 도구 줄 오른쪽 버튼(새로고침, 필터). 화면을 그리는 쪽이 넘긴다. */
  actions?: ReactNode
}) {
  const { filters } = useFilters()
  const today = kstDate(now)
  const [month, setMonth] = useState<Month>(today.slice(0, 7))

  const issues = useMemo(() => applyFilters(snapshot.issues, filters), [snapshot.issues, filters])
  const byDate = useMemo(() => issuesByDate(issues), [issues])
  const days = monthWeeks(month).flat()
  // 앞뒤 달 칸에 보이는 티켓도 센다. 칸에 티켓이 보이는데 빈 달이라고 하지 않게 한다.
  const isEmpty = !days.some((date) => byDate.has(date))
  // 도구 줄 개수는 앞뒤 달 칸을 빼고 이 달 날짜만 센다.
  const monthCount = days
    .filter((date) => date.startsWith(month))
    .reduce((n, date) => n + (byDate.get(date)?.length ?? 0), 0)

  return (
    <div className="flex flex-col gap-4">
      <PageToolbar title="달력" summary={`이 달 기한 ${monthCount}건`} actions={actions}>
        <FilterChips issues={snapshot.issues} />
      </PageToolbar>
      <Card>
        <MonthNav month={month} today={today} onChange={setMonth} />
        <Card.Content className="flex flex-col gap-3">
          {isEmpty && <p className="text-sm text-muted">이 달에 기한인 남은 티켓이 없어요</p>}
          <div>
            <div aria-hidden className="grid grid-cols-7 text-center text-xs text-muted">
              {WEEKDAYS.map((w, i) => (
                <span key={w} className={`pb-1 ${i % 6 === 0 ? WEEKEND_TEXT : ''}`}>
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
            <li>기한 지난 날의 이슈 번호는 빨강, 오늘은 주황이에요</li>
          </ul>
        </Card.Content>
      </Card>
    </div>
  )
}

function DayCell({
  date,
  today,
  outside,
  cycle,
  issues,
}: {
  date: DateString
  today: DateString
  outside: boolean
  cycle: boolean
  issues: Issue[]
}) {
  const isToday = date === today
  const tone = dayTone(date, today)
  const isFinal = date === FINAL_PRESENTATION
  return (
    <li
      aria-label={cellLabel(date)}
      aria-current={isToday ? 'date' : undefined}
      className={`flex min-h-16 min-w-0 flex-col gap-1 border-r border-b border-separator p-1 md:min-h-[max(8rem,calc((100dvh-18rem)/6))] ${
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
              : `px-1 leading-6 ${dayNumberColor(date, outside)}`
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
          label={`${issues.length}건`}
          className={`md:hidden ${TONE_TEXT[tone]}`}
        />
      )}
      <ul className="hidden min-w-0 flex-col gap-0.5 md:flex">
        {issues.slice(0, MAX_ROWS).map((issue) => (
          <li key={issue.id} className="min-w-0">
            <IssueRow issue={issue} tone={tone} />
          </li>
        ))}
      </ul>
      {issues.length > MAX_ROWS && (
        <DayPopover
          date={date}
          issues={issues}
          today={today}
          label={`${issues.length - MAX_ROWS}건 더`}
          className="hidden text-muted md:inline-flex"
        />
      )}
    </li>
  )
}

const ROW_CLASS =
  'flex w-full min-w-0 cursor-pointer items-center gap-1.5 rounded px-1 text-xs leading-5 text-foreground no-underline outline-none hover:bg-default focus-visible:ring-2 focus-visible:ring-accent'

/** 티켓 한 줄: 담당자 프로필 + 이름 + 이슈 번호. 번호에만 기한 색을 쓴다. */
function IssueRow({ issue, tone }: { issue: Issue; tone: DueTone }) {
  const canHover = useCanHover()
  const who = issue.assignee?.name ?? '담당 없음'
  const label = `${issue.identifier} ${issue.title}, ${who}`
  const body = (
    <>
      <MemberAvatar
        small
        name={issue.assignee?.name ?? null}
        avatarUrl={issue.assignee?.avatarUrl}
      />
      <span className="min-w-0 truncate">{who}</span>
      <span className={`shrink-0 font-medium ${TONE_TEXT[tone]}`}>{issue.identifier}</span>
    </>
  )

  if (!canHover) {
    return (
      <Popover>
        <Button
          size="sm"
          variant="ghost"
          aria-label={label}
          className={`h-auto justify-start font-normal ${ROW_CLASS}`}
        >
          {body}
        </Button>
        <Popover.Content placement="bottom" className="w-72 max-w-[calc(100vw-2rem)]">
          <Popover.Dialog aria-label={label}>
            <IssueDetail issue={issue} tone={tone} />
            <a
              href={issue.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-3 w-full ${buttonVariants({ size: 'sm', variant: 'primary' })}`}
            >
              Linear에서 열기
            </a>
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
    )
  }

  return (
    <Tooltip delay={300} closeDelay={0}>
      <Tooltip.Trigger
        // 타임라인과 같은 방식: 트리거를 링크로 그리고 button 역할을 빼서 링크로 읽히게 한다.
        render={({ ref, ...props }) => (
          <a
            {...(props as React.ComponentProps<'a'>)}
            ref={ref as React.Ref<HTMLAnchorElement>}
            role={undefined}
            href={issue.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className={ROW_CLASS}
          />
        )}
      >
        {body}
      </Tooltip.Trigger>
      <Tooltip.Content placement="right" className="w-72 max-w-[calc(100vw-2rem)] p-3">
        <IssueDetail issue={issue} tone={tone} />
      </Tooltip.Content>
    </Tooltip>
  )
}

/** 짧은 상세: 번호와 제목 전체, 상태, 기한(년도 포함), 라벨, 마일스톤 */
function IssueDetail({ issue, tone }: { issue: Issue; tone: DueTone }) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <p>
        <span className={`font-medium ${TONE_TEXT[tone]}`}>{issue.identifier}</span>{' '}
        <span>{issue.title}</span>
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted">상태</dt>
        <dd>{stateLabel(issue.state)}</dd>
        <dt className="text-muted">기한</dt>
        <dd className={TONE_TEXT[tone]}>{issue.dueDate && fullDate(issue.dueDate)}</dd>
      </dl>
      <div className="flex flex-wrap gap-1">
        {issue.labels.map((l) => (
          <LabelChip key={l.id} label={l} />
        ))}
        <MilestoneChip name={issue.milestone?.name ?? null} />
      </div>
    </div>
  )
}

/** 그날 기한 티켓 전체를 작은 창으로 보여 준다. */
function DayPopover({
  date,
  issues,
  today,
  label,
  className,
}: {
  date: DateString
  issues: Issue[]
  today: DateString
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
                <IssueRow issue={issue} tone={dayTone(date, today)} />
              </li>
            ))}
          </ul>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  )
}
