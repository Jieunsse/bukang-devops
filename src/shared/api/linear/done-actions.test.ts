import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DoneIssue } from './done-schema'

const { fetchDone } = vi.hoisted(() => ({ fetchDone: vi.fn() }))
vi.mock('next/cache', () => ({ unstable_cache: (fn: () => unknown) => fn }))
vi.mock('./fetch-done', () => ({ fetchDone }))
// 대시보드 스냅샷. 완료·취소 티켓의 사람·라벨 id를 여기에 맞춘다. 실제 Linear는 부르지 않는다.
const { seed } = vi.hoisted(() => ({
  seed: {
    fetchedAt: '2026-11-16T00:00:00.000Z',
    issues: [
      {
        id: 'BUK-20',
        identifier: 'BUK-20',
        title: 'BUK-20',
        url: 'https://linear.app/bukang-final/issue/BUK-20',
        dueDate: null,
        startedAt: null,
        state: { name: 'Todo', type: 'unstarted' },
        assignee: { id: 'buk-jihoon', name: '옥지훈' },
        labels: [{ id: 'buk-bug', name: 'Bug' }],
        milestone: null,
        cycle: null,
      },
    ],
    cycles: [],
    members: [{ id: 'buk-jihoon', name: '옥지훈' }],
  },
}))
vi.mock('./server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./server')>()),
  loadSnapshot: async () => ({ snapshot: seed }),
}))

const { loadDoneAction } = await import('./done-actions')

const done = (identifier: string, closedAt: string): DoneIssue => ({
  id: identifier,
  identifier,
  title: identifier,
  url: `https://linear.app/x/issue/${identifier}`,
  dueDate: null,
  startedAt: null,
  closedAt,
  state: { name: 'Done', type: 'completed' },
  assignee: null,
  labels: [],
  milestone: null,
  cycle: null,
})
const RANGE = { start: '2026-11-03', end: '2026-11-16' }

const answer = (byTeam: Record<string, DoneIssue[] | Error>) =>
  fetchDone.mockImplementation(async (ws: { teamKey: string }) => {
    const result = byTeam[ws.teamKey]
    if (result instanceof Error) throw result
    return result
  })

describe('완료·취소 티켓을 두 워크스페이스에서 받기', () => {
  beforeEach(() => {
    vi.stubEnv('LINEAR_API_KEY', 'buk-key')
    vi.stubEnv('LINEAR_API_KEY_CRU', 'cru-key')
    vi.stubEnv('VERCEL_ENV', '')
    fetchDone.mockReset()
  })

  it('두 곳 티켓을 합쳐 늦게 닫힌 순으로 놓는다', async () => {
    answer({
      BUK: [done('BUK-2', '2026-11-14T01:00:00.000Z'), done('BUK-1', '2026-11-10T01:00:00.000Z')],
      CRU: [done('CRU-1', '2026-11-15T01:00:00.000Z')],
    })
    const result = await loadDoneAction(RANGE)
    expect(result.failure).toBeUndefined()
    expect(result.issues.map((i) => i.identifier)).toEqual(['CRU-1', 'BUK-2', 'BUK-1'])
    expect(fetchDone).toHaveBeenCalledWith({ apiKey: 'cru-key', teamKey: 'CRU' }, RANGE)
  })

  it('한 곳이 실패하면 다른 곳 티켓은 보여 주고 실패한 팀을 알린다', async () => {
    answer({ BUK: new Error('down'), CRU: [done('CRU-1', '2026-11-15T01:00:00.000Z')] })
    const result = await loadDoneAction(RANGE)
    expect(result.issues.map((i) => i.identifier)).toEqual(['CRU-1'])
    expect(result.failure).toBe('BUK 팀: Linear에 연결하지 못했어요')
  })

  it('둘 다 실패하면 오류를 낸다', async () => {
    answer({ BUK: new Error('down'), CRU: new Error('down') })
    await expect(loadDoneAction(RANGE)).rejects.toThrow('down')
  })

  it('같은 사람과 같은 이름 라벨은 대시보드와 같은 id로 맞춰 한 묶음으로 보인다', async () => {
    answer({
      BUK: [],
      CRU: [
        {
          ...done('CRU-1', '2026-11-15T01:00:00.000Z'),
          assignee: { id: 'cru-jihoon', name: '옥지훈' },
          labels: [{ id: 'cru-bug', name: 'Bug' }],
        },
      ],
    })
    const [issue] = (await loadDoneAction(RANGE)).issues
    expect(issue?.assignee?.id).toBe('buk-jihoon')
    expect(issue?.labels.map((l) => l.id)).toEqual(['buk-bug'])
  })
})
