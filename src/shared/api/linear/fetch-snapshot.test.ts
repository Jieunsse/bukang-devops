import { describe, expect, it, vi } from 'vitest'

import { fetchSnapshot, LinearRequestError, LinearResponseError, MAX_PAGES } from './fetch-snapshot'

const rawIssue = {
  id: 'i1',
  identifier: 'BUK-1',
  title: '로그인 화면',
  url: 'https://linear.app/bukang/issue/BUK-1',
  dueDate: '2026-11-06',
  startedAt: '2026-11-03T01:00:00.000Z',
  state: { name: '진행 중', type: 'started' },
  assignee: { id: 'u1', name: '지훈' },
  labels: { nodes: [{ id: 'l1', name: 'FE' }] },
  projectMilestone: { id: 'm1', name: '세미 발표', progress: 0.4 },
}
const rawCycle = {
  id: 'c1',
  number: 7,
  name: null,
  startsAt: '2026-11-08T15:00:00.000Z',
  endsAt: '2026-11-15T15:00:00.000Z',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const issuesPage = (nodes: unknown[], hasNextPage = false, endCursor: string | null = null) =>
  json({ data: { issues: { nodes, pageInfo: { hasNextPage, endCursor } } } })
const cyclesPage = (nodes: unknown[], hasNextPage = false, endCursor: string | null = null) =>
  json({ data: { cycles: { nodes, pageInfo: { hasNextPage, endCursor } } } })

/** 요청 본문의 query로 이슈 요청과 사이클 요청을 나눠 응답한다. */
const fakeLinear = (issuePages: Response[], cyclePages: Response[] = [cyclesPage([rawCycle])]) =>
  vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as { query: string }
    if (body.query.includes('cycles(')) {
      const page = cyclePages.shift()
      if (!page) throw new Error('사이클을 예상보다 많이 불렀다')
      return page
    }
    const next = issuePages.shift()
    if (!next) throw new Error('예상보다 많이 불렀다')
    return next
  })

const NOW = new Date('2026-11-05T03:00:00.000Z')

describe('Linear에서 한 번에 받기', () => {
  it('키를 Authorization에 넣고 BUK 팀의 끝나지 않은 티켓만 요청한다', async () => {
    const fetchImpl = fakeLinear([issuesPage([rawIssue])])
    await fetchSnapshot('lin_api_x', fetchImpl, NOW)

    const [url, init] = fetchImpl.mock.calls[0]!
    expect(url).toBe('https://api.linear.app/graphql')
    expect(new Headers(init?.headers).get('authorization')).toBe('lin_api_x')
    const { query, variables } = JSON.parse(String(init?.body)) as {
      query: string
      variables: Record<string, unknown>
    }
    expect(query).toContain('nin: ["completed", "canceled"]')
    expect(variables.teamKey).toBe('BUK')
  })

  it('받은 값을 화면에서 쓰는 모양으로 바꾸고 받은 시각을 남긴다', async () => {
    const snapshot = await fetchSnapshot('k', fakeLinear([issuesPage([rawIssue])]), NOW)
    expect(snapshot).toEqual({
      fetchedAt: '2026-11-05T03:00:00.000Z',
      cycles: [rawCycle],
      issues: [
        {
          id: 'i1',
          identifier: 'BUK-1',
          title: '로그인 화면',
          url: 'https://linear.app/bukang/issue/BUK-1',
          dueDate: '2026-11-06',
          startedAt: '2026-11-03T01:00:00.000Z',
          state: { name: '진행 중', type: 'started' },
          assignee: { id: 'u1', name: '지훈' },
          labels: [{ id: 'l1', name: 'FE' }],
          milestone: { id: 'm1', name: '세미 발표', progress: 0.4 },
        },
      ],
    })
  })

  it('담당자와 마일스톤이 없는 티켓도 받는다', async () => {
    const bare = { ...rawIssue, assignee: null, projectMilestone: null, dueDate: null }
    const snapshot = await fetchSnapshot('k', fakeLinear([issuesPage([bare])]), NOW)
    expect(snapshot.issues[0]).toMatchObject({ assignee: null, milestone: null, dueDate: null })
  })

  it('다음 쪽이 있으면 끝까지 이어 받는다', async () => {
    const fetchImpl = fakeLinear([
      issuesPage([rawIssue], true, 'cursor-1'),
      issuesPage([{ ...rawIssue, id: 'i2' }]),
    ])
    const snapshot = await fetchSnapshot('k', fetchImpl, NOW)
    expect(snapshot.issues.map((i) => i.id)).toEqual(['i1', 'i2'])
    const second = fetchImpl.mock.calls.find(
      ([, init]) =>
        (JSON.parse(String(init?.body)) as { variables: { after?: string } }).variables.after,
    )
    expect(second).toBeDefined()
  })

  it('사이클도 다음 쪽이 있으면 끝까지 이어 받는다', async () => {
    const fetchImpl = fakeLinear(
      [issuesPage([rawIssue])],
      [cyclesPage([rawCycle], true, 'cy-1'), cyclesPage([{ ...rawCycle, id: 'c2', number: 8 }])],
    )
    const snapshot = await fetchSnapshot('k', fetchImpl, NOW)
    expect(snapshot.cycles.map((c) => c.number)).toEqual([7, 8])
  })

  it('쪽 수가 한도를 넘으면 잘린 목록을 보여 주지 않고 오류를 낸다', async () => {
    const pages = Array.from({ length: MAX_PAGES + 1 }, (_, n) =>
      issuesPage([rawIssue], true, `c${n}`),
    )
    await expect(fetchSnapshot('k', fakeLinear(pages), NOW)).rejects.toThrow(LinearRequestError)
  })

  it('응답 형식이 바뀌면 어느 값이 틀렸는지 담아 오류를 낸다', async () => {
    const broken = { ...rawIssue, dueDate: 20261106 }
    await expect(fetchSnapshot('k', fakeLinear([issuesPage([broken])]), NOW)).rejects.toThrow(
      LinearResponseError,
    )
    await expect(fetchSnapshot('k', fakeLinear([issuesPage([broken])]), NOW)).rejects.toThrow(
      /dueDate/,
    )
  })

  it('호출 한도에 걸리면 Linear가 준 오류 내용으로 오류를 낸다', async () => {
    const limited = json(
      { errors: [{ message: 'Rate limit exceeded', extensions: { code: 'RATELIMITED' } }] },
      400,
    )
    await expect(fetchSnapshot('k', fakeLinear([limited]), NOW)).rejects.toThrow(/Rate limit/)
  })

  it('키가 틀리면 오류를 내고 오류 내용에 키를 넣지 않는다', async () => {
    const unauthorized = json({ errors: [{ message: 'Authentication required' }] }, 401)
    const error = await fetchSnapshot('lin_api_secret', fakeLinear([unauthorized]), NOW).catch(
      (e: unknown) => e,
    )
    expect(error).toBeInstanceOf(LinearRequestError)
    expect(String((error as Error).message)).not.toContain('lin_api_secret')
  })
})
