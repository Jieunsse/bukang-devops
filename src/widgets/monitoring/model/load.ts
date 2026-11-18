import 'server-only'

import { queryPrometheus, readGrafanaConfig, type GrafanaConfig } from '@/shared/api/grafana/server'

import { toServiceRows, toTargets, type ServiceRow, type Target } from './rows'

// 운영 서버 모니터링. 그라파나(읽기 전용 토큰)를 거쳐 프로메테우스에 질의한다.
// 질의마다 따로 실패한다. 실패한 지표는 null이고, 살아 있는지 질의가 실패하면 화면 전체를 실패로 본다.

const QUERIES = {
  up: 'up',
  rps: 'sum by (job) (rate(http_server_requests_seconds_count[5m]))',
  errors: 'sum by (job) (rate(http_server_requests_seconds_count{status=~"5.."}[5m]))',
  p95: 'histogram_quantile(0.95, sum by (job, le) (rate(http_server_requests_seconds_bucket[5m])))',
  heap: 'sum by (job) (jvm_memory_used_bytes{area="heap"})',
} as const

export type MonitoringData =
  | { status: 'notConfigured' }
  | { status: 'failed' }
  | { status: 'ok'; targets: Target[]; services: ServiceRow[]; partial: boolean; fetchedAt: string }

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
  if (!up) return { status: 'failed' }
  const targets = toTargets(up)
  return {
    status: 'ok',
    targets,
    services: toServiceRows(targets, { rps, errors, p95, heap }),
    partial: [rps, errors, p95, heap].some((r) => r === null),
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
