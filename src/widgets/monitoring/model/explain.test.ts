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
  brief: [
    {
      key: 'latency' as const,
      title: '응답 시간(95%)',
      unit: 's' as const,
      // 2026-11-18 19:42 KST부터 1분 간격
      series: [
        {
          name: '게이트웨이',
          points: [
            [Date.UTC(2026, 10, 18, 10, 42) / 1000, 0.12],
            [Date.UTC(2026, 10, 18, 10, 43) / 1000, 1.1],
            [Date.UTC(2026, 10, 18, 10, 44) / 1000, 0.3],
          ] as [number, number | null][],
        },
      ],
      caption: '가장 느린 곳 게이트웨이: 120ms → 최대 1.1초(19:43)',
      alert: '게이트웨이 응답 시간이 19:43에 1.1초까지 늘었어요.',
    },
  ],
  resources: [{ name: '앱 서버', memory: 0.804, disk: 0.78, swap: null }],
}
const loadMonitoring = vi.fn(async () => monitoring)
vi.mock('./load', () => ({ loadMonitoring: () => loadMonitoring() }))
vi.mock('@/shared/api/grafana/server', () => ({ GRAFANA_METRICS_TAG: 'grafana-metrics' }))

const { buildExplainInput } = await import('./explain')
const { BRIEF_FORMAT, percentText } = await import('./format')
const { getExplanation, refreshMonitoring } = await import('./explain-server')

const env = { ANTHROPIC_API_KEY: 'k' }
const answer = (summary: string) => ({
  ok: true,
  value: {
    summary,
    watch: [],
    causes: [],
    services: ['특이 사항 없음'],
    resources: ['여유 있음'],
    nextSteps: [],
  },
})

beforeEach(() => {
  store.clear()
  askClaude.mockReset()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-18T10:00:00Z'))
})

describe('AI에 보낼 입력', () => {
  it('자동 브리핑과 같은 계산 결과를 화면 표기 그대로 보낸다', () => {
    const input = buildExplainInput(monitoring)
    // 브리핑 카드 문장은 글자 하나 다르지 않게 그대로 들어간다
    expect(input.brief[0]).toMatchObject({
      title: '응답 시간(95%)',
      caption: '가장 느린 곳 게이트웨이: 120ms → 최대 1.1초(19:43)',
      alert: '게이트웨이 응답 시간이 19:43에 1.1초까지 늘었어요.',
    })
    // 시계열 요약도 브리핑과 같은 표기 함수로 만든 문자열이다
    expect(input.brief[0]!.series[0]).toEqual({
      name: '게이트웨이',
      first: BRIEF_FORMAT.s(0.12),
      latest: BRIEF_FORMAT.s(0.3),
      peak: BRIEF_FORMAT.s(1.1),
      peakAt: '19:43',
    })
    // 서비스 표·판정·자원·기준값도 화면과 같은 문자열이다
    expect(input.services[0]).toMatchObject({
      name: '주문',
      status: '정상',
      errorRatio: percentText(0.05),
      p95: '-',
      issues: ['서버 오류 비율 1% 초과'],
    })
    expect(input.verdict).toMatchObject({ problems: ['주문', 'MySQL'], downCount: '1곳' })
    expect(input.resources).toEqual([
      { server: '앱 서버', memory: '80.4%', disk: '78.0%', swap: '-' },
    ])
    expect(input.thresholds).toMatchObject({ memory: '90%', latency: '1초', errorRatio: '1%' })
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
      explanation: { summary: '첫 해석', createdAt: '2026-11-18T10:00:00.000Z' },
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
    expect(await getExplanation(env)).toMatchObject({ explanation: { summary: '새 해석' } })
  })

  it('AI 호출이 실패하면 직전 해석이 그대로 남는다', async () => {
    askClaude
      .mockResolvedValueOnce(answer('첫 해석'))
      .mockResolvedValueOnce({ ok: false, reason: 'rateLimit' })
    await getExplanation(env)
    vi.setSystemTime(new Date('2026-11-18T10:02:00Z'))
    expect(await refreshMonitoring(env)).toMatchObject({ status: 'failed' })
    expect(await getExplanation(env)).toMatchObject({ explanation: { summary: '첫 해석' } })
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
    expect(await getExplanation(env)).toMatchObject({ explanation: { summary: '다음 해석' } })
  })

  it('새로고침이 실패한 직후 다시 눌러도 1분 동안은 AI를 부르지 않는다(실패해도 시도 시각을 남긴다)', async () => {
    askClaude
      .mockResolvedValueOnce(answer('첫 해석'))
      .mockResolvedValue({ ok: false, reason: 'invalid' })
    await getExplanation(env)
    vi.setSystemTime(new Date('2026-11-18T10:01:00Z'))
    expect(await refreshMonitoring(env)).toMatchObject({ status: 'failed' })
    vi.setSystemTime(new Date('2026-11-18T10:01:10Z'))
    expect(await refreshMonitoring(env)).toMatchObject({ status: 'tooSoon', secondsAgo: 10 })
    expect(askClaude).toHaveBeenCalledTimes(2)
    // 직전 해석은 그대로다
    expect(await getExplanation(env)).toMatchObject({ explanation: { summary: '첫 해석' } })
  })

  it('새로고침이 동시에 여러 번 와도 AI는 한 번만 부른다', async () => {
    askClaude.mockResolvedValueOnce(answer('첫 해석')).mockResolvedValue(answer('새 해석'))
    await getExplanation(env)
    vi.setSystemTime(new Date('2026-11-18T10:01:00Z'))
    const results = await Promise.all([
      refreshMonitoring(env),
      refreshMonitoring(env),
      refreshMonitoring(env),
    ])
    expect(askClaude).toHaveBeenCalledTimes(2)
    expect(results.filter((r) => r.status === 'refreshed')).toHaveLength(1)
  })

  it('캐시가 빈 상태에서 동시에 여러 명이 들어와도 AI는 한 번만 부른다', async () => {
    askClaude.mockResolvedValue(answer('첫 해석'))
    await Promise.all([getExplanation(env), getExplanation(env), getExplanation(env)])
    expect(askClaude).toHaveBeenCalledTimes(1)
  })
})
