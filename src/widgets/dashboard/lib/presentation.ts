import { currentPeriod, periodLabel } from '@/entities/ticket'
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

/** 지금 사이클의 완료 수와 전체 수. 사이클 밖이면 Linear가 완료 수를 주지 않아 다음 사이클 시작일을 준다. */
export function cycleProgress(now: string | number | Date, cycles: Cycle[], issues: Issue[]) {
  const period = currentPeriod(now, cycles)
  if (period.kind === 'cycle') {
    const completed = period.cycle.completedIssueCount ?? 0
    const remaining = issues.filter((i) => i.cycle?.id === period.cycle.id).length
    return {
      label: periodLabel(period),
      progress: { completed, total: completed + remaining },
      next: null,
    }
  }
  const nowMs = new Date(now).getTime()
  const next = [...cycles]
    .filter((c) => Date.parse(c.startsAt) > nowMs)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0]
  return {
    label: periodLabel(period),
    progress: null,
    next: next
      ? {
          title: `사이클 ${next.number}${next.name ? ` ${next.name}` : ''}`,
          start: withWeekday(kstDate(next.startsAt)),
        }
      : null,
  }
}
