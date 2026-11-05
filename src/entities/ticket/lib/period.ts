import type { Cycle } from '@/shared/api/linear'
import {
  addDays,
  daysBetween,
  formatDayWithWeekday,
  formatMonthDay,
  kstDate,
  weekdayOf,
  type DateString,
} from '@/shared/lib/date'

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

/** 「사이클 1 · 11/9~11/15」, 사이클 밖이면 「사이클 밖 · 11/5~11/8」 */
export function periodLabel(period: Period): string {
  const range = `${formatMonthDay(period.start)}~${formatMonthDay(period.end)}`
  if (period.kind === 'outside') return `사이클 밖 · ${range}`
  const { number, name } = period.cycle
  return `사이클 ${number}${name ? ` ${name}` : ''} · ${range}`
}

export type PeriodText = {
  /** 「사이클 7」, 사이클 밖이면 「사이클 8 시작 전」(다음 사이클이 없으면 「사이클 밖 기간」) */
  name: string
  /** 「11/9(월) ~ 11/15(일)」 */
  range: string
  /** 「3일째 / 7일」 */
  day: string
}

/** 대시보드와 사이클 페이지가 같이 쓰는 기간 표시 문구 */
export function periodText(
  period: Period,
  cycles: Cycle[],
  now: string | number | Date,
): PeriodText {
  const today = kstDate(now)
  const nowMs = new Date(now).getTime()
  let name: string
  if (period.kind === 'cycle') {
    const { number, name: cycleName } = period.cycle
    name = `사이클 ${number}${cycleName ? ` ${cycleName}` : ''}`
  } else {
    const next = cycles
      .filter((c) => Date.parse(c.startsAt) > nowMs)
      .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0]
    name = next ? `사이클 ${next.number} 시작 전` : '사이클 밖 기간'
  }
  return {
    name,
    range: `${formatDayWithWeekday(period.start)} ~ ${formatDayWithWeekday(period.end)}`,
    day: `${daysBetween(period.start, today) + 1}일째 / ${daysBetween(period.start, period.end) + 1}일`,
  }
}
