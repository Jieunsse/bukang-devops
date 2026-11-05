import type { Cycle } from '@/shared/api/linear'
import { kstDate, type DateString } from '@/shared/lib/date'

import type { DueTone } from './due-label'

/** 날짜 칸의 기한 색. 지난 날은 빨강, 오늘은 주황이다. */
export function dayTone(date: DateString, today: DateString): DueTone {
  if (date < today) return 'danger'
  return date === today ? 'warning' : 'default'
}

/** 사이클 기간(한국 날짜)에 드는지. 끝 시각은 사이클에 들지 않는다. */
export const inCycle = (date: DateString, cycles: Cycle[]) =>
  cycles.some((c) => kstDate(c.startsAt) <= date && date <= kstDate(Date.parse(c.endsAt) - 1))
