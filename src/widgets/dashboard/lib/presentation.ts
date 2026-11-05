import { currentPeriod } from '@/entities/ticket'
import type { Cycle, Issue } from '@/shared/api/linear'
import { daysBetween, formatMonthDay, kstDate, weekdayOf, type DateString } from '@/shared/lib/date'

export const FINAL_PRESENTATION = '2026-11-23'
const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']
const withWeekday = (date: DateString) => `${formatMonthDay(date)}(${WEEKDAY[weekdayOf(date)]})`

/** 최종 발표 날짜와 남은 날(D-n, 당일 D-day, 지나면 D+n). daysLeft는 0 아래로 내려가지 않는다. */
export function presentationCountdown(today: DateString) {
  const days = daysBetween(today, FINAL_PRESENTATION)
  return {
    dateLabel: withWeekday(FINAL_PRESENTATION),
    dDay: days === 0 ? 'D-day' : days > 0 ? `D-${days}` : `D+${-days}`,
    daysLeft: Math.max(0, days),
  }
}

/** 하루 평균 끝내야 하는 티켓 수(소수 한 자리). 남은 날이 없으면 셀 수 없다. */
export function dailyPace(remaining: number, daysLeft: number): number | null {
  return daysLeft > 0 ? Math.round((remaining / daysLeft) * 10) / 10 : null
}

/** 맨 위 「지금 사이클」 카드. 이름 한 줄과 큰 값 하나, 마우스를 올리면 보이는 설명(hint)을 준다. */
export type CycleCard = { name: string; value: string; ratio: number | null; hint: string | null }

/**
 * 사이클 안이면 완료 비율을 보여 준다. 전체 수는 완료 수 + 그 사이클의 남은 티켓이다.
 * 사이클 밖이면 Linear가 완료 수를 주지 않아 다음 사이클 첫날까지 남은 날을 보여 준다.
 */
export function cycleProgress(
  now: string | number | Date,
  cycles: Cycle[],
  issues: Issue[],
): CycleCard {
  const period = currentPeriod(now, cycles)
  if (period.kind === 'cycle') {
    const completed = period.cycle.completedIssueCount ?? 0
    const total = completed + issues.filter((i) => i.cycle?.id === period.cycle.id).length
    const ratio = total === 0 ? 0 : completed / total
    return {
      name: `사이클 ${period.cycle.number} 진행률`,
      value: `${Math.round(ratio * 100)}%`,
      ratio,
      hint: `완료 ${completed} / 전체 ${total}`,
    }
  }
  const nowMs = new Date(now).getTime()
  const next = [...cycles]
    .filter((c) => Date.parse(c.startsAt) > nowMs)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0]
  if (!next) return { name: '다음 사이클', value: '없음', ratio: null, hint: null }
  const start = kstDate(next.startsAt)
  return {
    name: '다음 사이클까지',
    value: `D-${daysBetween(kstDate(nowMs), start)}`,
    ratio: null,
    hint: `사이클 ${next.number}${next.name ? ` ${next.name}` : ''} · ${withWeekday(start)} 시작`,
  }
}
