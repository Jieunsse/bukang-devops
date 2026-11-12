// 이용 통계 기간. 크루런 프론트 entities/usage-stats/model/period.ts에서 가져왔다(직접 고르기는 뺐다).
// GA4 기본 보고서는 반영에 하루 이상 걸려서, 기간은 어제에서 끝난다.
// 날짜는 한국 시간 기준 'YYYY-MM-DD'다 (GA4 속성 시간대와 맞춘다).

export type StatsPeriodKind = '7d' | '30d'

export const STATS_PERIOD_ITEMS: { value: StatsPeriodKind; label: string }[] = [
  { value: '7d', label: '지난 7일' },
  { value: '30d', label: '지난 30일' },
]

export type DateSpan = { start: string; end: string }

export type StatsPeriod = {
  current: DateSpan
  /** 고른 기간과 길이가 같은 바로 앞 기간 */
  previous: DateSpan
}

const DAY_MS = 24 * 60 * 60 * 1000

// 'YYYY-MM-DD'를 UTC 자정으로 다뤄 서버 시간대와 상관없이 날짜만 더하고 뺀다
const toDay = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / DAY_MS
const fromDay = (day: number) => new Date(day * DAY_MS).toISOString().slice(0, 10)

/** 지금 한국 날짜 'YYYY-MM-DD' */
export function seoulToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(now)
}

/** 주소의 period 값을 기간 종류로 읽는다. 모르는 값은 지난 7일 */
export function parseStatsPeriodKind(value: string | string[] | undefined): StatsPeriodKind {
  return value === '30d' ? '30d' : '7d'
}

/** 고른 기간과 앞 기간을 날짜로 푼다 */
export function resolveStatsPeriod(kind: StatsPeriodKind, today: string): StatsPeriod {
  const end = toDay(today) - 1
  const length = kind === '7d' ? 7 : 30
  const start = end - length + 1
  return {
    current: { start: fromDay(start), end: fromDay(end) },
    previous: { start: fromDay(start - length), end: fromDay(start - 1) },
  }
}

/** 기간 안의 날짜를 처음부터 차례로 */
export function spanDates({ start, end }: DateSpan): string[] {
  const dates: string[] = []
  for (let day = toDay(start); day <= toDay(end); day++) dates.push(fromDay(day))
  return dates
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/** '2026-10-26' → '10/26' */
export function formatStatsDay(iso: string): string {
  return `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`
}

/** '2026-10-26' → '10/26 (월)' */
export function formatStatsDayWithWeekday(iso: string): string {
  return `${formatStatsDay(iso)} (${WEEKDAYS[new Date(`${iso}T00:00:00Z`).getUTCDay()]})`
}
