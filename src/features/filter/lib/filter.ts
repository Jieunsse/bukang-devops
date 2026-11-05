import type { Issue } from '@/shared/api/linear'

/** 「담당 없음」「마일스톤 없음」을 고를 때 주소에 남기는 값 */
export const NONE = 'none'

export const FILTER_KEYS = ['assignee', 'label', 'milestone'] as const
export type FilterKey = (typeof FILTER_KEYS)[number]
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

/** '?'를 뺀 주소 뒷부분. 고른 것이 없으면 빈 문자열 */
export function toSearch(filters: Filters): string {
  const params = new URLSearchParams()
  for (const key of FILTER_KEYS) {
    const value = filters[key]
    if (value) params.set(key, value)
  }
  return params.toString()
}

const matches = (id: string | undefined, wanted: string | undefined) =>
  wanted === undefined || (wanted === NONE ? id === undefined : id === wanted)

export function applyFilters(issues: Issue[], filters: Filters): Issue[] {
  return issues.filter(
    (issue) =>
      matches(issue.assignee?.id, filters.assignee) &&
      matches(issue.milestone?.id, filters.milestone) &&
      (filters.label === undefined || issue.labels.some((l) => l.id === filters.label)),
  )
}
