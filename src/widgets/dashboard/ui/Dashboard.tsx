'use client'

import { Button, EmptyState, Tabs } from '@heroui/react'
import { useMemo, type ReactNode } from 'react'

import {
  BUCKET_LABEL,
  BUCKETS,
  bucketOf,
  currentPeriod,
  groupByBucket,
  milestoneColumnWidth,
  type Bucket,
} from '@/entities/ticket'
import { applyFilters, FilterChips, useFilters, type Filters } from '@/features/filter'
import type { Snapshot } from '@/shared/api/linear'
import { formatMonthDay, kstDate } from '@/shared/lib/date'
import { PageToolbar } from '@/shared/ui'

import { dueCountsByDate } from '../lib/calendar'
import { assigneeLoad, milestoneProgress } from '../lib/summary'
import { useDashboardStore } from '../model/store'
import { AssigneeCard } from './AssigneeCard'
import { CalendarCard } from './CalendarCard'
import { DeadlineSection } from './DeadlineSection'
import { MilestoneCard } from './MilestoneCard'
import { PresentationCard } from './PresentationCard'
import { SummaryCards } from './SummaryCards'

/** 처음부터 접어 두는 묶음 */
const COLLAPSED: Bucket[] = ['later', 'noDue']

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
  const sections = bucket === 'all' ? BUCKETS : [bucket]
  const dueCounts = useMemo(() => dueCountsByDate(issues), [issues])
  const dateIssues = date ? issues.filter((i) => i.dueDate === date) : []

  return (
    <div className="flex flex-col gap-6">
      <PresentationCard today={today} />
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
              rows={assigneeLoad(issues, range)}
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
              summary={`${issues.length}건`}
              actions={
                <>
                  {date && (
                    <Button size="sm" variant="tertiary" onPress={() => setDate(null)}>
                      날짜 선택 풀기
                    </Button>
                  )}
                  {actions}
                </>
              }
            >
              <FilterChips issues={snapshot.issues} />
            </PageToolbar>
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
                defaultOpen
                emptyText="이날 기한인 남은 티켓이 없어요"
                milestoneWidth={milestoneWidth}
              />
            ) : (
              sections.map((b) => (
                <DeadlineSection
                  // 묶음을 바꾸면 접기와 더 보기 상태를 처음으로 돌린다.
                  key={`${bucket}-${b}`}
                  bucket={b}
                  issues={groups[b]}
                  today={today}
                  milestoneWidth={milestoneWidth}
                  defaultOpen={bucket !== 'all' || !COLLAPSED.includes(b)}
                  collapsible={bucket === 'all'}
                  emptyText={bucket === 'all' ? undefined : '이 묶음에 남은 티켓이 없어요'}
                />
              ))
            )}
          </div>
        </Tabs.Panel>
      </Tabs>
    </div>
  )
}
