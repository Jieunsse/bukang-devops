// GA4 Data API는 서비스 계정 키를 쓰므로 서버에서만 불러온다. 브라우저 코드가 import하면 빌드가 멈춘다.
// 크루런 프론트 shared/ga4에서 가져왔다. config·report·client는 그대로이고, 이 파일만 부캉이에 맞게 줄였다.
import 'server-only'

import { createGa4Reporter } from './client'
import { readGa4Config } from './config'
import type { Ga4Reporter } from './report'

export type { Ga4DateRange, Ga4Reporter, RealtimeOverview } from './report'

export type Ga4ReporterResult =
  | { status: 'ready'; reporter: Ga4Reporter }
  /** 키가 없다(로컬 개발 등). 화면에 「GA4 연결 정보가 없어요」를 보인다 */
  | { status: 'notConfigured' }
  /** 값의 형식이 틀렸다. 서버 로그에 어느 변수인지만 남긴다 */
  | { status: 'invalid' }

let cached: { key: string; reporter: Ga4Reporter } | undefined

export function getGa4Reporter(
  env: Record<string, string | undefined> = process.env,
): Ga4ReporterResult {
  const result = readGa4Config(env)
  if (result.status === 'missing') return { status: 'notConfigured' }
  if (result.status === 'invalid') {
    console.error(`[ga4] ${result.reason}`)
    return { status: 'invalid' }
  }
  // 키가 같으면 gRPC 연결을 다시 만들지 않는다
  const key = `${result.config.propertyId}:${result.config.credentials.client_email}`
  if (cached?.key !== key) cached = { key, reporter: createGa4Reporter(result.config) }
  return { status: 'ready', reporter: cached.reporter }
}
