import { daysBetween, formatMonthDay, weekdayOf, type DateString } from '@/shared/lib/date'

export const FINAL_PRESENTATION = '2026-11-23'
const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']

/** 최종 발표 날짜와 남은 날(D-n, 당일 D-day, 지나면 D+n) */
export function presentationCountdown(today: DateString) {
  const days = daysBetween(today, FINAL_PRESENTATION)
  return {
    dateLabel: `${formatMonthDay(FINAL_PRESENTATION)}(${WEEKDAY[weekdayOf(FINAL_PRESENTATION)]})`,
    dDay: days === 0 ? 'D-day' : days > 0 ? `D-${days}` : `D+${-days}`,
  }
}
