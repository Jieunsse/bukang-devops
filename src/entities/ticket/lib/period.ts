import type { Cycle } from '@/shared/api/linear'
import { addDays, kstDate, weekdayOf, type DateString } from '@/shared/lib/date'

/** 「이번 주」로 보는 기간. 지금 사이클이 없으면 오늘부터 이번 주 일요일까지다. */
export type Period =
  | { kind: 'cycle'; cycle: Cycle; start: DateString; end: DateString }
  | { kind: 'outside'; start: DateString; end: DateString }

export function currentPeriod(now: string | number | Date, cycles: Cycle[]): Period {
  const nowMs = new Date(now).getTime()
  const active = cycles.find((c) => Date.parse(c.startsAt) <= nowMs && nowMs < Date.parse(c.endsAt))
  if (active) {
    return {
      kind: 'cycle',
      cycle: active,
      start: kstDate(active.startsAt),
      // 끝 시각은 사이클에 들지 않는다. 그 직전 순간이 속한 날이 마지막 날이다.
      end: kstDate(Date.parse(active.endsAt) - 1),
    }
  }

  const today = kstDate(nowMs)
  let end = addDays(today, (7 - weekdayOf(today)) % 7)
  // 일요일 전에 다음 사이클이 시작하면 그 전날까지만 사이클 밖이다.
  for (const c of cycles) {
    if (Date.parse(c.startsAt) <= nowMs) continue
    const dayBefore = addDays(kstDate(c.startsAt), -1)
    if (dayBefore < end) end = dayBefore
  }
  return { kind: 'outside', start: today, end: end < today ? today : end }
}
