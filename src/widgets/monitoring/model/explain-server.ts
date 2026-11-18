import 'server-only'

import { unstable_cache, updateTag } from 'next/cache'

import { askClaude, createClaudeClient, readClaudeConfig } from '@/shared/api/claude/server'
import { GRAFANA_METRICS_TAG } from '@/shared/api/grafana/server'

import {
  buildExplainInput,
  EXPLAIN_SYSTEM,
  ExplanationSchema,
  type ExplanationText,
} from './explain'
import { loadMonitoring } from './load'

// AI 해석은 Linear 스냅샷처럼 서버 캐시에 둔다. 페이지에 들어올 때는 캐시만 읽고,
// 캐시가 비었을 때만 한 번 부른다. 시간이 지났다고 저절로 다시 부르지 않고, 새로고침 때만 새로 받는다.

export const EXPLAIN_TAG = 'monitoring-explain'
/** 새로고침은 서버 전체에서 1분에 한 번만 AI를 부른다 */
const ONE_MINUTE_MS = 60_000

export type Explanation = ExplanationText & { createdAt: string }
export type ExplanationResult =
  { status: 'notConfigured' } | { status: 'failed' } | { status: 'ok'; explanation: Explanation }

type Env = Record<string, string | undefined>

class ExplainFailed extends Error {}
// 실패 이유는 askClaude가 이미 서버 로그에 남긴다

/** 지표를 다시 읽어 AI에 보낸다. 실패하면 던진다(캐시에 실패를 넣지 않으려고) */
async function generate(env: Env): Promise<Explanation> {
  const config = readClaudeConfig(env)
  if (!config) throw new ExplainFailed('키 없음')
  const data = await loadMonitoring(env)
  if (data.status !== 'ok') throw new ExplainFailed('지표 없음')
  const result = await askClaude(createClaudeClient(config), config, {
    system: EXPLAIN_SYSTEM,
    user: JSON.stringify(buildExplainInput(data)),
    schema: ExplanationSchema,
  })
  if (!result.ok) throw new ExplainFailed(result.reason)
  return { ...result.value, createdAt: new Date().toISOString() }
}

// 새로고침에서 먼저 받은 값을 캐시에 넣을 때 쓴다(Linear primeNextSnapshot과 같은 방식)
let primed: Explanation | null = null
let cachedEnv: Env = process.env

/** 실패도 캐시에 둔다. 실패가 이어질 때 들어올 때마다 AI를 부르지 않게 하려고다(새로고침 1분 제한은 같다) */
type Cached = Explanation | { failedAt: string }

const readCache = unstable_cache(
  async (): Promise<Cached> => {
    const next = primed
    primed = null
    if (next) return next
    try {
      return await generate(cachedEnv)
    } catch {
      return { failedAt: new Date().toISOString() }
    }
  },
  ['monitoring-explain-v1'],
  // revalidate를 두지 않는다: 새로고침(updateTag) 전까지 같은 해석을 쓴다
  { tags: [EXPLAIN_TAG] },
)

async function readCached(env: Env): Promise<Cached | null> {
  if (!readClaudeConfig(env)) return null
  cachedEnv = env
  return readCache()
}

export async function getExplanation(env: Env = process.env): Promise<ExplanationResult> {
  const cached = await readCached(env)
  if (!cached) return { status: 'notConfigured' }
  return 'failedAt' in cached ? { status: 'failed' } : { status: 'ok', explanation: cached }
}

export type RefreshMonitoringResult =
  | { status: 'refreshed' }
  | { status: 'tooSoon'; secondsAgo: number }
  | { status: 'failed' }
  | { status: 'notConfigured' }

/** 지표 캐시와 해석을 새로 받는다. 해석은 새로 받은 뒤에만 바꾸고, 실패하면 직전 해석을 둔다 */
export async function refreshMonitoring(env: Env = process.env): Promise<RefreshMonitoringResult> {
  const current = await readCached(env)
  if (!current) return { status: 'notConfigured' }
  const elapsed =
    Date.now() - Date.parse('failedAt' in current ? current.failedAt : current.createdAt)
  if (elapsed < ONE_MINUTE_MS) {
    return { status: 'tooSoon', secondsAgo: Math.max(0, Math.floor(elapsed / 1000)) }
  }
  // 지표 캐시를 먼저 비워서, 화면 지표와 AI가 읽는 지표가 모두 지금 값이 되게 한다
  updateTag(GRAFANA_METRICS_TAG)
  try {
    primed = await generate(env)
  } catch {
    return { status: 'failed' }
  }
  updateTag(EXPLAIN_TAG)
  return { status: 'refreshed' }
}
