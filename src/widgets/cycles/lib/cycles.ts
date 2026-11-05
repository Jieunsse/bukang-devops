import { bucketOf, currentPeriod } from '@/entities/ticket'
import { NONE } from '@/features/filter'
import type { Cycle, Issue } from '@/shared/api/linear'
import { daysBetween, formatMonthDay, kstDate, weekdayOf, type DateString } from '@/shared/lib/date'

/** 사이클 밖 기간 탭의 키 */
export const OUTSIDE = 'outside'

export type CycleTab = {
  key: string
  title: string
  /** 사이클의 한국 시간 첫날과 마지막 날. 사이클 밖 기간은 없다. */
  days: { start: DateString; end: DateString } | null
  /** 이 탭의 끝나지 않은 티켓. 필터를 걸기 전이다. */
  issues: Issue[]
  /** 사이클 전체 기준. 사이클 밖 기간은 완료 수를 몰라 없다. */
  progress: { completed: number; total: number } | null
}

type Instant = string | number | Date

/** 사이클 밖 기간(사이클 밖 티켓이 있을 때)을 맨 앞에, 사이클은 시작 순으로 둔다. */
export function cycleTabs(issues: Issue[], cycles: Cycle[]): CycleTab[] {
  const known = new Set(cycles.map((c) => c.id))
  // 받지 못한 사이클을 가리키는 티켓도 사라지지 않게 사이클 밖으로 본다.
  const outside = issues.filter((i) => !i.cycle || !known.has(i.cycle.id))
  const tabs: CycleTab[] = [...cycles]
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
    .map((c) => {
      const mine = issues.filter((i) => i.cycle?.id === c.id)
      const completed = c.completedIssueCount ?? 0
      return {
        key: c.id,
        title: `사이클 ${c.number}${c.name ? ` ${c.name}` : ''}`,
        // 끝 시각은 사이클에 들지 않는다. 그 직전 순간이 속한 날이 마지막 날이다.
        days: { start: kstDate(c.startsAt), end: kstDate(Date.parse(c.endsAt) - 1) },
        issues: mine,
        progress: { completed, total: completed + mine.length },
      }
    })

  if (outside.length === 0) return tabs
  return [
    {
      key: OUTSIDE,
      title: '사이클 밖 기간',
      days: null,
      issues: outside,
      progress: null,
    },
    ...tabs,
  ]
}

/** 지금 사이클 → 사이클 밖 기간 → 다음 사이클 → 첫 탭 순으로 고른다. */
export function defaultTabKey(tabs: CycleTab[], cycles: Cycle[], now: Instant): string | null {
  const has = (key: string | undefined) => key !== undefined && tabs.some((t) => t.key === key)
  const period = currentPeriod(now, cycles)
  if (period.kind === 'cycle' && has(period.cycle.id)) return period.cycle.id
  if (has(OUTSIDE)) return OUTSIDE
  const nowMs = new Date(now).getTime()
  const next = tabs.find((t) =>
    cycles.some((c) => c.id === t.key && Date.parse(c.startsAt) > nowMs),
  )
  return next?.key ?? tabs[0]?.key ?? null
}

export type AssigneeGroup = {
  id: string
  name: string
  avatarUrl?: string | null
  issues: Issue[]
}

/** 티켓이 많은 사람부터, 담당 없음은 맨 아래. 묶음 안은 기한 순이고 기한 없음은 뒤다. */
export function groupByAssignee(issues: Issue[]): AssigneeGroup[] {
  const groups = new Map<string, AssigneeGroup>()
  for (const issue of issues) {
    const { id, name, avatarUrl } = issue.assignee ?? { id: NONE, name: '담당 없음' }
    const group = groups.get(id) ?? { id, name, avatarUrl, issues: [] }
    group.issues.push(issue)
    groups.set(id, group)
  }
  for (const group of groups.values()) {
    group.issues.sort(
      (a, b) =>
        Number(a.dueDate === null) - Number(b.dueDate === null) ||
        (a.dueDate ?? '').localeCompare(b.dueDate ?? ''),
    )
  }
  return [...groups.values()].sort(
    (a, b) =>
      Number(a.id === NONE) - Number(b.id === NONE) ||
      b.issues.length - a.issues.length ||
      a.name.localeCompare(b.name, 'ko'),
  )
}

export type TabSummary = {
  /** daysLeft는 지금 이 기간 안일 때만 있다. 마지막 날이면 0이다. */
  period: { start: DateString; end: DateString; daysLeft: number | null } | null
  /** 필터를 걸기 전 티켓으로 센다. */
  counts: { overdue: number; today: number; thisWeek: number }
}

/** 사이클 밖 기간은 지금 사이클 밖일 때만 오늘부터 이번 주 끝까지를 기간으로 적는다. */
export function tabSummary(tab: CycleTab, cycles: Cycle[], now: Instant): TabSummary {
  const today = kstDate(now)
  const current = currentPeriod(now, cycles)
  const days = tab.days ?? (current.kind === 'outside' ? current : null)
  const counts = { overdue: 0, today: 0, thisWeek: 0 }
  for (const issue of tab.issues) {
    const bucket = bucketOf(issue.dueDate, { today, end: current.end })
    if (bucket in counts) counts[bucket as keyof typeof counts]++
  }
  return {
    period: days && {
      start: days.start,
      end: days.end,
      daysLeft: days.start <= today && today <= days.end ? daysBetween(today, days.end) : null,
    },
    counts,
  }
}

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']

/** '2026-11-09' → '11/9(월)' */
export const formatDayWithWeekday = (date: DateString) =>
  `${formatMonthDay(date)}(${WEEKDAY[weekdayOf(date)]})`
