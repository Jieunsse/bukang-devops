// 그라파나 연결 정보. 서버 환경 변수에서만 읽는다(NEXT_PUBLIC_ 없음 → 브라우저 번들에 들어가지 않는다).
// 토큰은 읽기 전용 서비스 계정 토큰이다. 값은 로그·오류 문구에 넣지 않는다.

export type GrafanaConfig = { url: string; token: string }

export function readGrafanaConfig(env: {
  GRAFANA_URL?: string
  GRAFANA_TOKEN?: string
}): GrafanaConfig | null {
  const url = env.GRAFANA_URL?.trim().replace(/\/+$/, '')
  const token = env.GRAFANA_TOKEN?.trim()
  if (!url || !token) return null
  return { url, token }
}
