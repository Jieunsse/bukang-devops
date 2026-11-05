import { describe, expect, it } from 'vitest'

import type { Cycle, Issue } from '@/shared/api/linear'

import { cycleProgress, dailyPace, presentationCountdown } from './presentation'

// 최종 발표는 11/23(월)이다.
describe('최종 발표까지 남은 날짜', () => {
  it('남은 날을 D-n으로 쓴다', () => {
    expect(presentationCountdown('2026-11-05')).toEqual({
      dateLabel: '11/23(월)',
      dDay: 'D-18',
      daysLeft: 18,
    })
  })

  it('발표 당일은 D-day이고 남은 날은 0이다', () => {
    expect(presentationCountdown('2026-11-23')).toMatchObject({ dDay: 'D-day', daysLeft: 0 })
  })

  it('발표가 지나면 D+n이고 남은 날은 음수가 아니라 0이다', () => {
    expect(presentationCountdown('2026-11-25')).toMatchObject({ dDay: 'D+2', daysLeft: 0 })
  })
})

describe('하루 평균 끝내야 하는 티켓 수', () => {
  it('남은 티켓 수를 남은 날 수로 나누고 소수 한 자리로 반올림한다', () => {
    expect(dailyPace(21, 18)).toBe(1.2)
    expect(dailyPace(10, 4)).toBe(2.5)
  })

  it('남은 티켓이 없으면 0이다', () => {
    expect(dailyPace(0, 18)).toBe(0)
  })

  it('남은 날이 없으면(발표 당일이나 지난 뒤) 셀 수 없다', () => {
    expect(dailyPace(5, 0)).toBeNull()
  })
})

const issue = (id: string, cycleId: string | null): Issue => ({
  id,
  identifier: `BUK-${id}`,
  title: id,
  url: `https://linear.app/x/issue/BUK-${id}`,
  dueDate: null,
  startedAt: null,
  state: { name: '할 일', type: 'unstarted' },
  assignee: null,
  labels: [],
  milestone: null,
  cycle: cycleId ? { id: cycleId } : null,
})
// 사이클 1: 한국 시간 11/9(월) 00:00 ~ 11/16(월) 00:00
const cycle1: Cycle = {
  id: 'c1',
  number: 1,
  name: null,
  startsAt: '2026-11-08T15:00:00.000Z',
  endsAt: '2026-11-15T15:00:00.000Z',
  completedIssueCount: 3,
}

describe('지금 사이클 진행', () => {
  it('사이클 안이면 완료 수와 전체 수(완료 + 그 사이클의 남은 티켓)를 센다', () => {
    const now = '2026-11-10T03:00:00.000Z'
    expect(
      cycleProgress(now, [cycle1], [issue('a', 'c1'), issue('b', 'c1'), issue('c', null)]),
    ).toEqual({
      label: '사이클 1 · 11/9~11/15',
      progress: { completed: 3, total: 5 },
      next: null,
    })
  })

  it('사이클 밖이면 진행률 대신 다음 사이클 시작일을 알려 준다', () => {
    const now = '2026-11-05T03:00:00.000Z'
    expect(cycleProgress(now, [cycle1], [])).toEqual({
      label: '사이클 밖 · 11/5~11/8',
      progress: null,
      next: { title: '사이클 1', start: '11/9(월)' },
    })
  })

  it('사이클이 하나도 없으면 다음 사이클도 없다', () => {
    expect(cycleProgress('2026-11-05T03:00:00.000Z', [], [])).toMatchObject({
      progress: null,
      next: null,
    })
  })
})
