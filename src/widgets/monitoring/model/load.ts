import 'server-only'

import {
  queryPrometheus,
  queryPrometheusRange,
  readGrafanaConfig,
  type GrafanaConfig,
} from '@/shared/api/grafana/server'

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
} as const

/** 추이 그래프는 최근 1시간을 1분 간격으로 받는다 */
const TREND_WINDOW_SECONDS = 60 * 60
const TREND_STEP_SECONDS = 60
const TREND_QUERIES = { rps: QUERIES.rps, p95: QUERIES.p95, heap: QUERIES.heap } as const
export type TrendKind = keyof typeof TREND_QUERIES
export type Trends = Record<TrendKind, TrendSeries[] | null>

export type MonitoringData =
  | { status: 'notConfigured' }
  | { status: 'failed' }
  | {
      status: 'ok'
      targets: Target[]
      services: ServiceRow[]
      trends: Trends
      partial: boolean
      fetchedAt: string
    }

export async function loadMonitoring(
  env: Record<string, string | undefined> = process.env,
): Promise<MonitoringData> {
  const config = readGrafanaConfig(env)
  if (!config) return { status: 'notConfigured' }

  const [up, rps, errors, p95, heap] = await Promise.all([
    settle(config, 'up'),
    settle(config, 'rps'),
    settle(config, 'errors'),
    settle(config, 'p95'),
    settle(config, 'heap'),
  ])
  // 끝 시각을 1분 단위로 맞춰야 1분 동안 질의 주소가 같아 fetch 캐시를 다시 쓴다
  const end = Math.floor(Date.now() / 1000 / TREND_STEP_SECONDS) * TREND_STEP_SECONDS
  const range = { start: end - TREND_WINDOW_SECONDS, end, step: TREND_STEP_SECONDS }
  const [rpsTrend, p95Trend, heapTrend] = await Promise.all(
    (['rps', 'p95', 'heap'] as const).map((kind) => settleTrend(config, kind, range)),
  )
  if (!up) return { status: 'failed' }
  const targets = toTargets(up)
  return {
    status: 'ok',
    targets,
    services: toServiceRows(targets, { rps, errors, p95, heap }),
    trends: { rps: rpsTrend ?? null, p95: p95Trend ?? null, heap: heapTrend ?? null },
    partial: [rps, errors, p95, heap, rpsTrend, p95Trend, heapTrend].some((r) => r === null),
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
