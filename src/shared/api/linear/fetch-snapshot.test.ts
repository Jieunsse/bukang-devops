import { describe, expect, it, vi } from 'vitest'

import { fetchSnapshot, LinearRequestError, LinearResponseError, MAX_PAGES } from './fetch-snapshot'

const rawIssue = {
  id: 'i1',
  identifier: 'BUK-1',
  title: '로그인 화면',
  url: 'https://linear.app/bukang/issue/BUK-1',
  dueDate: '2026-11-06',
  startedAt: '2026-11-03T01:00:00.000Z',
  state: { id: 's-progress', name: 'In Progress', type: 'started', position: 2 },
  assignee: { id: 'u1', name: '지훈' },
  labels: { nodes: [{ id: 'l1', name: 'FE', color: '#4ea7fc' }] },
  // Linear는 마일스톤 진행률을 0~100으로 준다.
  projectMilestone: { id: 'm1', name: '세미 발표', progress: 40 },
  cycle: { id: 'c1' },
  // 우선순위는 0(없음)~4(낮음)이다.
  priority: 2,
  createdAt: '2026-10-30T02:02:39.364Z',
  parent: { identifier: 'BUK-16', title: '충전 한도와 이상 패턴 감지' },
}
const rawCycle = {
  id: 'c1',
  number: 7,
  name: null,
  startsAt: '2026-11-08T15:00:00.000Z',
  endsAt: '2026-11-15T15:00:00.000Z',
  // Linear는 날마다 완료 수를 쌓아 둔다. 마지막 값이 지금 완료 수다.
  completedIssueCountHistory: [0, 2, 3],
}
const cycle = {
  id: 'c1',
  number: 7,
  name: null,
  startsAt: '2026-11-08T15:00:00.000Z',
  endsAt: '2026-11-15T15:00:00.000Z',
  completedIssueCount: 3,
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const issuesPage = (nodes: unknown[], hasNextPage = false, endCursor: string | null = null) =>
  json({ data: { issues: { nodes, pageInfo: { hasNextPage, endCursor } } } })
const cyclesPage = (nodes: unknown[], hasNextPage = false, endCursor: string | null = null) =>
  json({ data: { cycles: { nodes, pageInfo: { hasNextPage, endCursor } } } })

const rawMembers = [
  { id: 'f6ad6c3a-2e01-4c69-b3d6-71966925bd01', name: '지은세', avatarUrl: null, active: true },
  { id: 'u-left', name: '나간 사람', avatarUrl: null, active: false },
]
const membersPage = (nodes: unknown[], hasNextPage = false, endCursor: string | null = null) =>
  json({
    data: { teams: { nodes: [{ members: { nodes, pageInfo: { hasNextPage, endCursor } } }] } },
  })

/** 요청 본문의 query로 이슈 요청, 사이클 요청, 팀 멤버 요청을 나눠 응답한다. */
const fakeLinear = (
  issuePages: Response[],
  cyclePages: Response[] = [cyclesPage([rawCycle])],
  memberPages: Response[] = [membersPage(rawMembers)],
) =>
  vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as { query: string }
    if (body.query.includes('members(')) {
      const page = memberPages.shift()
      if (!page) throw new Error('팀 멤버를 예상보다 많이 불렀다')
      return page
    }
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
    expect(query).toContain('assignee { id name avatarUrl }')
    expect(query).toContain('cycle { id }')
    expect(query).toContain('state { id name type position }')
    expect(query).toContain('priority')
    expect(query).toContain('createdAt')
    expect(query).toContain('parent { identifier title }')
    expect(query).toContain('labels(first: 20) { nodes { id name color } }')
    expect(variables.teamKey).toBe('BUK')
  })

  it('팀 멤버 질의는 팀을 하나만 받아 Linear 질의 복잡도 한도를 넘지 않는다', async () => {
    // teams에 개수를 정하지 않으면 Linear가 기본값 50팀으로 계산해 멤버 수와 곱한다.
    // 그래서 「Query too complex」로 운영 화면 전체가 멈췄다.
    const fetchImpl = fakeLinear([issuesPage([rawIssue])])
    await fetchSnapshot('k', fetchImpl, NOW)
    const queries = fetchImpl.mock.calls.map(
      ([, init]) => (JSON.parse(String(init?.body)) as { query: string }).query,
    )
    const members = queries.find((q) => q.includes('members('))
    expect(members).toMatch(/teams\(first: 1,/)
  })

  it('BUK 팀 멤버를 받아 비활성 멤버는 빼고 실명 규칙으로 이름을 바꾼다', async () => {
    const snapshot = await fetchSnapshot('k', fakeLinear([issuesPage([rawIssue])]), NOW)
    expect(snapshot.members).toEqual([
      { id: 'f6ad6c3a-2e01-4c69-b3d6-71966925bd01', name: '옥지훈', avatarUrl: null },
    ])
  })

  it('팀 멤버 응답 형식이 다르면 오류를 낸다', async () => {
    const broken = membersPage([{ id: 'u1', name: '지훈', active: 'yes' }])
    await expect(
      fetchSnapshot('k', fakeLinear([issuesPage([rawIssue])], undefined, [broken]), NOW),
    ).rejects.toThrow(LinearResponseError)
  })

  it('부모 이슈가 없는 티켓은 부모를 비워 둔다', async () => {
    const snapshot = await fetchSnapshot(
      'k',
      fakeLinear([issuesPage([{ ...rawIssue, parent: null, priority: 0 }])]),
      NOW,
    )
    expect(snapshot.issues[0]).toMatchObject({ parent: null, priority: 0 })
  })

  it('상태 순서, 우선순위, 만든 날이 응답에 없거나 범위를 벗어나면 오류를 낸다', async () => {
    const broken = [
      { ...rawIssue, priority: undefined },
      { ...rawIssue, priority: 7 },
      { ...rawIssue, createdAt: undefined },
      { ...rawIssue, state: { name: 'Todo', type: 'unstarted' } },
    ]
    for (const issue of broken) {
      await expect(fetchSnapshot('k', fakeLinear([issuesPage([issue])]), NOW)).rejects.toThrow(
        LinearResponseError,
      )
    }
  })

  it('사이클의 완료 수 기록을 요청한다', async () => {
    const fetchImpl = fakeLinear([issuesPage([rawIssue])])
    await fetchSnapshot('k', fetchImpl, NOW)
    const queries = fetchImpl.mock.calls.map(
      ([, init]) => (JSON.parse(String(init?.body)) as { query: string }).query,
    )
    expect(queries.find((q) => q.includes('cycles('))).toContain('completedIssueCountHistory')
  })

  it('완료 수 기록의 마지막 값을 완료 수로 쓰고, 기록이 비면 0으로 본다', async () => {
    const fetchImpl = fakeLinear(
      [issuesPage([rawIssue])],
      [cyclesPage([rawCycle, { ...rawCycle, id: 'c2', completedIssueCountHistory: [] }])],
    )
    const snapshot = await fetchSnapshot('k', fetchImpl, NOW)
    expect(snapshot.cycles.map((c) => c.completedIssueCount)).toEqual([3, 0])
  })

  it('사이클에 들지 않은 티켓은 사이클을 비워 둔다', async () => {
    const snapshot = await fetchSnapshot(
      'k',
      fakeLinear([issuesPage([{ ...rawIssue, cycle: null }])]),
      NOW,
    )
    expect(snapshot.issues[0]?.cycle).toBeNull()
  })

  it('티켓의 사이클이나 사이클의 완료 수 기록이 응답에 없으면 오류를 낸다', async () => {
    // JSON으로 보낼 때 undefined 칸은 빠진다.
    const noCycle = { ...rawIssue, cycle: undefined }
    await expect(fetchSnapshot('k', fakeLinear([issuesPage([noCycle])]), NOW)).rejects.toThrow(
      LinearResponseError,
    )
    const noHistory = { ...rawCycle, completedIssueCountHistory: undefined }
    await expect(
      fetchSnapshot('k', fakeLinear([issuesPage([rawIssue])], [cyclesPage([noHistory])]), NOW),
    ).rejects.toThrow(LinearResponseError)
  })

  it('받은 값을 화면에서 쓰는 모양으로 바꾸고 받은 시각을 남긴다', async () => {
    const snapshot = await fetchSnapshot('k', fakeLinear([issuesPage([rawIssue])]), NOW)
    expect(snapshot).toEqual({
      fetchedAt: '2026-11-05T03:00:00.000Z',
      cycles: [cycle],
      members: [{ id: 'f6ad6c3a-2e01-4c69-b3d6-71966925bd01', name: '옥지훈', avatarUrl: null }],
      issues: [
        {
          id: 'i1',
          identifier: 'BUK-1',
          title: '로그인 화면',
          url: 'https://linear.app/bukang/issue/BUK-1',
          dueDate: '2026-11-06',
          startedAt: '2026-11-03T01:00:00.000Z',
          state: { id: 's-progress', name: 'In Progress', type: 'started', position: 2 },
          assignee: { id: 'u1', name: '지훈' },
          labels: [{ id: 'l1', name: 'FE', color: '#4ea7fc' }],
          milestone: { id: 'm1', name: '세미 발표', progress: 0.4 },
          cycle: { id: 'c1' },
          priority: 2,
          createdAt: '2026-10-30T02:02:39.364Z',
          parent: { identifier: 'BUK-16', title: '충전 한도와 이상 패턴 감지' },
        },
      ],
    })
  })

  it('마일스톤 진행률 0~100을 화면에서 쓰는 0~1로 바꾼다', async () => {
    const at = (progress: number) => ({
      ...rawIssue,
      projectMilestone: { id: 'm', name: 'm', progress },
    })
    const snapshot = await fetchSnapshot(
      'k',
      fakeLinear([issuesPage([at(4), { ...at(100), id: 'i2' }, { ...at(0), id: 'i3' }])]),
      NOW,
    )
    expect(snapshot.issues.map((i) => i.milestone?.progress)).toEqual([0.04, 1, 0])
  })

  it('Linear 이름이 실명이 아닌 팀원은 실명으로 바꿔 보여 준다', async () => {
    const by = (id: string, name: string, n: number) => ({
      ...rawIssue,
      id: `i${n}`,
      assignee: { id, name },
    })
    const snapshot = await fetchSnapshot(
      'k',
      fakeLinear([
        issuesPage([
          by('870b71d5-9aed-4a8c-bf90-1972694b203b', 'Da Wit Lee', 1),
          by('833c0d35-5772-4e08-875c-dc85ca4fc8cb', 'bari cesco', 2),
          by('f6ad6c3a-2e01-4c69-b3d6-71966925bd01', '지은세', 3),
          by('33890f06-d1aa-4505-afcf-e3d1daa0ac1e', '김소희', 4),
        ]),
      ]),
      NOW,
    )
    expect(snapshot.issues.map((i) => i.assignee?.name)).toEqual([
      '이다윗',
      '김호빈',
      '옥지훈',
      '김소희',
    ])
  })

  it('담당자의 프로필 이미지 주소를 받고, 없으면 비워 둔다', async () => {
    const avatar = 'https://public.linear.app/u1/avatar.png'
    const snapshot = await fetchSnapshot(
      'k',
      fakeLinear([
        issuesPage([
          { ...rawIssue, assignee: { id: 'u1', name: '지훈', avatarUrl: avatar } },
          { ...rawIssue, id: 'i2', assignee: { id: 'u2', name: '영호', avatarUrl: null } },
        ]),
      ]),
      NOW,
    )
    expect(snapshot.issues.map((i) => i.assignee?.avatarUrl)).toEqual([avatar, null])
  })

  it('라벨 색이 색 코드가 아니면 응답 형식 오류로 본다', async () => {
    const broken = { ...rawIssue, labels: { nodes: [{ id: 'l1', name: 'FE', color: 'blue' }] } }
    await expect(fetchSnapshot('k', fakeLinear([issuesPage([broken])]), NOW)).rejects.toThrow(
      LinearResponseError,
    )
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
