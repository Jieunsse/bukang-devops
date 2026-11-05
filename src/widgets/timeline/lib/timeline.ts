import { NONE } from '@/features/filter'
import type { Issue } from '@/shared/api/linear'
import { addDays, kstDate, type DateString } from '@/shared/lib/date'

// 머리 영역(AppHeader)의 값과 같다. 공통 파일을 고치지 않으려고 여기 따로 둔다.
export const FINAL_PRESENTATION = '2026-11-23'

export type DatedIssue = Issue & { dueDate: DateString }
export type GroupBy = 'assignee' | 'milestone'

/** 막대는 from~to(둘 다 포함), 점은 from = to = 기한. started는 실제 시작일이다. */
export type Mark = {
  kind: 'bar' | 'dot'
  from: DateString
  to: DateString
  started: DateString | null
}

/** 기한이 없으면 그릴 것이 없다. */
export function markOf(issue: Issue, rangeStart: DateString): Mark | null {
  const due = issue.dueDate
  if (due === null) return null
  const started = issue.startedAt && kstDate(issue.startedAt)
  // 시작 전이거나 기한이 지난 뒤에 시작했으면 기한 날짜에 점을 찍는다.
  if (!started || started > due) return { kind: 'dot', from: due, to: due, started }
  return { kind: 'bar', from: started < rangeStart ? rangeStart : started, to: due, started }
}

/** 일주일 전부터 최종 발표일(지났으면 오늘)까지. 최종 발표일은 늘 범위 안에 든다. 모든 기한이 들어가도록 늘리고, 시작일로는 늘리지 않는다. */
export function timelineRange(issues: Issue[], today: DateString) {
  const weekAgo = addDays(today, -7)
  let start = weekAgo < FINAL_PRESENTATION ? weekAgo : FINAL_PRESENTATION
  let end = today > FINAL_PRESENTATION ? today : FINAL_PRESENTATION
  for (const { dueDate } of issues) {
    if (dueDate === null) continue
    if (dueDate < start) start = dueDate
    if (dueDate > end) end = dueDate
  }
  return { start, end }
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
