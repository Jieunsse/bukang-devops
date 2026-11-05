import { NONE } from '@/features/filter'
import type { DoneIssue } from '@/shared/api/linear'

export type DoneGroup = {
  id: string
  name: string
  avatarUrl?: string | null
  completed: number
  canceled: number
  issues: DoneIssue[]
}

/** 완료가 많은 사람부터, 담당 없음은 맨 아래. 묶음 안은 닫은 날이 최근인 것부터다. */
export function groupDone(issues: DoneIssue[]): DoneGroup[] {
  const groups = new Map<string, DoneGroup>()
  for (const issue of issues) {
    const { id, name, avatarUrl } = issue.assignee ?? { id: NONE, name: '담당 없음' }
    const group = groups.get(id) ?? { id, name, avatarUrl, completed: 0, canceled: 0, issues: [] }
    if (issue.state.type === 'canceled') group.canceled++
    else group.completed++
    group.issues.push(issue)
    groups.set(id, group)
  }
  for (const group of groups.values()) {
    group.issues.sort((a, b) => Date.parse(b.closedAt) - Date.parse(a.closedAt))
  }
  return [...groups.values()].sort(
    (a, b) =>
      Number(a.id === NONE) - Number(b.id === NONE) ||
      b.completed - a.completed ||
      a.name.localeCompare(b.name, 'ko'),
  )
}
