'use client'

import { EmptyState, Tabs } from '@heroui/react'
import { useMemo } from 'react'

import { BUCKET_LABEL, BUCKETS, currentPeriod, groupByBucket, type Bucket } from '@/entities/ticket'
import { applyFilters, useFilters } from '@/features/filter'
import type { Snapshot } from '@/shared/api/linear'
import { kstDate } from '@/shared/lib/date'

import { assigneeLoad, milestoneProgress } from '../lib/summary'
import { useDashboardStore } from '../model/store'
import { AssigneeCard } from './AssigneeCard'
import { DeadlineSection } from './DeadlineSection'
import { MilestoneCard } from './MilestoneCard'
import { SummaryCards } from './SummaryCards'

/** 처음부터 접어 두는 묶음 */
const COLLAPSED: Bucket[] = ['later', 'noDue']

export function Dashboard({ snapshot, now }: { snapshot: Snapshot; now: number }) {
  const { filters, setFilters } = useFilters()
  const bucket = useDashboardStore((s) => s.bucket)
  const setBucket = useDashboardStore((s) => s.setBucket)

  const today = kstDate(now)
  const range = useMemo(
    () => ({ today, end: currentPeriod(now, snapshot.cycles).end }),
    [today, now, snapshot.cycles],
  )
  const issues = useMemo(() => applyFilters(snapshot.issues, filters), [snapshot.issues, filters])
  const groups = useMemo(() => groupByBucket(issues, range), [issues, range])
  const counts = Object.fromEntries(BUCKETS.map((b) => [b, groups[b].length])) as Record<
    Bucket,
    number
  >
  const sections = bucket === 'all' ? BUCKETS : [bucket]

  return (
    <div className="flex flex-col gap-6">
      <Tabs
        className="w-fit max-w-full"
        selectedKey={bucket}
        onSelectionChange={(key) => setBucket(key as Bucket | 'all')}
      >
        <Tabs.ListContainer>
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
      </Tabs>

      <SummaryCards counts={counts} selected={bucket} onSelect={setBucket} />

      <div className="grid gap-4 md:grid-cols-2">
        <AssigneeCard
          rows={assigneeLoad(issues, range)}
          onSelect={(assignee) => setFilters({ ...filters, assignee })}
        />
        <MilestoneCard
          {...milestoneProgress(issues)}
          onSelect={(milestone) => setFilters({ ...filters, milestone })}
        />
      </div>

      <div className="flex flex-col gap-6">
        <h2 className="text-lg font-semibold">마감 목록</h2>
        {issues.length === 0 ? (
          <EmptyState className="py-12">
            <p className="font-medium">남은 티켓이 없어요</p>
            <p className="text-sm text-muted">필터를 바꾸거나 Linear에서 티켓을 확인해 주세요.</p>
          </EmptyState>
        ) : (
          sections.map((b) => (
            <DeadlineSection
              // 묶음을 바꾸면 접기와 더 보기 상태를 처음으로 돌린다.
              key={`${bucket}-${b}`}
              bucket={b}
              issues={groups[b]}
              today={today}
              defaultOpen={bucket !== 'all' || !COLLAPSED.includes(b)}
            />
          ))
        )}
      </div>
    </div>
  )
}
