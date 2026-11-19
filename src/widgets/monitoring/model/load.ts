import 'server-only'

import {
  queryPrometheus,
  queryPrometheusRange,
  readGrafanaConfig,
  type GrafanaConfig,
  type Sample,
} from '@/shared/api/grafana/server'
import type { Series } from '@/shared/lib/chart'
import {
  cacheSecondsOf,
  DEFAULT_RANGE,
  RANGES,
  rangeEnd,
  type RangeKey,
} from '@/shared/lib/time-range'

import { BRIEF_FORMAT } from './format'
import { buildBrief, nameOf, type BriefCard, type BriefKey } from './brief'
import {
  toServiceRows,
  toTargets,
  toTrends,
  type ServiceRow,
  type Target,
  type TrendSeries,
} from './rows'

// 운영 서버 모니터링. 그라파나(읽기 전용 토큰)를 거쳐 프로메테우스에 질의한다.
// 질의마다 따로 실패한다. 실패한 지표는 null이고, 살아 있는지 질의가 실패하면 화면 전체를 실패로 본다.

const QUERIES = {
  up: 'up',
  rps: 'sum by (job) (rate(http_server_requests_seconds_count[5m]))',
  errors: 'sum by (job) (rate(http_server_requests_seconds_count{status=~"5.."}[5m]))',
  p95: 'histogram_quantile(0.95, sum by (job, le) (rate(http_server_requests_seconds_bucket[5m])))',
  heap: 'sum by (job) (jvm_memory_used_bytes{area="heap"})',
  // 팀 성능 요청 지표(서비스별 CPU·DB 연결 풀·응답 2초 실패·처리량·메모리).
  // 가상 사용자 수(k6_vus)는 k6 결과가 아직 운영 프로메테우스로 들어오지 않아 빠졌다. 들어오면 여기에 더한다
  rpsPeak: 'max_over_time(sum by (job) (rate(http_server_requests_seconds_count[2m]))[1h:1m])',
  // shortcut: 히스토그램에 2초 구간이 없어 가장 가까운 2.147초 구간을 쓴다. 2~2.147초 요청은 빠진다
  over2s:
    '1 - sum by (job) (rate(http_server_requests_seconds_bucket{le="2.147483647"}[5m])) / sum by (job) (rate(http_server_requests_seconds_count[5m]))',
  cpu: 'max by (job) (process_cpu_usage)',
  // 최대값이 없는 힙 영역은 -1이라 빼고 더한다
  heapRatio:
    'sum by (job) (jvm_memory_used_bytes{area="heap"}) / sum by (job) (jvm_memory_max_bytes{area="heap"} > 0)',
  dbActive: 'sum by (job) (hikaricp_connections_active)',
  dbMax: 'sum by (job) (hikaricp_connections_max)',
  dbPending: 'sum by (job) (hikaricp_connections_pending)',
  // 서버 자원. 그라파나 서버 대시보드의 메모리·디스크·스왑 사용률과 같은 식이다.
  // instance로 묶어 job 라벨을 지운다(job이 두 서버 모두 node라 이름이 겹친다). 디스크가 여러 개면 가장 찬 것
  memory: 'max by (instance) (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)',
  disk: 'max by (instance) (1 - node_filesystem_avail_bytes{mountpoint="/",fstype!="rootfs"} / node_filesystem_size_bytes{mountpoint="/",fstype!="rootfs"})',
  swap: 'max by (instance) (1 - node_memory_SwapFree_bytes / node_memory_SwapTotal_bytes)',
} as const

const TREND_QUERIES = {
  // 5xx가 한 번도 없는 서비스는 분자 시계열이 없어서, 요청 수 × 0 으로 0을 채운다
  errors: `(${QUERIES.errors} or ${QUERIES.rps} * 0) / ${QUERIES.rps}`,
  rps: QUERIES.rps,
  p95: QUERIES.p95,
  heap: QUERIES.heap,
} as const
export type TrendKind = keyof typeof TREND_QUERIES
export type Trends = Record<TrendKind, TrendSeries[] | null>

/**
 * 브리핑 질의(2분 구간 rate). 응답 시간 카드만 추이의 응답 시간(95%, 5분 구간·서비스만)을 그대로 쓴다.
 * 히스토그램 질의가 가장 무거워서(7일에 3초 넘게) 같은 질의를 두 번 보내지 않는다
 */
const BRIEF_QUERIES: Record<Exclude<BriefKey, 'latency'>, string> = {
  throughput: 'sum(rate(http_server_requests_seconds_count{job=~"gateway|.*-service"}[2m]))',
  cpu: '1 - avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[2m]))',
  dbConn: 'sum by (job) (hikaricp_connections_active) / sum by (job) (hikaricp_connections_max)',
  pending: 'sum by (job) (hikaricp_connections_pending)',
  lock: 'rate(mysql_global_status_innodb_row_lock_waits[2m])',
}

export type ServerResource = {
  name: string
  memory: number | null
  disk: number | null
  swap: number | null
}

export type MonitoringData =
  | { status: 'notConfigured' }
  | { status: 'failed' }
  | {
      status: 'ok'
      targets: Target[]
      services: ServiceRow[]
      trends: Trends
      brief: BriefCard[]
      /** 서버별 메모리·디스크·스왑 사용률(0~1). 못 받으면 null */
      resources: ServerResource[]
      partial: boolean
      fetchedAt: string
    }

type Window = { start: number; end: number; step: number; cache: number }

/** 고른 기간의 추이·병목 그래프. 브라우저가 기간을 바꿀 때 이것만 다시 받는다 */
export type RangedMetrics = {
  range: RangeKey
  trends: Trends
  brief: BriefCard[]
  partial: boolean
}

export async function loadRanged(config: GrafanaConfig, range: RangeKey): Promise<RangedMetrics> {
  const end = rangeEnd(range)
  const win: Window = {
    start: end - RANGES[range].seconds,
    end,
    step: RANGES[range].step,
    cache: cacheSecondsOf(range),
  }
  const keys = Object.keys(BRIEF_QUERIES) as Exclude<BriefKey, 'latency'>[]
  const [[errors, rps, p95, heap], briefSeries] = await Promise.all([
    Promise.all(
      (['errors', 'rps', 'p95', 'heap'] as const).map((kind) => settleTrend(config, kind, win)),
    ),
    Promise.all(keys.map((key) => settleBrief(config, key, win))),
  ])
  const brief = buildBrief(
    {
      ...(Object.fromEntries(keys.map((k, i) => [k, briefSeries[i] ?? null])) as Record<
        Exclude<BriefKey, 'latency'>,
        Series[] | null
      >),
      latency: p95?.map(({ name, points }) => ({ name, points })) ?? null,
    },
    BRIEF_FORMAT,
  )
  const trends: Trends = {
    errors: errors ?? null,
    rps: rps ?? null,
    p95: p95 ?? null,
    heap: heap ?? null,
  }
  return { range, trends, brief, partial: Object.values(trends).some((r) => r === null) }
}

/** 지금 상태(판정·서비스 표·상태판·자원)와 기간 그래프를 함께 받는다. 화면은 1시간으로 먼저 그린다 */
export async function loadMonitoring(
  env: Record<string, string | undefined> = process.env,
  range: RangeKey = DEFAULT_RANGE,
): Promise<MonitoringData> {
  const config = readGrafanaConfig(env)
  if (!config) return { status: 'notConfigured' }

  const names = Object.keys(QUERIES) as (keyof typeof QUERIES)[]
  const [m, ranged] = await Promise.all([
    Promise.all(names.map(async (name) => [name, await settle(config, name)] as const)).then(
      (entries) => Object.fromEntries(entries) as Record<keyof typeof QUERIES, Sample[] | null>,
    ),
    loadRanged(config, range),
  ])
  const { up, memory, disk, swap } = m
  if (!up) return { status: 'failed' }
  const targets = toTargets(up)
  return {
    status: 'ok',
    targets,
    services: toServiceRows(targets, m),
    trends: ranged.trends,
    brief: ranged.brief,
    resources: toResources({ memory, disk, swap }),
    partial:
      ranged.partial ||
      // 서버 자원(메모리·디스크·스왑)은 따로 「-」로 보여서 일부 지표 모름에 넣지 않는다
      names.filter((n) => !['up', 'memory', 'disk', 'swap'].includes(n)).some((n) => m[n] === null),
    fetchedAt: new Date().toISOString(),
  }
}

async function settle(config: GrafanaConfig, name: keyof typeof QUERIES) {
  try {
    return await queryPrometheus(config, QUERIES[name])
  } catch (e) {
    // 토큰은 오류에 들어 있지 않지만, 혹시 몰라 오류 문구만 남긴다
    console.error(`[grafana] ${name} 불러오기 실패: ${e instanceof Error ? e.message : String(e)}`)
    return null
  }
}

// shortcut: rate 구간은 기간과 상관없이 [2m]·[5m]이라, 긴 기간에서는 점 사이(최대 42분)의 순간 변화를 놓친다.
// 구간을 그래프 간격만큼 늘리면 7일 응답 시간 질의가 12초 넘게 걸려서 두었다. 기록 규칙(recording rule)을 만들면 늘린다
function queryWindow(config: GrafanaConfig, promql: string, win: Window) {
  const { cache, ...range } = win
  return queryPrometheusRange(config, promql, range, cache)
}

async function settleTrend(config: GrafanaConfig, kind: TrendKind, win: Window) {
  try {
    return toTrends(await queryWindow(config, TREND_QUERIES[kind], win))
  } catch (e) {
    console.error(
      `[grafana] ${kind} 추이 불러오기 실패: ${e instanceof Error ? e.message : String(e)}`,
    )
    return null
  }
}

async function settleBrief(
  config: GrafanaConfig,
  key: Exclude<BriefKey, 'latency'>,
  win: Window,
): Promise<Series[] | null> {
  try {
    const rows = await queryWindow(config, BRIEF_QUERIES[key], win)
    return rows.map((r) => ({
      name: key === 'lock' ? 'MySQL' : nameOf(r.labels),
      points: r.points.map(([t, v]): [number, number | null] => [t, Number.isFinite(v) ? v : null]),
    }))
  } catch (e) {
    console.error(
      `[grafana] 브리핑 ${key} 불러오기 실패: ${e instanceof Error ? e.message : String(e)}`,
    )
    return null
  }
}

/** 서버(instance)별로 메모리·디스크·스왑 사용률을 묶는다. 스왑이 없는 서버는 0/0이라 null이다 */
export function toResources(
  m: Record<'memory' | 'disk' | 'swap', Sample[] | null>,
): ServerResource[] {
  const by = new Map<string, ServerResource>()
  for (const key of ['memory', 'disk', 'swap'] as const) {
    for (const s of m[key] ?? []) {
      const name = nameOf(s.labels)
      const row = by.get(name) ?? { name, memory: null, disk: null, swap: null }
      row[key] = Number.isFinite(s.value) ? s.value : null
      by.set(name, row)
    }
  }
  return [...by.values()].sort((a, b) => a.name.localeCompare(b.name, 'ko'))
}
