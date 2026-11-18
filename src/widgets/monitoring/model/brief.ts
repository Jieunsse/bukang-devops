import { seriesStats, type Series } from '@/shared/lib/chart'

import { hhmm } from './format'
import { JOB_NAMES } from './rows'

// 자동 브리핑. 최근 1시간 지표로 카드마다 한 줄 설명과 주의 문장을 숫자로 만든다.
// 병목은 보통 「요청 증가 → CPU → 응답 시간 → DB 연결 → 연결 대기 → 락 대기」 순서로 번지므로 그 순서로 보여 준다.

export type BriefKey = 'throughput' | 'cpu' | 'latency' | 'dbConn' | 'pending' | 'lock'
export type BriefUnit = 'reqps' | 'percentunit' | 's' | 'short'

export type BriefCard = {
  key: BriefKey
  title: string
  unit: BriefUnit
  series: Series[]
  caption: string
  /** 기준을 넘었을 때의 문장. 넘지 않았으면 null */
  alert: string | null
}

/** 주의로 볼 기준. 넘으면 카드와 맨 위 종합에 문장이 붙는다 */
export const THRESHOLDS = {
  /** 서버 오류(5xx) 비율. 1%를 넘으면 문제. 부하 테스트로 평소 값을 재면 바꾼다 */
  errorRatio: 0.01,
  cpu: 0.8,
  /** 응답 시간 95번째 백분위. 1초를 넘으면 문제. 부하 테스트로 평소 값을 재면 바꾼다 */
  latencySeconds: 1,
  dbConnRatio: 1,
  pending: 1,
  lockPerSecond: 1,
  /** 서버 자원. 그라파나 서버 대시보드의 빨강 단계와 같다 */
  memory: 0.9,
  disk: 0.9,
  swap: 0.25,
} as const

/** 서버 이름(node exporter instance) → 화면 이름 */
const SERVER_NAMES: Record<string, string> = {
  'ip-10-0-1-145': '앱 서버',
  '10.0.2.222:9100': '데이터 서버',
}

export const nameOf = (labels: Record<string, string>) =>
  (labels.job && JOB_NAMES[labels.job]) ||
  (labels.instance && SERVER_NAMES[labels.instance]) ||
  labels.job ||
  labels.instance ||
  '전체'

type Fmt = (v: number) => string

/** 가장 높았던 값과 그 시각 */
export function peakOf(s: Series): { value: number; at: number } | null {
  let best: { value: number; at: number } | null = null
  for (const [t, v] of s.points)
    if (v !== null && (best === null || v > best.value)) best = { value: v, at: t }
  return best
}

/** 기준 이상이 처음 나온 시각 */
export function firstAtOrAbove(s: Series, limit: number): number | null {
  return s.points.find(([, v]) => v !== null && v >= limit)?.[0] ?? null
}

/** 가장 높았던 순서로 앞의 n개 */
export function topByPeak(series: Series[], n: number): Series[] {
  return [...series].sort((a, b) => (peakOf(b)?.value ?? -1) - (peakOf(a)?.value ?? -1)).slice(0, n)
}

/** 「시작 값 → 최대 값(시각)」. unit은 숫자 바로 뒤에 붙는 말(건, 회) */
const startToPeak = (s: Series, f: Fmt, unit = '') => {
  const first = s.points.find(([, v]) => v !== null)?.[1]
  const peak = peakOf(s)
  if (first === undefined || first === null || !peak) return '기록 없음'
  return `${f(first)}${unit} → 최대 ${f(peak.value)}${unit}(${hhmm(peak.at)})`
}

export function buildBrief(
  input: Record<BriefKey, Series[] | null>,
  f: Record<BriefUnit, Fmt>,
): BriefCard[] {
  const cards: BriefCard[] = []
  const missing = (key: BriefKey, title: string, unit: BriefUnit) =>
    cards.push({ key, title, unit, series: [], caption: '지표를 받지 못했어요', alert: null })

  // ① 처리량
  if (input.throughput) {
    const s = input.throughput[0]
    cards.push({
      key: 'throughput',
      title: '처리량',
      unit: 'reqps',
      series: input.throughput,
      caption: s ? `초당 ${startToPeak(s, f.reqps)}` : '요청 기록 없음',
      alert: null,
    })
  } else missing('throughput', '처리량', 'reqps')

  // ② CPU
  if (input.cpu) {
    const parts = input.cpu.map((s) => `${s.name} 최대 ${f.percentunit(peakOf(s)?.value ?? 0)}`)
    const hot = input.cpu
      .map((s) => ({ s, at: firstAtOrAbove(s, THRESHOLDS.cpu), peak: peakOf(s) }))
      .filter((x) => x.at !== null)
    cards.push({
      key: 'cpu',
      title: 'CPU',
      unit: 'percentunit',
      series: input.cpu,
      caption: parts.join(', ') || '기록 없음',
      alert: hot.length
        ? hot
            .map(
              (x) =>
                `${x.s.name} CPU가 ${hhmm(x.at!)}부터 ${f.percentunit(THRESHOLDS.cpu)}를 넘었어요(최대 ${f.percentunit(x.peak!.value)}).`,
            )
            .join(' ')
        : null,
    })
  } else missing('cpu', 'CPU', 'percentunit')

  // ③ 응답 시간(95%)
  if (input.latency) {
    const top = topByPeak(input.latency, 3)
    const worst = top[0]
    const peak = worst && peakOf(worst)
    cards.push({
      key: 'latency',
      title: '응답 시간(95%)',
      unit: 's',
      series: top,
      caption: worst ? `가장 느린 곳 ${worst.name}: ${startToPeak(worst, f.s)}` : '기록 없음',
      alert:
        worst && peak && peak.value > THRESHOLDS.latencySeconds
          ? `${worst.name} 응답 시간이 ${hhmm(peak.at)}에 ${f.s(peak.value)}까지 늘었어요.`
          : null,
    })
  } else missing('latency', '응답 시간(95%)', 's')

  // ④ DB 연결 사용률
  if (input.dbConn) {
    const top = topByPeak(input.dbConn, 3)
    const worst = top[0]
    const fullAt = worst ? firstAtOrAbove(worst, THRESHOLDS.dbConnRatio) : null
    cards.push({
      key: 'dbConn',
      title: 'DB 연결 사용률',
      unit: 'percentunit',
      series: top,
      caption: worst
        ? fullAt !== null
          ? `${worst.name}: ${hhmm(fullAt)}부터 연결을 모두 사용`
          : `가장 많이 쓴 곳 ${worst.name} 최대 ${f.percentunit(peakOf(worst)?.value ?? 0)}`
        : '기록 없음',
      alert:
        worst && fullAt !== null
          ? `${worst.name} 서비스가 ${hhmm(fullAt)}부터 DB 연결을 모두 썼어요.`
          : null,
    })
  } else missing('dbConn', 'DB 연결 사용률', 'percentunit')

  // ⑤ 연결 대기
  if (input.pending) {
    const top = topByPeak(input.pending, 3)
    const worst = top[0]
    const peak = worst && peakOf(worst)
    const waiting = Boolean(peak && peak.value >= THRESHOLDS.pending)
    cards.push({
      key: 'pending',
      title: 'DB 연결 대기',
      unit: 'short',
      series: top,
      caption: waiting ? `${worst!.name}: ${startToPeak(worst!, f.short, '건')}` : '대기 없음',
      alert: waiting
        ? `${worst!.name}에서 DB 연결을 기다리는 요청이 ${hhmm(peak!.at)}에 ${f.short(peak!.value)}건까지 쌓였어요.`
        : null,
    })
  } else missing('pending', 'DB 연결 대기', 'short')

  // ⑥ DB 행 락 대기
  if (input.lock) {
    const s = input.lock[0]
    const peak = s && peakOf(s)
    cards.push({
      key: 'lock',
      title: 'DB 행 락 대기',
      unit: 'short',
      series: input.lock,
      caption: !s
        ? '기록 없음'
        : peak && peak.value > 0
          ? `초당 ${startToPeak(s, f.short, '회')}`
          : '락 대기 없음',
      alert:
        peak && peak.value >= THRESHOLDS.lockPerSecond
          ? `MySQL 행 락 대기가 ${hhmm(peak.at)}에 초당 ${f.short(peak.value)}회까지 늘었어요.`
          : null,
    })
  } else missing('lock', 'DB 행 락 대기', 'short')

  return cards
}

/** 카드 아래 한 줄 요약에 쓰는 지금 값 */
export const latestOf = (s: Series) => seriesStats(s.points).latest

/** AI 입력용 시계열 요약. 숫자는 화면 표기 그대로의 문자열이고, unit은 카드 문장과 같은 단위(건·회)다 */
export function summarizeSeries(s: Series, f: Fmt, unit = '') {
  const values = s.points.filter(([, v]) => v !== null)
  const peak = peakOf(s)
  const latest = seriesStats(s.points).latest
  return {
    name: s.name,
    first: values[0]?.[1] == null ? null : f(values[0][1]) + unit,
    latest: latest === null ? null : f(latest) + unit,
    peak: peak ? f(peak.value) + unit : null,
    peakAt: peak ? hhmm(peak.at) : null,
  }
}

/** 카드 문장에서 숫자 뒤에 붙는 단위. AI 입력의 숫자에도 똑같이 붙인다 */
export const BRIEF_SUFFIX: Partial<Record<BriefKey, string>> = { pending: '건', lock: '회' }
