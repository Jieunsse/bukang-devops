import type { Issue } from '@/shared/api/linear'
import { addDays, weekdayOf, type DateString } from '@/shared/lib/date'

// 머리 영역(AppHeader)의 값과 같다. 공통 파일을 고치지 않으려고 여기 따로 둔다.
export const FINAL_PRESENTATION = '2026-11-23'

/** 'YYYY-MM' */
export type Month = string

export function shiftMonth(month: Month, delta: number): Month {
  const y = Number(month.slice(0, 4))
  const m = Number(month.slice(5, 7))
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7)
}

export function monthLabel(month: Month): string {
  return `${Number(month.slice(0, 4))}년 ${Number(month.slice(5, 7))}월`
}

/** 월요일에 시작하는 주(7칸)들. 첫 주와 마지막 주는 앞뒤 달 날짜로 채운다. */
export function monthWeeks(month: Month): DateString[][] {
  const first = `${month}-01`
  const last = addDays(`${shiftMonth(month, 1)}-01`, -1)
  let day = addDays(first, -((weekdayOf(first) + 6) % 7))
  const weeks: DateString[][] = []
  while (day <= last) {
    weeks.push(Array.from({ length: 7 }, (_, d) => addDays(day, d)))
    day = addDays(day, 7)
  }
  return weeks
}

export function issuesByDate(issues: Issue[]): Map<DateString, Issue[]> {
  const byDate = new Map<DateString, Issue[]>()
  for (const issue of issues) {
    if (issue.dueDate) byDate.set(issue.dueDate, [...(byDate.get(issue.dueDate) ?? []), issue])
  }
  return byDate
}

// 담당자를 구분하는 색. 기한 상태 색(빨강·주황)과 섞이지 않는 색만 쓴다.
const PALETTE = [
  'bg-sky-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-lime-500',
  'bg-indigo-500',
  'bg-fuchsia-500',
]
export const NO_ASSIGNEE_COLOR = 'bg-muted'

/** 담당자 id 순서로 색을 준다. 필터 전 전체 목록으로 만들어 필터를 바꿔도 색이 그대로다. */
export function assigneeColors(issues: Issue[]): Map<string, string> {
  const ids = [...new Set(issues.flatMap((i) => (i.assignee ? [i.assignee.id] : [])))].sort()
  return new Map(ids.map((id, n) => [id, PALETTE[n % PALETTE.length] ?? NO_ASSIGNEE_COLOR]))
}
