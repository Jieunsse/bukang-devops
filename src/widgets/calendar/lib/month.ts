import type { Issue } from '@/shared/api/linear'
import type { Schedule } from '@/shared/api/schedule'
import { addDays, daysBetween, weekdayOf, type DateString } from '@/shared/lib/date'

// 대시보드(presentation.ts)·타임라인과 같은 값이다. 위젯끼리는 서로 가져오지 않아서 여기 따로 둔다.
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

/** 보이는 날짜마다 그날 걸친 일정. 기간 일정은 시작일부터 종료일까지 모든 날에 넣는다. */
export function schedulesByDate(
  schedules: Schedule[],
  days: DateString[],
): Map<DateString, Schedule[]> {
  const byDate = new Map<DateString, Schedule[]>()
  for (const date of days) {
    const on = schedules.filter((s) => s.start <= date && date <= s.end)
    if (on.length > 0) byDate.set(date, on)
  }
  return byDate
}

/** 일정을 끌어 온 날짜(from)에서 놓은 날짜(to)까지 떨어진 날 수만큼 시작일·종료일을 함께 옮긴다. */
export function moveRange(
  range: { start: DateString; end: DateString },
  from: DateString,
  to: DateString,
): { start: DateString; end: DateString } {
  const days = daysBetween(from, to)
  return { start: addDays(range.start, days), end: addDays(range.end, days) }
}
