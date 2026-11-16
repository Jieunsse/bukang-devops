import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { RequestOptions } from './schema'

const { getRequestOptions } = vi.hoisted(() => ({ getRequestOptions: vi.fn() }))
vi.mock('next/cache', () => ({ unstable_cache: (fn: () => unknown) => fn, updateTag: vi.fn() }))
vi.mock('./server', () => ({ getRequestOptions, getRequestLog: vi.fn() }))
// 대시보드 멤버는 BUK 사용자 id다. 만들기에 쓰면 CRU 팀에서 거절된다.
vi.mock('../linear/server', () => ({
  SNAPSHOT_TAG: 'linear-snapshot',
  getSnapshot: async () => ({
    fetchedAt: '2026-11-16T00:00:00.000Z',
    issues: [],
    cycles: [],
    members: [
      { id: 'buk-jihoon', name: '옥지훈' },
      { id: 'buk-yeongho', name: '영호' },
    ],
  }),
}))

const { createWorkRequestAction } = await import('./actions')

const cruOptions: RequestOptions = {
  teamId: 'team-cru',
  members: [
    { id: 'cru-jihoon', name: '옥지훈' },
    { id: 'cru-yeongho', name: '영호' },
  ],
  labels: [{ id: 'l-bug', name: 'Bug' }],
  projects: [{ id: 'p-final', name: '최종', milestones: [] }],
  cycles: [],
}
const input = {
  assigneeId: 'cru-yeongho',
  requesterId: 'cru-jihoon',
  title: '로그인 화면 문구 고치기',
  description: '',
  dueDate: '',
  projectId: 'p-final',
  milestoneId: '',
  labelIds: ['l-bug'],
  priority: 3,
  cycleId: 'none',
}

describe('작업 요청 만들기', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  beforeEach(() => {
    vi.stubEnv('LINEAR_API_KEY', 'buk-key')
    vi.stubEnv('LINEAR_API_KEY_CRU', 'cru-key')
    vi.stubEnv('SCHEDULE_PASSWORD', 'team-secret')
    getRequestOptions.mockResolvedValue(cruOptions)
    fetchMock = vi.fn(async () =>
      Response.json({
        data: {
          issueCreate: {
            success: true,
            issue: { identifier: 'CRU-7', url: 'https://linear.app/buka-last/issue/CRU-7' },
          },
        },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('CRU 키가 있으면 CRU 키로 CRU 팀에 CRU 멤버를 담당자로 만든다', async () => {
    const result = await createWorkRequestAction('team-secret', input)
    expect(result).toEqual({
      ok: true,
      identifier: 'CRU-7',
      url: 'https://linear.app/buka-last/issue/CRU-7',
    })
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(new Headers(init.headers).get('authorization')).toBe('cru-key')
    const { variables } = JSON.parse(String(init.body))
    expect(variables.input).toMatchObject({ teamId: 'team-cru', assigneeId: 'cru-yeongho' })
  })

  it('CRU 키가 없으면 지금처럼 BUK 키로 만든다', async () => {
    vi.stubEnv('LINEAR_API_KEY_CRU', '')
    await createWorkRequestAction('team-secret', input)
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(new Headers(init.headers).get('authorization')).toBe('buk-key')
  })
})
