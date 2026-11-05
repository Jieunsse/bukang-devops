'use client'

import { Button, Card, Chip, EmptyState, Label, ProgressBar, Tabs } from '@heroui/react'
import { cardVariants } from '@heroui/styles'
import { useMemo, useState } from 'react'

import { MemberAvatar } from '@/entities/member'
import { dueLabel, type DueTone } from '@/entities/ticket'
import { applyFilters, NONE, useFilters } from '@/features/filter'
import type { Issue, Snapshot } from '@/shared/api/linear'
import { formatMonthDay, kstDate } from '@/shared/lib/date'
import { CollapseButton } from '@/shared/ui'

import {
  cycleTabs,
  defaultTabKey,
  formatDayWithWeekday,
  groupByAssignee,
  tabSummary,
  type AssigneeGroup,
  type CycleTab,
  type TabSummary,
} from '../lib/cycles'

const TONE_CLASS: Record<DueTone, string> = {
  danger: 'text-danger',
  warning: 'text-warning',
  default: 'text-muted',
}
/** 열마다 처음 보여 줄 카드 수 */
const PAGE = 5

export function Cycles({ snapshot, now }: { snapshot: Snapshot; now: number }) {
  const { filters } = useFilters()
  const tabs = useMemo(
    () => cycleTabs(snapshot.issues, snapshot.cycles),
    [snapshot.issues, snapshot.cycles],
  )
  const fallback = defaultTabKey(tabs, snapshot.cycles, now)
  const [picked, setPicked] = useState<string | null>(null)
  // 새로 받은 목록에서 고른 탭이 사라지면 고른 것을 잊고 지금 기간 탭으로 돌아간다.
  // 그래야 나중에 그 탭이 다시 생겨도 저절로 넘어가지 않는다.
  if (picked !== null && !tabs.some((t) => t.key === picked)) setPicked(null)
  const selected = tabs.find((t) => t.key === picked) ?? tabs.find((t) => t.key === fallback)

  if (!selected) {
    return (
      <EmptyState className="py-12">
        <p className="font-medium">보여 줄 사이클이 없어요</p>
        <p className="text-sm text-muted">Linear에서 사이클을 만들면 여기에 보여요.</p>
      </EmptyState>
    )
  }

  return (
    <Tabs
      className="w-full"
      selectedKey={selected.key}
      onSelectionChange={(key) => setPicked(String(key))}
    >
      <Tabs.ListContainer className="w-fit max-w-full">
        <Tabs.List aria-label="사이클">
          {tabs.map((t) => {
            const { period } = tabSummary(t, snapshot.cycles, now)
            return (
              <Tabs.Tab key={t.key} id={t.key} className="h-auto flex-col py-1.5 whitespace-nowrap">
                <span>{t.title}</span>
                {period && (
                  <span className="text-xs text-muted">
                    {formatMonthDay(period.start)}~{formatMonthDay(period.end)}
                  </span>
                )}
                <Tabs.Indicator />
              </Tabs.Tab>
            )
          })}
        </Tabs.List>
      </Tabs.ListContainer>
      <Tabs.Panel id={selected.key} className="flex flex-col gap-6 pt-6">
        <SummaryCard tab={selected} summary={tabSummary(selected, snapshot.cycles, now)} />
        <Board
          // 탭을 바꾸면 열마다 더 보기 상태를 처음으로 돌린다.
          key={selected.key}
          tab={selected}
          issues={applyFilters(selected.issues, filters)}
          today={kstDate(now)}
        />
      </Tabs.Panel>
    </Tabs>
  )
}

const COUNTS = [
  { key: 'overdue', label: '기한 지남', className: 'text-danger' },
  { key: 'today', label: '오늘', className: 'text-warning' },
  { key: 'thisWeek', label: '이번 주', className: '' },
] as const

function SummaryCard({ tab, summary }: { tab: CycleTab; summary: TabSummary }) {
  const { period, counts } = summary
  const { progress } = tab
  return (
    <Card>
      <section aria-label={`${tab.title} 요약`}>
        <Card.Content className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-3xl font-semibold">{tab.title}</h2>
            {period && (
              <p className="text-muted">
                {formatDayWithWeekday(period.start)} ~ {formatDayWithWeekday(period.end)}
                {period.daysLeft !== null &&
                  ` · ${period.daysLeft > 0 ? `${period.daysLeft}일 남음` : '오늘까지'}`}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end lg:gap-8">
            <div className="flex flex-col gap-3">
              <p className="text-3xl font-semibold tabular-nums">남은 티켓 {tab.issues.length}건</p>
              {progress && (
                <ProgressBar
                  value={
                    progress.total === 0
                      ? 0
                      : Math.round((progress.completed / progress.total) * 100)
                  }
                  className="w-full sm:w-64"
                >
                  <Label className="text-sm text-muted">
                    완료 {progress.completed} / 전체 {progress.total}
                  </Label>
                  <ProgressBar.Output />
                  <ProgressBar.Track>
                    <ProgressBar.Fill />
                  </ProgressBar.Track>
                </ProgressBar>
              )}
            </div>
            <div role="group" aria-label="기한별 개수" className="grid grid-cols-3 gap-2">
              {COUNTS.map((c) => (
                <div key={c.key} className="flex flex-col rounded-xl bg-default px-3 py-2">
                  <span className="text-xs whitespace-nowrap text-muted">{c.label}</span>
                  <span
                    // 0건은 알릴 것이 없으니 기한 색을 넣지 않는다.
                    className={`text-xl font-semibold tabular-nums ${counts[c.key] > 0 ? c.className : ''}`}
                  >
                    {counts[c.key]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card.Content>
      </section>
    </Card>
  )
}

function Board({ tab, issues, today }: { tab: CycleTab; issues: Issue[]; today: string }) {
  if (issues.length === 0) {
    return (
      <EmptyState className="py-12">
        <p className="font-medium">
          {tab.issues.length === 0 ? '이 사이클에 남은 티켓이 없어요' : '필터에 맞는 티켓이 없어요'}
        </p>
        {tab.issues.length > 0 && <p className="text-sm text-muted">필터를 바꿔 보세요.</p>}
      </EmptyState>
    )
  }
  return <BoardColumns issues={issues} today={today} />
}

/** 처음에는 모든 열을 펼쳐 둔다. 접은 열은 담당자 id로 기억한다. */
function BoardColumns({ issues, today }: { issues: Issue[]; today: string }) {
  const groups = groupByAssignee(issues)
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set())
  const allCollapsed = groups.every((g) => collapsed.has(g.id))
  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })

  return (
    <div className="flex flex-col gap-3">
      <Button
        size="sm"
        variant="tertiary"
        className="self-end"
        onPress={() => setCollapsed(allCollapsed ? new Set() : new Set(groups.map((g) => g.id)))}
      >
        {allCollapsed ? '모두 펼치기' : '모두 접기'}
      </Button>
      <section
        aria-label="담당자별 티켓"
        // 넓은 화면에서는 열을 화면 폭에 맞춰 나누고, 열이 많으면 가로로 밀어 본다. 휴대폰에서는 세로로 쌓는다.
        className="flex flex-col gap-4 md:grid md:auto-cols-[minmax(13rem,1fr)] md:grid-flow-col md:items-start md:overflow-x-auto md:pb-2"
      >
        {groups.map((group) => (
          <Column
            key={group.id}
            group={group}
            today={today}
            isOpen={!collapsed.has(group.id)}
            onToggle={() => toggle(group.id)}
          />
        ))}
      </section>
    </div>
  )
}

function Column({
  group,
  today,
  isOpen,
  onToggle,
}: {
  group: AssigneeGroup
  today: string
  isOpen: boolean
  onToggle: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? group.issues : group.issues.slice(0, PAGE)
  const hidden = group.issues.length - visible.length
  const ticket = cardVariants({ variant: 'secondary' })
  return (
    <Card>
      <section aria-label={group.name} className="flex flex-col gap-3">
        <Card.Header>
          <h3 className="min-w-0">
            <CollapseButton isOpen={isOpen} onToggle={onToggle} className="max-w-full">
              {group.id === NONE ? (
                <span aria-hidden className="size-6 shrink-0" />
              ) : (
                // 사진이 없을 때 보이는 첫 글자가 버튼 이름에 섞이지 않게 숨긴다.
                <span aria-hidden>
                  <MemberAvatar name={group.name} avatarUrl={group.avatarUrl} />
                </span>
              )}
              <span className="truncate">{group.name}</span>
              <Chip size="sm">{group.issues.length}건</Chip>
            </CollapseButton>
          </h3>
        </Card.Header>
        {isOpen && (
          <Card.Content>
            <ul className="flex flex-col gap-2">
              {visible.map((issue) => {
                const due = dueLabel(issue.dueDate, today)
                return (
                  <li key={issue.id}>
                    <a
                      href={issue.url}
                      target="_blank"
                      rel="noreferrer"
                      className={ticket.base({
                        className:
                          'gap-1.5 p-3 outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-accent',
                      })}
                    >
                      <span className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-muted">{issue.identifier}</span>
                        <span className={`whitespace-nowrap ${TONE_CLASS[due.tone]}`}>
                          {due.text}
                        </span>
                      </span>
                      <span className="line-clamp-2 text-sm font-medium">{issue.title}</span>
                      {issue.labels.length > 0 && (
                        <span className="flex flex-wrap gap-1">
                          {issue.labels.map((l) => (
                            <Chip key={l.id} size="sm">
                              {l.name}
                            </Chip>
                          ))}
                        </span>
                      )}
                    </a>
                  </li>
                )
              })}
            </ul>
            {hidden > 0 && (
              <Button
                variant="tertiary"
                size="sm"
                className="mt-2 self-start"
                onPress={() => setExpanded(true)}
              >
                {hidden}건 더 보기
              </Button>
            )}
          </Card.Content>
        )}
      </section>
    </Card>
  )
}
