import type { Issue } from '@/shared/api/linear'

import { NONE, type FilterKey } from './filter'

export type FilterOption = { id: string; name: string }

const uniqueSorted = (items: FilterOption[]) =>
  [...new Map(items.map((o) => [o.id, o])).values()].sort((a, b) =>
    a.name.localeCompare(b.name, 'ko'),
  )

/** 받아 둔 티켓에 실제로 있는 값만 고를 수 있게 한다. */
export function filterOptions(issues: Issue[]): Record<FilterKey, FilterOption[]> {
  return {
    assignee: [
      ...uniqueSorted(issues.flatMap((i) => (i.assignee ? [i.assignee] : []))),
      { id: NONE, name: '담당 없음' },
    ],
    label: uniqueSorted(issues.flatMap((i) => i.labels)),
    milestone: [
      ...uniqueSorted(issues.flatMap((i) => (i.milestone ? [i.milestone] : []))),
      { id: NONE, name: '마일스톤 없음' },
    ],
  }
}
