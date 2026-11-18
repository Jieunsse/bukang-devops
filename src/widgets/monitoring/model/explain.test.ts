// @vitest-environment node
// 서버 코드 테스트다. SDK는 브라우저 같은 환경(jsdom)에서 키를 쓰지 않게 막는다.
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ServiceRow, Target } from './rows'

// 점검표: 비용(캐시가 있으면 AI를 부르지 않음, 1분 안 새로고침은 부르지 않음), 실패 격리(실패하면 직전 해석 유지),
// 숫자는 코드가 계산(판정·추이 요약은 코드, AI에는 결과만), 키가 없으면 부르지 않음.

// next/cache: 키마다 값을 기억하고, updateTag는 그 태그가 붙은 값만 비운다(실제 Next 데이터 캐시와 같은 동작만 흉내 낸다)
const store = new Map<string, { value: unknown; tags: string[] }>()
vi.mock('next/cache', () => ({
  unstable_cache:
    <T>(fn: () => Promise<T>, keys: string[], opts?: { tags?: string[] }) =>
    async () => {
      const k = keys.join('|')
      if (!store.has(k)) store.set(k, { value: await fn(), tags: opts?.tags ?? [] })
      return store.get(k)!.value as T
    },
  updateTag: (tag: string) => {
    for (const [k, v] of store) if (v.tags.includes(tag)) store.delete(k)
  },
}))

const askClaude = vi.fn()
vi.mock('@/shared/api/claude/server', async (orig) => ({
  ...(await orig<typeof import('@/shared/api/claude/server')>()),
  askClaude: (...a: unknown[]) => askClaude(...a),
  createClaudeClient: () => ({}),
}))

const row = (o: Partial<ServiceRow>): ServiceRow => ({
  job: 'order-service',
  name: '주문',
  up: true,
  rps: 2,
  errorRatio: 0,
  p95Seconds: 0.2,
  heapBytes: 100 * 1024 * 1024,
  ...o,
})
const targets: Target[] = [
  { job: 'order-service', name: '주문', instance: 'a', up: true },
  { job: 'mysql', name: 'MySQL', instance: 'b', up: false },
]
const monitoring = {
  status: 'ok' as const,
  fetchedAt: '2026-11-18T10:00:00Z',
  partial: false,
  targets,
  services: [row({ errorRatio: 0.05, p95Seconds: null })],
  trends: {
    errors: null,
    rps: null,
    heap: null,
    p95: [
      {
        job: 'order-service',
        name: '주문',
        points: [
          [0, 0.1],
          [60, 2],
          [120, null],
          [180, 0.3],
        ] as [number, number | null][],
      },
    ],
  },
  brief: [],
}
const loadMonitoring = vi.fn(async () => monitoring)
vi.mock('./load', () => ({ loadMonitoring: () => loadMonitoring() }))
vi.mock('@/shared/api/grafana/server', () => ({ GRAFANA_METRICS_TAG: 'grafana-metrics' }))

const { buildExplainInput } = await import('./explain')
const { getExplanation, refreshMonitoring } = await import('./explain-server')

const env = { ANTHROPIC_API_KEY: 'k' }
const answer = (status: string) => ({
  ok: true,
  value: { status, cause: '원인', firstCheck: '먼저 볼 곳' },
})

beforeEach(() => {
  store.clear()
  askClaude.mockReset()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-18T10:00:00Z'))
})

describe('AI에 보낼 입력', () => {
  it('판정은 코드가 계산하고, 값이 없으면 null 그대로, p95 추이는 처음·마지막·최대만 보낸다', () => {
    const input = buildExplainInput(monitoring)
    expect(input.problems).toEqual(['주문', 'MySQL'])
    expect(input.services[0]).toMatchObject({
      name: '주문',
      status: '정상',
      errorRatioPercent: 5,
      p95Ms: null,
      issues: ['서버 오류 비율 1% 초과'],
    })
    expect(input.p95Trend[0]).toEqual({ name: '주문', firstMs: 100, lastMs: 300, maxMs: 2000 })
    expect(input.infraDown).toEqual(['MySQL'])
    // 주소·토큰 같은 값은 보내지 않는다
    expect(JSON.stringify(input)).not.toMatch(/instance|http|token/i)
  })
})

describe('해석 캐시', () => {
  it('키가 없으면 AI를 부르지 않는다', async () => {
    expect(await getExplanation({})).toEqual({ status: 'notConfigured' })
    expect(askClaude).not.toHaveBeenCalled()
  })

  it('캐시가 있으면 페이지에 다시 들어와도 AI를 부르지 않는다', async () => {
    askClaude.mockResolvedValue(answer('첫 해석'))
    const first = await getExplanation(env)
    const second = await getExplanation(env)
    expect(askClaude).toHaveBeenCalledTimes(1)
    expect(second).toEqual(first)
    expect(first).toMatchObject({
      status: 'ok',
      explanation: { status: '첫 해석', createdAt: '2026-11-18T10:00:00.000Z' },
    })
  })

  it('1분 안에 새로고침을 다시 누르면 AI를 부르지 않는다', async () => {
    askClaude.mockResolvedValue(answer('첫 해석'))
    await getExplanation(env)
    vi.setSystemTime(new Date('2026-11-18T10:00:30Z'))
    const r = await refreshMonitoring(env)
    expect(r).toMatchObject({ status: 'tooSoon', secondsAgo: 30 })
    expect(askClaude).toHaveBeenCalledTimes(1)
  })

  it('1분이 지나 새로고침하면 새 해석으로 바꾼다', async () => {
    askClaude.mockResolvedValueOnce(answer('첫 해석')).mockResolvedValueOnce(answer('새 해석'))
    await getExplanation(env)
    vi.setSystemTime(new Date('2026-11-18T10:01:00Z'))
    expect(await refreshMonitoring(env)).toMatchObject({ status: 'refreshed' })
    expect(await getExplanation(env)).toMatchObject({ explanation: { status: '새 해석' } })
  })

  it('AI 호출이 실패하면 직전 해석이 그대로 남는다', async () => {
    askClaude
      .mockResolvedValueOnce(answer('첫 해석'))
      .mockResolvedValueOnce({ ok: false, reason: 'rateLimit' })
    await getExplanation(env)
    vi.setSystemTime(new Date('2026-11-18T10:02:00Z'))
    expect(await refreshMonitoring(env)).toMatchObject({ status: 'failed' })
    expect(await getExplanation(env)).toMatchObject({ explanation: { status: '첫 해석' } })
  })

  it('처음 호출이 실패하면 실패로 보여 주고, 1분 동안은 다시 들어와도 AI를 부르지 않는다', async () => {
    askClaude
      .mockResolvedValueOnce({ ok: false, reason: 'refusal' })
      .mockResolvedValueOnce(answer('다음 해석'))
    expect(await getExplanation(env)).toEqual({ status: 'failed' })
    expect(await getExplanation(env)).toEqual({ status: 'failed' })
    expect(await refreshMonitoring(env)).toMatchObject({ status: 'tooSoon' })
    expect(askClaude).toHaveBeenCalledTimes(1)
    vi.setSystemTime(new Date('2026-11-18T10:01:00Z'))
    expect(await refreshMonitoring(env)).toMatchObject({ status: 'refreshed' })
    expect(await getExplanation(env)).toMatchObject({ explanation: { status: '다음 해석' } })
  })
})
