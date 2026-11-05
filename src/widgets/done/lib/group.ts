import { NONE } from '@/features/filter'
import type { DoneIssue, Member } from '@/shared/api/linear'

export type DoneGroup = {
  id: string
  name: string
  avatarUrl?: string | null
  completed: number
  canceled: number
  issues: DoneIssue[]
}

/** 완료가 많은 사람부터, 담당 없음은 맨 아래. 묶음 안은 닫은 날이 최근인 것부터다. */
export function groupDone(issues: DoneIssue[], members: Member[] = []): DoneGroup[] {
  const groups = new Map<string, DoneGroup>()
  // 완료·취소가 0건인 팀원도 묶음을 둔다.
  for (const { id, name, avatarUrl } of members) {
    groups.set(id, { id, name, avatarUrl, completed: 0, canceled: 0, issues: [] })
  }
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
