import { daysBetween, formatMonthDay, weekdayOf, type DateString } from '@/shared/lib/date'

export const PROJECT_START = '2026-10-28'
export const FINAL_PRESENTATION = '2026-11-23'
const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']

/** 최종 발표까지 남은 날과, 프로젝트 시작일부터 지난 비율(0~1) */
export function presentationCountdown(today: DateString) {
  const total = daysBetween(PROJECT_START, FINAL_PRESENTATION)
  const elapsed = Math.min(total, Math.max(0, daysBetween(PROJECT_START, today)))
  return {
    dateLabel: `${formatMonthDay(FINAL_PRESENTATION)}(${WEEKDAY[weekdayOf(FINAL_PRESENTATION)]})`,
    daysLeft: Math.max(0, daysBetween(today, FINAL_PRESENTATION)),
    elapsedRatio: elapsed / total,
  }
}
