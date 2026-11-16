import { beforeEach, describe, expect, it, vi } from 'vitest'

import { currentPeriod } from '@/entities/ticket'

import type { Issue, Snapshot } from './schema'

const { fetchSnapshot } = vi.hoisted(() => ({ fetchSnapshot: vi.fn() }))
// 서버 캐시는 거치지 않고 함수를 그대로 부른다. 캐시가 비었을 때와 같다.
vi.mock('next/cache', () => ({ unstable_cache: (fn: () => unknown) => fn }))
vi.mock('./fetch-snapshot', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./fetch-snapshot')>()),
  fetchSnapshot,
}))

const { LinearRequestError, LinearResponseError } = await import('./fetch-snapshot')

const snap = (fetchedAt: string): Snapshot => ({ fetchedAt, issues: [], cycles: [] })

/** 서버 인스턴스를 새로 띄운 것처럼, 기억해 둔 마지막 성공 값이 없는 상태로 불러온다. */
const freshServer = async () => {
  vi.resetModules()
  return import('./server')
}

describe('Linear가 실패할 때 마지막 성공 값', () => {
  beforeEach(() => {
    vi.stubEnv('LINEAR_API_KEY', 'k')
    vi.stubEnv('LINEAR_API_KEY_CRU', '')
    fetchSnapshot.mockReset()
  })

  it('성공하면 받은 값을 실패 표시 없이 돌려준다', async () => {
    const { loadSnapshot } = await freshServer()
    fetchSnapshot.mockResolvedValueOnce(snap('2026-11-05T02:40:00.000Z'))
    expect(await loadSnapshot()).toEqual({ snapshot: snap('2026-11-05T02:40:00.000Z') })
  })

  it('실패하면 오류 대신 마지막 성공 값과 실패 이유를 돌려준다', async () => {
    const { loadSnapshot } = await freshServer()
    fetchSnapshot
      .mockResolvedValueOnce(snap('2026-11-05T02:40:00.000Z'))
      .mockRejectedValueOnce(new LinearRequestError('Linear 요청 실패(400): Rate limit exceeded'))
    await loadSnapshot()
    expect(await loadSnapshot()).toEqual({
      snapshot: { ...snap('2026-11-05T02:40:00.000Z'), failure: 'Linear 요청 한도에 걸렸어요' },
    })
  })

  it('응답 형식이 바뀌어 실패하면 그 이유를 짧게 적는다', async () => {
    const { loadSnapshot } = await freshServer()
    fetchSnapshot
      .mockResolvedValueOnce(snap('2026-11-05T02:40:00.000Z'))
      .mockRejectedValueOnce(new LinearResponseError('Linear 응답 형식이 달라요: ...'))
    await loadSnapshot()
    expect((await loadSnapshot()).snapshot?.failure).toBe('Linear 응답 형식이 달라졌어요')
  })

  it('한 번도 성공한 적이 없으면 보여 줄 값 없이 실패 이유만 돌려준다', async () => {
    const { loadSnapshot } = await freshServer()
    fetchSnapshot.mockRejectedValueOnce(new Error('network down'))
    expect(await loadSnapshot()).toEqual({
      snapshot: null,
      failure: 'Linear에 연결하지 못했어요',
    })
  })

  it('운영에서 키가 없으면 지난 값으로 숨기지 않고 오류를 그대로 낸다', async () => {
    vi.stubEnv('LINEAR_API_KEY', '')
    vi.stubEnv('VERCEL_ENV', 'production')
    const { loadSnapshot, MissingApiKeyError } = await freshServer()
    await expect(loadSnapshot()).rejects.toBeInstanceOf(MissingApiKeyError)
    vi.stubEnv('VERCEL_ENV', '')
  })
})

const issue = (identifier: string, assignee: Issue['assignee']): Issue => ({
  id: identifier,
  identifier,
  title: identifier,
  url: identifier.startsWith('CRU')
    ? `https://linear.app/buka-last/issue/${identifier}`
    : `https://linear.app/bukang-final/issue/${identifier}`,
  dueDate: null,
  startedAt: null,
  state: { name: 'Todo', type: 'unstarted' },
  assignee,
  labels: [],
  milestone: null,
  cycle: null,
})
const week = { startsAt: '2026-11-15T15:00:00.000Z', endsAt: '2026-11-22T15:00:00.000Z' }
const buk: Snapshot = {
  fetchedAt: '2026-11-16T01:00:00.000Z',
  issues: [issue('BUK-12', { id: 'buk-jihoon', name: '옥지훈' })],
  cycles: [{ id: 'buk-c8', number: 8, name: null, ...week, team: 'BUK' }],
  members: [{ id: 'buk-jihoon', name: '옥지훈' }],
  project: { name: '크루런 최종프로젝트', progress: 0.65 },
}
const cru: Snapshot = {
  fetchedAt: '2026-11-16T01:00:01.000Z',
  issues: [issue('CRU-3', { id: 'cru-jihoon', name: '옥지훈' })],
  cycles: [{ id: 'cru-c1', number: 1, name: null, ...week, team: 'CRU' }],
  members: [
    { id: 'cru-jihoon', name: '옥지훈' },
    { id: 'cru-new', name: '새 팀원' },
  ],
  project: { name: '크루런 최종프로젝트', progress: 0.1 },
}

describe('두 워크스페이스 합치기', () => {
  beforeEach(() => {
    vi.stubEnv('LINEAR_API_KEY', 'lin_api_buk_secret')
    vi.stubEnv('LINEAR_API_KEY_CRU', 'lin_api_cru_secret')
    vi.stubEnv('VERCEL_ENV', '')
    fetchSnapshot.mockReset()
  })

  /** 팀 키마다 정한 결과를 돌려준다. Error면 그 팀 호출이 실패한다. */
  const answer = (byTeam: Record<string, Snapshot | Error>) =>
    fetchSnapshot.mockImplementation(async (ws: { teamKey: string }) => {
      const result = byTeam[ws.teamKey]
      if (result instanceof Error) throw result
      return result
    })

  it('두 곳의 티켓과 사이클을 모두 보여 주고 이슈 주소는 각자 워크스페이스 주소를 쓴다', async () => {
    const { loadSnapshot } = await freshServer()
    answer({ BUK: buk, CRU: cru })
    const { snapshot } = await loadSnapshot()
    expect(snapshot?.failure).toBeUndefined()
    expect(snapshot?.issues.map((i) => [i.identifier, i.url])).toEqual([
      ['BUK-12', 'https://linear.app/bukang-final/issue/BUK-12'],
      ['CRU-3', 'https://linear.app/buka-last/issue/CRU-3'],
    ])
    expect(snapshot?.cycles.map((c) => c.id).sort()).toEqual(['buk-c8', 'cru-c1'])
    expect(fetchSnapshot).toHaveBeenCalledWith(
      { apiKey: 'lin_api_cru_secret', teamKey: 'CRU' },
      expect.anything(),
      expect.anything(),
    )
  })

  it('같은 사람은 실명이 같으면 한 사람으로 합치고 BUK 쪽 id로 맞춘다', async () => {
    const { loadSnapshot } = await freshServer()
    answer({ BUK: buk, CRU: cru })
    const { snapshot } = await loadSnapshot()
    expect(snapshot?.members).toEqual([
      { id: 'buk-jihoon', name: '옥지훈' },
      { id: 'cru-new', name: '새 팀원' },
    ])
    expect(snapshot?.issues.map((i) => i.assignee?.id)).toEqual(['buk-jihoon', 'buk-jihoon'])
  })

  it('프로젝트 진행률은 기록이 쌓인 BUK 프로젝트를 쓴다', async () => {
    const { loadSnapshot } = await freshServer()
    answer({ BUK: buk, CRU: cru })
    expect((await loadSnapshot()).snapshot?.project).toEqual(buk.project)
  })

  it('두 곳 사이클이 겹치면 새 티켓을 만드는 CRU 사이클을 지금 사이클로 본다', async () => {
    const { loadSnapshot } = await freshServer()
    answer({ BUK: buk, CRU: cru })
    const { snapshot } = await loadSnapshot()
    const period = currentPeriod('2026-11-17T03:00:00.000Z', snapshot!.cycles)
    expect(period.kind === 'cycle' && period.cycle.id).toBe('cru-c1')
  })

  it('CRU만 실패하면 BUK는 보여 주고 CRU를 받지 못했다고 알린다', async () => {
    const { loadSnapshot } = await freshServer()
    answer({ BUK: buk, CRU: new LinearRequestError('Linear 요청 실패(401): Authentication') })
    const { snapshot } = await loadSnapshot()
    expect(snapshot?.issues.map((i) => i.identifier)).toEqual(['BUK-12'])
    expect(snapshot?.failure).toBe('CRU 팀: Linear가 요청을 받지 않았어요')
  })

  it('BUK만 실패하면 CRU는 보여 주고 BUK를 받지 못했다고 알린다', async () => {
    const { loadSnapshot } = await freshServer()
    answer({ BUK: new Error('network down'), CRU: cru })
    const { snapshot } = await loadSnapshot()
    expect(snapshot?.issues.map((i) => i.identifier)).toEqual(['CRU-3'])
    expect(snapshot?.failure).toBe('BUK 팀: Linear에 연결하지 못했어요')
    expect(snapshot?.failure).not.toContain('secret')
  })

  it('둘 다 실패하면 지금처럼 마지막 성공 값과 실패 이유를 보여 준다', async () => {
    const { loadSnapshot } = await freshServer()
    answer({ BUK: buk, CRU: cru })
    await loadSnapshot()
    answer({ BUK: new Error('down'), CRU: new Error('down') })
    const { snapshot } = await loadSnapshot()
    expect(snapshot?.issues).toHaveLength(2)
    expect(snapshot?.failure).toBe('Linear에 연결하지 못했어요')
  })

  it('CRU가 잠깐 실패하면 CRU 몫은 직전에 받은 값을 그대로 보여 주고 실패를 알린다', async () => {
    const { loadSnapshot } = await freshServer()
    answer({ BUK: buk, CRU: cru })
    await loadSnapshot()
    answer({ BUK: buk, CRU: new LinearRequestError('Linear 요청 실패(400): Rate limit exceeded') })
    const { snapshot } = await loadSnapshot()
    expect(snapshot?.issues.map((i) => i.identifier)).toEqual(['BUK-12', 'CRU-3'])
    expect(snapshot?.cycles.map((c) => c.id).sort()).toEqual(['buk-c8', 'cru-c1'])
    expect(snapshot?.members?.map((m) => m.name)).toEqual(['옥지훈', '새 팀원'])
    expect(snapshot?.failure).toBe('CRU 팀: Linear 요청 한도에 걸렸어요')
  })

  it('이름이 같은 라벨과 마일스톤은 앞(BUK) 워크스페이스 id로 맞춰 필터에 한 번만 보인다', async () => {
    const { loadSnapshot } = await freshServer()
    const tagged = (s: Snapshot, prefix: string): Snapshot => ({
      ...s,
      issues: s.issues.map((i) => ({
        ...i,
        labels: [{ id: `${prefix}-bug`, name: 'Bug' }],
        milestone: { id: `${prefix}-m1`, name: '최종 발표', progress: 0.5 },
      })),
    })
    answer({ BUK: tagged(buk, 'buk'), CRU: tagged(cru, 'cru') })
    const { snapshot } = await loadSnapshot()
    expect(snapshot?.issues.map((i) => [i.labels[0]?.id, i.milestone?.id])).toEqual([
      ['buk-bug', 'buk-m1'],
      ['buk-bug', 'buk-m1'],
    ])
  })

  it('CRU 키가 없으면 BUK만 부른다', async () => {
    vi.stubEnv('LINEAR_API_KEY_CRU', '')
    const { loadSnapshot } = await freshServer()
    answer({ BUK: buk })
    await loadSnapshot()
    expect(fetchSnapshot).toHaveBeenCalledTimes(1)
    expect(fetchSnapshot.mock.calls[0]![0]).toEqual({
      apiKey: 'lin_api_buk_secret',
      teamKey: 'BUK',
    })
  })
})
