import type { Cycle } from '@/shared/api/linear'
import {
  addDays,
  daysBetween,
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

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']
const withWeekday = (date: DateString) => `${formatMonthDay(date)}(${WEEKDAY[weekdayOf(date)]})`
const cycleName = (c: Cycle) => `사이클 ${c.number}${c.name ? ` ${c.name}` : ''}`

/** 지금 사이클 밖일 때 쓰는 이름. 「사이클 밖」 대신 다음 사이클을 기준으로 말한다. */
export function beforeCycleLabel(now: string | number | Date, cycles: Cycle[]): string {
  const nowMs = new Date(now).getTime()
  const next = [...cycles]
    .filter((c) => Date.parse(c.startsAt) > nowMs)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0]
  return next ? `${cycleName(next)} 시작 전` : '사이클 없음'
}

export type PeriodBadge = {
  /** 칩 글자. 사이클 안이면 「사이클 1」, 밖이면 「사이클 1 시작 전」 */
  chip: string
  inCycle: boolean
  /** 「11/9(월) ~ 11/15(일)」 */
  range: string
  /** 사이클 안일 때만 「3일째 / 7일」 */
  dayOf: string | null
}

/** 머리 영역에 보여 줄 지금 기간. */
export function periodBadge(now: string | number | Date, cycles: Cycle[]): PeriodBadge {
  const period = currentPeriod(now, cycles)
  const range = `${withWeekday(period.start)} ~ ${withWeekday(period.end)}`
  if (period.kind === 'outside') {
    return { chip: beforeCycleLabel(now, cycles), inCycle: false, range, dayOf: null }
  }
  const day = daysBetween(period.start, kstDate(now)) + 1
  const length = daysBetween(period.start, period.end) + 1
  return { chip: cycleName(period.cycle), inCycle: true, range, dayOf: `${day}일째 / ${length}일` }
}
