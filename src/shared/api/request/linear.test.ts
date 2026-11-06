import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { linearIssueCreator } = await import('./linear')

const issue = {
  title: '문구 고치기',
  description: '요청한 사람: 옥지훈',
  assigneeId: 'u-1',
  dueDate: null,
}
const json = (data: unknown) => new Response(JSON.stringify({ data }))

describe('Linear 티켓 만들기', () => {
  it('BUK 팀 id를 찾아 그 팀에 티켓을 만든다', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(json({ teams: { nodes: [{ id: 'team-buk' }] } }))
      .mockResolvedValueOnce(
        json({
          issueCreate: {
            success: true,
            issue: { identifier: 'BUK-99', url: 'https://linear.app/b/issue/BUK-99' },
          },
        }),
      )
    const created = await linearIssueCreator('key', fetchImpl)(issue)
    expect(created).toEqual({ identifier: 'BUK-99', url: 'https://linear.app/b/issue/BUK-99' })
    const body = JSON.parse(fetchImpl.mock.calls[1]![1].body)
    expect(body.variables).toEqual({ input: { teamId: 'team-buk', ...issue } })
  })

  it('Linear가 만들지 않았다고 하면 실패로 본다', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(json({ teams: { nodes: [{ id: 'team-buk' }] } }))
      .mockResolvedValueOnce(json({ issueCreate: { success: false, issue: null } }))
    await expect(linearIssueCreator('key', fetchImpl)(issue)).rejects.toThrow('만들지 않았어요')
  })

  it('팀을 찾지 못하면 티켓을 만들지 않는다', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(json({ teams: { nodes: [] } }))
    await expect(linearIssueCreator('key', fetchImpl)(issue)).rejects.toThrow('팀을 찾지 못했어요')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
})
