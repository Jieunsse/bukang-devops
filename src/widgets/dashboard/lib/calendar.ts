import type { Issue } from '@/shared/api/linear'
import type { DateString } from '@/shared/lib/date'

/** 날짜마다 그날 기한인 티켓 수. 기한 없는 티켓은 세지 않는다. */
export function dueCountsByDate(issues: Issue[]): Map<DateString, number> {
  const counts = new Map<DateString, number>()
  for (const { dueDate } of issues) {
    if (dueDate) counts.set(dueDate, (counts.get(dueDate) ?? 0) + 1)
  }
  return counts
}
