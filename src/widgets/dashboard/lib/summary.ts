import { bucketOf, type BucketRange } from '@/entities/ticket'
import { NONE } from '@/features/filter'
import type { Issue, Member } from '@/shared/api/linear'

export type AssigneeLoad = {
  id: string
  name: string
  avatarUrl?: string | null
  overdue: number
  /** 오늘을 포함한다 */
  thisWeek: number
  /** 이번 주(사이클 또는 사이클 밖 기간) 다음부터 */
  later: number
  noDue: number
  total: number
}

/** 막대 구간 순서와 이름. 색은 화면이 정한다. */
export const SEGMENT_LABEL = {
  overdue: '기한 지남',
  thisWeek: '이번 주',
  later: '다음 주 이후',
  noDue: '기한 없음',
} as const
export type Segment = keyof typeof SEGMENT_LABEL

/** 0이 아닌 구간만 「이번 주 6 · 다음 주 이후 9」처럼 이어 쓴다. */
export function segmentText(row: AssigneeLoad): string {
  return (Object.keys(SEGMENT_LABEL) as Segment[])
    .filter((key) => row[key] > 0)
    .map((key) => `${SEGMENT_LABEL[key]} ${row[key]}`)
    .join(' · ')
}

/** 담당자마다 남은 티켓을 세고, 많은 사람부터 둔다. 담당 없음은 맨 아래다. */
export function assigneeLoad(
  issues: Issue[],
  range: BucketRange,
  members: Member[] = [],
): AssigneeLoad[] {
  const rows = new Map<string, AssigneeLoad>()
  // 남은 티켓이 0건인 팀원도 0건 줄로 둔다.
  for (const { id, name, avatarUrl } of members) {
    rows.set(id, { id, name, avatarUrl, overdue: 0, thisWeek: 0, later: 0, noDue: 0, total: 0 })
  }
  for (const issue of issues) {
    const { id, name, avatarUrl } = issue.assignee ?? { id: NONE, name: '담당 없음' }
    const row = rows.get(id) ?? {
      id,
      name,
      avatarUrl,
      overdue: 0,
      thisWeek: 0,
      later: 0,
      noDue: 0,
      total: 0,
    }
    const bucket = bucketOf(issue.dueDate, range)
    if (bucket === 'overdue') row.overdue++
    else if (bucket === 'today' || bucket === 'thisWeek') row.thisWeek++
    else if (bucket === 'later') row.later++
    else row.noDue++
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
