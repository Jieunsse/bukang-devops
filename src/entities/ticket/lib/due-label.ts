import { daysBetween, formatMonthDay, type DateString } from '@/shared/lib/date'

/** 기한 세 단계 색. 지남 빨강, 오늘 주황, 그 밖 회색 */
export type DueTone = 'danger' | 'warning' | 'default'

export function dueLabel(
  dueDate: DateString | null,
  today: DateString,
): { text: string; tone: DueTone } {
  if (dueDate === null) return { text: '기한 없음', tone: 'default' }
  const days = daysBetween(today, dueDate)
  if (days < 0) return { text: `${-days}일 지남`, tone: 'danger' }
  if (days === 0) return { text: '오늘', tone: 'warning' }
  return { text: `${formatMonthDay(dueDate)} (D-${days})`, tone: 'default' }
}
