import { describe, expect, it } from 'vitest'

import type { Cycle, Issue } from '@/shared/api/linear'

import { cycleTabs, defaultTabKey, groupByAssignee, OUTSIDE } from './cycles'

const issue = (n: number, extra: Partial<Issue> = {}): Issue => ({
  id: `i${n}`,
  identifier: `BUK-${n}`,
  title: `티켓 ${n}`,
  url: `https://linear.app/bukang/issue/BUK-${n}`,
  dueDate: null,
  startedAt: null,
  state: { name: '할 일', type: 'unstarted' },
  assignee: { id: 'u1', name: '지훈' },
  labels: [],
  milestone: null,
  cycle: null,
  ...extra,
})

// 사이클 1: 한국 시간 11/9(월) 00:00 ~ 11/16(월) 00:00, 사이클 2는 그다음 주
const cycle1: Cycle = {
  id: 'c1',
  number: 1,
  name: null,
  startsAt: '2026-11-08T15:00:00.000Z',
  endsAt: '2026-11-15T15:00:00.000Z',
  completedIssueCount: 2,
}
const cycle2: Cycle = {
  ...cycle1,
  id: 'c2',
  number: 2,
  startsAt: '2026-11-15T15:00:00.000Z',
  endsAt: '2026-11-22T15:00:00.000Z',
  completedIssueCount: 0,
}
// 한국 시간 2026-11-05(목) 12:00. 사이클 밖 기간이다.
const NOW = '2026-11-05T03:00:00.000Z'

describe('사이클 탭', () => {
  it('사이클 밖 티켓이 있으면 사이클 밖 기간을 맨 앞에 두고, 사이클은 시작 순으로 둔다', () => {
    const tabs = cycleTabs([issue(1), issue(2, { cycle: { id: 'c1' } })], [cycle2, cycle1], NOW)
    expect(tabs.map((t) => t.key)).toEqual([OUTSIDE, 'c1', 'c2'])
    expect(tabs.map((t) => t.title)).toEqual(['사이클 밖 기간', '사이클 1', '사이클 2'])
  })

  it('사이클 밖 티켓이 없으면 사이클 밖 기간 탭을 두지 않는다', () => {
    const tabs = cycleTabs([issue(1, { cycle: { id: 'c1' } })], [cycle1], NOW)
    expect(tabs.map((t) => t.key)).toEqual(['c1'])
  })

  it('사이클 이름이 있으면 번호 뒤에 붙이고, 기간을 한국 시간 날짜로 적는다', () => {
    const [tab] = cycleTabs([], [{ ...cycle1, name: '데모 준비' }], NOW)
    expect(tab).toMatchObject({ title: '사이클 1 데모 준비', range: '11/9~11/15' })
  })

  it('사이클 밖 기간은 지금 사이클 밖일 때만 기간을 적는다', () => {
    expect(cycleTabs([issue(1)], [cycle1], NOW)[0]?.range).toBe('11/5~11/8')
    expect(cycleTabs([issue(1)], [cycle1], '2026-11-10T03:00:00.000Z')[0]?.range).toBeNull()
  })

  it('진행률은 완료 수와, 완료 수에 남은 티켓 수를 더한 전체 수다', () => {
    const issues = [issue(1, { cycle: { id: 'c1' } }), issue(2, { cycle: { id: 'c1' } })]
    const [tab] = cycleTabs(issues, [cycle1], NOW)
    expect(tab?.progress).toEqual({ completed: 2, total: 4 })
  })

  it('빈 사이클은 0 / 0이고 티켓이 없다', () => {
    const [tab] = cycleTabs([], [cycle2], NOW)
    expect(tab).toMatchObject({ progress: { completed: 0, total: 0 }, issues: [] })
  })

  it('완료 수를 모르는 사이클은 완료 0으로 본다', () => {
    const unknown = { ...cycle1, completedIssueCount: undefined }
    const [tab] = cycleTabs([issue(1, { cycle: { id: 'c1' } })], [unknown], NOW)
    expect(tab?.progress).toEqual({ completed: 0, total: 1 })
  })

  it('사이클 밖 기간에는 진행률이 없다', () => {
    expect(cycleTabs([issue(1)], [], NOW)[0]?.progress).toBeNull()
  })

  it('받지 못한 사이클을 가리키는 티켓은 사라지지 않게 사이클 밖에 둔다', () => {
    const tabs = cycleTabs([issue(1, { cycle: { id: 'gone' } })], [cycle1], NOW)
    expect(tabs[0]).toMatchObject({ key: OUTSIDE, issues: [expect.objectContaining({ id: 'i1' })] })
  })

  it('사이클이 하나도 없고 티켓도 없으면 탭이 없다', () => {
    expect(cycleTabs([], [], NOW)).toEqual([])
  })
})

describe('처음 여는 탭', () => {
  const tabs = cycleTabs([issue(1)], [cycle1, cycle2], NOW)

  it('지금 사이클 안이면 그 사이클이다', () => {
    expect(defaultTabKey(tabs, [cycle1, cycle2], '2026-11-16T03:00:00.000Z')).toBe('c2')
  })

  it('한국 시간 월요일 0시가 되면 그 주 사이클로 바뀐다', () => {
    expect(defaultTabKey(tabs, [cycle1, cycle2], '2026-11-08T14:59:59.999Z')).toBe(OUTSIDE)
    expect(defaultTabKey(tabs, [cycle1, cycle2], '2026-11-08T15:00:00.000Z')).toBe('c1')
  })

  it('사이클 밖인데 사이클 밖 탭이 없으면 다음 사이클이다', () => {
    const cycleOnly = cycleTabs([], [cycle1, cycle2], NOW)
    expect(defaultTabKey(cycleOnly, [cycle1, cycle2], NOW)).toBe('c1')
  })

  it('다음 사이클도 없으면 첫 탭이고, 탭이 없으면 비어 있다', () => {
    const late = '2026-12-01T00:00:00.000Z'
    expect(defaultTabKey(cycleTabs([], [cycle1, cycle2], late), [cycle1, cycle2], late)).toBe('c1')
    expect(defaultTabKey([], [], NOW)).toBeNull()
  })
})

describe('담당자별 묶음', () => {
  it('티켓이 많은 사람부터 두고 담당 없음은 맨 아래에 둔다', () => {
    const groups = groupByAssignee([
      issue(1, { assignee: null }),
      issue(2, { assignee: { id: 'u2', name: '소희' } }),
      issue(3),
      issue(4),
    ])
    expect(groups.map((g) => g.name)).toEqual(['지훈', '소희', '담당 없음'])
  })

  it('묶음 안은 기한이 이른 순이고 기한 없음은 뒤에 둔다', () => {
    const [group] = groupByAssignee([
      issue(1, { dueDate: null }),
      issue(2, { dueDate: '2026-11-10' }),
      issue(3, { dueDate: '2026-11-03' }),
    ])
    expect(group?.issues.map((i) => i.id)).toEqual(['i3', 'i2', 'i1'])
  })
})
