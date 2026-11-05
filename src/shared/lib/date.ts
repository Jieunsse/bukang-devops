// 날짜는 모두 'YYYY-MM-DD' 문자열로 다룬다. 문자열 비교가 곧 날짜 비교다.
// 한국은 서머타임이 없어 UTC+9를 그대로 더한다.
const KST_OFFSET_MS = 9 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

export type DateString = string

/** 어떤 시각이 한국 시간으로 며칠인지 */
export function kstDate(instant: string | number | Date): DateString {
  return new Date(new Date(instant).getTime() + KST_OFFSET_MS).toISOString().slice(0, 10)
}

const toUtcMs = (date: DateString) => Date.parse(`${date}T00:00:00Z`)

export function addDays(date: DateString, days: number): DateString {
  return new Date(toUtcMs(date) + days * DAY_MS).toISOString().slice(0, 10)
}

/** 0 = 일요일 */
export function weekdayOf(date: DateString): number {
  return new Date(toUtcMs(date)).getUTCDay()
}

/** from에서 to까지 며칠인지. to가 앞이면 음수 */
export function daysBetween(from: DateString, to: DateString): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS)
}

/** '2026-11-05' → '11/5' */
export function formatMonthDay(date: DateString): string {
  const [, m, d] = date.split('-')
  return `${Number(m)}/${Number(d)}`
}

/** 한국 시간 '11/5 14:03' */
export function formatKstDateTime(instant: string | number | Date): string {
  const iso = new Date(new Date(instant).getTime() + KST_OFFSET_MS).toISOString()
  return `${formatMonthDay(iso.slice(0, 10))} ${iso.slice(11, 16)}`
}
