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
/**
 * 비용: Opus 5.5 출력 100만 토큰당 20달러. 한 번에 출력 약 2천 토큰이면 약 0.04달러이고, 생각 토큰만큼 더 든다.
 * 새로고침이 서버 전체 1분에 한 번이라 최악이어도 시간당 60번이다.
 */
// 짧은 조각만 쓰게 해서 effort를 low로 내리고 빨리 받는다. 생각 토큰도 한도에 들어가서 넉넉히 둔다
const REPORT_OPTIONS = { maxTokens: 3000, effort: 'low', timeoutMs: 60_000 } as const

export type Explanation = ExplanationText & { createdAt: string }
export type ExplanationResult =
  { status: 'notConfigured' } | { status: 'failed' } | { status: 'ok'; explanation: Explanation }

type Env = Record<string, string | undefined>

class ExplainFailed extends Error {}
// 실패 이유는 askClaude가 이미 서버 로그에 남긴다

/** 지표를 다시 읽어 AI에 보낸다. 실패하면 던진다 */
async function generate(env: Env): Promise<Explanation> {
  const config = readClaudeConfig(env)
  if (!config) throw new ExplainFailed('키 없음')
  // 화면에서 고른 기간과 상관없이 최근 1시간으로 만든다. 기간마다 만들면 AI 비용이 늘어서다
  const data = await loadMonitoring(env, '1h')
  if (data.status !== 'ok') throw new ExplainFailed('지표 없음')
  const result = await askClaude(
    createClaudeClient(config),
    config,
    {
      system: EXPLAIN_SYSTEM,
      user: JSON.stringify(buildExplainInput(data)),
      schema: ExplanationSchema,
    },
    REPORT_OPTIONS,
  )
  if (!result.ok) throw new ExplainFailed(result.reason)
  return { ...result.value, createdAt: new Date().toISOString() }
}

/**
 * 캐시에 두는 값. attemptedAt은 마지막으로 AI를 부르려 한 시각이다(성공·실패 모두).
 * 새로고침 1분 제한은 이 시각으로 잰다. 그래야 AI가 계속 실패해도 누르는 대로 다시 부르지 않는다.
 * explanation은 마지막으로 성공한 해석이다. 실패하면 직전 해석을 그대로 둔다.
 */
type Cached = { explanation: Explanation | null; attemptedAt: string }

// 다음 캐시 채우기에 쓸 값(Linear primeNextSnapshot과 같은 방식)
let primed: Cached | null = null
let cachedEnv: Env = process.env
// 이 서버 안에서 진행 중인 AI 호출. 동시에 온 요청은 이것을 함께 기다린다
let inflight: Promise<Cached> | null = null

// shortcut: 진행 중 호출을 묶는 건 서버 인스턴스 하나 안에서만이다. 인스턴스 여러 개가 동시에 캐시가 빈 것을
// 보면 인스턴스 수만큼 부를 수 있다. 트래픽이 늘면 Redis 같은 공용 저장소로 락을 건다.
function attempt(previous: Explanation | null): Promise<Cached> {
  inflight ??= (async () => {
    const attemptedAt = new Date().toISOString()
    try {
      return { explanation: await generate(cachedEnv), attemptedAt }
    } catch {
      return { explanation: previous, attemptedAt }
    }
  })().finally(() => {
    inflight = null
  })
  return inflight
}

const readCache = unstable_cache(
  async (): Promise<Cached> => {
    const next = primed
    primed = null
    return next ?? attempt(null)
  },
  // 응답 모양(여섯 칸 리포트)이 바뀌면 키를 올려 옛 캐시 값을 읽지 않게 한다
  ['monitoring-explain-v5'],
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
  return cached.explanation
    ? { status: 'ok', explanation: cached.explanation }
    : { status: 'failed' }
}

export type RefreshMonitoringResult =
  | { status: 'refreshed' }
  | { status: 'tooSoon'; secondsAgo: number }
  | { status: 'failed' }
  | { status: 'notConfigured' }

let refreshing: Promise<RefreshMonitoringResult> | null = null

/** 지표 캐시와 해석을 새로 받는다. 해석은 새로 받은 뒤에만 바꾸고, 실패하면 직전 해석을 둔다 */
export async function refreshMonitoring(env: Env = process.env): Promise<RefreshMonitoringResult> {
  const current = await readCached(env)
  if (!current) return { status: 'notConfigured' }
  const elapsed = Date.now() - Date.parse(current.attemptedAt)
  if (elapsed < ONE_MINUTE_MS || refreshing) {
    return { status: 'tooSoon', secondsAgo: Math.max(0, Math.floor(elapsed / 1000)) }
  }
  refreshing = (async (): Promise<RefreshMonitoringResult> => {
    // AI를 부르기 전에 시도 시각부터 캐시에 남긴다. 그동안 온 다른 새로고침은 1분 제한에 걸린다
    primed = { explanation: current.explanation, attemptedAt: new Date().toISOString() }
    updateTag(EXPLAIN_TAG)
    await readCache()
    // 지표 캐시를 비워서 화면 지표와 AI가 읽는 지표가 모두 지금 값이 되게 한다
    updateTag(GRAFANA_METRICS_TAG)
    const next = await attempt(current.explanation)
    if (next.explanation === current.explanation) return { status: 'failed' }
    primed = next
    updateTag(EXPLAIN_TAG)
    return { status: 'refreshed' }
  })().finally(() => {
    refreshing = null
  })
  return refreshing
}
