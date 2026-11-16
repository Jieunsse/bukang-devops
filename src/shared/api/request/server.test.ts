import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { RequestLogEntry, RequestOptions } from './schema'

const { fetchRequestLog, fetchRequestOptions } = vi.hoisted(() => ({
  fetchRequestLog: vi.fn(),
  fetchRequestOptions: vi.fn(),
}))
// 서버 캐시는 거치지 않고 함수를 그대로 부른다.
vi.mock('next/cache', () => ({ unstable_cache: (fn: () => unknown) => fn }))
vi.mock('./linear', () => ({ fetchRequestLog, fetchRequestOptions }))
vi.mock('../linear/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../linear/server')>()),
  getSnapshot: async () => ({ fetchedAt: '2026-11-16T00:00:00.000Z', issues: [], cycles: [] }),
}))

const { getRequestLog, getRequestOptions } = await import('./server')

const entry = (identifier: string, createdAt: string): RequestLogEntry => ({
  identifier,
  title: identifier,
  url: `https://linear.app/x/issue/${identifier}`,
  createdAt,
  requester: '옥지훈',
  assignee: null,
  state: { id: 's', name: 'Todo', type: 'unstarted', position: 1 },
})
const options = (teamId: string): RequestOptions => ({
  teamId,
  members: [],
  labels: [],
  projects: [],
  cycles: [],
})

describe('작업 요청 선택지', () => {
  beforeEach(() => {
    vi.stubEnv('LINEAR_API_KEY', 'buk-key')
    vi.stubEnv('LINEAR_API_KEY_CRU', '')
    fetchRequestOptions.mockReset()
  })

  it('CRU 키가 있으면 새 요청을 만들 CRU 팀의 선택지를 받는다', async () => {
    vi.stubEnv('LINEAR_API_KEY_CRU', 'cru-key')
    fetchRequestOptions.mockResolvedValueOnce(options('team-cru'))
    expect((await getRequestOptions()).teamId).toBe('team-cru')
    expect(fetchRequestOptions).toHaveBeenCalledWith({ apiKey: 'cru-key', teamKey: 'CRU' })
  })

  it('CRU 키가 없으면 지금처럼 BUK 팀의 선택지를 받는다', async () => {
    fetchRequestOptions.mockResolvedValueOnce(options('team-buk'))
    await getRequestOptions()
    expect(fetchRequestOptions).toHaveBeenCalledWith({ apiKey: 'buk-key', teamKey: 'BUK' })
  })
})

describe('작업 요청 내역', () => {
  beforeEach(() => {
    vi.stubEnv('LINEAR_API_KEY', 'buk-key')
    vi.stubEnv('LINEAR_API_KEY_CRU', 'cru-key')
    fetchRequestLog.mockReset()
  })

  const answer = (byTeam: Record<string, RequestLogEntry[] | Error>) =>
    fetchRequestLog.mockImplementation(async (ws: { teamKey: string }) => {
      const result = byTeam[ws.teamKey]
      if (result instanceof Error) throw result
      return result
    })

  it('두 곳에서 찾은 요청을 합쳐 최근 것부터 보여 준다', async () => {
    answer({
      BUK: [entry('BUK-9', '2026-11-12T01:00:00.000Z'), entry('BUK-5', '2026-11-08T01:00:00.000Z')],
      CRU: [entry('CRU-2', '2026-11-16T01:00:00.000Z')],
    })
    const log = await getRequestLog()
    expect(log.failure).toBeUndefined()
    expect(log.entries.map((e) => e.identifier)).toEqual(['CRU-2', 'BUK-9', 'BUK-5'])
  })

  it('합쳐도 최근 100건까지만 보여 준다', async () => {
    const many = (team: string, day: number) =>
      Array.from({ length: 100 }, (_, n) =>
        entry(`${team}-${n}`, `2026-11-${day}T${String(n % 24).padStart(2, '0')}:00:00.000Z`),
      )
    answer({ BUK: many('BUK', 10), CRU: many('CRU', 16) })
    const log = await getRequestLog()
    expect(log.entries).toHaveLength(100)
    expect(log.entries.every((e) => e.identifier.startsWith('CRU'))).toBe(true)
  })

  it('한 곳이 실패하면 다른 곳 요청은 보여 주고 실패한 팀을 알린다', async () => {
    answer({ BUK: [entry('BUK-9', '2026-11-12T01:00:00.000Z')], CRU: new Error('down') })
    const log = await getRequestLog()
    expect(log.entries.map((e) => e.identifier)).toEqual(['BUK-9'])
    expect(log.failure).toBe('CRU 팀: Linear에 연결하지 못했어요')
  })
})
