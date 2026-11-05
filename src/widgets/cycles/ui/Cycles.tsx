'use client'

import {
  Button,
  Card,
  EmptyState,
  Label,
  ProgressBar,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
} from '@heroui/react'
import { cardVariants } from '@heroui/styles'
import { useMemo, useState } from 'react'

import { MemberAvatar } from '@/entities/member'
import {
  currentPeriod,
  DueChip,
  LabelChip,
  periodText,
  PriorityIcon,
  StateIcon,
  stateLabel,
} from '@/entities/ticket'
import { applyFilters, NONE, useFilters } from '@/features/filter'
import type { Cycle, Issue, Snapshot } from '@/shared/api/linear'
import { formatMonthDay, kstDate } from '@/shared/lib/date'
import { CollapseButton, CountChip, StatCards } from '@/shared/ui'

import {
  cycleTabs,
  defaultTabKey,
  formatDayWithWeekday,
  groupByAssignee,
  groupByState,
  inBucket,
  OUTSIDE,
  tabSummary,
  type CycleTab,
  type SummaryBucket,
} from '../lib/cycles'

/** 열마다 처음 보여 줄 카드 수 */
const PAGE = 5

export function Cycles({ snapshot, now }: { snapshot: Snapshot; now: number }) {
  const { filters } = useFilters()
  const tabs = useMemo(
    () => cycleTabs(snapshot.issues, snapshot.cycles),
    [snapshot.issues, snapshot.cycles],
  )
  const fallback = defaultTabKey(tabs, snapshot.cycles, now)
  const current = currentPeriod(now, snapshot.cycles)
  // 지금 사이클 밖이면 사이클 밖 탭을 「사이클 N 시작 전」으로 부른다. 대시보드와 같은 문구다.
  const outsideName = periodText(current, snapshot.cycles, now).name
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
            const isCurrent = tabSummary(t, snapshot.cycles, now).period?.daysLeft != null
            return (
              <Tabs.Tab key={t.key} id={t.key} className="gap-1.5 whitespace-nowrap">
                {/* 지금 기간 탭은 이름 앞 작은 표시로 구분한다. 날짜는 아래 숫자 칸 줄에 있다. */}
                {isCurrent && (
                  <span
                    aria-hidden
                    data-current
                    className="size-1.5 shrink-0 rounded-full bg-accent"
                  />
                )}
                {t.key === OUTSIDE && current.kind === 'outside' ? outsideName : t.title}
                {isCurrent && <span className="sr-only">, 진행 중</span>}
                <Tabs.Indicator />
              </Tabs.Tab>
            )
          })}
        </Tabs.List>
      </Tabs.ListContainer>
      <Tabs.Panel id={selected.key} className="flex flex-col gap-6 pt-6">
        <TabContent
          // 탭을 바꾸면 고른 묶음과 열마다 더 보기 상태를 처음으로 돌린다.
          key={selected.key}
          tab={selected}
          issues={applyFilters(selected.issues, filters)}
          cycles={snapshot.cycles}
          now={now}
        />
      </Tabs.Panel>
    </Tabs>
  )
}

type Picked = 'all' | SummaryBucket

const STATS: { key: SummaryBucket; label: string; className?: string }[] = [
  { key: 'overdue', label: '기한 지남', className: 'text-danger' },
  { key: 'today', label: '오늘', className: 'text-warning' },
  { key: 'thisWeek', label: '이번 주' },
]

function TabContent({
  tab,
  issues,
  cycles,
  now,
}: {
  tab: CycleTab
  /** 필터를 건 이 탭의 티켓 */
  issues: Issue[]
  cycles: Cycle[]
  now: number
}) {
  const [picked, setPicked] = useState<Picked>('all')
  // 보드가 빈 안내로 바뀌었다 돌아와도 접은 열과 묶음 방식을 기억하려고 여기에 둔다. 접은 열은 열 id로 기억한다.
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set())
  const [groupBy, setGroupBy] = useState<GroupBy>('state')
  // 숫자 칸은 보드와 같은 수를 세도록 필터를 건 티켓으로 센다. 진행 막대는 사이클 전체 기준이다.
  const { period, counts } = tabSummary(tab, cycles, now, issues)
  const { progress } = tab
  const shown = picked === 'all' ? issues : inBucket(issues, picked, cycles, now)

  return (
    <>
      <StatCards<Picked>
        items={[
          { key: 'all', label: '남은 티켓', count: issues.length },
          ...STATS.map((s) => ({ ...s, count: counts[s.key] })),
        ]}
        selected={picked}
        // 고른 칸을 다시 누르면 모두 보여 준다.
        onSelect={(key) => setPicked(key === picked ? 'all' : key)}
      />
      {(period || progress) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {period && (
            <p className="text-muted">
              {formatDayWithWeekday(period.start)} ~ {formatDayWithWeekday(period.end)}
              {period.daysLeft !== null &&
                ` · ${period.daysLeft > 0 ? `${period.daysLeft}일 남음` : '오늘까지'}`}
            </p>
          )}
          {progress && (
            <ProgressBar
              value={
                progress.total === 0 ? 0 : Math.round((progress.completed / progress.total) * 100)
              }
              className="w-full sm:max-w-sm"
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
      )}
      <Board
        issues={shown}
        today={kstDate(now)}
        emptyText={
          tab.issues.length === 0
            ? '이 사이클에 남은 티켓이 없어요'
            : issues.length === 0
              ? '필터에 맞는 티켓이 없어요'
              : '이 묶음에 남은 티켓이 없어요'
        }
        showFilterHint={tab.issues.length > 0 && issues.length === 0}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        groupBy={groupBy}
        setGroupBy={setGroupBy}
      />
    </>
  )
}

/** 보드가 빈 안내로 바뀌었다 돌아와도 남아야 하는 보드 상태 */
type CollapseState = {
  collapsed: ReadonlySet<string>
  setCollapsed: React.Dispatch<React.SetStateAction<ReadonlySet<string>>>
  groupBy: GroupBy
  setGroupBy: (groupBy: GroupBy) => void
}

function Board({
  issues,
  today,
  emptyText,
  showFilterHint,
  ...collapse
}: {
  issues: Issue[]
  today: string
  emptyText: string
  showFilterHint: boolean
} & CollapseState) {
  if (issues.length === 0) {
    return (
      <EmptyState className="py-12">
        <p className="font-medium">{emptyText}</p>
        {showFilterHint && <p className="text-sm text-muted">필터를 바꿔 보세요.</p>}
      </EmptyState>
    )
  }
  return <BoardColumns issues={issues} today={today} {...collapse} />
}

type GroupBy = 'state' | 'assignee'
const GROUP_BY_LABEL: Record<GroupBy, string> = { state: '상태별', assignee: '담당자별' }

type BoardGroup = { id: string; name: string; icon: React.ReactNode; issues: Issue[] }

const toBoardGroups = (issues: Issue[], groupBy: GroupBy): BoardGroup[] =>
  groupBy === 'state'
    ? groupByState(issues).map((g) => ({ ...g, icon: <StateIcon state={g.state} /> }))
    : groupByAssignee(issues).map((g) => ({
        ...g,
        icon:
          g.id === NONE ? (
            <span className="size-6 shrink-0" />
          ) : (
            <MemberAvatar name={g.name} avatarUrl={g.avatarUrl} />
          ),
      }))

/** 처음에는 상태별로 묶고 모든 열을 펼쳐 둔다. */
function BoardColumns({
  issues,
  today,
  collapsed,
  setCollapsed,
  groupBy,
  setGroupBy,
}: { issues: Issue[]; today: string } & CollapseState) {
  const groups = toBoardGroups(issues, groupBy)
  const allCollapsed = groups.every((g) => collapsed.has(g.id))
  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <ToggleButtonGroup
          aria-label="보드 묶음"
          size="sm"
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={[groupBy]}
          onSelectionChange={(keys) => setGroupBy([...keys][0] as GroupBy)}
        >
          <ToggleButton id="state">{GROUP_BY_LABEL.state}</ToggleButton>
          <ToggleButton id="assignee">{GROUP_BY_LABEL.assignee}</ToggleButton>
        </ToggleButtonGroup>
        <Button
          size="sm"
          variant="tertiary"
          onPress={() => setCollapsed(allCollapsed ? new Set() : new Set(groups.map((g) => g.id)))}
        >
          {allCollapsed ? '모두 펼치기' : '모두 접기'}
        </Button>
      </div>
      <section
        aria-label={`${GROUP_BY_LABEL[groupBy]} 티켓`}
        // 넓은 화면에서는 열을 화면 폭에 맞춰 나누고, 열이 많으면 가로로 밀어 본다. 휴대폰에서는 세로로 쌓는다.
        className="flex flex-col gap-4 md:grid md:auto-cols-[minmax(15rem,1fr)] md:grid-flow-col md:items-start md:overflow-x-auto md:pb-2"
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
  group: BoardGroup
  today: string
  isOpen: boolean
  onToggle: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? group.issues : group.issues.slice(0, PAGE)
  const hidden = group.issues.length - visible.length
  return (
    <Card>
      <section aria-label={group.name} className="flex flex-col gap-3">
        <Card.Header>
          <h3 className="min-w-0">
            <CollapseButton isOpen={isOpen} onToggle={onToggle} className="max-w-full">
              {/* 아이콘의 이름이나 사진 대신 보이는 첫 글자가 버튼 이름에 섞이지 않게 숨긴다. */}
              <span aria-hidden className="flex">
                {group.icon}
              </span>
              <span className="truncate">{group.name}</span>
              <CountChip>{group.issues.length}건</CountChip>
            </CollapseButton>
          </h3>
        </Card.Header>
        {isOpen && (
          <Card.Content>
            <ul className="flex flex-col gap-2">
              {visible.map((issue) => (
                <li key={issue.id}>
                  <TicketCard issue={issue} today={today} />
                </li>
              ))}
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

/** Linear 보드 카드 모양. 누르면 Linear 이슈를 새 탭으로 연다. */
const PRIORITY_NAME = ['없음', '긴급', '높음', '보통', '낮음']

/** 화면 낭독기가 제목을 먼저 읽도록 카드 링크 이름을 따로 만든다. */
const cardName = (issue: Issue) =>
  [
    issue.title,
    issue.identifier,
    stateLabel(issue.state),
    `담당 ${issue.assignee?.name ?? '없음'}`,
    `기한 ${issue.dueDate ? formatMonthDay(issue.dueDate) : '없음'}`,
    `우선순위 ${PRIORITY_NAME[issue.priority ?? 0] ?? '없음'}`,
  ].join(', ')

function TicketCard({ issue, today }: { issue: Issue; today: string }) {
  const ticket = cardVariants({ variant: 'secondary' })
  return (
    <a
      aria-label={cardName(issue)}
      href={issue.url}
      target="_blank"
      rel="noreferrer"
      className={ticket.base({
        className:
          'gap-1.5 p-3 outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-accent',
      })}
    >
      {issue.parent && (
        <span className="truncate text-xs text-muted">
          {`${issue.parent.identifier} › ${issue.parent.title}`}
        </span>
      )}
      <span className="flex items-center justify-between gap-2 text-xs">
        <span className="text-muted">{issue.identifier}</span>
        {issue.assignee && (
          <span aria-hidden>
            <MemberAvatar {...issue.assignee} />
          </span>
        )}
      </span>
      <span className="flex items-start gap-1.5">
        <span className="mt-0.5 flex">
          <StateIcon state={issue.state} />
        </span>
        <span className="line-clamp-2 text-sm font-medium">{issue.title}</span>
      </span>
      <span className="flex flex-wrap items-center gap-1">
        <PriorityIcon priority={issue.priority} />
        {issue.dueDate && <DueChip dueDate={issue.dueDate} today={today} />}
        {issue.labels.map((l) => (
          <LabelChip key={l.id} label={l} />
        ))}
      </span>
      {issue.createdAt && (
        <span className="text-xs text-muted">
          만든 날 {formatMonthDay(kstDate(issue.createdAt))}
        </span>
      )}
    </a>
  )
}
