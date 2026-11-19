// 모니터링 기간. 그라파나 시간 범위 목록처럼 고르고, 주소 ?range= 로 남겨 링크와 탭 이동에 그대로 따라간다.
// 지표는 프로메테우스가 15일 보관하므로 저장은 새로 만들지 않고, 고른 기간으로 query_range를 부른다.

/** 프로메테우스 수집 간격(크루런 레포 infra/monitoring-node/prometheus.yml의 scrape_interval) */
export const SCRAPE_SECONDS = 15
/** 그래프 하나에 찍을 점 개수 */
const POINTS = 240

/** 기간 ÷ 240. 수집 간격보다 촘촘히 물으면 같은 값이 반복될 뿐이라 그보다 줄이지 않는다 */
const stepFor = (seconds: number) => Math.max(SCRAPE_SECONDS, Math.ceil(seconds / POINTS))
const range = (label: string, seconds: number) => ({ label, seconds, step: stepFor(seconds) })

const MIN = 60
const HOUR = 60 * MIN
const DAY = 24 * HOUR

// 7일보다 길게 고르면 보관 기간(15일) 끝이 비어 보일 수 있어 넣지 않는다
export const RANGES = {
  '5m': range('5분', 5 * MIN),
  '15m': range('15분', 15 * MIN),
  '30m': range('30분', 30 * MIN),
  '1h': range('1시간', HOUR),
  '3h': range('3시간', 3 * HOUR),
  '6h': range('6시간', 6 * HOUR),
  '12h': range('12시간', 12 * HOUR),
  '24h': range('24시간', DAY),
  '2d': range('2일', 2 * DAY),
  '7d': range('7일', 7 * DAY),
}
export type RangeKey = keyof typeof RANGES
export const DEFAULT_RANGE: RangeKey = '1h'

export const parseRange = (v: unknown): RangeKey =>
  typeof v === 'string' && Object.hasOwn(RANGES, v) ? (v as RangeKey) : DEFAULT_RANGE

/** 서버·브라우저 캐시 시간. 긴 기간은 마지막 1분이 바뀌어도 그래프가 거의 같아 5분 둔다 */
export const cacheSecondsOf = (r: RangeKey) => (RANGES[r].seconds <= HOUR ? 60 : 5 * MIN)

/** 끝 시각(유닉스 초). 캐시 시간 단위로 맞춰야 그동안 질의 주소가 같아 캐시를 다시 쓴다 */
export const rangeEnd = (r: RangeKey, nowMs = Date.now()) => {
  const c = cacheSecondsOf(r)
  return Math.floor(nowMs / 1000 / c) * c
}

/** 지금 주소의 다른 값은 두고 기간만 바꾼다. 기본 기간이면 range를 뺀다 */
export function rangeHref(pathname: string, search: string, r: RangeKey) {
  const p = new URLSearchParams(search)
  if (r === DEFAULT_RANGE) p.delete('range')
  else p.set('range', r)
  const q = p.toString()
  return q ? `${pathname}?${q}` : pathname
}

const TIME = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})
const DATE = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Seoul',
  month: 'numeric',
  day: 'numeric',
})

/** 한국 시간 「20:56」, withDate면 「11/18 20:56」 */
export const clockText = (unixSeconds: number, withDate = false) => {
  const d = new Date(unixSeconds * 1000)
  return withDate ? `${DATE.format(d)} ${TIME.format(d)}` : TIME.format(d)
}

/** 그래프가 24시간 이상이면 시각에 날짜를 붙인다(자정을 넘으면 어제·오늘을 구분할 수 없어서) */
export const spansOverDay = (points: readonly (readonly [number, unknown])[]) =>
  points.length > 1 && points[points.length - 1]![0] - points[0]![0] >= DAY
