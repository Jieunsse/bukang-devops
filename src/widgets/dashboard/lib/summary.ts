import { bucketOf, type BucketRange } from '@/entities/ticket'
import { NONE } from '@/features/filter'
import type { Issue } from '@/shared/api/linear'

export type AssigneeLoad = {
  id: string
  name: string
  avatarUrl?: string | null
  overdue: number
  /** 오늘을 포함한다 */
  thisWeek: number
  /** 기한 없음을 포함한다 */
  later: number
  total: number
}

/** 담당자마다 남은 티켓을 세고, 많은 사람부터 둔다. 담당 없음은 맨 아래다. */
export function assigneeLoad(issues: Issue[], range: BucketRange): AssigneeLoad[] {
  const rows = new Map<string, AssigneeLoad>()
  for (const issue of issues) {
    const { id, name, avatarUrl } = issue.assignee ?? { id: NONE, name: '담당 없음' }
    const row = rows.get(id) ?? { id, name, avatarUrl, overdue: 0, thisWeek: 0, later: 0, total: 0 }
    const bucket = bucketOf(issue.dueDate, range)
    if (bucket === 'overdue') row.overdue++
    else if (bucket === 'today' || bucket === 'thisWeek') row.thisWeek++
    else row.later++
    row.total++
    rows.set(id, row)
  }
  return [...rows.values()].sort(
    (a, b) =>
      Number(a.id === NONE) - Number(b.id === NONE) ||
      b.total - a.total ||
      a.name.localeCompare(b.name, 'ko'),
  )
}

export type MilestoneRow = { id: string; name: string; progress: number; remaining: number }

/** 진행률은 Linear가 준 값(0~1)이다. 낮은 순으로 둔다. */
export function milestoneProgress(issues: Issue[]): {
  milestones: MilestoneRow[]
  noMilestone: number
} {
  const rows = new Map<string, MilestoneRow>()
  let noMilestone = 0
  for (const { milestone } of issues) {
    if (!milestone) {
      noMilestone++
      continue
    }
    const row = rows.get(milestone.id) ?? { ...milestone, remaining: 0 }
    row.remaining++
    rows.set(milestone.id, row)
  }
  const milestones = [...rows.values()].sort(
    (a, b) => a.progress - b.progress || a.name.localeCompare(b.name, 'ko'),
  )
  return { milestones, noMilestone }
}
