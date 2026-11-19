import 'server-only'

import {
  queryPrometheus,
  queryPrometheusRange,
  readGrafanaConfig,
  type GrafanaConfig,
  type Sample,
} from '@/shared/api/grafana/server'
import type { Series } from '@/shared/lib/chart'

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

/** 추이 그래프는 최근 1시간을 1분 간격으로 받는다 */
const TREND_WINDOW_SECONDS = 60 * 60
const TREND_STEP_SECONDS = 60
const TREND_QUERIES = {
  // 5xx가 한 번도 없는 서비스는 분자 시계열이 없어서, 요청 수 × 0 으로 0을 채운다
  errors: `(${QUERIES.errors} or ${QUERIES.rps} * 0) / ${QUERIES.rps}`,
  rps: QUERIES.rps,
  p95: QUERIES.p95,
  heap: QUERIES.heap,
} as const
export type TrendKind = keyof typeof TREND_QUERIES
export type Trends = Record<TrendKind, TrendSeries[] | null>

/** 브리핑 질의. 2분 구간 rate로 1분 간격 그래프를 그린다 */
const BRIEF_QUERIES: Record<BriefKey, string> = {
  throughput: 'sum(rate(http_server_requests_seconds_count{job=~"gateway|.*-service"}[2m]))',
  cpu: '1 - avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[2m]))',
  latency:
    'histogram_quantile(0.95, sum by (job, le) (rate(http_server_requests_seconds_bucket[2m])))',
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

export async function loadMonitoring(
  env: Record<string, string | undefined> = process.env,
): Promise<MonitoringData> {
  const config = readGrafanaConfig(env)
  if (!config) return { status: 'notConfigured' }

  const names = Object.keys(QUERIES) as (keyof typeof QUERIES)[]
  const m = Object.fromEntries(
    await Promise.all(names.map(async (name) => [name, await settle(config, name)] as const)),
  ) as Record<keyof typeof QUERIES, Sample[] | null>
  const { up, memory, disk, swap } = m
  // 끝 시각을 1분 단위로 맞춰야 1분 동안 질의 주소가 같아 fetch 캐시를 다시 쓴다
  const end = Math.floor(Date.now() / 1000 / TREND_STEP_SECONDS) * TREND_STEP_SECONDS
  const range = { start: end - TREND_WINDOW_SECONDS, end, step: TREND_STEP_SECONDS }
  const keys = Object.keys(BRIEF_QUERIES) as BriefKey[]
  const [[errorsTrend, rpsTrend, p95Trend, heapTrend], briefSeries] = await Promise.all([
    Promise.all(
      (['errors', 'rps', 'p95', 'heap'] as const).map((kind) => settleTrend(config, kind, range)),
    ),
    Promise.all(keys.map((key) => settleBrief(config, key, range))),
  ])
  const brief = buildBrief(
    Object.fromEntries(keys.map((k, i) => [k, briefSeries[i] ?? null])) as Record<
      BriefKey,
      Series[] | null
    >,
    BRIEF_FORMAT,
  )
  if (!up) return { status: 'failed' }
  const targets = toTargets(up)
  return {
    status: 'ok',
    targets,
    services: toServiceRows(targets, m),
    trends: {
      errors: errorsTrend ?? null,
      rps: rpsTrend ?? null,
      p95: p95Trend ?? null,
      heap: heapTrend ?? null,
    },
    brief,
    resources: toResources({ memory, disk, swap }),
    partial: [
      // 서버 자원(메모리·디스크·스왑)은 따로 「-」로 보여서 일부 지표 모름에 넣지 않는다
      ...names.filter((n) => !['up', 'memory', 'disk', 'swap'].includes(n)).map((n) => m[n]),
      errorsTrend,
      rpsTrend,
      p95Trend,
      heapTrend,
    ].some((r) => r === null),
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

async function settleTrend(
  config: GrafanaConfig,
  kind: TrendKind,
  range: { start: number; end: number; step: number },
) {
  try {
    return toTrends(await queryPrometheusRange(config, TREND_QUERIES[kind], range))
  } catch (e) {
    console.error(
      `[grafana] ${kind} 추이 불러오기 실패: ${e instanceof Error ? e.message : String(e)}`,
    )
    return null
  }
}

async function settleBrief(
  config: GrafanaConfig,
  key: BriefKey,
  range: { start: number; end: number; step: number },
): Promise<Series[] | null> {
  try {
    const rows = await queryPrometheusRange(config, BRIEF_QUERIES[key], range)
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
