import { BRIEF_SUFFIX, latestOf, summarizeSeries, THRESHOLDS, type BriefKey } from './brief'
import { BRIEF_FORMAT, msText, percentText } from './format'
import type { MonitoringData } from './load'
import { verdictOf } from './verdict'

// 리포트에서 코드가 계산하는 부분. AI는 어느 지표를 볼지와 짧은 말만 정하고,
// 숫자·그래프·자원 막대·서비스 줄은 여기서 브리핑 데이터로 만든다. 그래서 화면 숫자와 리포트 숫자가 같다.

type Ok = Extract<MonitoringData, { status: 'ok' }>

export type ResourceMetric = 'memory' | 'disk' | 'swap'
export type WatchMetric = BriefKey | ResourceMetric
export type WatchItem = { metric: WatchMetric; target: string; title: string; note: string }

export type WatchCard = {
  title: string
  note: string
  /** 큰 숫자. 시계열은 최대값, 자원은 지금 값 */
  value: string
  /** 최대값 시각. 자원은 null */
  at: string | null
  sub: string
  /** 기준을 넘었는지 */
  danger: boolean
  points: [number, number | null][] | null
}

const pct = (v: number) => `${Math.round(v * 100)}%`

/**
 * 지표별 기준. inclusive는 기준과 같은 값도 문제로 보는지다. 상세 탭 브리핑(brief.ts)과 같게 둔다:
 * 응답 시간만 「초과」, 나머지는 「이상」. 처리량은 기준이 없다
 */
const LIMIT: Partial<Record<BriefKey, { value: number; text: string; inclusive: boolean }>> = {
  cpu: { value: THRESHOLDS.cpu, text: pct(THRESHOLDS.cpu), inclusive: true },
  latency: {
    value: THRESHOLDS.latencySeconds,
    text: msText(THRESHOLDS.latencySeconds),
    inclusive: false,
  },
  dbConn: { value: THRESHOLDS.dbConnRatio, text: pct(THRESHOLDS.dbConnRatio), inclusive: true },
  pending: { value: THRESHOLDS.pending, text: `${THRESHOLDS.pending}건`, inclusive: true },
  lock: {
    value: THRESHOLDS.lockPerSecond,
    text: `초당 ${THRESHOLDS.lockPerSecond}회`,
    inclusive: true,
  },
}

const isResource = (m: WatchMetric): m is ResourceMetric =>
  m === 'memory' || m === 'disk' || m === 'swap'

/** 기준까지 남은 양(%p) 또는 넘었다는 말 */
function headroom(v: number, limit: number) {
  return v >= limit
    ? `기준 ${pct(limit)}을 넘었어요`
    : `기준 ${pct(limit)}까지 ${((limit - v) * 100).toFixed(1)}%p`
}

export function resolveWatch(data: Ok, item: WatchItem): WatchCard | null {
  if (isResource(item.metric)) {
    const metric = item.metric
    // 못 찾으면 다른 서버 숫자를 대신 쓰지 않고 카드를 뺀다
    const row = data.resources.find((r) => r.name === item.target)
    const v = row?.[metric]
    if (v === null || v === undefined) return null
    const limit = THRESHOLDS[metric]
    return {
      title: item.title,
      note: item.note,
      value: percentText(v),
      at: null,
      sub: headroom(v, limit),
      danger: v >= limit,
      points: null,
    }
  }
  const card = data.brief.find((c) => c.key === item.metric)
  // 못 찾으면 다른 대상 숫자를 대신 쓰지 않고 카드를 뺀다(AI 제목과 숫자가 어긋나지 않게)
  const series = card?.series.find((s) => s.name === item.target)
  if (!card || !series) return null
  const s = summarizeSeries(series, BRIEF_FORMAT[card.unit], BRIEF_SUFFIX[card.key])
  if (s.peak === null) return null
  const limit = LIMIT[card.key]
  const peakValue = Math.max(...series.points.map(([, v]) => v ?? -Infinity))
  return {
    title: item.title,
    note: item.note,
    value: s.peak,
    at: s.peakAt,
    sub: limit ? `지금 ${s.latest ?? '-'} · 기준 ${limit.text}` : `지금 ${s.latest ?? '-'}`,
    danger: limit ? (limit.inclusive ? peakValue >= limit.value : peakValue > limit.value) : false,
    points: series.points,
  }
}

export type ResourceBar = { label: string; ratio: number; limit: number; text: string }

/** 서버별 CPU·메모리·디스크(·스왑)와 DB 연결(브리핑 상위 3곳 중 지금 가장 많이 쓰는 곳)을 기준과 함께 막대로 */
export function resourceBars(data: Ok): ResourceBar[] {
  const cpu = data.brief.find((c) => c.key === 'cpu')
  const bars: ResourceBar[] = []
  for (const r of data.resources) {
    const c = cpu?.series.find((s) => s.name === r.name)
    const cpuNow = c ? latestOf(c) : null
    if (cpuNow !== null) {
      bars.push({
        label: `${r.name} CPU`,
        ratio: cpuNow,
        limit: THRESHOLDS.cpu,
        text: BRIEF_FORMAT.percentunit(cpuNow),
      })
    }
    if (r.memory !== null)
      bars.push({
        label: `${r.name} 메모리`,
        ratio: r.memory,
        limit: THRESHOLDS.memory,
        text: percentText(r.memory),
      })
    if (r.disk !== null)
      bars.push({
        label: `${r.name} 디스크`,
        ratio: r.disk,
        limit: THRESHOLDS.disk,
        text: percentText(r.disk),
      })
    if (r.swap !== null)
      bars.push({
        label: `${r.name} 스왑`,
        ratio: r.swap,
        limit: THRESHOLDS.swap,
        text: percentText(r.swap),
      })
  }
  const db = data.brief.find((c) => c.key === 'dbConn')
  const dbNow = db?.series.map(latestOf).filter((v): v is number => v !== null)
  if (dbNow?.length) {
    const v = Math.max(...dbNow)
    bars.push({
      label: 'DB 연결 최대',
      ratio: v,
      limit: THRESHOLDS.dbConnRatio,
      text: BRIEF_FORMAT.percentunit(v),
    })
  }
  return bars
}

export function serviceLine(data: Ok): string {
  const problems = verdictOf(data.services, data.targets).problemServices
  return problems.length
    ? `문제 ${problems.length}곳: ${problems.join(', ')}`
    : `특이 사항 없음 · ${data.services.length}곳 정상`
}

/** 할 일의 탭 이름(서버, JVM …)을 대시보드 주소로. 이름이 「부하 테스트(k6)」처럼 길어도 앞부분으로 맞춘다 */
export function tabHref(tab: string, links: { uid: string; name: string }[]): string | null {
  const link = links.find((l) => l.name === tab || l.name.startsWith(tab))
  return link ? `/monitoring/${link.uid}` : null
}
