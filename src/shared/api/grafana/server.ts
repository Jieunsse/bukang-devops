// 그라파나를 거쳐 프로메테우스에 질의한다. 토큰을 쓰므로 서버에서만 불러온다.
import 'server-only'

import type { GrafanaConfig } from './config'

export { readGrafanaConfig } from './config'
export type { GrafanaConfig } from './config'

/** 그라파나에 등록된 프로메테우스 데이터 소스의 uid */
const DATASOURCE_UID = 'prometheus'
/** 그라파나가 늦게 답해도 화면이 오래 멈추지 않게 한다 */
const CALL_TIMEOUT_MS = 10_000
/** 같은 질의는 1분 동안 다시 부르지 않는다 */
const REVALIDATE_SECONDS = 60

export type Sample = { labels: Record<string, string>; value: number }

/** 지금 시점 값 하나씩(instant vector)을 받는다 */
export async function queryPrometheus(config: GrafanaConfig, promql: string): Promise<Sample[]> {
  const url = `${config.url}/api/datasources/proxy/uid/${DATASOURCE_UID}/api/v1/query?query=${encodeURIComponent(promql)}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${config.token}` },
    signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
    next: { revalidate: REVALIDATE_SECONDS },
  })
  if (!res.ok) throw new Error(`그라파나 응답 ${res.status}`)
  const body = (await res.json()) as {
    status: string
    data?: { result?: { metric: Record<string, string>; value: [number, string] }[] }
  }
  if (body.status !== 'success') throw new Error('프로메테우스 질의 실패')
  return (body.data?.result ?? []).map((r) => ({ labels: r.metric, value: Number(r.value[1]) }))
}
