import { NONE } from '@/features/filter'
import type { Issue } from '@/shared/api/linear'
import { addDays, kstDate, type DateString } from '@/shared/lib/date'

// 프로젝트 기간. 최종 발표일은 머리 영역(AppHeader)의 값과 같다.
export const PROJECT_START = '2026-10-28'
export const FINAL_PRESENTATION = '2026-11-23'

export type DatedIssue = Issue & { dueDate: DateString }
export type GroupBy = 'assignee' | 'milestone'
export type View = '2w' | '4w' | 'all'
export type Range = { start: DateString; end: DateString }

const VIEW_DAYS = { '2w': 14, '4w': 28 } as const

/** 2주·4주는 오늘이 왼쪽에서 3분의 1쯤 오게 두고, 전체는 프로젝트 기간을 보여 준다. */
export function viewRange(view: View, today: DateString): Range {
  if (view === 'all') return { start: PROJECT_START, end: FINAL_PRESENTATION }
  const days = VIEW_DAYS[view]
  const start = addDays(today, -Math.floor(days / 3))
  return { start, end: addDays(start, days - 1) }
}

/** 기한 지남과 오늘 마감이 먼저다. 기한이 남았으면 시작했는지로 나눈다. */
export type Tone = 'overdue' | 'today' | 'progress' | 'notStarted'

export function toneOf(issue: DatedIssue, today: DateString): Tone {
  if (issue.dueDate < today) return 'overdue'
  if (issue.dueDate === today) return 'today'
  return issue.startedAt ? 'progress' : 'notStarted'
}

/**
 * 막대는 from~to(둘 다 포함, 보기 범위 안으로 자름), 마름모는 기한 칸 하나다.
 * started는 실제 시작일, outside는 보기 범위 밖에 있으면 어느 쪽인지다.
 */
export type Mark = {
  kind: 'bar' | 'diamond'
  from: DateString
  to: DateString
  started: DateString | null
  outside: 'before' | 'after' | null
}

export function markOf(issue: Issue, range: Range): Mark | null {
  const due = issue.dueDate
  if (due === null) return null
  const started = issue.startedAt && kstDate(issue.startedAt)
  // 시작 전이거나 기한이 지난 뒤에 시작했으면 기한 칸에 마름모를 찍는다.
  const isBar = started !== null && started <= due
  const from = isBar ? started : due
  if (due < range.start)
    return { kind: isBar ? 'bar' : 'diamond', from, to: due, started, outside: 'before' }
  if (from > range.end)
    return { kind: isBar ? 'bar' : 'diamond', from, to: due, started, outside: 'after' }
  return {
    kind: isBar ? 'bar' : 'diamond',
    from: from < range.start ? range.start : from,
    to: due > range.end ? range.end : due,
    started,
    outside: null,
  }
}

export type Row<T extends Issue> = {
  id: string
  name: string
  avatarUrl?: string | null
  issues: T[]
}

const EMPTY_NAME: Record<GroupBy, string> = { assignee: '담당 없음', milestone: '마일스톤 없음' }

/** 이름순으로 묶고 「없음」 묶음은 맨 아래에 둔다. 묶음 안은 기한이 빠른 순이다. */
export function groupRows<T extends Issue>(issues: T[], by: GroupBy): Row<T>[] {
  const rows = new Map<string, Row<T>>()
  for (const issue of issues) {
    const owner = by === 'assignee' ? issue.assignee : issue.milestone
    const id = owner?.id ?? NONE
    const row = rows.get(id) ?? {
      id,
      name: owner?.name ?? EMPTY_NAME[by],
      avatarUrl: owner && 'avatarUrl' in owner ? owner.avatarUrl : undefined,
      issues: [],
    }
    row.issues.push(issue)
    rows.set(id, row)
  }
  for (const row of rows.values()) {
    row.issues.sort(
      (a, b) =>
        (a.dueDate ?? '').localeCompare(b.dueDate ?? '') ||
        a.identifier.localeCompare(b.identifier),
    )
  }
  return [...rows.values()].sort(
    (a, b) => Number(a.id === NONE) - Number(b.id === NONE) || a.name.localeCompare(b.name, 'ko'),
  )
}
