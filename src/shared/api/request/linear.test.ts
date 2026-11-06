import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { fetchRequestOptions, linearIssueCreator } = await import('./linear')

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
