'use client'

import { Button, EmptyState, Tabs } from '@heroui/react'
import { useEffect, useMemo, useRef, type ReactNode } from 'react'

import {
  BUCKET_LABEL,
  BUCKETS,
  bucketOf,
  currentPeriod,
  groupByBucket,
  milestoneColumnWidth,
  type Bucket,
} from '@/entities/ticket'
import {
  applyFilters,
  FilterChips,
  useFilters,
  visibleMembers,
  type Filters,
} from '@/features/filter'
import type { Snapshot } from '@/shared/api/linear'
import { formatMonthDay, kstDate } from '@/shared/lib/date'
import { PageToolbar } from '@/shared/ui'

import { dueCountsByDate } from '../lib/calendar'
import { assigneeLoad, milestoneProgress } from '../lib/summary'
import { useDashboardStore } from '../model/store'
import { AssigneeCard } from './AssigneeCard'
import { CalendarCard } from './CalendarCard'
import { DeadlineGrid } from './DeadlineGrid'
import { DeadlineSection } from './DeadlineSection'
import { MilestoneCard } from './MilestoneCard'
import { PresentationCard } from './PresentationCard'
import { SummaryCards } from './SummaryCards'

/** 이미 걸린 값을 다시 누르면 그 필터를 푼다. */
const toggle = (filters: Filters, key: 'assignee' | 'milestone', id: string): Filters => ({
  ...filters,
  [key]: filters[key] === id ? undefined : id,
})

export function Dashboard({
  snapshot,
  now,
  actions,
}: {
  snapshot: Snapshot
  now: number
  /** 도구 줄 오른쪽 버튼(새로고침, 필터). 화면을 그리는 쪽이 넘긴다. */
  actions?: ReactNode
}) {
  const { filters, setFilters } = useFilters()
  const bucket = useDashboardStore((s) => s.bucket)
  const setBucket = useDashboardStore((s) => s.setBucket)
  // 카드나 풀기 버튼은 누르면 사라진다. 포커스를 잃지 않게 마감 목록 영역으로 옮긴다.
  const listArea = useRef<HTMLElement>(null)
  const moveFocus = useRef(false)
  const selectFromList = (b: Bucket | 'all') => {
    moveFocus.current = true
    setBucket(b)
  }
  useEffect(() => {
    if (!moveFocus.current) return
    moveFocus.current = false
    listArea.current?.focus()
  }, [bucket])
  const date = useDashboardStore((s) => s.date)
  const setDate = useDashboardStore((s) => s.setDate)

  const today = kstDate(now)
  const range = useMemo(
    () => ({ today, end: currentPeriod(now, snapshot.cycles).end }),
    [today, now, snapshot.cycles],
  )
  const issues = useMemo(() => applyFilters(snapshot.issues, filters), [snapshot.issues, filters])
  const groups = useMemo(() => groupByBucket(issues, range), [issues, range])
  // 필터 전 목록으로 재서 필터를 바꿔도 칸 폭이 흔들리지 않는다.
  const milestoneWidth = useMemo(
    () =>
      milestoneColumnWidth(snapshot.issues.flatMap((i) => (i.milestone ? [i.milestone.name] : []))),
    [snapshot.issues],
  )
  const counts = Object.fromEntries(BUCKETS.map((b) => [b, groups[b].length])) as Record<
    Bucket,
    number
  >
  const sections: readonly Bucket[] = bucket === 'all' ? BUCKETS : [bucket]
  const dueCounts = useMemo(() => dueCountsByDate(issues), [issues])
  const dateIssues = date ? issues.filter((i) => i.dueDate === date) : []
  // 도구 줄 개수는 지금 목록에 보이는 묶음(또는 고른 날짜)만 센다.
  const shownCount = date ? dateIssues.length : sections.reduce((n, b) => n + groups[b].length, 0)

  return (
    <div className="flex flex-col gap-6">
      <PresentationCard
        now={now}
        cycles={snapshot.cycles}
        cycleIssues={snapshot.issues}
        project={snapshot.project}
      />
      <Tabs
        // 탭 줄만 글자 폭에 맞춘다. 아래 내용 영역은 늘 전체 폭이다.
        className="w-full"
        selectedKey={bucket}
        onSelectionChange={(key) => setBucket(key as Bucket | 'all')}
      >
        <Tabs.ListContainer className="w-fit max-w-full">
          <Tabs.List aria-label="마감 목록 묶음">
            <Tabs.Tab id="all" className="whitespace-nowrap">
              전체
              <Tabs.Indicator />
            </Tabs.Tab>
            {BUCKETS.map((b) => (
              <Tabs.Tab key={b} id={b} className="whitespace-nowrap">
                {BUCKET_LABEL[b]}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
        <Tabs.Panel id={bucket} className="flex flex-col gap-6 pt-6">
          <SummaryCards counts={counts} selected={bucket} onSelect={setBucket} />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <AssigneeCard
              rows={assigneeLoad(issues, range, visibleMembers(snapshot.members ?? [], filters))}
              onSelect={(id) => setFilters(toggle(filters, 'assignee', id))}
            />
            <MilestoneCard
              {...milestoneProgress(issues)}
              onSelect={(id) => setFilters(toggle(filters, 'milestone', id))}
            />
            <CalendarCard
              counts={dueCounts}
              cycles={snapshot.cycles}
              today={today}
              selected={date}
              onSelect={setDate}
            />
          </div>

          <div className="flex flex-col gap-6">
            <PageToolbar
              title="마감 목록"
              summary={`${shownCount}건`}
              actions={
                <>
                  {date && (
                    <Button size="sm" variant="tertiary" onPress={() => setDate(null)}>
                      날짜 선택 풀기
                    </Button>
                  )}
                  {!date && bucket !== 'all' && (
                    <Button size="sm" variant="tertiary" onPress={() => selectFromList('all')}>
                      묶음 선택 풀기
                    </Button>
                  )}
                  {actions}
                </>
              }
            >
              <FilterChips issues={snapshot.issues} />
            </PageToolbar>
            <section ref={listArea} tabIndex={-1} aria-label="마감 목록" className="outline-none">
              {issues.length === 0 ? (
                <EmptyState className="py-12">
                  <p className="font-medium">남은 티켓이 없어요</p>
                  <p className="text-sm text-muted">
                    필터를 바꾸거나 Linear에서 티켓을 확인해 주세요.
                  </p>
                </EmptyState>
              ) : date ? (
                <DeadlineSection
                  key={date}
                  bucket={bucketOf(date, range)}
                  title={`${formatMonthDay(date)} 기한`}
                  issues={dateIssues}
                  today={today}
                  emptyText="이날 기한인 남은 티켓이 없어요"
                  milestoneWidth={milestoneWidth}
                />
              ) : bucket === 'all' ? (
                <DeadlineGrid groups={groups} today={today} onSelect={selectFromList} />
              ) : (
                <DeadlineSection
                  bucket={bucket}
                  issues={groups[bucket]}
                  today={today}
                  milestoneWidth={milestoneWidth}
                  emptyText="이 묶음에 남은 티켓이 없어요"
                />
              )}
            </section>
          </div>
        </Tabs.Panel>
      </Tabs>
    </div>
  )
}
