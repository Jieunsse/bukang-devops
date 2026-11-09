import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { fetchRequestLog, fetchRequestOptions, linearIssueCreator } = await import('./linear')

const issue = {
  title: '문구 고치기',
  description: '요청한 사람: 옥지훈',
  assigneeId: 'u-1',
  dueDate: null,
  projectId: 'p-1',
  projectMilestoneId: null,
  labelIds: ['l-bug'],
  priority: 3,
  cycleId: 'c-1',
}
const json = (data: unknown) => new Response(JSON.stringify({ data }))

describe('Linear 티켓 만들기', () => {
  it('고른 팀에 고른 값을 그대로 넣어 티켓을 만든다', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      json({
        issueCreate: {
          success: true,
          issue: { identifier: 'BUK-99', url: 'https://linear.app/b/issue/BUK-99' },
        },
      }),
    )
    const created = await linearIssueCreator('key', 'team-buk', fetchImpl)(issue)
    expect(created).toEqual({ identifier: 'BUK-99', url: 'https://linear.app/b/issue/BUK-99' })
    const body = JSON.parse(fetchImpl.mock.calls[0]![1].body)
    expect(body.variables).toEqual({ input: { teamId: 'team-buk', ...issue } })
  })

  it('Linear가 만들지 않았다고 하면 실패로 본다', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(json({ issueCreate: { success: false, issue: null } }))
    await expect(linearIssueCreator('key', 'team-buk', fetchImpl)(issue)).rejects.toThrow(
      '만들지 않았어요',
    )
  })
})

describe('작업 요청 선택지 받기', () => {
  it('묶음 라벨과 끝난 프로젝트는 빼고 받는다', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      json({
        teams: {
          nodes: [
            {
              id: 'team-buk',
              labels: {
                nodes: [
                  { id: 'l-bug', name: 'Bug', color: '#eb5757', isGroup: false },
                  { id: 'l-area', name: '영역', color: '#bbbbbb', isGroup: true },
                ],
              },
              projects: {
                nodes: [
                  {
                    id: 'p-1',
                    name: '최종',
                    state: 'started',
                    projectMilestones: { nodes: [{ id: 'm-1', name: '1차' }] },
                  },
                  {
                    id: 'p-old',
                    name: '세미',
                    state: 'completed',
                    projectMilestones: { nodes: [] },
                  },
                ],
              },
              cycles: {
                nodes: [
                  {
                    id: 'c-1',
                    number: 1,
                    name: null,
                    startsAt: '2026-11-08T15:00:00.000Z',
                    endsAt: '2026-11-15T15:00:00.000Z',
                  },
                ],
              },
            },
          ],
        },
      }),
    )
    expect(await fetchRequestOptions('key', fetchImpl)).toEqual({
      teamId: 'team-buk',
      labels: [{ id: 'l-bug', name: 'Bug', color: '#eb5757' }],
      projects: [{ id: 'p-1', name: '최종', milestones: [{ id: 'm-1', name: '1차' }] }],
      cycles: [
        {
          id: 'c-1',
          number: 1,
          name: null,
          startsAt: '2026-11-08T15:00:00.000Z',
          endsAt: '2026-11-15T15:00:00.000Z',
        },
      ],
    })
  })

  it('팀을 찾지 못하면 오류를 낸다', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(json({ teams: { nodes: [] } }))
    await expect(fetchRequestOptions('key', fetchImpl)).rejects.toThrow('팀을 찾지 못했어요')
  })
})

describe('작업 요청 내역 받기', () => {
  const state = { id: 's-1', name: 'Todo', type: 'unstarted', position: 1 }
  const node = (identifier: string, createdAt: string, description: string | null) => ({
    identifier,
    title: `${identifier} 제목`,
    url: `https://linear.app/b/issue/${identifier}`,
    createdAt,
    description,
    state,
    assignee: { name: '영호', avatarUrl: null },
  })

  it('작업 요청 표시가 있는 BUK 티켓만 찾고, 요청한 사람을 설명 끝에서 읽어 최근 것부터 준다', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      json({
        issues: {
          nodes: [
            node('BUK-1', '2026-11-06T01:00:00.000Z', '요청한 사람: 옥지훈 (부캉이 작업 요청)'),
            node(
              'BUK-2',
              '2026-11-07T01:00:00.000Z',
              '버튼 고쳐 주세요.\n\n---\n요청한 사람: 김호빈 (부캉이 작업 요청)',
            ),
          ],
        },
      }),
    )
    const log = await fetchRequestLog('key', fetchImpl)
    expect(log.map((e) => [e.identifier, e.requester])).toEqual([
      ['BUK-2', '김호빈'],
      ['BUK-1', '옥지훈'],
    ])
    expect(log[0]).not.toHaveProperty('description')
    const body = JSON.parse(fetchImpl.mock.calls[0]![1].body)
    expect(body.variables).toEqual({ teamKey: 'BUK', marker: '(부캉이 작업 요청)' })
  })

  it('누군가 설명에서 요청한 사람 줄을 지웠으면 요청한 사람을 비워 둔다', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        json({ issues: { nodes: [node('BUK-3', '2026-11-08T01:00:00.000Z', null)] } }),
      )
    const [entry] = await fetchRequestLog('key', fetchImpl)
    expect(entry!.requester).toBeNull()
  })
})
