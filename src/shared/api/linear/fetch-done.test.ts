import { describe, expect, it, vi } from 'vitest'

import { fetchDone } from './fetch-done'
import { LinearRequestError, LinearResponseError, MAX_PAGES } from './fetch-snapshot'

const rawDone = {
  id: 'i1',
  identifier: 'BUK-1',
  title: '로그인 화면',
  url: 'https://linear.app/bukang/issue/BUK-1',
  dueDate: '2026-11-03',
  startedAt: '2026-10-30T01:00:00.000Z',
  completedAt: '2026-11-04T08:00:00.000Z',
  canceledAt: null,
  state: { id: 's-done', name: 'Done', type: 'completed', position: 4 },
  assignee: { id: 'f6ad6c3a-2e01-4c69-b3d6-71966925bd01', name: '지은세', avatarUrl: null },
  labels: { nodes: [{ id: 'l1', name: 'FE' }] },
  projectMilestone: { id: 'm1', name: '세미 발표', progress: 40 },
  // 티켓 응답은 대시보드와 같은 검사를 거쳐서 사이클·우선순위·만든 날·부모 칸이 꼭 있어야 한다.
  cycle: null,
  priority: 3,
  createdAt: '2026-10-28T01:00:00.000Z',
  parent: null,
}
const rawCanceled = {
  ...rawDone,
  id: 'i2',
  identifier: 'BUK-2',
  completedAt: null,
  canceledAt: '2026-11-05T01:00:00.000Z',
  state: { id: 's-canceled', name: 'Canceled', type: 'canceled', position: 5 },
  assignee: null,
  projectMilestone: null,
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const page = (nodes: unknown[], hasNextPage = false, endCursor: string | null = null) =>
  json({ data: { issues: { nodes, pageInfo: { hasNextPage, endCursor } } } })

const fakeLinear = (pages: Response[]) =>
  vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => {
    const next = pages.shift()
    if (!next) throw new Error('예상보다 많이 불렀다')
    return next
  })

const RANGE = { start: '2026-10-23', end: '2026-11-05' }

describe('완료·취소 티켓 받기', () => {
  it('BUK 팀의 완료·취소 티켓을 한국 날짜 경계로 요청한다', async () => {
    const fetchImpl = fakeLinear([page([rawDone])])
    await fetchDone('lin_api_x', RANGE, fetchImpl)

    const [url, init] = fetchImpl.mock.calls[0]!
    expect(url).toBe('https://api.linear.app/graphql')
    expect(new Headers(init?.headers).get('authorization')).toBe('lin_api_x')
    const { query, variables } = JSON.parse(String(init?.body)) as {
      query: string
      variables: Record<string, unknown>
    }
    expect(variables.teamKey).toBe('BUK')
    expect(query).toContain('completedAt')
    expect(query).toContain('canceledAt')
    expect(query).toContain('"completed"')
    expect(query).toContain('"canceled"')
    // 10/23 00:00 한국 시간부터 11/6 00:00 한국 시간 전까지
    expect(query).toContain('gte: "2026-10-22T15:00:00.000Z"')
    expect(query).toContain('lt: "2026-11-05T15:00:00.000Z"')
    // Linear는 닫힌 지 오래된 티켓을 자동으로 보관한다. 지난 기간을 고르면 그 티켓도 보여야 한다.
    expect(query).toContain('includeArchived: true')
    // 대시보드와 같은 티켓 검사를 거치므로 같은 칸을 요청한다.
    expect(query).toContain('state { id name type position }')
    expect(query).toContain('parent { identifier title }')
  })

  it('완료했다가 취소한 티켓은 취소 시각을 닫힌 시각으로 쓴다', async () => {
    const reopened = { ...rawCanceled, completedAt: '2026-09-01T01:00:00.000Z' }
    const [issue] = await fetchDone('k', RANGE, fakeLinear([page([reopened])]))
    expect(issue?.closedAt).toBe('2026-11-05T01:00:00.000Z')
  })

  it('중복으로 닫은 티켓은 취소로 보고 취소 시각을 닫힌 시각으로 쓴다', async () => {
    // Linear에는 「중복」이라는 상태 종류가 따로 있고, 완료 시각 없이 취소 시각만 있다.
    const duplicate = {
      ...rawCanceled,
      state: { ...rawCanceled.state, name: 'Duplicate', type: 'duplicate' },
      completedAt: null,
    }
    const [issue] = await fetchDone('k', RANGE, fakeLinear([page([duplicate])]))
    expect(issue?.closedAt).toBe('2026-11-05T01:00:00.000Z')
    expect(issue?.state).toMatchObject({ name: 'Duplicate', type: 'canceled' })
  })

  it('화면에서 쓰는 모양으로 바꾸고 닫힌 시각이 늦은 순으로 놓는다', async () => {
    const issues = await fetchDone('k', RANGE, fakeLinear([page([rawDone, rawCanceled])]))
    expect(issues).toEqual([
      {
        id: 'i2',
        identifier: 'BUK-2',
        title: '로그인 화면',
        // 취소 티켓은 완료 티켓을 복사해 만들어 주소가 같다.
        url: 'https://linear.app/bukang/issue/BUK-1',
        dueDate: '2026-11-03',
        startedAt: '2026-10-30T01:00:00.000Z',
        closedAt: '2026-11-05T01:00:00.000Z',
        cycle: null,
        priority: 3,
        createdAt: '2026-10-28T01:00:00.000Z',
        parent: null,
        state: { id: 's-canceled', name: 'Canceled', type: 'canceled', position: 5 },
        assignee: null,
        labels: [{ id: 'l1', name: 'FE' }],
        milestone: null,
      },
      {
        id: 'i1',
        identifier: 'BUK-1',
        title: '로그인 화면',
        url: 'https://linear.app/bukang/issue/BUK-1',
        dueDate: '2026-11-03',
        startedAt: '2026-10-30T01:00:00.000Z',
        closedAt: '2026-11-04T08:00:00.000Z',
        cycle: null,
        priority: 3,
        createdAt: '2026-10-28T01:00:00.000Z',
        parent: null,
        state: { id: 's-done', name: 'Done', type: 'completed', position: 4 },
        // Linear 이름이 실명이 아닌 팀원은 실명으로 바꾼다.
        assignee: { id: 'f6ad6c3a-2e01-4c69-b3d6-71966925bd01', name: '옥지훈', avatarUrl: null },
        labels: [{ id: 'l1', name: 'FE' }],
        milestone: { id: 'm1', name: '세미 발표', progress: 0.4 },
      },
    ])
  })

  it('티켓이 없으면 빈 목록을 돌려준다', async () => {
    expect(await fetchDone('k', RANGE, fakeLinear([page([])]))).toEqual([])
  })

  it('다음 쪽이 있으면 끝까지 이어 받는다', async () => {
    const fetchImpl = fakeLinear([page([rawDone], true, 'c1'), page([rawCanceled])])
    const issues = await fetchDone('k', RANGE, fetchImpl)
    expect(issues.map((i) => i.id).sort()).toEqual(['i1', 'i2'])
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('쪽 수가 한도를 넘으면 잘린 목록 대신 오류를 낸다', async () => {
    const pages = Array.from({ length: MAX_PAGES + 1 }, (_, n) => page([rawDone], true, `c${n}`))
    await expect(fetchDone('k', RANGE, fakeLinear(pages))).rejects.toThrow(LinearRequestError)
  })

  it('완료 시각도 취소 시각도 없으면 응답 형식이 바뀐 것으로 본다', async () => {
    const broken = { ...rawDone, completedAt: null }
    await expect(fetchDone('k', RANGE, fakeLinear([page([broken])]))).rejects.toThrow(
      LinearResponseError,
    )
  })

  it('응답 형식이 바뀌면 오류를 낸다', async () => {
    const broken = { ...rawDone, completedAt: 20261104 }
    await expect(fetchDone('k', RANGE, fakeLinear([page([broken])]))).rejects.toThrow(
      LinearResponseError,
    )
  })

  it('키가 틀리면 오류를 내고 오류 내용에 키를 넣지 않는다', async () => {
    const unauthorized = json({ errors: [{ message: 'Authentication required' }] }, 401)
    const error = await fetchDone('lin_api_secret', RANGE, fakeLinear([unauthorized])).catch(
      (e: unknown) => e,
    )
    expect(error).toBeInstanceOf(LinearRequestError)
    expect(String((error as Error).message)).not.toContain('lin_api_secret')
  })

  it.each([
    ['시작이 끝보다 늦은 기간', { start: '2026-11-05', end: '2026-11-04' }],
    ['90일을 넘는 기간', { start: '2026-08-07', end: '2026-11-05' }],
    ['날짜 모양이 아닌 값', { start: '2026-11-05"}', end: '2026-11-05' }],
    ['없는 날짜', { start: '2026-02-30', end: '2026-03-01' }],
    ['너무 먼 과거', { start: '0000-01-01', end: '0000-01-02' }],
    ['너무 먼 미래', { start: '9999-12-30', end: '9999-12-31' }],
  ])('%s은 Linear를 부르지 않고 거절한다', async (_, range) => {
    const fetchImpl = fakeLinear([page([rawDone])])
    await expect(fetchDone('k', range, fetchImpl)).rejects.toThrow()
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})
