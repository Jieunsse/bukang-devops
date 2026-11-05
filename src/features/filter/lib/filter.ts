import type { Issue } from '@/shared/api/linear'

/** 「담당 없음」「마일스톤 없음」을 고를 때 주소에 남기는 값 */
export const NONE = 'none'

export const FILTER_KEYS = ['assignee', 'label', 'milestone'] as const
export type FilterKey = (typeof FILTER_KEYS)[number]

export const FIELD_LABEL: Record<FilterKey, string> = {
  assignee: '담당자',
  label: '라벨',
  milestone: '마일스톤',
}
/** 값은 Linear id. 고르지 않은 항목은 없다. */
export type Filters = Partial<Record<FilterKey, string>>

export function parseFilters(params: URLSearchParams): Filters {
  const filters: Filters = {}
  for (const key of FILTER_KEYS) {
    const value = params.get(key)
    if (value) filters[key] = value
  }
  return filters
}

/** '?'를 뺀 주소 뒷부분. current에 있던 필터 밖의 값(완료·취소 기간 등)은 남긴다. */
export function toSearch(filters: Filters, current?: URLSearchParams): string {
  const params = new URLSearchParams(current)
  for (const key of FILTER_KEYS) params.delete(key)
  for (const key of FILTER_KEYS) {
    const value = filters[key]
    if (value) params.set(key, value)
  }
  return params.toString()
}

const matches = (id: string | undefined, wanted: string | undefined) =>
  wanted === undefined || (wanted === NONE ? id === undefined : id === wanted)

export function applyFilters<T extends Issue>(issues: T[], filters: Filters): T[] {
  return issues.filter(
    (issue) =>
      matches(issue.assignee?.id, filters.assignee) &&
      matches(issue.milestone?.id, filters.milestone) &&
      (filters.label === undefined || issue.labels.some((l) => l.id === filters.label)),
  )
}

/** 담당자를 고르면 팀원 목록도 그 사람만 남긴다. 「담당 없음」을 고르면 팀원은 없다. */
export function visibleMembers<M extends { id: string }>(members: M[], filters: Filters): M[] {
  if (!filters.assignee) return members
  return members.filter((m) => m.id === filters.assignee)
}
