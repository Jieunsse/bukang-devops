'use client'

import { ChevronDown, ChevronRight } from '@gravity-ui/icons'
import { Card, EmptyState, ToggleButton, ToggleButtonGroup, Tooltip } from '@heroui/react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { MemberAvatar } from '@/entities/member'
import { dueLabel } from '@/entities/ticket'
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
import { CountChip } from '@/shared/ui'

import {
  groupRows,
  markOf,
  toneOf,
  viewRange,
  FINAL_PRESENTATION,
  type DatedIssue,
  type GroupBy,
  type Range,
  type Tone,
  type View,
} from '../lib/timeline'

/** 하루 칸의 최소 폭(px). 카드가 넓으면 칸이 늘어나 카드 폭을 다 쓴다. */
const MIN_DAY_PX = 24
const LABEL_W = 'w-40 md:w-56'
const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']

const TONE: Record<Tone, { label: string; color: string }> = {
  progress: { label: '진행 중', color: 'bg-accent' },
  notStarted: { label: '시작 전', color: 'bg-muted' },
  overdue: { label: '기한 지남', color: 'bg-danger' },
  today: { label: '오늘 마감', color: 'bg-warning' },
}

export function Timeline({ snapshot, now }: { snapshot: Snapshot; now: number }) {
  const { filters } = useFilters()
  const [groupBy, setGroupBy] = useState<GroupBy>('assignee')
  const [view, setView] = useState<View>('4w')
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  const today = kstDate(now)

  const issues = useMemo(() => applyFilters(snapshot.issues, filters), [snapshot.issues, filters])
  const dated = issues.filter((i): i is DatedIssue => i.dueDate !== null)
  const noDue = issues.length - dated.length
  const range = viewRange(view, today)
  const days = daysBetween(range.start, range.end) + 1
  const dates = Array.from({ length: days }, (_, d) => addDays(range.start, d))
  const todayIndex = daysBetween(range.start, today)
  const inRange = (i: number) => (i >= 0 && i < days ? i : null)
  const marks = {
    today: inRange(todayIndex),
    final: inRange(daysBetween(range.start, FINAL_PRESENTATION)),
  }

  // 휴대폰처럼 차트가 카드보다 넓으면 오늘 칸이 보이게 옮긴다. 페이지는 움직이지 않는다.
  const chartRef = useRef<HTMLElement>(null)
  const todayRef = useRef<HTMLSpanElement>(null)
  const hasChart = dated.length > 0
  useEffect(() => {
    const chart = chartRef.current
    const pill = todayRef.current
    if (!chart || !pill) return
    // 고정된 이름 칸을 뺀 날짜 영역에서 왼쪽 3분의 1에 오늘이 오게 한다.
    const labelW = chart.querySelector<HTMLElement>('[data-label-col]')?.offsetWidth ?? 0
    const offset = pill.getBoundingClientRect().left - chart.getBoundingClientRect().left
    chart.scrollLeft += offset + pill.offsetWidth / 2 - labelW - (chart.clientWidth - labelW) / 3
  }, [view, hasChart])

  const toggleGroup = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })

  return (
    <Card>
      <Card.Header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Card.Title>타임라인</Card.Title>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted">기한 없음 {noDue}건</p>
            <ToggleButtonGroup
              aria-label="보기 범위"
              size="sm"
              selectionMode="single"
              disallowEmptySelection
              selectedKeys={[view]}
              onSelectionChange={(keys) => setView([...keys][0] as View)}
            >
              <ToggleButton id="2w">2주</ToggleButton>
              <ToggleButton id="4w">4주</ToggleButton>
              <ToggleButton id="all">전체</ToggleButton>
            </ToggleButtonGroup>
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
        </div>
        <ul aria-label="범례" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <li className="flex items-center gap-1.5">
            <span aria-hidden className={`h-2.5 w-5 rounded-full ${TONE.progress.color}`} />
            {TONE.progress.label}
          </li>
          <li className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={`size-2.5 rotate-45 rounded-[2px] ${TONE.notStarted.color}`}
            />
            {TONE.notStarted.label}
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className={`h-2.5 w-5 rounded-full ${TONE.overdue.color}`} />
            {TONE.overdue.label}
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className={`h-2.5 w-5 rounded-full ${TONE.today.color}`} />
            {TONE.today.label}
          </li>
        </ul>
      </Card.Header>
      <Card.Content>
        {dated.length === 0 ? (
          <EmptyState className="py-12">
            <p className="font-medium">기한이 있는 티켓이 없어요</p>
            <p className="text-sm text-muted">필터를 바꾸거나 Linear에서 기한을 정해 주세요.</p>
          </EmptyState>
        ) : (
          <section
            ref={chartRef}
            aria-label="타임라인 차트"
            // 머리줄을 위에 고정하려고 차트 안에서 세로로도 스크롤한다.
            className="max-h-[75dvh] scroll-pl-40 overflow-auto rounded-xl border border-separator md:scroll-pl-56"
          >
            <div
              className="relative flex flex-col text-sm"
              // 이름 칸(넓은 화면 224px)과 하루 칸 최소 폭을 더한 만큼은 확보한다.
              style={{ minWidth: 224 + days * MIN_DAY_PX }}
            >
              <DateHeader dates={dates} today={today} marks={marks} todayRef={todayRef} />
              <div className="relative">
                <DayGrid dates={dates} marks={marks} />
                {groupRows(dated, groupBy).map((row) => {
                  // 「담당 없음」과 「마일스톤 없음」은 id가 같아서 묶음 방식을 키에 붙인다.
                  const key = `${groupBy}:${row.id}`
                  const open = !collapsed.has(key)
                  return (
                    <section key={row.id} aria-label={row.name} className="relative">
                      <div className="flex h-9 border-b border-separator">
                        <button
                          type="button"
                          aria-expanded={open}
                          aria-label={`${row.name} ${row.issues.length}건`}
                          onClick={() => toggleGroup(key)}
                          className={`sticky left-0 z-20 flex shrink-0 cursor-pointer items-center gap-2 bg-surface px-2 font-medium outline-none hover:bg-default focus-visible:ring-2 focus-visible:ring-accent ${LABEL_W}`}
                        >
                          {open ? (
                            <ChevronDown aria-hidden className="size-3.5 shrink-0 text-muted" />
                          ) : (
                            <ChevronRight aria-hidden className="size-3.5 shrink-0 text-muted" />
                          )}
                          {groupBy === 'assignee' && row.id !== NONE && (
                            <MemberAvatar name={row.name} avatarUrl={row.avatarUrl} />
                          )}
                          <span className="truncate">{row.name}</span>
                          <CountChip>{row.issues.length}</CountChip>
                        </button>
                      </div>
                      {open &&
                        row.issues.map((issue) => (
                          <IssueRow
                            key={issue.id}
                            issue={issue}
                            today={today}
                            range={range}
                            days={days}
                          />
                        ))}
                    </section>
                  )
                })}
              </div>
            </div>
          </section>
        )}
      </Card.Content>
    </Card>
  )
}

/** 요일과 날짜를 하루 칸마다 적는다. 첫 칸과 월요일에는 월/일을 위에 적는다. */
type Marks = { today: number | null; final: number | null }

function DateHeader({
  dates,
  today,
  marks,
  todayRef,
}: {
  dates: DateString[]
  today: DateString
  marks: Marks
  todayRef: React.RefObject<HTMLSpanElement | null>
}) {
  const days = dates.length
  const todayIndex = marks.today
  // 월/일은 오늘 표시와 겹치거나 끝에서 넘치는 곳에는 적지 않는다.
  // 첫 칸 바로 뒤에 월요일이 있으면 첫 칸도 적지 않는다.
  const showMonthDay = (d: number) =>
    (d === 0
      ? ![1, 2].some((n) => n < days && weekdayOf(dates[n]!) === 1)
      : weekdayOf(dates[d]!) === 1) &&
    d < days - 2 &&
    !(todayIndex !== null && Math.abs(d - todayIndex) <= 2)
  const sameDay = marks.today !== null && marks.today === marks.final
  // 끝 쪽 이름표는 칸 오른쪽 끝에 맞춰 차트 밖으로 넘치지 않게 한다.
  const at = (i: number): React.CSSProperties =>
    i >= days - 3
      ? { right: `${((days - i - 1) / days) * 100}%` }
      : { left: `${((i + 0.5) / days) * 100}%`, transform: 'translateX(-50%)' }
  return (
    <div className="sticky top-0 z-30 flex border-b border-separator bg-surface">
      <span
        data-label-col
        className={`sticky left-0 z-40 flex shrink-0 items-end bg-surface px-2 pb-1 text-xs text-muted ${LABEL_W}`}
      >
        티켓
      </span>
      <div className="relative flex-1">
        <div aria-hidden className="relative h-10">
          {marks.final !== null && !sameDay && (
            <span
              className="absolute top-0.5 text-[11px] whitespace-nowrap text-muted"
              style={at(marks.final)}
            >
              최종 발표
            </span>
          )}
          {dates.map((date, d) =>
            showMonthDay(d) ? (
              <span
                key={date}
                className="absolute bottom-0.5 pl-1 text-xs font-medium whitespace-nowrap"
                style={{ left: `${(d / days) * 100}%` }}
              >
                {formatMonthDay(date)}
              </span>
            ) : null,
          )}
          {todayIndex !== null && (
            <span
              ref={todayRef}
              className="absolute bottom-0.5 rounded-full bg-accent px-2 text-xs font-medium whitespace-nowrap text-accent-foreground"
              style={at(todayIndex)}
            >
              {sameDay ? '오늘·최종 발표' : `오늘 ${formatMonthDay(today)}`}
            </span>
          )}
        </div>
        <div className="grid" style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }}>
          {dates.map((date, d) => {
            const weekday = weekdayOf(date)
            return (
              <span
                key={date}
                aria-hidden
                className={`flex flex-col items-center py-0.5 text-[11px] leading-tight ${
                  weekday === 0 || weekday === 6 ? 'bg-surface-secondary text-muted' : ''
                } ${weekday === 1 ? 'border-l border-separator' : ''} ${
                  d === todayIndex ? 'font-semibold text-accent' : ''
                }`}
              >
                <span>{WEEKDAY[weekday]}</span>
                <span className="tabular-nums">{Number(date.slice(8))}</span>
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/**
 * 줄 뒤에 깔리는 칸. 주말은 연한 바탕, 주 시작(월요일)은 진한 선이다.
 * 오늘은 강조색 선, 최종 발표일은 점선이다.
 */
function DayGrid({ dates, marks }: { dates: DateString[]; marks: Marks }) {
  const days = dates.length
  const line = (i: number) => ({ left: `${((i + 0.5) / days) * 100}%` })
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 flex">
      <span className={`shrink-0 ${LABEL_W}`} />
      <div
        className="relative grid flex-1"
        style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }}
      >
        {dates.map((date) => {
          const weekday = weekdayOf(date)
          return (
            <span
              key={date}
              className={`border-l ${weekday === 1 ? 'border-separator' : 'border-separator/30'} ${
                weekday === 0 || weekday === 6 ? 'bg-surface-secondary' : ''
              }`}
            />
          )
        })}
        {marks.final !== null && marks.final !== marks.today && (
          <span
            className="absolute inset-y-0 border-l-2 border-dashed border-foreground/50"
            style={line(marks.final)}
          />
        )}
        {marks.today !== null && (
          <span className="absolute inset-y-0 border-l-2 border-accent" style={line(marks.today)} />
        )}
      </div>
    </div>
  )
}

function IssueRow({
  issue,
  today,
  range,
  days,
}: {
  issue: DatedIssue
  today: DateString
  range: Range
  days: number
}) {
  const mark = markOf(issue, range)
  if (!mark) return null
  const tone = toneOf(issue, today)
  const due = formatMonthDay(issue.dueDate)
  const started = mark.started && formatMonthDay(mark.started)
  const when =
    started === null
      ? `시작 전, 기한 ${due}`
      : mark.kind === 'diamond'
        ? `기한 ${due}, ${started}에 시작`
        : `${started}부터 ${due}까지`
  const period =
    started === null
      ? `시작 전 · 기한 ${due}`
      : mark.kind === 'diamond'
        ? `${started} 시작 · 기한 ${due}`
        : `${started} ~ ${due}`
  const pct = (date: DateString, offset = 0) =>
    `${((daysBetween(range.start, date) + offset) / days) * 100}%`
  const color = TONE[tone].color
  // 기한 날짜는 표시 오른쪽에 적는다. 끝에서 두 칸 안이면 넘치지 않게 왼쪽에 적고,
  // 왼쪽에도 자리가 없으면(범위 전체를 덮는 막대) 막대 안 오른쪽에 적는다.
  const fromIndex = daysBetween(range.start, mark.from)
  const dueSide =
    daysBetween(mark.to, range.end) >= 2
      ? {
          className: 'pl-1.5 text-muted',
          style: { left: pct(mark.to, mark.kind === 'bar' ? 1 : 0.75) },
        }
      : fromIndex >= 2
        ? {
            className: 'pr-1.5 text-muted',
            style: { right: `${((days - fromIndex) / days) * 100}%` },
          }
        : { className: 'right-1 font-medium text-white', style: undefined }

  return (
    <Tooltip delay={300} closeDelay={0}>
      <Tooltip.Trigger
        // 줄 전체를 링크로 그린다. 트리거는 div용 속성을 주지만 a에도 그대로 맞는다.
        render={({ ref, ...props }) => (
          <a
            {...(props as React.ComponentProps<'a'>)}
            ref={ref as React.Ref<HTMLAnchorElement>}
            // 툴팁 트리거가 붙이는 button 역할을 빼서 링크로 읽히게 한다.
            role={undefined}
            href={issue.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${issue.identifier} ${issue.title}, ${when}${
              tone === 'notStarted' ? '' : `, ${TONE[tone].label}`
            }`}
            className="relative flex h-8 cursor-pointer outline-none hover:bg-default/40 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
          />
        )}
      >
        <span
          className={`sticky left-0 z-20 shrink-0 truncate bg-surface pr-2 pl-8 leading-8 ${LABEL_W}`}
        >
          <span className="text-muted">{issue.identifier}</span> {issue.title}
        </span>
        <span className="relative flex-1">
          {mark.outside === 'before' && (
            <span
              className={`absolute top-1/2 left-1 -translate-y-1/2 text-xs ${
                tone === 'overdue' ? 'font-medium text-danger' : 'text-muted'
              }`}
            >
              ← {due}
            </span>
          )}
          {mark.outside === 'after' && (
            <span className="absolute top-1/2 right-1 -translate-y-1/2 text-xs text-muted">
              {due} →
            </span>
          )}
          {mark.outside === null && (
            <>
              {mark.kind === 'bar' ? (
                <span
                  data-testid={`mark-${issue.id}`}
                  className={`absolute top-1/2 h-4 -translate-y-1/2 rounded-full ${color}`}
                  style={{
                    left: pct(mark.from),
                    width: `${((daysBetween(mark.from, mark.to) + 1) / days) * 100}%`,
                  }}
                />
              ) : (
                <span
                  data-testid={`mark-${issue.id}`}
                  className={`absolute top-1/2 size-3 -translate-1/2 rotate-45 rounded-[2px] ${color}`}
                  style={{ left: pct(mark.to, 0.5) }}
                />
              )}
              <span
                data-testid={`due-${issue.id}`}
                className={`absolute top-1/2 -translate-y-1/2 text-xs whitespace-nowrap tabular-nums ${dueSide.className}`}
                style={dueSide.style}
              >
                {issue.dueDate > range.end ? `${due} →` : due}
              </span>
            </>
          )}
        </span>
      </Tooltip.Trigger>
      <Tooltip.Content className="flex max-w-xs flex-col gap-0.5 text-xs">
        <p className="font-medium">
          {issue.identifier} {issue.title}
        </p>
        <p>
          {issue.assignee?.name ?? '담당 없음'} · {issue.state.name}
        </p>
        <p>{period}</p>
        <p>{dueLabel(issue.dueDate, today).text}</p>
      </Tooltip.Content>
    </Tooltip>
  )
}
