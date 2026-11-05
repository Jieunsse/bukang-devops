import { describe, expect, it } from 'vitest'

import type { Issue } from '@/shared/api/linear'

import { assigneeLoad, milestoneProgress, segmentText } from './summary'

const base: Issue = {
  id: 'x',
  identifier: 'BUK-1',
  title: 't',
  url: 'https://linear.app/x/issue/BUK-1',
  dueDate: null,
  startedAt: null,
  state: { name: '할 일', type: 'unstarted' },
  assignee: null,
  labels: [],
  milestone: null,
}
const jihoon = { id: 'u1', name: '지훈' }
const sohee = { id: 'u2', name: '소희' }
const range = { today: '2026-11-05', end: '2026-11-08' }
const semi = { id: 'm1', name: '세미', progress: 0.8 }
const final = { id: 'm2', name: '최종', progress: 0.3 }

describe('사람별 남은 티켓', () => {
  it('지남, 이번 주(오늘 포함), 다음 주 이후, 기한 없음 네 구간으로 나누고 많은 사람부터 둔다', () => {
    const rows = assigneeLoad(
      [
        { ...base, assignee: jihoon, dueDate: '2026-11-01' },
        { ...base, assignee: sohee, dueDate: '2026-11-05' },
        { ...base, assignee: sohee, dueDate: '2026-11-07' },
        { ...base, assignee: sohee, dueDate: null },
        { ...base, assignee: jihoon, dueDate: '2026-11-20' },
        { ...base, assignee: sohee, dueDate: '2026-11-03' },
      ],
      range,
    )
    expect(rows).toEqual([
      { id: 'u2', name: '소희', overdue: 1, thisWeek: 2, later: 0, noDue: 1, total: 4 },
      { id: 'u1', name: '지훈', overdue: 1, thisWeek: 0, later: 1, noDue: 0, total: 2 },
    ])
  })

  it('담당자 없는 티켓은 맨 아래 담당 없음 줄로 모은다', () => {
    const rows = assigneeLoad(
      [
        { ...base, dueDate: '2026-11-01' },
        { ...base, dueDate: '2026-11-01' },
        { ...base, assignee: jihoon },
      ],
      range,
    )
    expect(rows.map((r) => [r.id, r.name, r.total])).toEqual([
      ['u1', '지훈', 1],
      ['none', '담당 없음', 2],
    ])
  })

  it('티켓이 없으면 빈 목록이다', () => {
    expect(assigneeLoad([], range)).toEqual([])
  })

  it('남은 티켓이 0건인 팀원도 0건 줄로 보여 주고, 0건은 티켓 있는 사람 아래에 둔다', () => {
    const members = [jihoon, sohee, { id: 'u3', name: '민수' }]
    const rows = assigneeLoad([{ ...base, assignee: sohee, dueDate: '2026-11-07' }], range, members)
    expect(rows.map((r) => [r.name, r.total])).toEqual([
      ['소희', 1],
      ['민수', 0],
      ['지훈', 0],
    ])
  })

  it('담당 없음은 남은 티켓이 있을 때만 맨 아래에 둔다', () => {
    const members = [jihoon]
    expect(assigneeLoad([], range, members).map((r) => r.name)).toEqual(['지훈'])
    // 담당 없음은 티켓이 있어도 0건 팀원보다 아래, 맨 끝이다.
    expect(assigneeLoad([{ ...base }], range, members).map((r) => r.name)).toEqual([
      '지훈',
      '담당 없음',
    ])
  })
})

describe('막대 구간 글자', () => {
  const row = { id: 'u1', name: '지훈', overdue: 0, thisWeek: 6, later: 9, noDue: 2, total: 17 }

  it('0이 아닌 구간만 「이름 개수」로 이어 쓴다', () => {
    expect(segmentText(row)).toBe('이번 주 6 · 다음 주 이후 9 · 기한 없음 2')
  })

  it('모든 구간이 0이면 빈 글자다', () => {
    expect(segmentText({ ...row, thisWeek: 0, later: 0, noDue: 0, total: 0 })).toBe('')
  })
})

describe('마일스톤 진행률', () => {
  it('진행률이 낮은 순으로 남은 티켓 수와 함께 두고 마일스톤 없음 수를 따로 센다', () => {
    expect(
      milestoneProgress([
        { ...base, milestone: semi },
        { ...base, milestone: final },
        { ...base, milestone: final },
        { ...base },
      ]),
    ).toEqual({
      milestones: [
        { id: 'm2', name: '최종', progress: 0.3, remaining: 2 },
        { id: 'm1', name: '세미', progress: 0.8, remaining: 1 },
      ],
      noMilestone: 1,
    })
  })
})
